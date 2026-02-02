import { describe, it, expect, vi, afterEach } from 'vitest';
import { getSproutsWeekDates, SproutsScraper } from './SproutsScraper';

describe('SproutsScraper parsing', () => {
  describe('getSproutsWeekDates', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns Wednesday start when today is Wednesday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-04T12:00:00')); // Wednesday
      const { startDate, expiryDate } = getSproutsWeekDates();
      expect(startDate).toBe('2026-02-04');
      expect(expiryDate).toBe('2026-02-10'); // next Tuesday
    });

    it('returns previous Wednesday when today is Thursday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-05T12:00:00')); // Thursday
      const { startDate, expiryDate } = getSproutsWeekDates();
      expect(startDate).toBe('2026-02-04'); // previous Wednesday
      expect(expiryDate).toBe('2026-02-10');
    });

    it('returns previous Wednesday when today is Tuesday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-03T12:00:00')); // Tuesday
      const { startDate, expiryDate } = getSproutsWeekDates();
      expect(startDate).toBe('2026-01-28'); // previous Wednesday
      expect(expiryDate).toBe('2026-02-03'); // this Tuesday
    });

    it('returns previous Wednesday when today is Sunday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-01T12:00:00')); // Sunday
      const { startDate, expiryDate } = getSproutsWeekDates();
      expect(startDate).toBe('2026-01-28'); // previous Wednesday
      expect(expiryDate).toBe('2026-02-03'); // next Tuesday
    });

    it('returns previous Wednesday when today is Monday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-02T12:00:00')); // Monday
      const { startDate, expiryDate } = getSproutsWeekDates();
      expect(startDate).toBe('2026-01-28');
      expect(expiryDate).toBe('2026-02-03');
    });

    it('returns previous Wednesday when today is Friday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-06T12:00:00')); // Friday
      const { startDate, expiryDate } = getSproutsWeekDates();
      expect(startDate).toBe('2026-02-04');
      expect(expiryDate).toBe('2026-02-10');
    });

    it('returns previous Wednesday when today is Saturday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-07T12:00:00')); // Saturday
      const { startDate, expiryDate } = getSproutsWeekDates();
      expect(startDate).toBe('2026-02-04');
      expect(expiryDate).toBe('2026-02-10');
    });

    it('expiryDate is always 6 days after startDate', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-04T12:00:00'));
      const { startDate, expiryDate } = getSproutsWeekDates();
      const start = new Date(startDate);
      const end = new Date(expiryDate);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(6);
    });

    it('handles year boundary', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T12:00:00')); // Thursday
      const { startDate, expiryDate } = getSproutsWeekDates();
      expect(startDate).toBe('2025-12-31'); // previous Wednesday
      expect(expiryDate).toBe('2026-01-06');
    });
  });

  describe('toScrapedDeal', () => {
    // Access private method via prototype for testing
    const scraper = new SproutsScraper();
    const toScrapedDeal = (scraper as unknown as { toScrapedDeal: (item: { name: string; price: number; promoText: string; size: string; imageUrl: string }, startDate: string, expiryDate: string) => unknown }).toScrapedDeal.bind(scraper);

    const startDate = '2026-01-28';
    const expiryDate = '2026-02-03';

    describe('BOGO free', () => {
      it('calculates BOGO free deal (price / 2)', () => {
        const result = toScrapedDeal(
          { name: 'Organic Strawberries', price: 6.99, promoText: 'Buy 1, get 1 free', size: '1 lb container', imageUrl: '' },
          startDate, expiryDate
        ) as { salePrice: number; originalPrice: number; description: string; unit: string };

        expect(result).not.toBeNull();
        expect(result.originalPrice).toBe(6.99);
        expect(result.salePrice).toBe(3.50); // 6.99 / 2 rounded
        expect(result.description).toContain('Buy 1 get 1 free');
        expect(result.unit).toBe('/lb');
      });

      it('BOGO free with "each" fallback when no size', () => {
        const result = toScrapedDeal(
          { name: 'Product', price: 10, promoText: 'Buy 1, get 1 free', size: '', imageUrl: '' },
          startDate, expiryDate
        ) as { description: string };

        expect(result).not.toBeNull();
        expect(result.description).toContain('each');
      });
    });

    describe('BOGO percent off', () => {
      it('calculates BOGO 50% off', () => {
        const result = toScrapedDeal(
          { name: 'Yogurt', price: 4.00, promoText: 'Buy 1, get 1 50% off', size: '6 oz', imageUrl: '' },
          startDate, expiryDate
        ) as { salePrice: number; originalPrice: number };

        expect(result).not.toBeNull();
        expect(result.originalPrice).toBe(4.00);
        // salePrice = 4 * (2 - 0.5) / 2 = 4 * 1.5 / 2 = 3.00
        expect(result.salePrice).toBe(3.00);
      });

      it('calculates BOGO 25% off', () => {
        const result = toScrapedDeal(
          { name: 'Chips', price: 5.00, promoText: 'Buy 1, get 1 25% off', size: '8 oz', imageUrl: '' },
          startDate, expiryDate
        ) as { salePrice: number };

        // salePrice = 5 * (2 - 0.25) / 2 = 5 * 1.75 / 2 = 4.375
        expect(result.salePrice).toBe(4.38);
      });
    });

    describe('price drop (was price)', () => {
      it('calculates price drop deal', () => {
        const result = toScrapedDeal(
          { name: 'Coffee', price: 7.99, promoText: 'was $9.99', size: '12 oz', imageUrl: '' },
          startDate, expiryDate
        ) as { originalPrice: number; salePrice: number; unit: string };

        expect(result).not.toBeNull();
        expect(result.originalPrice).toBe(9.99);
        expect(result.salePrice).toBe(7.99);
        expect(result.unit).toBe('/oz');
      });

      it('handles was price with comma', () => {
        const result = toScrapedDeal(
          { name: 'TV', price: 899.99, promoText: 'was $1,099.99', size: '', imageUrl: '' },
          startDate, expiryDate
        ) as { originalPrice: number };

        expect(result).not.toBeNull();
        expect(result.originalPrice).toBe(1099.99);
      });
    });

    describe('save amount', () => {
      it('calculates save amount deal', () => {
        const result = toScrapedDeal(
          { name: 'Cereal', price: 3.49, promoText: 'save $1.50', size: '16 oz', imageUrl: '' },
          startDate, expiryDate
        ) as { originalPrice: number; salePrice: number };

        expect(result).not.toBeNull();
        expect(result.salePrice).toBe(3.49);
        expect(result.originalPrice).toBe(4.99);
      });
    });

    describe('percent off', () => {
      it('calculates percent off deal', () => {
        const result = toScrapedDeal(
          { name: 'Salad Mix', price: 3.99, promoText: '20% off', size: '5 oz', imageUrl: '' },
          startDate, expiryDate
        ) as { originalPrice: number; salePrice: number };

        expect(result).not.toBeNull();
        expect(result.salePrice).toBe(3.99);
        // originalPrice = 3.99 / (1 - 0.20) = 3.99 / 0.80 = 4.99
        expect(result.originalPrice).toBe(4.99);
      });

      it('calculates 50% off deal', () => {
        const result = toScrapedDeal(
          { name: 'Item', price: 5.00, promoText: '50% off', size: '', imageUrl: '' },
          startDate, expiryDate
        ) as { originalPrice: number };

        expect(result.originalPrice).toBe(10.00);
      });
    });

    describe('edge cases', () => {
      it('returns null for unrecognized promo text', () => {
        const result = toScrapedDeal(
          { name: 'Mystery Item', price: 5.99, promoText: 'Limited time only', size: '', imageUrl: '' },
          startDate, expiryDate
        );
        expect(result).toBeNull();
      });

      it('returns null when originalPrice <= salePrice after calculation', () => {
        // 0% off → originalPrice = price / (1 - 0) = price = salePrice → rejected
        const result = toScrapedDeal(
          { name: 'Item', price: 5.00, promoText: 'was $5.00', size: '', imageUrl: '' },
          startDate, expiryDate
        );
        expect(result).toBeNull();
      });

      it('includes imageUrl when provided', () => {
        const result = toScrapedDeal(
          { name: 'Berries', price: 6.99, promoText: 'Buy 1, get 1 free', size: '1 lb', imageUrl: 'https://cdn.sprouts.com/img.jpg' },
          startDate, expiryDate
        ) as { imageUrl: string };

        expect(result.imageUrl).toBe('https://cdn.sprouts.com/img.jpg');
      });

      it('omits imageUrl when empty', () => {
        const result = toScrapedDeal(
          { name: 'Berries', price: 6.99, promoText: 'Buy 1, get 1 free', size: '1 lb', imageUrl: '' },
          startDate, expiryDate
        ) as { imageUrl: undefined };

        expect(result.imageUrl).toBeUndefined();
      });

      it('extracts unit from size', () => {
        const result = toScrapedDeal(
          { name: 'Chicken', price: 4.99, promoText: 'was $6.99', size: '1 lb', imageUrl: '' },
          startDate, expiryDate
        ) as { unit: string };

        expect(result.unit).toBe('/lb');
      });

      it('extracts ct unit', () => {
        const result = toScrapedDeal(
          { name: 'Eggs', price: 3.99, promoText: 'was $5.99', size: '12 ct', imageUrl: '' },
          startDate, expiryDate
        ) as { unit: string };

        expect(result.unit).toBe('/ct');
      });

      it('truncates long names to 200 chars', () => {
        const longName = 'A'.repeat(300);
        const result = toScrapedDeal(
          { name: longName, price: 6.99, promoText: 'Buy 1, get 1 free', size: '', imageUrl: '' },
          startDate, expiryDate
        ) as { title: string };

        expect(result.title.length).toBe(200);
      });

      it('sets start and expiry dates correctly', () => {
        const result = toScrapedDeal(
          { name: 'Item', price: 6.99, promoText: 'Buy 1, get 1 free', size: '', imageUrl: '' },
          '2026-03-04', '2026-03-10'
        ) as { startDate: string; expiryDate: string };

        expect(result.startDate).toBe('2026-03-04');
        expect(result.expiryDate).toBe('2026-03-10');
      });
    });
  });
});
