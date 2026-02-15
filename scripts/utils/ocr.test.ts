import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mocks for node: built-ins (must use node: prefix for ESM interception) ---

const mockExistsSync = vi.fn<(path: string) => boolean>();
const mockReadFileSync = vi.fn<(path: string, encoding: string) => string>();
const mockWriteFileSync = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  const mocked = {
    ...actual,
    existsSync: (...args: Parameters<typeof actual.existsSync>) => mockExistsSync(args[0] as string),
    readFileSync: (...args: Parameters<typeof actual.readFileSync>) =>
      mockReadFileSync(args[0] as string, args[1] as string),
    writeFileSync: (...args: Parameters<typeof actual.writeFileSync>) =>
      mockWriteFileSync(...args),
    mkdirSync: (...args: Parameters<typeof actual.mkdirSync>) =>
      mockMkdirSync(...args),
  };
  return { ...mocked, default: mocked };
});

const mockSpawn = vi.fn();

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    default: { ...actual, spawn: (...args: unknown[]) => mockSpawn(...args) },
    spawn: (...args: unknown[]) => mockSpawn(...args),
  };
});

// --- Helpers ---

type Listener = (...args: unknown[]) => void;

function makeSpawnProc(opts: {
  stdout?: string;
  closeCode?: number;
  emitError?: Error;
}) {
  const { stdout = '', closeCode = 0, emitError } = opts;
  return {
    on: vi.fn((event: string, cb: Listener) => {
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
      on: vi.fn(),
    },
    stdin: { write: vi.fn(), end: vi.fn() },
  };
}

const SAMPLE_OCR_RESULT = [
  {
    title: 'Napa Cabbage',
    originalPrice: 1.29,
    salePrice: 0.69,
    unit: '/lb',
    categoryHints: ['produce'],
  },
  {
    title: 'Pork Belly',
    originalPrice: 5.99,
    salePrice: 3.99,
    unit: '/lb',
    categoryHints: ['meat'],
  },
];

const SAMPLE_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUg=='; // fake base64

// Mock global fetch
const mockFetch = vi.fn<(url: string | URL | Request) => Promise<Response>>();
vi.stubGlobal('fetch', mockFetch);

describe('ocrFlyer', () => {
  let originalCI: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalCI = process.env.CI;
    delete process.env.CI;

    // Default: no cache file
    mockExistsSync.mockReturnValue(false);

    // Default: fetch returns a fake image
    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response(Buffer.from(SAMPLE_IMAGE_BASE64, 'base64'), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      })),
    );

    // Default: 'which claude' succeeds
    mockSpawn.mockImplementation((...args: unknown[]) => {
      const cmd = args[0] as string;
      if (cmd === 'which') {
        return makeSpawnProc({ closeCode: 0 });
      }
      // claude -p call
      return makeSpawnProc({
        stdout: JSON.stringify({ result: JSON.stringify(SAMPLE_OCR_RESULT) }),
      });
    });
  });

  afterEach(() => {
    if (originalCI !== undefined) {
      process.env.CI = originalCI;
    } else {
      delete process.env.CI;
    }
  });

  it('extracts deals from image via Claude Vision', async () => {
    const { ocrFlyer } = await import('./ocr');
    const result = await ocrFlyer('https://img.99ranch.com/flyer1.jpg');

    expect(result).toEqual(SAMPLE_OCR_RESULT);
    expect(mockFetch).toHaveBeenCalledWith('https://img.99ranch.com/flyer1.jpg');
  });

  it('returns cached result without calling Claude', async () => {
    const cacheData: Record<string, unknown> = {};
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256').update('https://img.99ranch.com/flyer1.jpg').digest('hex');
    cacheData[hash] = SAMPLE_OCR_RESULT;

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(cacheData));

    const { ocrFlyer } = await import('./ocr');
    const result = await ocrFlyer('https://img.99ranch.com/flyer1.jpg');

    expect(result).toEqual(SAMPLE_OCR_RESULT);
    // Should NOT call fetch or claude
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('saves result to cache after successful OCR', async () => {
    const { ocrFlyer } = await import('./ocr');
    await ocrFlyer('https://img.99ranch.com/flyer1.jpg');

    expect(mockWriteFileSync).toHaveBeenCalled();
    const writtenJson = mockWriteFileSync.mock.calls[0][1] as string;
    const parsed = JSON.parse(writtenJson);
    // Should have one entry
    expect(Object.keys(parsed)).toHaveLength(1);
    expect(Object.values(parsed)[0]).toEqual(SAMPLE_OCR_RESULT);
  });

  it('returns [] in CI environment', async () => {
    process.env.CI = 'true';
    const { ocrFlyer } = await import('./ocr');
    const result = await ocrFlyer('https://img.99ranch.com/flyer1.jpg');

    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns [] when claude CLI is not available', async () => {
    mockSpawn.mockImplementation((...args: unknown[]) => {
      const cmd = args[0] as string;
      if (cmd === 'which') {
        return makeSpawnProc({ closeCode: 1 }); // not found
      }
      return makeSpawnProc({ closeCode: 0 });
    });

    const { ocrFlyer } = await import('./ocr');
    const result = await ocrFlyer('https://img.99ranch.com/flyer1.jpg');

    expect(result).toEqual([]);
  });

  it('returns [] when Claude returns invalid JSON', async () => {
    mockSpawn.mockImplementation((...args: unknown[]) => {
      const cmd = args[0] as string;
      if (cmd === 'which') return makeSpawnProc({ closeCode: 0 });
      return makeSpawnProc({ stdout: 'This is not valid JSON at all' });
    });

    const { ocrFlyer } = await import('./ocr');
    const result = await ocrFlyer('https://img.99ranch.com/flyer1.jpg');

    expect(result).toEqual([]);
  });

  it('returns [] when Claude process fails', async () => {
    mockSpawn.mockImplementation((...args: unknown[]) => {
      const cmd = args[0] as string;
      if (cmd === 'which') return makeSpawnProc({ closeCode: 0 });
      return makeSpawnProc({ closeCode: 1 });
    });

    const { ocrFlyer } = await import('./ocr');
    const result = await ocrFlyer('https://img.99ranch.com/flyer1.jpg');

    expect(result).toEqual([]);
  });

  it('returns [] when image fetch fails', async () => {
    mockFetch.mockImplementation(() =>
      Promise.reject(new Error('Network error')),
    );

    const { ocrFlyer } = await import('./ocr');
    const result = await ocrFlyer('https://img.99ranch.com/flyer1.jpg');

    expect(result).toEqual([]);
  });

  it('returns [] when image fetch returns non-OK status', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response('Not Found', { status: 404 })),
    );

    const { ocrFlyer } = await import('./ocr');
    const result = await ocrFlyer('https://img.99ranch.com/flyer1.jpg');

    expect(result).toEqual([]);
  });

  it('handles corrupted cache file gracefully', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('not valid json{{{');

    const { ocrFlyer } = await import('./ocr');
    const result = await ocrFlyer('https://img.99ranch.com/flyer1.jpg');

    // Should fall through to Claude call and succeed
    expect(result).toEqual(SAMPLE_OCR_RESULT);
  });

  it('handles markdown-fenced JSON response', async () => {
    const fencedResponse = JSON.stringify({
      result: '```json\n' + JSON.stringify(SAMPLE_OCR_RESULT) + '\n```',
    });
    mockSpawn.mockImplementation((...args: unknown[]) => {
      const cmd = args[0] as string;
      if (cmd === 'which') return makeSpawnProc({ closeCode: 0 });
      return makeSpawnProc({ stdout: fencedResponse });
    });

    const { ocrFlyer } = await import('./ocr');
    const result = await ocrFlyer('https://img.99ranch.com/flyer1.jpg');

    expect(result).toEqual(SAMPLE_OCR_RESULT);
  });

  it('creates cache directory if it does not exist', async () => {
    // First call: cache dir doesn't exist; second call: for cache file
    mockExistsSync.mockImplementation((path: string) => {
      if (path.endsWith('ocr.json')) return false;
      if (path.includes('.cache')) return false;
      return false;
    });

    const { ocrFlyer } = await import('./ocr');
    await ocrFlyer('https://img.99ranch.com/flyer1.jpg');

    expect(mockMkdirSync).toHaveBeenCalled();
  });
});
