import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseRanch99Dates } from './Ranch99Scraper';

// --- Mock playwright ---
const mockClose = vi.fn();
const mockGoto = vi.fn();
const mockContent = vi.fn();
const mockEvaluate = vi.fn();
const mockWaitForSelector = vi.fn();
const mockNewPage = vi.fn().mockResolvedValue({
  goto: mockGoto,
  content: mockContent,
  evaluate: mockEvaluate,
  waitForSelector: mockWaitForSelector,
});
const mockNewContext = vi.fn().mockResolvedValue({ newPage: mockNewPage });
const mockLaunch = vi.fn().mockResolvedValue({
  newContext: mockNewContext,
  close: mockClose,
});

vi.mock('playwright', () => ({
  chromium: { launch: (...args: unknown[]) => mockLaunch(...args) },
}));

// --- Mock ocrFlyer ---
const mockOcrFlyer = vi.fn();
vi.mock('../utils/ocr.js', () => ({
  ocrFlyer: (...args: unknown[]) => mockOcrFlyer(...args),
}));

describe('Ranch99Scraper parsing', () => {
  describe('parseRanch99Dates', () => {
    it('parses "Feb.13 - Feb.19" format', () => {
      const result = parseRanch99Dates('Feb.13 - Feb.19');
      expect(result).toEqual({
        startDate: expect.stringMatching(/^\d{4}-02-13$/),
        expiryDate: expect.stringMatching(/^\d{4}-02-19$/),
      });
    });

    it('parses "Jan.1 - Jan.7" with single-digit days', () => {
      const result = parseRanch99Dates('Jan.1 - Jan.7');
      expect(result).toEqual({
        startDate: expect.stringMatching(/^\d{4}-01-01$/),
        expiryDate: expect.stringMatching(/^\d{4}-01-07$/),
      });
    });

    it('parses "Dec.28 - Jan.3" across year boundary', () => {
      const result = parseRanch99Dates('Dec.28 - Jan.3');
      expect(result).not.toBeNull();
      // Start month should be Dec (12), end month should be Jan (01)
      expect(result!.startDate).toMatch(/-12-28$/);
      expect(result!.expiryDate).toMatch(/-01-03$/);
    });

    it('parses all month abbreviations', () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (const month of months) {
        const result = parseRanch99Dates(`${month}.15 - ${month}.20`);
        expect(result).not.toBeNull();
      }
    });

    it('returns null for empty string', () => {
      expect(parseRanch99Dates('')).toBeNull();
    });

    it('returns null for invalid format', () => {
      expect(parseRanch99Dates('no dates here')).toBeNull();
    });

    it('returns null for single date', () => {
      expect(parseRanch99Dates('Feb.13')).toBeNull();
    });

    it('handles double-digit days', () => {
      const result = parseRanch99Dates('Mar.10 - Mar.25');
      expect(result).toEqual({
        startDate: expect.stringMatching(/^\d{4}-03-10$/),
        expiryDate: expect.stringMatching(/^\d{4}-03-25$/),
      });
    });

    it('handles extra whitespace', () => {
      const result = parseRanch99Dates('  Feb.13  -  Feb.19  ');
      expect(result).not.toBeNull();
      expect(result!.startDate).toMatch(/-02-13$/);
    });
  });
});

describe('Ranch99Scraper.scrape() error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLaunch.mockResolvedValue({
      newContext: mockNewContext,
      close: mockClose,
    });
    mockGoto.mockResolvedValue(undefined);
    mockContent.mockResolvedValue('<html></html>');
    mockEvaluate.mockResolvedValue([]);
    mockOcrFlyer.mockResolvedValue([]);
  });

  it('returns [] when browser launch fails', async () => {
    const { Ranch99Scraper } = await import('./Ranch99Scraper');
    mockLaunch.mockRejectedValueOnce(new Error('Failed to launch browser'));

    const scraper = new Ranch99Scraper();
    const result = await scraper.scrape();

    expect(result).toEqual([]);
  });

  it('returns [] when navigation fails with known error', async () => {
    const { Ranch99Scraper } = await import('./Ranch99Scraper');
    mockGoto.mockRejectedValueOnce(new Error('Timeout 60000ms exceeded'));

    const scraper = new Ranch99Scraper();
    const result = await scraper.scrape();

    expect(result).toEqual([]);
    expect(mockClose).toHaveBeenCalled();
  });

  it('returns [] when no ad data is found on page', async () => {
    vi.useFakeTimers();
    try {
      const { Ranch99Scraper } = await import('./Ranch99Scraper');
      // evaluate returns empty array (no ad sections)
      mockEvaluate.mockResolvedValue([]);

      const scraper = new Ranch99Scraper();
      const promise = scraper.scrape();
      await vi.advanceTimersByTimeAsync(20000);
      const result = await promise;

      expect(result).toEqual([]);
      expect(mockClose).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('calls ocrFlyer for each image and maps results to ScrapedDeal', async () => {
    vi.useFakeTimers();
    try {
      const { Ranch99Scraper } = await import('./Ranch99Scraper');

      // Simulate page returning ad data
      mockEvaluate.mockResolvedValue([
        {
          name: 'Unbeatable Deals',
          date: 'Feb.13 - Feb.19',
          imageUrl: 'https://img.awsprod.99ranch.com/flyer1.jpg',
        },
      ]);

      mockOcrFlyer.mockResolvedValue([
        {
          title: 'Napa Cabbage',
          originalPrice: 1.29,
          salePrice: 0.69,
          unit: '/lb',
          categoryHints: ['produce'],
        },
      ]);

      const scraper = new Ranch99Scraper();
      const promise = scraper.scrape();
      await vi.advanceTimersByTimeAsync(20000);
      const result = await promise;

      expect(mockOcrFlyer).toHaveBeenCalledWith('https://img.awsprod.99ranch.com/flyer1.jpg');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'Napa Cabbage',
        originalPrice: 1.29,
        salePrice: 0.69,
        unit: '/lb',
        startDate: expect.stringMatching(/^\d{4}-02-13$/),
        expiryDate: expect.stringMatching(/^\d{4}-02-19$/),
        categoryHints: ['produce'],
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('handles multiple ad sections with multiple images', async () => {
    vi.useFakeTimers();
    try {
      const { Ranch99Scraper } = await import('./Ranch99Scraper');

      mockEvaluate.mockResolvedValue([
        {
          name: 'Produce',
          date: 'Feb.13 - Feb.19',
          imageUrl: 'https://img.awsprod.99ranch.com/produce.jpg',
        },
        {
          name: 'Meat',
          date: 'Feb.13 - Feb.19',
          imageUrl: 'https://img.awsprod.99ranch.com/meat.jpg',
        },
      ]);

      mockOcrFlyer
        .mockResolvedValueOnce([
          { title: 'Bok Choy', originalPrice: 1.5, salePrice: 0.99, unit: '/lb', categoryHints: ['produce'] },
        ])
        .mockResolvedValueOnce([
          { title: 'Pork Belly', originalPrice: 5.99, salePrice: 3.99, unit: '/lb', categoryHints: ['meat'] },
        ]);

      const scraper = new Ranch99Scraper();
      const promise = scraper.scrape();
      await vi.advanceTimersByTimeAsync(20000);
      const result = await promise;

      expect(mockOcrFlyer).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Bok Choy');
      expect(result[1].title).toBe('Pork Belly');
    } finally {
      vi.useRealTimers();
    }
  });

  it('skips ad sections with unparseable dates', async () => {
    vi.useFakeTimers();
    try {
      const { Ranch99Scraper } = await import('./Ranch99Scraper');

      mockEvaluate.mockResolvedValue([
        {
          name: 'Bad Section',
          date: 'no dates',
          imageUrl: 'https://img.awsprod.99ranch.com/bad.jpg',
        },
        {
          name: 'Good Section',
          date: 'Feb.13 - Feb.19',
          imageUrl: 'https://img.awsprod.99ranch.com/good.jpg',
        },
      ]);

      mockOcrFlyer.mockResolvedValue([
        { title: 'Rice', originalPrice: 12.99, salePrice: 9.99, unit: '/bag', categoryHints: ['pantry'] },
      ]);

      const scraper = new Ranch99Scraper();
      const promise = scraper.scrape();
      await vi.advanceTimersByTimeAsync(20000);
      const result = await promise;

      // Only the good section should call OCR
      expect(mockOcrFlyer).toHaveBeenCalledTimes(1);
      expect(mockOcrFlyer).toHaveBeenCalledWith('https://img.awsprod.99ranch.com/good.jpg');
      expect(result).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-throws unknown errors', async () => {
    const { Ranch99Scraper } = await import('./Ranch99Scraper');
    mockGoto.mockRejectedValueOnce(new Error('Something completely unexpected'));

    const scraper = new Ranch99Scraper();
    await expect(scraper.scrape()).rejects.toThrow('Something completely unexpected');
    expect(mockClose).toHaveBeenCalled();
  });
});
