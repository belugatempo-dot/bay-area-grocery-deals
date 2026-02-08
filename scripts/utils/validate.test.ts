import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validate } from './validate';
import type { ScrapedDeal } from '../scrapers/BaseScraper';

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

describe('validate', () => {
  // Suppress console.log during tests
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('valid deals', () => {
    it('accepts a well-formed deal', () => {
      const { valid, errors } = validate([makeDeal()]);
      expect(valid).toHaveLength(1);
      expect(errors).toHaveLength(0);
    });

    it('accepts deal with optional fields', () => {
      const { valid } = validate([makeDeal({ unit: '/lb', details: 'Sale!', imageUrl: 'http://img.png' })]);
      expect(valid).toHaveLength(1);
    });

    it('accepts deal with equal originalPrice and salePrice', () => {
      // originalPrice >= salePrice is OK
      const { valid } = validate([makeDeal({ originalPrice: 5, salePrice: 5 })]);
      expect(valid).toHaveLength(1);
    });

    it('validates multiple deals independently', () => {
      const { valid, errors } = validate([
        makeDeal(),
        makeDeal({ title: 'ab' }), // too short
        makeDeal({ title: 'Another Valid Deal' }),
      ]);
      expect(valid).toHaveLength(2);
      expect(errors).toHaveLength(1);
    });

    it('accepts deal with minimum valid title (3 chars)', () => {
      const { valid } = validate([makeDeal({ title: 'Egg' })]);
      expect(valid).toHaveLength(1);
    });
  });

  describe('title validation', () => {
    it('rejects empty title', () => {
      const { valid, errors } = validate([makeDeal({ title: '' })]);
      expect(valid).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('title is missing or too short');
    });

    it('rejects title shorter than 3 chars', () => {
      const { valid, errors } = validate([makeDeal({ title: 'AB' })]);
      expect(valid).toHaveLength(0);
      expect(errors[0]).toContain('title is missing or too short');
    });

    it('rejects whitespace-only title', () => {
      const { valid } = validate([makeDeal({ title: '  ' })]);
      expect(valid).toHaveLength(0);
    });

    it('rejects undefined-like title', () => {
      const { valid } = validate([makeDeal({ title: undefined as unknown as string })]);
      expect(valid).toHaveLength(0);
    });
  });

  describe('price validation', () => {
    it('rejects originalPrice of 0', () => {
      const { valid, errors } = validate([makeDeal({ originalPrice: 0 })]);
      expect(valid).toHaveLength(0);
      expect(errors[0]).toContain('invalid originalPrice');
    });

    it('rejects negative originalPrice', () => {
      const { valid, errors } = validate([makeDeal({ originalPrice: -5 })]);
      expect(valid).toHaveLength(0);
      expect(errors[0]).toContain('invalid originalPrice');
    });

    it('rejects salePrice of 0', () => {
      const { valid, errors } = validate([makeDeal({ salePrice: 0 })]);
      expect(valid).toHaveLength(0);
      expect(errors[0]).toContain('invalid salePrice');
    });

    it('rejects negative salePrice', () => {
      const { valid, errors } = validate([makeDeal({ salePrice: -3 })]);
      expect(valid).toHaveLength(0);
      expect(errors[0]).toContain('invalid salePrice');
    });

    it('rejects when originalPrice < salePrice', () => {
      const { valid, errors } = validate([makeDeal({ originalPrice: 3, salePrice: 5 })]);
      expect(valid).toHaveLength(0);
      expect(errors[0]).toContain('originalPrice');
      expect(errors[0]).toContain('< salePrice');
    });

    it('rejects non-number originalPrice', () => {
      const { valid } = validate([makeDeal({ originalPrice: 'abc' as unknown as number })]);
      expect(valid).toHaveLength(0);
    });

    it('rejects non-number salePrice', () => {
      const { valid } = validate([makeDeal({ salePrice: 'abc' as unknown as number })]);
      expect(valid).toHaveLength(0);
    });
  });

  describe('date validation', () => {
    it('rejects invalid startDate format', () => {
      const { valid, errors } = validate([makeDeal({ startDate: '01/28/2026' })]);
      expect(valid).toHaveLength(0);
      expect(errors[0]).toContain('invalid startDate');
    });

    it('rejects invalid expiryDate format', () => {
      const { valid, errors } = validate([makeDeal({ expiryDate: 'Feb 4, 2026' })]);
      expect(valid).toHaveLength(0);
      expect(errors[0]).toContain('invalid expiryDate');
    });

    it('rejects empty startDate', () => {
      const { valid } = validate([makeDeal({ startDate: '' })]);
      expect(valid).toHaveLength(0);
    });

    it('rejects empty expiryDate', () => {
      const { valid } = validate([makeDeal({ expiryDate: '' })]);
      expect(valid).toHaveLength(0);
    });

    it('rejects expiryDate before startDate', () => {
      const { valid, errors } = validate([
        makeDeal({ startDate: '2026-02-04', expiryDate: '2026-01-28' }),
      ]);
      expect(valid).toHaveLength(0);
      expect(errors[0]).toContain('must be after startDate');
    });

    it('rejects equal startDate and expiryDate', () => {
      const { valid, errors } = validate([
        makeDeal({ startDate: '2026-02-01', expiryDate: '2026-02-01' }),
      ]);
      expect(valid).toHaveLength(0);
      expect(errors[0]).toContain('must be after startDate');
    });

    it('rejects date with wrong separator', () => {
      const { valid } = validate([makeDeal({ startDate: '2026.01.28' })]);
      expect(valid).toHaveLength(0);
    });
  });

  describe('multiple errors per deal', () => {
    it('collects all errors for a single deal', () => {
      const { errors } = validate([
        makeDeal({
          title: '',
          originalPrice: -1,
          salePrice: 0,
          startDate: 'bad',
          expiryDate: 'bad',
        }),
      ]);
      // One error string with multiple issues joined by "; "
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('title');
      expect(errors[0]).toContain('originalPrice');
      expect(errors[0]).toContain('salePrice');
      expect(errors[0]).toContain('startDate');
      expect(errors[0]).toContain('expiryDate');
    });
  });

  describe('error display truncation', () => {
    it('shows "and N more" when more than 5 deals fail validation', () => {
      const invalidDeals = Array.from({ length: 7 }, (_, i) =>
        makeDeal({ title: `Deal ${i}`, originalPrice: -1 })
      );
      const { errors } = validate(invalidDeals);
      expect(errors).toHaveLength(7);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('and 2 more'));
    });
  });

  describe('edge cases', () => {
    it('handles empty deals array', () => {
      const { valid, errors } = validate([]);
      expect(valid).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });

    it('truncates title in error message', () => {
      const longTitle = 'A'.repeat(100);
      const { errors } = validate([makeDeal({ title: longTitle, originalPrice: -1 })]);
      // Error message should truncate title at 50 chars
      expect(errors[0]).toContain('A'.repeat(50));
    });

    it('handles deal with very small valid prices', () => {
      const { valid } = validate([makeDeal({ originalPrice: 0.01, salePrice: 0.01 })]);
      expect(valid).toHaveLength(1);
    });

    it('handles deal with very large prices', () => {
      const { valid } = validate([makeDeal({ originalPrice: 99999, salePrice: 50000 })]);
      expect(valid).toHaveLength(1);
    });
  });
});
