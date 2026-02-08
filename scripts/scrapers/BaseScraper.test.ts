import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseScraper, type ScrapedDeal } from './BaseScraper';
import type { TranslatedDeal } from '../utils/translate';

// Mock dependencies
vi.mock('../utils/translate.js', () => ({
  translateBatch: vi.fn((deals: ScrapedDeal[]) =>
    Promise.resolve(
      deals.map((d) => ({
        ...d,
        titleZh: d.title + '_zh',
        descriptionZh: d.description + '_zh',
        unitZh: d.unit,
        detailsZh: d.details,
      }))
    )
  ),
}));

vi.mock('../utils/retry.js', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

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

class TestScraper extends BaseScraper {
  readonly storeId = 'test-store';
  readonly locations = ['san_jose', 'sunnyvale'];
  private deals: ScrapedDeal[] = [];

  setDeals(deals: ScrapedDeal[]) {
    this.deals = deals;
  }

  async scrape(): Promise<ScrapedDeal[]> {
    return this.deals;
  }

  // Expose protected toDeal for direct testing
  public testToDeal(d: TranslatedDeal, index: number) {
    return this.toDeal(d, index);
  }
}

describe('BaseScraper', () => {
  let scraper: TestScraper;

  beforeEach(() => {
    scraper = new TestScraper();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('toDeal', () => {
    it('generates correct ID format', () => {
      const translated: TranslatedDeal = {
        ...makeDeal(),
        titleZh: '草莓',
        descriptionZh: '新鲜',
      };
      const deal = scraper.testToDeal(translated, 0);
      expect(deal.id).toBe('test-store-001');
    });

    it('pads ID to 3 digits', () => {
      const translated: TranslatedDeal = {
        ...makeDeal(),
        titleZh: '草莓',
        descriptionZh: '新鲜',
      };
      const deal = scraper.testToDeal(translated, 99);
      expect(deal.id).toBe('test-store-100');
    });

    it('assigns category from title', () => {
      const translated: TranslatedDeal = {
        ...makeDeal({ title: 'Fresh Salmon Fillet' }),
        titleZh: '三文鱼',
        descriptionZh: '新鲜',
      };
      const deal = scraper.testToDeal(translated, 0);
      expect(deal.categoryId).toBe('meat');
    });

    it('marks deal as hot when savings >= $5', () => {
      const translated: TranslatedDeal = {
        ...makeDeal({ originalPrice: 10.99, salePrice: 5.99 }),
        titleZh: '草莓',
        descriptionZh: '新鲜',
      };
      const deal = scraper.testToDeal(translated, 0);
      expect(deal.isHot).toBe(true);
    });

    it('marks deal as not hot when savings < $5', () => {
      const translated: TranslatedDeal = {
        ...makeDeal({ originalPrice: 5.99, salePrice: 3.99 }),
        titleZh: '草莓',
        descriptionZh: '新鲜',
      };
      const deal = scraper.testToDeal(translated, 0);
      expect(deal.isHot).toBe(false);
    });

    it('passes through all fields correctly', () => {
      const translated: TranslatedDeal = {
        ...makeDeal({ unit: '/lb', details: 'Members only', imageUrl: 'http://img.png' }),
        titleZh: '草莓',
        descriptionZh: '新鲜',
        unitZh: '/磅',
        detailsZh: '仅限会员',
      };
      const deal = scraper.testToDeal(translated, 0);
      expect(deal.storeId).toBe('test-store');
      expect(deal.locations).toEqual(['san_jose', 'sunnyvale']);
      expect(deal.unit).toBe('/lb');
      expect(deal.unitZh).toBe('/磅');
      expect(deal.details).toBe('Members only');
      expect(deal.detailsZh).toBe('仅限会员');
      expect(deal.imageUrl).toBe('http://img.png');
    });
  });

  describe('run', () => {
    it('runs full pipeline and returns deals', async () => {
      scraper.setDeals([makeDeal()]);
      const deals = await scraper.run();

      expect(deals).toHaveLength(1);
      expect(deals[0].id).toBe('test-store-001');
      expect(deals[0].titleZh).toBe('Organic Strawberries_zh');
    });

    it('filters invalid deals via validation', async () => {
      scraper.setDeals([
        makeDeal(),
        makeDeal({ title: 'AB', originalPrice: -1 }), // invalid: short title + negative price
      ]);
      const deals = await scraper.run();

      // Only the valid deal should make it through
      expect(deals).toHaveLength(1);
      expect(deals[0].title).toBe('Organic Strawberries');
    });

    it('returns empty array when no valid deals', async () => {
      scraper.setDeals([
        makeDeal({ title: '' }), // invalid
      ]);
      const deals = await scraper.run();
      expect(deals).toEqual([]);
    });

    it('returns empty array when scrape returns nothing', async () => {
      scraper.setDeals([]);
      const deals = await scraper.run();
      expect(deals).toEqual([]);
    });

    it('handles translation errors gracefully', async () => {
      const { translateBatch } = await import('../utils/translate.js');
      vi.mocked(translateBatch).mockRejectedValueOnce(new Error('Translation failed'));

      scraper.setDeals([makeDeal()]);
      await expect(scraper.run()).rejects.toThrow('Translation failed');
    });

    it('processes multiple deals correctly', async () => {
      scraper.setDeals([
        makeDeal({ title: 'Deal A' }),
        makeDeal({ title: 'Deal B' }),
        makeDeal({ title: 'Deal C' }),
      ]);
      const deals = await scraper.run();

      expect(deals).toHaveLength(3);
      expect(deals[0].id).toBe('test-store-001');
      expect(deals[1].id).toBe('test-store-002');
      expect(deals[2].id).toBe('test-store-003');
    });

    it('uses withRetry for scraping', async () => {
      const { withRetry } = await import('../utils/retry.js');
      scraper.setDeals([makeDeal()]);
      await scraper.run();
      expect(withRetry).toHaveBeenCalled();
    });
  });
});
