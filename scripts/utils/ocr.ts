import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { stripMarkdownFencing } from './translate.js';

const CACHE_DIR = resolve(import.meta.dirname, '../.cache');
const CACHE_PATH = resolve(CACHE_DIR, 'ocr.json');

export interface OcrDeal {
  title: string;
  originalPrice: number;
  salePrice: number;
  unit: string;
  categoryHints: string[];
}

function imageHash(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

function loadCache(): Record<string, OcrDeal[]> {
  try {
    if (existsSync(CACHE_PATH)) {
      return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
    }
  } catch {
    // Corrupted cache — start fresh
  }
  return {};
}

function saveCache(cache: Record<string, OcrDeal[]>): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p', '--output-format', 'json'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 180000,
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

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

function isClaudeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('which', ['claude'], { stdio: 'ignore' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

function parseOcrResponse(stdout: string): OcrDeal[] {
  try {
    const direct = JSON.parse(stdout);
    if (Array.isArray(direct)) return direct;

    if (typeof direct === 'object' && 'result' in direct) {
      const resultStr = typeof direct.result === 'string'
        ? direct.result
        : JSON.stringify(direct.result);
      const cleaned = stripMarkdownFencing(resultStr);
      const inner = JSON.parse(cleaned);
      if (Array.isArray(inner)) return inner;
    }
  } catch {
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

const OCR_PROMPT_PREFIX = `You are analyzing a grocery store promotional flyer image.
Extract EVERY product deal visible in the image. For each deal, provide:
- title: the product name in English
- originalPrice: the original/regular price (number only, no $)
- salePrice: the sale/discounted price (number only, no $)
- unit: the unit of measurement (e.g., "/lb", "/ea", "/pkg", "each", or "" if not specified)
- categoryHints: array of category keywords (e.g., ["produce"], ["meat", "seafood"], ["dairy"])

If the original price is not shown, estimate it as salePrice * 1.3 (rounded to 2 decimal places).
If prices show a range like "2 for $5", calculate the per-unit price.

Return ONLY a JSON array of objects. No other text.
Example: [{"title":"Napa Cabbage","originalPrice":1.29,"salePrice":0.69,"unit":"/lb","categoryHints":["produce"]}]

Here is the flyer image as base64:
`;

export async function ocrFlyer(imageUrl: string): Promise<OcrDeal[]> {
  if (process.env.CI === 'true') {
    console.log('  OCR: skipping in CI environment');
    return [];
  }

  const hash = imageHash(imageUrl);
  const cache = loadCache();

  if (cache[hash]) {
    console.log(`  OCR: cache hit for ${imageUrl.substring(0, 60)}...`);
    return cache[hash];
  }

  const claudeAvailable = await isClaudeAvailable();
  if (!claudeAvailable) {
    console.log('  OCR: claude CLI not found, skipping');
    return [];
  }

  // Download the image
  let base64: string;
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.log(`  OCR: image fetch failed (${response.status}) for ${imageUrl.substring(0, 60)}`);
      return [];
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    base64 = buffer.toString('base64');
  } catch (err) {
    console.log(`  OCR: image download error: ${err instanceof Error ? err.message : err}`);
    return [];
  }

  // Call Claude Vision
  try {
    const prompt = `${OCR_PROMPT_PREFIX}data:image/jpeg;base64,${base64}`;
    const stdout = await runClaude(prompt);
    const deals = parseOcrResponse(stdout);

    if (deals.length > 0) {
      cache[hash] = deals;
      saveCache(cache);
      console.log(`  OCR: extracted ${deals.length} deals from ${imageUrl.substring(0, 60)}`);
    } else {
      console.log(`  OCR: no deals extracted from ${imageUrl.substring(0, 60)}`);
    }

    return deals;
  } catch (err) {
    console.log(`  OCR: Claude error: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}
