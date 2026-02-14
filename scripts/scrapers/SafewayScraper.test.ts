import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getSafewayWeekDates,
  parseSafewayPrice,
  parseSafewayDates,
  SafewayScraper,
} from './SafewayScraper';

describe('SafewayScraper parsing', () => {
  describe('getSafewayWeekDates', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns Wednesday start when today is Wednesday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-04T12:00:00')); // Wednesday
      const { startDate, expiryDate } = getSafewayWeekDates();
      expect(startDate).toBe('2026-02-04');
      expect(expiryDate).toBe('2026-02-10'); // next Tuesday
    });

    it('returns previous Wednesday when today is Thursday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-05T12:00:00')); // Thursday
      const { startDate, expiryDate } = getSafewayWeekDates();
      expect(startDate).toBe('2026-02-04');
      expect(expiryDate).toBe('2026-02-10');
    });

    it('returns previous Wednesday when today is Tuesday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-03T12:00:00')); // Tuesday
      const { startDate, expiryDate } = getSafewayWeekDates();
      expect(startDate).toBe('2026-01-28');
      expect(expiryDate).toBe('2026-02-03');
    });

    it('returns previous Wednesday when today is Sunday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-01T12:00:00')); // Sunday
      const { startDate, expiryDate } = getSafewayWeekDates();
      expect(startDate).toBe('2026-01-28');
      expect(expiryDate).toBe('2026-02-03');
    });

    it('returns previous Wednesday when today is Monday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-02T12:00:00')); // Monday
      const { startDate, expiryDate } = getSafewayWeekDates();
      expect(startDate).toBe('2026-01-28');
      expect(expiryDate).toBe('2026-02-03');
    });

    it('returns previous Wednesday when today is Friday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-06T12:00:00')); // Friday
      const { startDate, expiryDate } = getSafewayWeekDates();
      expect(startDate).toBe('2026-02-04');
      expect(expiryDate).toBe('2026-02-10');
    });

    it('returns previous Wednesday when today is Saturday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-07T12:00:00')); // Saturday
      const { startDate, expiryDate } = getSafewayWeekDates();
      expect(startDate).toBe('2026-02-04');
      expect(expiryDate).toBe('2026-02-10');
    });

    it('expiryDate is always 6 days after startDate', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-04T12:00:00'));
      const { startDate, expiryDate } = getSafewayWeekDates();
      const start = new Date(startDate);
      const end = new Date(expiryDate);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(6);
    });

    it('handles year boundary', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T12:00:00')); // Thursday
      const { startDate, expiryDate } = getSafewayWeekDates();
      expect(startDate).toBe('2025-12-31'); // previous Wednesday
      expect(expiryDate).toBe('2026-01-06');
    });
  });

  describe('parseSafewayPrice', () => {
    it('parses "2 for $5" format', () => {
      const result = parseSafewayPrice('2 for $5');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(2.50);
    });

    it('parses "3 for $10" format', () => {
      const result = parseSafewayPrice('3 for $10');
      expect(result).not.toBeNull();
      expect(result!.sale).toBeCloseTo(3.33, 2);
    });

    it('parses "2 for $5.00" with decimal', () => {
      const result = parseSafewayPrice('2 for $5.00');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(2.50);
    });

    it('parses "$X.XX ea" format', () => {
      const result = parseSafewayPrice('$3.99 ea');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(3.99);
    });

    it('parses "$X.XX ea with card" format', () => {
      const result = parseSafewayPrice('$3.99 ea with card');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(3.99);
    });

    it('parses "CLUB PRICE $X.XX" format', () => {
      const result = parseSafewayPrice('CLUB PRICE $4.49');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(4.49);
    });

    it('parses "Save $X" format', () => {
      const result = parseSafewayPrice('Save $2.00');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(2.00);
    });

    it('parses "Save $X.XX on 2" format', () => {
      const result = parseSafewayPrice('Save $3.00 on 2');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(3.00);
    });

    it('parses "Was $X.XX Now $Y.YY" format', () => {
      const result = parseSafewayPrice('Was $5.99 Now $3.99');
      expect(result).not.toBeNull();
      expect(result!.original).toBe(5.99);
      expect(result!.sale).toBe(3.99);
    });

    it('parses "Buy 2 Get 1 Free" format', () => {
      const result = parseSafewayPrice('Buy 2 Get 1 Free');
      expect(result).not.toBeNull();
      // Buy 2 get 1 free = 3 items for price of 2 = 33% off effective
      expect(result!.sale).toBe(0); // marker value, needs price context
    });

    it('parses "Buy 1 Get 1 Free" format', () => {
      const result = parseSafewayPrice('Buy 1 Get 1 Free');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(0); // marker for BOGO
    });

    it('returns null for unrecognized formats', () => {
      expect(parseSafewayPrice('Limited time offer')).toBeNull();
      expect(parseSafewayPrice('')).toBeNull();
      expect(parseSafewayPrice('Great value')).toBeNull();
    });

    it('parses case-insensitively', () => {
      const result = parseSafewayPrice('club price $2.99');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(2.99);
    });
  });

  describe('parseSafewayDates', () => {
    it('parses "Valid MM/DD - MM/DD" header', () => {
      const result = parseSafewayDates('Valid 2/12 - 2/18');
      expect(result).not.toBeNull();
      expect(result!.startDate).toMatch(/^\d{4}-02-12$/);
      expect(result!.expiryDate).toMatch(/^\d{4}-02-18$/);
    });

    it('parses "MM/DD/YY - MM/DD/YY" format', () => {
      const result = parseSafewayDates('2/12/26 - 2/18/26');
      expect(result).not.toBeNull();
      expect(result!.startDate).toBe('2026-02-12');
      expect(result!.expiryDate).toBe('2026-02-18');
    });

    it('parses "MM/DD/YYYY - MM/DD/YYYY" format', () => {
      const result = parseSafewayDates('02/12/2026 - 02/18/2026');
      expect(result).not.toBeNull();
      expect(result!.startDate).toBe('2026-02-12');
      expect(result!.expiryDate).toBe('2026-02-18');
    });

    it('parses dates with en-dash', () => {
      const result = parseSafewayDates('2/12 – 2/18');
      expect(result).not.toBeNull();
      expect(result!.startDate).toMatch(/^\d{4}-02-12$/);
      expect(result!.expiryDate).toMatch(/^\d{4}-02-18$/);
    });

    it('returns null for missing dates', () => {
      expect(parseSafewayDates('')).toBeNull();
      expect(parseSafewayDates('No date info')).toBeNull();
    });

    it('handles year boundary in MM/DD format', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-05T12:00:00'));
      const result = parseSafewayDates('Valid 12/31 - 1/6');
      expect(result).not.toBeNull();
      expect(result!.startDate).toBe('2025-12-31');
      expect(result!.expiryDate).toBe('2026-01-06');
      vi.useRealTimers();
    });
  });

  describe('toScrapedDeal', () => {
    const scraper = new SafewayScraper();
    const toScrapedDeal = (scraper as unknown as {
      toScrapedDeal: (item: {
        title: string;
        priceText: string;
        promoText: string;
        imageUrl: string;
      }, startDate: string, expiryDate: string) => unknown;
    }).toScrapedDeal.bind(scraper);

    const startDate = '2026-02-04';
    const expiryDate = '2026-02-10';

    it('converts "2 for $5" deal', () => {
      const result = toScrapedDeal(
        { title: 'Signature SELECT Pasta', priceText: '2 for $5', promoText: '', imageUrl: '' },
        startDate, expiryDate
      ) as { salePrice: number; originalPrice: number; title: string };

      expect(result).not.toBeNull();
      expect(result.salePrice).toBe(2.50);
      expect(result.originalPrice).toBeGreaterThan(2.50);
      expect(result.title).toBe('Signature SELECT Pasta');
    });

    it('converts "Was/Now" deal', () => {
      const result = toScrapedDeal(
        { title: 'Chicken Breast', priceText: 'Was $8.99 Now $5.99', promoText: '', imageUrl: '' },
        startDate, expiryDate
      ) as { salePrice: number; originalPrice: number };

      expect(result).not.toBeNull();
      expect(result.originalPrice).toBe(8.99);
      expect(result.salePrice).toBe(5.99);
    });

    it('converts "CLUB PRICE" deal', () => {
      const result = toScrapedDeal(
        { title: 'Tide Laundry Detergent', priceText: 'CLUB PRICE $9.99', promoText: '', imageUrl: '' },
        startDate, expiryDate
      ) as { salePrice: number; originalPrice: number };

      expect(result).not.toBeNull();
      expect(result.salePrice).toBe(9.99);
      expect(result.originalPrice).toBeGreaterThan(9.99);
    });

    it('converts "Save $X" deal', () => {
      const result = toScrapedDeal(
        { title: 'Cereal Box', priceText: 'Save $2.00', promoText: '', imageUrl: '' },
        startDate, expiryDate
      ) as { salePrice: number; originalPrice: number };

      expect(result).not.toBeNull();
      // Save $2 → we estimate originalPrice from save amount
      expect(result.originalPrice - result.salePrice).toBeCloseTo(2.00, 2);
    });

    it('converts BOGO deal with price context', () => {
      const result = toScrapedDeal(
        { title: 'Yogurt', priceText: 'Buy 1 Get 1 Free', promoText: '$3.99', imageUrl: '' },
        startDate, expiryDate
      ) as { salePrice: number; originalPrice: number };

      expect(result).not.toBeNull();
      expect(result.originalPrice).toBe(3.99);
      expect(result.salePrice).toBe(2.00); // 3.99 / 2 rounded
    });

    it('returns null for unrecognized price text', () => {
      const result = toScrapedDeal(
        { title: 'Mystery Item', priceText: 'Great value', promoText: '', imageUrl: '' },
        startDate, expiryDate
      );
      expect(result).toBeNull();
    });

    it('includes imageUrl when present', () => {
      const result = toScrapedDeal(
        { title: 'Apples', priceText: 'Was $4.99 Now $2.99', promoText: '', imageUrl: 'https://cdn.safeway.com/img.jpg' },
        startDate, expiryDate
      ) as { imageUrl: string };

      expect(result.imageUrl).toBe('https://cdn.safeway.com/img.jpg');
    });

    it('omits imageUrl when empty', () => {
      const result = toScrapedDeal(
        { title: 'Apples', priceText: 'Was $4.99 Now $2.99', promoText: '', imageUrl: '' },
        startDate, expiryDate
      ) as { imageUrl: undefined };

      expect(result.imageUrl).toBeUndefined();
    });

    it('truncates long titles to 200 chars', () => {
      const longTitle = 'A'.repeat(300);
      const result = toScrapedDeal(
        { title: longTitle, priceText: 'Was $4.99 Now $2.99', promoText: '', imageUrl: '' },
        startDate, expiryDate
      ) as { title: string };

      expect(result.title.length).toBe(200);
    });

    it('sets dates correctly', () => {
      const result = toScrapedDeal(
        { title: 'Item', priceText: 'Was $4.99 Now $2.99', promoText: '', imageUrl: '' },
        '2026-03-04', '2026-03-10'
      ) as { startDate: string; expiryDate: string };

      expect(result.startDate).toBe('2026-03-04');
      expect(result.expiryDate).toBe('2026-03-10');
    });

    it('returns null when sale price equals or exceeds original price', () => {
      const result = toScrapedDeal(
        { title: 'Item', priceText: 'Was $2.99 Now $2.99', promoText: '', imageUrl: '' },
        startDate, expiryDate
      );
      expect(result).toBeNull();
    });
  });
});
