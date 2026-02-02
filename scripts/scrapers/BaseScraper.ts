import type { Deal } from '../../src/types/index.js';
import { withRetry } from '../utils/retry.js';
import { validate } from '../utils/validate.js';
import { translateBatch, type TranslatedDeal } from '../utils/translate.js';
import { assignCategory } from '../utils/categorize.js';

export interface ScrapedDeal {
  title: string;
  description: string;
  originalPrice: number;
  salePrice: number;
  unit?: string;
  startDate: string;  // YYYY-MM-DD
  expiryDate: string;
  categoryHints?: string[];
  details?: string;
}

export interface ScraperResult {
  storeId: string;
  deals: Deal[];
  errors: string[];
}

export abstract class BaseScraper {
  abstract readonly storeId: string;
  abstract readonly locations: string[];

  /** Subclasses implement: raw scraping logic */
  abstract scrape(): Promise<ScrapedDeal[]>;

  /** Full pipeline: scrape → validate → translate → categorize → Deal[] */
  async run(): Promise<Deal[]> {
    console.log(`\n[${this.storeId}] Starting scrape...`);

    const raw = await withRetry(() => this.scrape(), { maxRetries: 2 });
    console.log(`  Scraped ${raw.length} raw deals`);

    const { valid, errors } = validate(raw);
    if (errors.length > 0) {
      console.log(`  ${errors.length} deals failed validation`);
    }

    if (valid.length === 0) {
      console.log(`  No valid deals to process`);
      return [];
    }

    const translated = await translateBatch(valid);
    const deals = translated.map((d, i) => this.toDeal(d, i));

    console.log(`  Produced ${deals.length} final deals`);
    return deals;
  }

  private toDeal(d: TranslatedDeal, index: number): Deal {
    const categoryId = assignCategory(d.title, d.categoryHints);
    const savings = d.originalPrice - d.salePrice;

    return {
      id: `${this.storeId}-${(index + 1).toString().padStart(3, '0')}`,
      storeId: this.storeId,
      categoryId,
      title: d.title,
      titleZh: d.titleZh,
      description: d.description,
      descriptionZh: d.descriptionZh,
      originalPrice: d.originalPrice,
      salePrice: d.salePrice,
      unit: d.unit,
      unitZh: d.unitZh,
      startDate: d.startDate,
      expiryDate: d.expiryDate,
      isHot: savings >= 5,
      locations: this.locations,
      details: d.details,
      detailsZh: d.detailsZh,
    };
  }
}
