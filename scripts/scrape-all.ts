import { CostcoScraper } from './scrapers/CostcoScraper.js';
import { SproutsScraper } from './scrapers/SproutsScraper.js';
import { SafewayScraper } from './scrapers/SafewayScraper.js';
import { HMartScraper } from './scrapers/HMartScraper.js';
import { Ranch99Scraper } from './scrapers/Ranch99Scraper.js';
import { mergeToDealsJson } from './utils/merge.js';
import type { Deal } from '../src/types/index.js';

const scrapers = [new CostcoScraper(), new SproutsScraper(), new SafewayScraper(), new HMartScraper(), new Ranch99Scraper()];

async function main() {
  console.log('=== Bay Area Grocery Deals Scraper ===\n');

  const allDeals: Deal[] = [];
  const results: { store: string; count: number; error?: string }[] = [];

  for (const scraper of scrapers) {
    try {
      const deals = await scraper.run();
      allDeals.push(...deals);
      results.push({ store: scraper.storeId, count: deals.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n[${scraper.storeId}] FAILED: ${message}`);
      results.push({ store: scraper.storeId, count: 0, error: message });
      // Single store failure doesn't stop others
    }
  }

  console.log('\n=== Summary ===');
  for (const r of results) {
    const status = r.error ? `FAILED (${r.error.substring(0, 60)})` : `${r.count} deals`;
    console.log(`  ${r.store}: ${status}`);
  }

  if (allDeals.length > 0) {
    mergeToDealsJson(allDeals);
  } else {
    console.log('\nNo deals scraped. deals.json unchanged.');
  }
}

main().catch((error) => {
  console.error('Scraper failed:', error);
  process.exit(1);
});
