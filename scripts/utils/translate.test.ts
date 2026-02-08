import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ScrapedDeal } from '../scrapers/BaseScraper';
import {
  stripMarkdownFencing,
  parseClaudeResponse,
  cacheKey,
  fallbackTranslate,
  translateBatch,
  type TranslatedFields,
} from './translate';

// Mock fs and child_process at module level for ESM compatibility
const mockExistsSync = vi.fn(() => false);
const mockReadFileSync = vi.fn(() => '{}');
const mockWriteFileSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockSpawn = vi.fn();

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  const mocked = {
    ...actual,
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  };
  return { ...mocked, default: mocked };
});

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    default: { ...actual, spawn: (...args: unknown[]) => mockSpawn(...args) },
    spawn: (...args: unknown[]) => mockSpawn(...args),
  };
});

function makeDeal(overrides: Partial<ScrapedDeal> = {}): ScrapedDeal {
  return {
    title: 'Organic Strawberries',
    description: 'Fresh organic strawberries',
    originalPrice: 5.99,
    salePrice: 3.99,
    startDate: '2026-01-28',
    expiryDate: '2026-02-04',
    ...overrides,
  };
}

describe('stripMarkdownFencing', () => {
  it('removes ```json fencing', () => {
    expect(stripMarkdownFencing('```json\n[{"a":1}]\n```')).toBe('[{"a":1}]');
  });

  it('removes plain ``` fencing', () => {
    expect(stripMarkdownFencing('```\n[{"a":1}]\n```')).toBe('[{"a":1}]');
  });

  it('handles fencing with extra whitespace', () => {
    expect(stripMarkdownFencing('```json  \n  [1]  \n```  ')).toBe('[1]');
  });

  it('returns plain text unchanged', () => {
    expect(stripMarkdownFencing('[{"a":1}]')).toBe('[{"a":1}]');
  });

  it('handles empty string', () => {
    expect(stripMarkdownFencing('')).toBe('');
  });
});

describe('parseClaudeResponse', () => {
  it('parses direct JSON array', () => {
    const input = JSON.stringify([{ titleZh: '草莓', descriptionZh: '新鲜' }]);
    const result = parseClaudeResponse(input);
    expect(result).toEqual([{ titleZh: '草莓', descriptionZh: '新鲜' }]);
  });

  it('parses {result: "..."} wrapper with JSON string', () => {
    const inner = JSON.stringify([{ titleZh: '草莓', descriptionZh: '新鲜' }]);
    const input = JSON.stringify({ result: inner });
    const result = parseClaudeResponse(input);
    expect(result).toEqual([{ titleZh: '草莓', descriptionZh: '新鲜' }]);
  });

  it('parses {result: "..."} wrapper with markdown fencing', () => {
    const inner = '```json\n' + JSON.stringify([{ titleZh: '草莓' }]) + '\n```';
    const input = JSON.stringify({ result: inner });
    const result = parseClaudeResponse(input);
    expect(result).toEqual([{ titleZh: '草莓' }]);
  });

  it('parses {result: [...]} wrapper with object result', () => {
    const input = JSON.stringify({ result: [{ titleZh: '草莓' }] });
    const result = parseClaudeResponse(input);
    expect(result).toEqual([{ titleZh: '草莓' }]);
  });

  it('handles markdown-fenced raw stdout', () => {
    const input = '```json\n' + JSON.stringify([{ titleZh: '草莓' }]) + '\n```';
    const result = parseClaudeResponse(input);
    expect(result).toEqual([{ titleZh: '草莓' }]);
  });

  it('returns empty array for unparseable input', () => {
    expect(parseClaudeResponse('not json at all')).toEqual([]);
  });

  it('returns empty array for non-array JSON', () => {
    expect(parseClaudeResponse('{"foo":"bar"}')).toEqual([]);
  });
});

describe('cacheKey', () => {
  it('constructs key from title, description, unit, details', () => {
    const deal = makeDeal({ unit: '/lb', details: 'Limited' });
    expect(cacheKey(deal)).toBe('Organic Strawberries||Fresh organic strawberries||/lb||Limited');
  });

  it('uses empty strings for missing optional fields', () => {
    const deal = makeDeal();
    expect(cacheKey(deal)).toBe('Organic Strawberries||Fresh organic strawberries||||');
  });

  it('different deals produce different keys', () => {
    const a = makeDeal({ title: 'A' });
    const b = makeDeal({ title: 'B' });
    expect(cacheKey(a)).not.toBe(cacheKey(b));
  });
});

describe('fallbackTranslate', () => {
  it('copies English fields to Zh fields', () => {
    const deal = makeDeal({ unit: '/lb', details: 'Sale' });
    const result = fallbackTranslate(deal);
    expect(result.titleZh).toBe('Organic Strawberries');
    expect(result.descriptionZh).toBe('Fresh organic strawberries');
    expect(result.unitZh).toBe('/lb');
    expect(result.detailsZh).toBe('Sale');
  });

  it('handles missing optional fields', () => {
    const deal = makeDeal();
    const result = fallbackTranslate(deal);
    expect(result.unitZh).toBeUndefined();
    expect(result.detailsZh).toBeUndefined();
  });

  it('preserves all original deal fields', () => {
    const deal = makeDeal({ imageUrl: 'http://img.png' });
    const result = fallbackTranslate(deal);
    expect(result.title).toBe('Organic Strawberries');
    expect(result.originalPrice).toBe(5.99);
    expect(result.imageUrl).toBe('http://img.png');
  });
});

describe('translateBatch', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('{}');
    mockWriteFileSync.mockReset();
    mockMkdirSync.mockReset();
    mockSpawn.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  type Listener = (...args: unknown[]) => void;

  function makeSpawnProc(opts: {
    closeCode?: number;
    stdout?: string;
    stderr?: string;
    emitError?: Error;
  } = {}) {
    const { closeCode = 0, stdout = '', stderr = '', emitError } = opts;

    return {
      on: vi.fn((event: string, cb: Listener) => {
        // Fire close/error asynchronously when the listener is registered
        if (event === 'close' && !emitError) {
          setTimeout(() => cb(closeCode), 10);
        }
        if (event === 'error' && emitError) {
          setTimeout(() => cb(emitError), 10);
        }
      }),
      stdout: {
        on: vi.fn((event: string, cb: Listener) => {
          if (event === 'data' && stdout) {
            setTimeout(() => cb(Buffer.from(stdout)), 0);
          }
        }),
      },
      stderr: {
        on: vi.fn((event: string, cb: Listener) => {
          if (event === 'data' && stderr) {
            setTimeout(() => cb(Buffer.from(stderr)), 0);
          }
        }),
      },
      stdin: { write: vi.fn(), end: vi.fn() },
      stdio: ['pipe', 'pipe', 'pipe'],
    };
  }

  it('returns empty array for empty input', async () => {
    const result = await translateBatch([]);
    expect(result).toEqual([]);
  });

  it('uses fallback in CI environment', async () => {
    vi.stubEnv('CI', 'true');
    const result = await translateBatch([makeDeal()]);
    expect(result).toHaveLength(1);
    expect(result[0].titleZh).toBe('Organic Strawberries');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('skipping in CI'));
  });

  it('uses fallback when claude CLI is not available', async () => {
    vi.stubEnv('CI', '');
    mockSpawn.mockReturnValue(makeSpawnProc({ closeCode: 1 }));

    const result = await translateBatch([makeDeal()]);
    expect(result).toHaveLength(1);
    expect(result[0].titleZh).toBe('Organic Strawberries');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('claude CLI not found'));
  });

  it('returns cached translations when all deals are cached', async () => {
    vi.stubEnv('CI', '');

    const deal = makeDeal();
    const key = cacheKey(deal);
    const cached: TranslatedFields = { titleZh: '有机草莓', descriptionZh: '新鲜有机草莓' };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ [key]: cached }));

    // which claude → success
    mockSpawn.mockReturnValue(makeSpawnProc({ closeCode: 0 }));

    const result = await translateBatch([deal]);
    expect(result).toHaveLength(1);
    expect(result[0].titleZh).toBe('有机草莓');
  });

  it('translates uncached deals via claude CLI', async () => {
    vi.stubEnv('CI', '');

    const translations: TranslatedFields[] = [
      { titleZh: '有机草莓', descriptionZh: '新鲜有机草莓', unitZh: '', detailsZh: '' },
    ];

    // which claude → success, claude → success with output
    let callCount = 0;
    mockSpawn.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeSpawnProc({ closeCode: 0 }); // which
      return makeSpawnProc({ closeCode: 0, stdout: JSON.stringify(translations) }); // claude
    });

    const result = await translateBatch([makeDeal()]);
    expect(result).toHaveLength(1);
    expect(result[0].titleZh).toBe('有机草莓');
  });

  it('falls back on response count mismatch', async () => {
    vi.stubEnv('CI', '');

    const translations: TranslatedFields[] = [
      { titleZh: 'A', descriptionZh: 'B' },
      { titleZh: 'C', descriptionZh: 'D' },
    ];

    let callCount = 0;
    mockSpawn.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeSpawnProc({ closeCode: 0 });
      return makeSpawnProc({ closeCode: 0, stdout: JSON.stringify(translations) });
    });

    const result = await translateBatch([makeDeal()]);
    expect(result).toHaveLength(1);
    expect(result[0].titleZh).toBe('Organic Strawberries');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('response count mismatch'));
  });

  it('falls back on claude CLI error (non-zero exit code)', async () => {
    vi.stubEnv('CI', '');

    let callCount = 0;
    mockSpawn.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeSpawnProc({ closeCode: 0 });
      return makeSpawnProc({ closeCode: 1, stderr: 'some error' });
    });

    const result = await translateBatch([makeDeal()]);
    expect(result).toHaveLength(1);
    expect(result[0].titleZh).toBe('Organic Strawberries');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('claude CLI error'));
  });

  it('falls back on spawn error event', async () => {
    vi.stubEnv('CI', '');

    let callCount = 0;
    mockSpawn.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeSpawnProc({ closeCode: 0 }); // which
      return makeSpawnProc({ emitError: new Error('ENOENT') }); // claude
    });

    const result = await translateBatch([makeDeal()]);
    expect(result).toHaveLength(1);
    expect(result[0].titleZh).toBe('Organic Strawberries');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('claude CLI error'));
  });

  it('logs cache hit count when some deals are cached', async () => {
    vi.stubEnv('CI', '');

    const deal1 = makeDeal({ title: 'Deal A' });
    const deal2 = makeDeal({ title: 'Deal B' });
    const key1 = cacheKey(deal1);
    const cached: TranslatedFields = { titleZh: 'A中文', descriptionZh: 'A描述' };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ [key1]: cached }));

    const translations: TranslatedFields[] = [
      { titleZh: 'B中文', descriptionZh: 'B描述', unitZh: '', detailsZh: '' },
    ];

    let callCount = 0;
    mockSpawn.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeSpawnProc({ closeCode: 0 });
      return makeSpawnProc({ closeCode: 0, stdout: JSON.stringify(translations) });
    });

    const result = await translateBatch([deal1, deal2]);
    expect(result).toHaveLength(2);
    expect(result[0].titleZh).toBe('A中文');
    expect(result[1].titleZh).toBe('B中文');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1 cached'));
  });

  it('handles which command error event gracefully', async () => {
    vi.stubEnv('CI', '');

    mockSpawn.mockReturnValue(makeSpawnProc({ emitError: new Error('ENOENT') }));

    const result = await translateBatch([makeDeal()]);
    expect(result).toHaveLength(1);
    expect(result[0].titleZh).toBe('Organic Strawberries');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('claude CLI not found'));
  });

  it('saves cache after successful translation', async () => {
    vi.stubEnv('CI', '');

    const translations: TranslatedFields[] = [
      { titleZh: '有机草莓', descriptionZh: '新鲜', unitZh: '', detailsZh: '' },
    ];

    let callCount = 0;
    mockSpawn.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeSpawnProc({ closeCode: 0 });
      return makeSpawnProc({ closeCode: 0, stdout: JSON.stringify(translations) });
    });

    await translateBatch([makeDeal()]);
    expect(mockMkdirSync).toHaveBeenCalled();
    expect(mockWriteFileSync).toHaveBeenCalled();
  });
});
