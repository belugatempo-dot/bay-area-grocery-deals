import { chromium, type Page } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const COSTCO_URL = 'https://www.costco.com/warehouse-savings.html';
const DEALS_PATH = resolve(import.meta.dirname, '../src/data/deals.json');

// Map Costco product keywords to our category IDs
const CATEGORY_MAP: Record<string, string[]> = {
  produce: ['fruit', 'vegetable', 'organic produce', 'berries', 'avocado', 'lettuce', 'salad'],
  meat: ['beef', 'chicken', 'pork', 'salmon', 'shrimp', 'steak', 'seafood', 'fish', 'turkey', 'lamb', 'crab'],
  dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg'],
  bakery: ['bread', 'croissant', 'muffin', 'cake', 'bagel', 'cookie', 'brownie'],
  snacks: ['chips', 'crackers', 'nuts', 'almond', 'snack', 'granola', 'popcorn', 'pretzel'],
  beverages: ['water', 'coffee', 'tea', 'juice', 'soda', 'drink', 'wine', 'beer', 'kombucha'],
  frozen: ['frozen', 'ice cream', 'pizza'],
  pantry: ['rice', 'pasta', 'sauce', 'oil', 'flour', 'sugar', 'cereal', 'soup', 'canned'],
  household: ['paper towel', 'detergent', 'trash bag', 'tissue', 'cleaning', 'battery', 'towel'],
  personal: ['shampoo', 'toothpaste', 'soap', 'lotion', 'vitamin', 'supplement', 'moisturizer'],
};

// Bay Area Costco locations
const COSTCO_LOCATIONS = [
  'san_jose', 'sunnyvale', 'mountain_view', 'redwood_city',
  'san_francisco', 'fremont', 'hayward', 'richmond',
];

interface ScrapedItem {
  title: string;
  discount: string;
  price: string;
  dates: string;
  imgUrl: string;
}

function guessCategory(title: string): string {
  const lower = title.toLowerCase();
  for (const [categoryId, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return categoryId;
    }
  }
  return 'pantry'; // default fallback
}

function parseDates(dateStr: string): { startDate: string; expiryDate: string } | null {
  // Costco format examples: "01/27/26 - 02/23/26", "Valid 1/27/26 Through 2/23/26"
  const patterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*[-–—]\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*(?:through|thru|to)\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      const [, sm, sd, sy, em, ed, ey] = match;
      const startYear = sy.length === 2 ? `20${sy}` : sy;
      const endYear = ey.length === 2 ? `20${ey}` : ey;
      return {
        startDate: `${startYear}-${sm.padStart(2, '0')}-${sd.padStart(2, '0')}`,
        expiryDate: `${endYear}-${em.padStart(2, '0')}-${ed.padStart(2, '0')}`,
      };
    }
  }
  return null;
}

function parsePrice(priceStr: string): { originalPrice: number; salePrice: number } | null {
  // Try to find dollar amounts
  const amounts = priceStr.match(/\$[\d,.]+/g);
  if (amounts && amounts.length >= 1) {
    const parsed = amounts.map((a) => parseFloat(a.replace(/[$,]/g, '')));
    if (parsed.length >= 2) {
      // Higher price is original, lower is sale
      const sorted = [...parsed].sort((a, b) => b - a);
      return { originalPrice: sorted[0], salePrice: sorted[1] };
    }
    // Single price — look for "off" amount
    const offMatch = priceStr.match(/\$?([\d,.]+)\s*off/i);
    if (offMatch) {
      const off = parseFloat(offMatch[1].replace(/,/g, ''));
      return { originalPrice: parsed[0] + off, salePrice: parsed[0] };
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeCostcoDeals(page: Page): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];

  // Wait for main content to load
  await page.waitForSelector('body', { timeout: 30000 });

  // Try multiple selectors that Costco has used historically
  const selectors = [
    '.product-tile-set .product-tile',
    '.product-list .product',
    '[data-testid="product-tile"]',
    '.warehouse-savings-item',
    '.col-xs-6.col-md-4',
    '.product-img-holder',
    'div[class*="product"]',
  ];

  let productSelector = '';
  for (const sel of selectors) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      productSelector = sel;
      console.log(`Found ${count} items with selector: ${sel}`);
      break;
    }
  }

  if (!productSelector) {
    // Fallback: try to extract from page text content
    console.log('No product tiles found with known selectors. Attempting text extraction...');

    const pageText = await page.textContent('body');
    if (pageText) {
      console.log(`Page text length: ${pageText.length} characters`);
      console.log('First 500 chars:', pageText.substring(0, 500));
    }
    return items;
  }

  const productEls = page.locator(productSelector);
  const count = await productEls.count();
  console.log(`Processing ${count} product elements...`);

  for (let i = 0; i < count; i++) {
    try {
      const el = productEls.nth(i);
      const text = (await el.textContent()) ?? '';
      const imgEl = el.locator('img').first();
      const imgUrl = (await imgEl.getAttribute('src').catch(() => null)) ?? '';

      // Extract structured data if available
      const title = text.split('\n').filter((s) => s.trim()).slice(0, 2).join(' ').trim();
      if (!title || title.length < 5) continue;

      items.push({
        title: title.substring(0, 200),
        discount: text,
        price: text,
        dates: text,
        imgUrl,
      });
    } catch {
      continue;
    }
  }

  return items;
}

async function main() {
  console.log('Starting Costco deal scraper...');
  console.log(`Target URL: ${COSTCO_URL}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
  });

  const page = await context.newPage();

  let scrapedItems: ScrapedItem[] = [];
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\nAttempt ${attempt}/${maxRetries}...`);

      // Random delay to appear more human
      await sleep(1000 + Math.random() * 2000);

      await page.goto(COSTCO_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Wait a bit for JS rendering
      await sleep(3000 + Math.random() * 2000);

      // Scroll down to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await sleep(2000);
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await sleep(2000);

      scrapedItems = await scrapeCostcoDeals(page);

      if (scrapedItems.length > 0) {
        console.log(`Successfully scraped ${scrapedItems.length} items`);
        break;
      }

      console.log('No items found, retrying...');
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error instanceof Error ? error.message : error);
      if (attempt < maxRetries) {
        const delay = 5000 * attempt;
        console.log(`Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }

  await browser.close();

  if (scrapedItems.length === 0) {
    console.log('\nNo deals scraped. Keeping existing deals.json unchanged.');
    console.log('This may be due to Costco bot protection. Try running with headed mode for debugging.');
    return;
  }

  // Convert scraped items to our Deal format
  let nextId = 100;
  const existingDeals = JSON.parse(readFileSync(DEALS_PATH, 'utf-8'));
  // Keep non-Costco deals from existing data
  const nonCostcoDeals = existingDeals.filter((d: { storeId: string }) => d.storeId !== 'costco');

  const costcoDeals = scrapedItems
    .map((item) => {
      const prices = parsePrice(item.price);
      const dates = parseDates(item.dates);

      if (!prices || !dates) return null;

      const id = `costco-${nextId++}`;
      const categoryId = guessCategory(item.title);

      return {
        id,
        storeId: 'costco',
        categoryId,
        title: item.title,
        titleZh: item.title, // Would need translation API for proper Chinese
        description: 'Costco warehouse savings',
        descriptionZh: 'Costco 仓储优惠',
        originalPrice: prices.originalPrice,
        salePrice: prices.salePrice,
        unit: '',
        unitZh: '',
        startDate: dates.startDate,
        expiryDate: dates.expiryDate,
        isHot: prices.originalPrice - prices.salePrice >= 5,
        locations: COSTCO_LOCATIONS,
        details: 'Costco warehouse savings. Member only.',
        detailsZh: 'Costco 仓储优惠。仅限会员。',
      };
    })
    .filter(Boolean);

  console.log(`\nConverted ${costcoDeals.length} deals to app format`);

  const mergedDeals = [...nonCostcoDeals, ...costcoDeals];
  writeFileSync(DEALS_PATH, JSON.stringify(mergedDeals, null, 2) + '\n');
  console.log(`Wrote ${mergedDeals.length} total deals to ${DEALS_PATH}`);
}

main().catch((error) => {
  console.error('Scraper failed:', error);
  process.exit(1);
});
