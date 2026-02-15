import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseDates, parsePrice } from './CostcoScraper';

// --- Mock rebrowser-pw for scrape() tests ---
const mockClose = vi.fn();
const mockGoto = vi.fn();
const mockMouse = { move: vi.fn() };
const mockEvaluate = vi.fn();
const mockWaitForSelector = vi.fn();
const mockLocator = vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) });
const mockNewPage = vi.fn().mockResolvedValue({
  goto: mockGoto,
  mouse: mockMouse,
  evaluate: mockEvaluate,
  waitForSelector: mockWaitForSelector,
  locator: mockLocator,
});
const mockNewContext = vi.fn().mockResolvedValue({ newPage: mockNewPage });
const mockLaunch = vi.fn().mockResolvedValue({
  newContext: mockNewContext,
  close: mockClose,
});

vi.mock('rebrowser-pw', () => ({
  chromium: { launch: (...args: unknown[]) => mockLaunch(...args) },
}));

describe('CostcoScraper parsing', () => {
  describe('parseDates', () => {
    it('parses MM/DD/YYYY dash-separated dates', () => {
      const result = parseDates('Valid 1/29/2026 - 2/23/2026');
      expect(result).toEqual({
        startDate: '2026-01-29',
        expiryDate: '2026-02-23',
      });
    });

    it('parses MM/DD/YYYY with en-dash', () => {
      const result = parseDates('01/15/2026 – 02/15/2026');
      expect(result).toEqual({
        startDate: '2026-01-15',
        expiryDate: '2026-02-15',
      });
    });

    it('parses MM/DD/YYYY with em-dash', () => {
      const result = parseDates('01/15/2026 — 02/15/2026');
      expect(result).toEqual({
        startDate: '2026-01-15',
        expiryDate: '2026-02-15',
      });
    });

    it('parses 2-digit years', () => {
      const result = parseDates('1/29/26 - 2/23/26');
      expect(result).toEqual({
        startDate: '2026-01-29',
        expiryDate: '2026-02-23',
      });
    });

    it('parses "through" date format', () => {
      const result = parseDates('1/29/2026 through 2/23/2026');
      expect(result).toEqual({
        startDate: '2026-01-29',
        expiryDate: '2026-02-23',
      });
    });

    it('parses "thru" date format', () => {
      const result = parseDates('1/29/2026 thru 2/23/2026');
      expect(result).toEqual({
        startDate: '2026-01-29',
        expiryDate: '2026-02-23',
      });
    });

    it('parses "to" date format', () => {
      const result = parseDates('1/29/2026 to 2/23/2026');
      expect(result).toEqual({
        startDate: '2026-01-29',
        expiryDate: '2026-02-23',
      });
    });

    it('pads single-digit months and days', () => {
      const result = parseDates('3/5/2026 - 4/9/2026');
      expect(result).toEqual({
        startDate: '2026-03-05',
        expiryDate: '2026-04-09',
      });
    });

    it('handles double-digit months and days', () => {
      const result = parseDates('12/25/2025 - 01/05/2026');
      expect(result).toEqual({
        startDate: '2025-12-25',
        expiryDate: '2026-01-05',
      });
    });

    it('returns null for text with no dates', () => {
      expect(parseDates('No dates here')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseDates('')).toBeNull();
    });

    it('returns null for single date', () => {
      expect(parseDates('1/29/2026')).toBeNull();
    });

    it('extracts dates from longer text', () => {
      const text = 'Kirkland Signature Item $15.99 off Valid 1/29/2026 - 2/23/2026 While supplies last';
      const result = parseDates(text);
      expect(result).toEqual({
        startDate: '2026-01-29',
        expiryDate: '2026-02-23',
      });
    });

    it('handles dates at end of text', () => {
      const result = parseDates('Some product\n3/1/2026 - 3/15/2026');
      expect(result).toEqual({
        startDate: '2026-03-01',
        expiryDate: '2026-03-15',
      });
    });
  });

  describe('parsePrice', () => {
    it('parses two dollar amounts and returns higher as original', () => {
      const result = parsePrice('Was $24.99 Now $19.99');
      expect(result).toEqual({ originalPrice: 24.99, salePrice: 19.99 });
    });

    it('sorts amounts correctly regardless of order', () => {
      const result = parsePrice('$19.99 regular $24.99');
      expect(result).toEqual({ originalPrice: 24.99, salePrice: 19.99 });
    });

    it('parses "$X off" pattern', () => {
      const result = parsePrice('$15.99 $5.00 off');
      // Two prices found: 15.99 and 5.00 → sorted: 15.99, 5.00
      expect(result).toEqual({ originalPrice: 15.99, salePrice: 5.00 });
    });

    it('parses single price with off amount', () => {
      const result = parsePrice('$15.99 $4 off');
      // Two prices: 15.99 and 4 → sorted: 15.99, 4
      expect(result).toEqual({ originalPrice: 15.99, salePrice: 4 });
    });

    it('handles prices with commas', () => {
      const result = parsePrice('Was $1,299.99 Now $999.99');
      expect(result).toEqual({ originalPrice: 1299.99, salePrice: 999.99 });
    });

    it('returns null for text with no prices', () => {
      expect(parsePrice('No prices here')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parsePrice('')).toBeNull();
    });

    it('returns null for single price without off amount', () => {
      // Single price and no "off" pattern → null
      expect(parsePrice('Only $5.99')).toBeNull();
    });

    it('handles three prices (takes top two)', () => {
      const result = parsePrice('Was $29.99 Sale $24.99 Member $19.99');
      expect(result).toEqual({ originalPrice: 29.99, salePrice: 24.99 });
    });

    it('parses whole dollar amounts', () => {
      const result = parsePrice('$20 and $15');
      expect(result).toEqual({ originalPrice: 20, salePrice: 15 });
    });

    it('handles text around prices', () => {
      const result = parsePrice('Kirkland Signature Motor Oil $29.99 After $8 off');
      // Two prices: 29.99 and 8 → sorted: 29.99, 8
      expect(result).toEqual({ originalPrice: 29.99, salePrice: 8 });
    });
  });
});

describe('CostcoScraper.scrape() error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock implementations
    mockLaunch.mockResolvedValue({
      newContext: mockNewContext,
      close: mockClose,
    });
    mockGoto.mockResolvedValue(undefined);
    mockLocator.mockReturnValue({ count: vi.fn().mockResolvedValue(0) });
  });

  it('returns [] when page.goto throws ERR_HTTP2_PROTOCOL_ERROR', async () => {
    const { CostcoScraper } = await import('./CostcoScraper');
    mockGoto.mockRejectedValueOnce(new Error('net::ERR_HTTP2_PROTOCOL_ERROR'));

    const scraper = new CostcoScraper();
    const result = await scraper.scrape();

    expect(result).toEqual([]);
    expect(mockClose).toHaveBeenCalled();
  });

  it('returns [] when page.goto throws net::ERR_CONNECTION_RESET', async () => {
    const { CostcoScraper } = await import('./CostcoScraper');
    mockGoto.mockRejectedValueOnce(new Error('net::ERR_CONNECTION_RESET'));

    const scraper = new CostcoScraper();
    const result = await scraper.scrape();

    expect(result).toEqual([]);
    expect(mockClose).toHaveBeenCalled();
  });

  it('returns [] when page.goto throws Timeout error', async () => {
    const { CostcoScraper } = await import('./CostcoScraper');
    mockGoto.mockRejectedValueOnce(new Error('Timeout 60000ms exceeded'));

    const scraper = new CostcoScraper();
    const result = await scraper.scrape();

    expect(result).toEqual([]);
    expect(mockClose).toHaveBeenCalled();
  });

  it('returns [] when Navigation failed', async () => {
    const { CostcoScraper } = await import('./CostcoScraper');
    mockGoto.mockRejectedValueOnce(new Error('Navigation failed because page was closed'));

    const scraper = new CostcoScraper();
    const result = await scraper.scrape();

    expect(result).toEqual([]);
    expect(mockClose).toHaveBeenCalled();
  });

  it('returns [] when browser launch fails', async () => {
    const { CostcoScraper } = await import('./CostcoScraper');
    mockLaunch.mockRejectedValueOnce(new Error('Failed to launch browser'));

    const scraper = new CostcoScraper();
    const result = await scraper.scrape();

    expect(result).toEqual([]);
  });

  it('re-throws unknown errors', async () => {
    const { CostcoScraper } = await import('./CostcoScraper');
    mockGoto.mockRejectedValueOnce(new Error('Something completely unexpected'));

    const scraper = new CostcoScraper();
    await expect(scraper.scrape()).rejects.toThrow('Something completely unexpected');
    expect(mockClose).toHaveBeenCalled();
  });

  it('returns [] when no product tiles are found (no crash)', async () => {
    vi.useFakeTimers();
    try {
      const { CostcoScraper } = await import('./CostcoScraper');
      // Default mock already returns count=0 for all selectors

      const scraper = new CostcoScraper();
      const promise = scraper.scrape();

      // Advance past all sleep() calls
      await vi.advanceTimersByTimeAsync(20000);
      const result = await promise;

      expect(result).toEqual([]);
      expect(mockClose).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
