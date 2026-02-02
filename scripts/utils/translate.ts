import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import type { ScrapedDeal } from '../scrapers/BaseScraper.js';

const CACHE_DIR = resolve(import.meta.dirname, '../.cache');
const CACHE_PATH = resolve(CACHE_DIR, 'translations.json');

export interface TranslatedFields {
  titleZh: string;
  descriptionZh: string;
  unitZh?: string;
  detailsZh?: string;
}

export type TranslatedDeal = ScrapedDeal & TranslatedFields;

function loadCache(): Record<string, TranslatedFields> {
  try {
    if (existsSync(CACHE_PATH)) {
      return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
    }
  } catch {
    // Corrupted cache — start fresh
  }
  return {};
}

function saveCache(cache: Record<string, TranslatedFields>): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');
}

function cacheKey(deal: ScrapedDeal): string {
  return `${deal.title}||${deal.description}||${deal.unit ?? ''}||${deal.details ?? ''}`;
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p', '--output-format', 'json'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`claude exited with code ${code}: ${stderr}`));
    });
    proc.on('error', reject);

    // Send prompt via stdin to avoid shell escaping issues with JSON
    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

async function isClaudeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('which', ['claude'], { stdio: 'ignore' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

export async function translateBatch(deals: ScrapedDeal[]): Promise<TranslatedDeal[]> {
  if (deals.length === 0) return [];

  // Check if we should skip translation (CI or no claude CLI)
  if (process.env.CI === 'true') {
    console.log('  Translation: skipping in CI environment');
    return deals.map(fallbackTranslate);
  }

  const claudeAvailable = await isClaudeAvailable();
  if (!claudeAvailable) {
    console.log('  Translation: claude CLI not found, using fallback');
    return deals.map(fallbackTranslate);
  }

  const cache = loadCache();
  const results: TranslatedDeal[] = [];
  const toTranslate: { index: number; deal: ScrapedDeal }[] = [];

  // Check cache first
  for (let i = 0; i < deals.length; i++) {
    const key = cacheKey(deals[i]);
    if (cache[key]) {
      results[i] = { ...deals[i], ...cache[key] };
    } else {
      toTranslate.push({ index: i, deal: deals[i] });
    }
  }

  const cachedCount = deals.length - toTranslate.length;
  if (cachedCount > 0) {
    console.log(`  Translation: ${cachedCount} cached, ${toTranslate.length} to translate`);
  }

  if (toTranslate.length === 0) return results;

  // Batch translate uncached deals via claude CLI
  try {
    const textsToTranslate = toTranslate.map(({ deal }) => ({
      title: deal.title,
      description: deal.description,
      unit: deal.unit ?? '',
      details: deal.details ?? '',
    }));

    const prompt = `Translate the following grocery deal texts from English to Simplified Chinese.
Return a JSON array with the same number of elements. Each element should have: titleZh, descriptionZh, unitZh, detailsZh.
Use natural Chinese grocery terms (e.g., "ribeye steak" → "肋眼牛排", "/lb" → "/磅", "organic" → "有机").
Keep brand names in English. If text is empty, return empty string.

${JSON.stringify(textsToTranslate)}`;

    const stdout = await runClaude(prompt);

    // Parse the response — claude --output-format json wraps in {"result":"..."}
    // The result string may contain markdown fencing: ```json\n[...]\n```
    const translations = parseClaudeResponse(stdout);

    if (translations.length === toTranslate.length) {
      for (let i = 0; i < toTranslate.length; i++) {
        const { index, deal } = toTranslate[i];
        const t = translations[i];
        const fields: TranslatedFields = {
          titleZh: t.titleZh || deal.title,
          descriptionZh: t.descriptionZh || deal.description,
          unitZh: t.unitZh || deal.unit,
          detailsZh: t.detailsZh || deal.details,
        };
        results[index] = { ...deal, ...fields };
        cache[cacheKey(deal)] = fields;
      }
      saveCache(cache);
      console.log(`  Translation: ${toTranslate.length} deals translated via Claude CLI`);
    } else {
      console.log(`  Translation: response count mismatch (${translations.length} vs ${toTranslate.length}), using fallback`);
      for (const { index, deal } of toTranslate) {
        results[index] = fallbackTranslate(deal);
      }
    }
  } catch (error) {
    console.log(`  Translation: claude CLI error: ${error instanceof Error ? error.message : error}`);
    for (const { index, deal } of toTranslate) {
      results[index] = fallbackTranslate(deal);
    }
  }

  return results;
}

function stripMarkdownFencing(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrapping
  return text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
}

function parseClaudeResponse(stdout: string): TranslatedFields[] {
  try {
    // First try: direct JSON array
    const direct = JSON.parse(stdout);
    if (Array.isArray(direct)) return direct;

    // Second try: {result: "..."} wrapper from --output-format json
    if (typeof direct === 'object' && 'result' in direct) {
      const resultStr = typeof direct.result === 'string' ? direct.result : JSON.stringify(direct.result);
      const cleaned = stripMarkdownFencing(resultStr);
      const inner = JSON.parse(cleaned);
      if (Array.isArray(inner)) return inner;
    }
  } catch {
    // Third try: strip markdown fencing from raw stdout
    try {
      const cleaned = stripMarkdownFencing(stdout);
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Give up
    }
  }
  return [];
}

function fallbackTranslate(deal: ScrapedDeal): TranslatedDeal {
  return {
    ...deal,
    titleZh: deal.title,
    descriptionZh: deal.description,
    unitZh: deal.unit,
    detailsZh: deal.details,
  };
}
