import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getHMartWeekDates,
  detectContentType,
  parseHMartPrice,
  HMartScraper,
} from './HMartScraper';

describe('HMartScraper parsing', () => {
  describe('getHMartWeekDates', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns Friday start when today is Friday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-06T12:00:00')); // Friday
      const { startDate, expiryDate } = getHMartWeekDates();
      expect(startDate).toBe('2026-02-06');
      expect(expiryDate).toBe('2026-02-12'); // next Thursday
    });

    it('returns previous Friday when today is Saturday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-07T12:00:00')); // Saturday
      const { startDate, expiryDate } = getHMartWeekDates();
      expect(startDate).toBe('2026-02-06');
      expect(expiryDate).toBe('2026-02-12');
    });

    it('returns previous Friday when today is Thursday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-05T12:00:00')); // Thursday
      const { startDate, expiryDate } = getHMartWeekDates();
      expect(startDate).toBe('2026-01-30'); // previous Friday
      expect(expiryDate).toBe('2026-02-05');
    });

    it('returns previous Friday when today is Sunday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-01T12:00:00')); // Sunday
      const { startDate, expiryDate } = getHMartWeekDates();
      expect(startDate).toBe('2026-01-30');
      expect(expiryDate).toBe('2026-02-05');
    });

    it('returns previous Friday when today is Monday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-02T12:00:00')); // Monday
      const { startDate, expiryDate } = getHMartWeekDates();
      expect(startDate).toBe('2026-01-30');
      expect(expiryDate).toBe('2026-02-05');
    });

    it('returns previous Friday when today is Tuesday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-03T12:00:00')); // Tuesday
      const { startDate, expiryDate } = getHMartWeekDates();
      expect(startDate).toBe('2026-01-30');
      expect(expiryDate).toBe('2026-02-05');
    });

    it('returns previous Friday when today is Wednesday', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-04T12:00:00')); // Wednesday
      const { startDate, expiryDate } = getHMartWeekDates();
      expect(startDate).toBe('2026-01-30');
      expect(expiryDate).toBe('2026-02-05');
    });

    it('expiryDate is always 6 days after startDate', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-06T12:00:00'));
      const { startDate, expiryDate } = getHMartWeekDates();
      const start = new Date(startDate);
      const end = new Date(expiryDate);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(6);
    });

    it('handles year boundary', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T12:00:00')); // Thursday
      const { startDate, expiryDate } = getHMartWeekDates();
      expect(startDate).toBe('2025-12-26'); // previous Friday
      expect(expiryDate).toBe('2026-01-01');
    });
  });

  describe('detectContentType', () => {
    it('returns "structured" for HTML with product grid elements', () => {
      const html = `
        <div class="product-grid">
          <div class="product-item">
            <h3>Korean Pear</h3>
            <span class="price">$2.99/lb</span>
          </div>
          <div class="product-item">
            <h3>Napa Cabbage</h3>
            <span class="price">$1.49 ea</span>
          </div>
        </div>
      `;
      expect(detectContentType(html)).toBe('structured');
    });

    it('returns "structured" for HTML with vtex product elements', () => {
      const html = `
        <div class="vtex-product-summary">
          <span class="vtex-product-summary-name">Kimchi</span>
          <span class="vtex-product-price">$5.99</span>
        </div>
        <div class="vtex-product-summary">
          <span class="vtex-product-summary-name">Tofu</span>
          <span class="vtex-product-price">$1.99</span>
        </div>
      `;
      expect(detectContentType(html)).toBe('structured');
    });

    it('returns "image-based" for HTML with only flyer images', () => {
      const html = `
        <div class="flyer-container">
          <img src="https://cdn.hmart.com/weekly-ad-page1.jpg" alt="Weekly Ad Page 1" />
          <img src="https://cdn.hmart.com/weekly-ad-page2.jpg" alt="Weekly Ad Page 2" />
        </div>
      `;
      expect(detectContentType(html)).toBe('image-based');
    });

    it('returns "image-based" for empty HTML', () => {
      expect(detectContentType('')).toBe('image-based');
    });

    it('returns "image-based" for minimal HTML without products', () => {
      const html = '<html><body><h1>H Mart Weekly Ads</h1></body></html>';
      expect(detectContentType(html)).toBe('image-based');
    });

    it('returns "structured" when both product and image elements exist', () => {
      const html = `
        <div class="product-grid">
          <div class="product-item"><h3>Item</h3><span class="price">$1.99</span></div>
        </div>
        <img src="flyer.jpg" alt="ad" />
      `;
      expect(detectContentType(html)).toBe('structured');
    });
  });

  describe('parseHMartPrice', () => {
    it('parses "$X.XX / lb" format', () => {
      const result = parseHMartPrice('$2.99/lb');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(2.99);
    });

    it('parses "$X.XX / lb" with space', () => {
      const result = parseHMartPrice('$3.49 / lb');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(3.49);
    });

    it('parses "X for $Y" format', () => {
      const result = parseHMartPrice('3 for $5');
      expect(result).not.toBeNull();
      expect(result!.sale).toBeCloseTo(1.67, 2);
    });

    it('parses "$X.XX ea" format', () => {
      const result = parseHMartPrice('$1.99 ea');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(1.99);
    });

    it('parses simple "$X.XX" format', () => {
      const result = parseHMartPrice('$4.99');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(4.99);
    });

    it('parses percentage discount "XX% off"', () => {
      const result = parseHMartPrice('20% off');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(0); // marker, needs reference price
      expect(result!.original).toBe(20); // stores percentage
    });

    it('returns null for unrecognized formats', () => {
      expect(parseHMartPrice('')).toBeNull();
      expect(parseHMartPrice('No price')).toBeNull();
      expect(parseHMartPrice('Great deal')).toBeNull();
    });

    it('parses prices with comma separators', () => {
      const result = parseHMartPrice('$1,299.99');
      expect(result).not.toBeNull();
      expect(result!.sale).toBe(1299.99);
    });
  });

  describe('toScrapedDeal', () => {
    const scraper = new HMartScraper();
    const toScrapedDeal = (scraper as unknown as {
      toScrapedDeal: (item: {
        title: string;
        priceText: string;
        imageUrl: string;
      }, startDate: string, expiryDate: string) => unknown;
    }).toScrapedDeal.bind(scraper);

    const startDate = '2026-01-30';
    const expiryDate = '2026-02-05';

    it('converts price-per-pound deal', () => {
      const result = toScrapedDeal(
        { title: 'Korean Pear', priceText: '$2.99/lb', imageUrl: '' },
        startDate, expiryDate
      ) as { salePrice: number; originalPrice: number; unit: string };

      expect(result).not.toBeNull();
      expect(result.salePrice).toBe(2.99);
      expect(result.originalPrice).toBeGreaterThan(2.99);
      expect(result.unit).toBe('/lb');
    });

    it('converts "X for $Y" deal', () => {
      const result = toScrapedDeal(
        { title: 'Cup Noodles', priceText: '3 for $5', imageUrl: '' },
        startDate, expiryDate
      ) as { salePrice: number };

      expect(result).not.toBeNull();
      expect(result.salePrice).toBeCloseTo(1.67, 2);
    });

    it('converts simple dollar price deal', () => {
      const result = toScrapedDeal(
        { title: 'Kimchi', priceText: '$5.99', imageUrl: '' },
        startDate, expiryDate
      ) as { salePrice: number; originalPrice: number };

      expect(result).not.toBeNull();
      expect(result.salePrice).toBe(5.99);
      expect(result.originalPrice).toBeGreaterThan(5.99);
    });

    it('returns null for unrecognized price text', () => {
      const result = toScrapedDeal(
        { title: 'Something', priceText: 'TBD', imageUrl: '' },
        startDate, expiryDate
      );
      expect(result).toBeNull();
    });

    it('includes imageUrl when present', () => {
      const result = toScrapedDeal(
        { title: 'Tofu', priceText: '$1.99 ea', imageUrl: 'https://cdn.hmart.com/tofu.jpg' },
        startDate, expiryDate
      ) as { imageUrl: string };

      expect(result.imageUrl).toBe('https://cdn.hmart.com/tofu.jpg');
    });

    it('omits imageUrl when empty', () => {
      const result = toScrapedDeal(
        { title: 'Tofu', priceText: '$1.99 ea', imageUrl: '' },
        startDate, expiryDate
      ) as { imageUrl: undefined };

      expect(result.imageUrl).toBeUndefined();
    });

    it('truncates long titles to 200 chars', () => {
      const longTitle = 'B'.repeat(300);
      const result = toScrapedDeal(
        { title: longTitle, priceText: '$2.99/lb', imageUrl: '' },
        startDate, expiryDate
      ) as { title: string };

      expect(result.title.length).toBe(200);
    });

    it('sets dates correctly', () => {
      const result = toScrapedDeal(
        { title: 'Pear', priceText: '$2.99/lb', imageUrl: '' },
        '2026-03-06', '2026-03-12'
      ) as { startDate: string; expiryDate: string };

      expect(result.startDate).toBe('2026-03-06');
      expect(result.expiryDate).toBe('2026-03-12');
    });
  });
});
