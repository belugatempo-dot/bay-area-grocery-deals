import { CostcoScraper } from './scrapers/CostcoScraper.js';
import { SproutsScraper } from './scrapers/SproutsScraper.js';
import { SafewayScraper } from './scrapers/SafewayScraper.js';
import { HMartScraper } from './scrapers/HMartScraper.js';
import { mergeToDealsJson } from './utils/merge.js';
import type { BaseScraper } from './scrapers/BaseScraper.js';

const SCRAPERS: Record<string, () => BaseScraper> = {
  costco: () => new CostcoScraper(),
  sprouts: () => new SproutsScraper(),
  safeway: () => new SafewayScraper(),
  hmart: () => new HMartScraper(),
};

async function main() {
  const storeArg = process.argv.find((a) => a.startsWith('--store='));
  const storeName = storeArg?.split('=')[1]?.toLowerCase();

  if (!storeName || !SCRAPERS[storeName]) {
    console.error(`Usage: tsx scripts/scrape-single.ts --store=<name>`);
    console.error(`Available stores: ${Object.keys(SCRAPERS).join(', ')}`);
    process.exit(1);
  }

  console.log(`=== Scraping ${storeName} ===`);

  const scraper = SCRAPERS[storeName]();
  const deals = await scraper.run();

  if (deals.length > 0) {
    mergeToDealsJson(deals);
  } else {
    console.log('\nNo deals scraped. deals.json unchanged.');
  }
}

main().catch((error) => {
  console.error('Scraper failed:', error);
  process.exit(1);
});
