import { describe, it, expect } from 'vitest';
import { parseDates, parsePrice } from './CostcoScraper';

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
