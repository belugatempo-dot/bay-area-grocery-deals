import { chromium, type Page } from 'rebrowser-pw';
import { BaseScraper, type ScrapedDeal } from './BaseScraper.js';

const COSTCO_URL = 'https://www.costco.com/warehouse-savings.html';

const COSTCO_LOCATIONS = [
  'san_jose', 'sunnyvale', 'mountain_view', 'redwood_city',
  'san_francisco', 'daly_city', 'south_sf', 'fremont',
  'hayward', 'richmond', 'danville', 'livermore', 'gilroy', 'foster_city',
];

interface RawItem {
  title: string;
  text: string;
}

/** Error patterns that indicate bot detection or network issues — not worth retrying. */
const KNOWN_BLOCK_PATTERNS = [
  'ERR_HTTP2_PROTOCOL_ERROR',
  'net::ERR_',
  'Timeout',
  'Navigation failed',
];

function isKnownBlockError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return KNOWN_BLOCK_PATTERNS.some((p) => msg.includes(p));
}

export class CostcoScraper extends BaseScraper {
  readonly storeId = 'costco';
  readonly locations = COSTCO_LOCATIONS;

  async scrape(): Promise<ScrapedDeal[]> {
    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-infobars',
          '--window-size=1920,1080',
        ],
      });
    } catch (err) {
      console.log(`  [costco] Browser launch failed: ${err instanceof Error ? err.message : err}`);
      return [];
    }

    try {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/Los_Angeles',
        extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
      });

      const page = await context.newPage();

      // Random delay to appear more human
      await sleep(1000 + Math.random() * 2000);

      await page.goto(COSTCO_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Human-like mouse movement
      await page.mouse.move(300 + Math.random() * 600, 200 + Math.random() * 400);

      // Wait for JS rendering
      await sleep(3000 + Math.random() * 2000);

      // Scroll to trigger lazy loading
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await sleep(2000);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(2000);

      const rawItems = await this.extractItems(page);
      console.log(`  Found ${rawItems.length} raw items on page`);

      return rawItems
        .map((item) => this.parseItem(item))
        .filter((d): d is ScrapedDeal => d !== null);
    } catch (err) {
      if (isKnownBlockError(err)) {
        console.log(`  [costco] Blocked or connection error: ${err instanceof Error ? err.message : err}`);
        return [];
      }
      throw err;
    } finally {
      await browser.close();
    }
  }

  private async extractItems(page: Page): Promise<RawItem[]> {
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
        console.log(`  Using selector: ${sel} (${count} items)`);
        break;
      }
    }

    if (!productSelector) {
      console.log('  No product tiles found with known selectors');
      return [];
    }

    const items: RawItem[] = [];
    const productEls = page.locator(productSelector);
    const count = await productEls.count();

    for (let i = 0; i < count; i++) {
      try {
        const el = productEls.nth(i);
        const text = (await el.textContent()) ?? '';
        const title = text
          .split('\n')
          .filter((s) => s.trim())
          .slice(0, 2)
          .join(' ')
          .trim();

        if (!title || title.length < 5) continue;

        items.push({ title: title.substring(0, 200), text });
      } catch {
        continue;
      }
    }

    return items;
  }

  private parseItem(item: RawItem): ScrapedDeal | null {
    const prices = parsePrice(item.text);
    const dates = parseDates(item.text);

    if (!prices || !dates) return null;

    return {
      title: item.title,
      description: 'Costco warehouse savings',
      originalPrice: prices.originalPrice,
      salePrice: prices.salePrice,
      unit: '',
      startDate: dates.startDate,
      expiryDate: dates.expiryDate,
      categoryHints: [],
      details: 'Costco warehouse savings. Member only.',
    };
  }
}

// --- Price/date parsing (migrated from scrape-costco.ts) ---

export function parseDates(dateStr: string): { startDate: string; expiryDate: string } | null {
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

export function parsePrice(priceStr: string): { originalPrice: number; salePrice: number } | null {
  const amounts = priceStr.match(/\$[\d,.]+/g);
  if (amounts && amounts.length >= 1) {
    const parsed = amounts.map((a) => parseFloat(a.replace(/[$,]/g, '')));
    if (parsed.length >= 2) {
      const sorted = [...parsed].sort((a, b) => b - a);
      return { originalPrice: sorted[0], salePrice: sorted[1] };
    }
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
