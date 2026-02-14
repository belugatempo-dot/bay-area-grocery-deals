import { chromium, type Page } from 'playwright';
import { BaseScraper, type ScrapedDeal } from './BaseScraper.js';

const HMART_URL = 'https://www.hmart.com/weekly-ads/northern-california';

const HMART_LOCATIONS = [
  'san_jose', 'santa_clara', 'milpitas', 'fremont', 'oakland', 'san_francisco',
];

interface RawHMartItem {
  title: string;
  priceText: string;
  imageUrl: string;
}

export class HMartScraper extends BaseScraper {
  readonly storeId = 'hmart';
  readonly locations = HMART_LOCATIONS;

  async scrape(): Promise<ScrapedDeal[]> {
    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    try {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
      });

      const page = await context.newPage();

      await sleep(1000 + Math.random() * 2000);

      await page.goto(HMART_URL, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });

      // Wait for VTEX hydration or page render
      await sleep(5000 + Math.random() * 2000);

      // Scroll to trigger lazy loading
      for (let i = 0; i < 3; i++) {
        await page.evaluate((i) => window.scrollTo(0, (i + 1) * 600), i);
        await sleep(1000);
      }

      // Detect content type
      const html = await page.content();
      const contentType = detectContentType(html);
      console.log(`  Content type: ${contentType}`);

      if (contentType === 'image-based') {
        console.log('  H Mart ads appear to be image-based flyers.');
        console.log('  Extracting flyer image URLs for future OCR processing (Phase 7).');
        const imageUrls = await this.extractFlyerImages(page);
        if (imageUrls.length > 0) {
          console.log(`  Found ${imageUrls.length} flyer image(s)`);
        }
        return [];
      }

      const rawItems = await this.extractStructuredDeals(page);
      console.log(`  Extracted ${rawItems.length} structured deals`);

      const { startDate, expiryDate } = getHMartWeekDates();
      return rawItems
        .map((item) => this.toScrapedDeal(item, startDate, expiryDate))
        .filter((d): d is ScrapedDeal => d !== null);
    } finally {
      await browser.close();
    }
  }

  private async extractFlyerImages(page: Page): Promise<string[]> {
    return await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      const urls: string[] = [];
      for (const img of imgs) {
        const src = img.src || '';
        if (src && (
          /weekly|flyer|ad|circular/i.test(src) ||
          /weekly|flyer|ad|circular/i.test(img.alt || '') ||
          img.width > 400
        )) {
          urls.push(src);
        }
      }
      return urls;
    });
  }

  private async extractStructuredDeals(page: Page): Promise<RawHMartItem[]> {
    // Try multiple selectors for product elements
    const selectors = [
      '.vtex-product-summary',
      '[class*="product-summary"]',
      '[class*="productSummary"]',
      '.product-item',
      '.product-card',
      '[data-testid="product"]',
      '[class*="product"]',
      'article',
    ];

    let productSelector = '';
    for (const sel of selectors) {
      const count = await page.locator(sel).count();
      if (count > 2) {
        productSelector = sel;
        console.log(`  Using selector: ${sel} (${count} items)`);
        break;
      }
    }

    if (!productSelector) {
      console.log('  No structured product elements found');
      return this.extractViaEvaluate(page);
    }

    const items: RawHMartItem[] = [];
    const seen = new Set<string>();
    const productEls = page.locator(productSelector);
    const count = await productEls.count();

    for (let i = 0; i < count; i++) {
      try {
        const el = productEls.nth(i);
        const text = (await el.textContent()) ?? '';
        if (text.length < 5) continue;

        // Extract title from headings or name elements
        let title = '';
        for (const titleSel of ['h2', 'h3', 'h4', '[class*="name"]', '[class*="title"]']) {
          const titleEl = el.locator(titleSel).first();
          if (await titleEl.count() > 0) {
            title = ((await titleEl.textContent()) ?? '').trim();
            if (title) break;
          }
        }
        if (!title || title.length < 3 || seen.has(title)) continue;

        // Extract price text
        let priceText = '';
        for (const priceSel of ['[class*="price"]', '[class*="Price"]', 'span', '.price']) {
          const priceEl = el.locator(priceSel).first();
          if (await priceEl.count() > 0) {
            const pt = ((await priceEl.textContent()) ?? '').trim();
            if (pt && /\$|for|%/i.test(pt)) {
              priceText = pt;
              break;
            }
          }
        }
        if (!priceText) {
          // Fallback: look for price in full text
          const priceMatch = text.match(/\$[\d,.]+(?:\s*\/\s*\w+)?/);
          if (priceMatch) priceText = priceMatch[0];
        }
        if (!priceText) continue;

        // Extract image
        let imageUrl = '';
        try {
          const img = el.locator('img').first();
          if (await img.count() > 0) {
            imageUrl = (await img.getAttribute('src')) ?? '';
          }
        } catch {
          // Best-effort
        }

        seen.add(title);
        items.push({ title, priceText, imageUrl });
      } catch {
        continue;
      }
    }

    return items;
  }

  private async extractViaEvaluate(page: Page): Promise<RawHMartItem[]> {
    return await page.evaluate(() => {
      const items: { title: string; priceText: string; imageUrl: string }[] = [];
      const seen = new Set<string>();

      const elements = document.querySelectorAll('div, article, section, li');
      for (const el of elements) {
        const text = el.textContent?.trim() || '';
        if (text.length < 10 || text.length > 500) continue;
        if (!text.includes('$') && !/\d\s*for\s*\$/i.test(text)) continue;

        const heading = el.querySelector('h2, h3, h4, [class*="title"], [class*="name"]');
        const title = heading?.textContent?.trim() || '';
        if (!title || title.length < 3 || title.length > 200 || seen.has(title)) continue;

        const priceMatch = text.match(/\$[\d,.]+(?:\s*\/\s*\w+)?|\d+\s+for\s+\$[\d,.]+/i);
        if (!priceMatch) continue;

        let imageUrl = '';
        const img = el.querySelector('img');
        if (img) imageUrl = img.src || '';

        seen.add(title);
        items.push({ title, priceText: priceMatch[0], imageUrl });
      }

      return items;
    });
  }

  private toScrapedDeal(
    item: RawHMartItem,
    startDate: string,
    expiryDate: string,
  ): ScrapedDeal | null {
    const { title, priceText, imageUrl } = item;

    const parsed = parseHMartPrice(priceText);
    if (!parsed) return null;

    let originalPrice: number;
    let salePrice: number;
    let description: string;
    let unit: string | undefined;

    if (parsed.original > 0 && parsed.sale === 0) {
      // Percentage discount — need reference price, skip
      return null;
    } else if (parsed.sale > 0) {
      salePrice = parsed.sale;
      originalPrice = Math.round(salePrice * 1.3 * 100) / 100; // estimate 30% markup
      description = `H Mart weekly special: $${salePrice.toFixed(2)}`;
    } else {
      return null;
    }

    // Extract unit from price text
    const unitMatch = priceText.match(/\/\s*(lb|oz|ea|pk|ct|kg)\b/i);
    if (unitMatch) {
      unit = `/${unitMatch[1].toLowerCase()}`;
    }

    if (originalPrice <= 0 || salePrice <= 0 || originalPrice <= salePrice) return null;

    return {
      title: title.substring(0, 200),
      description,
      originalPrice,
      salePrice,
      unit,
      startDate,
      expiryDate,
      categoryHints: [],
      details: 'H Mart weekly ad special.',
      imageUrl: imageUrl || undefined,
    };
  }
}

/** H Mart weekly ad runs Friday to Thursday */
export function getHMartWeekDates(): { startDate: string; expiryDate: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri
  // Days since most recent Friday
  const diffToLastFri = (dayOfWeek + 2) % 7;
  const lastFri = new Date(now);
  lastFri.setDate(now.getDate() - diffToLastFri);

  const nextThu = new Date(lastFri);
  nextThu.setDate(lastFri.getDate() + 6);

  return {
    startDate: toISO(lastFri),
    expiryDate: toISO(nextThu),
  };
}

/**
 * Detect whether the H Mart page contains structured product data or image-based flyers.
 *
 * Looks for indicators of structured content:
 * - product grid/item/summary class names
 * - VTEX product elements
 * - Multiple price patterns with adjacent text
 */
export function detectContentType(html: string): 'structured' | 'image-based' {
  if (!html) return 'image-based';

  const structuredIndicators = [
    /class="[^"]*product[-_]?(grid|item|summary|card|list)[^"]*"/i,
    /class="[^"]*vtex[-_]?product/i,
    /class="[^"]*price[^"]*"[^>]*>\s*\$[\d,.]+/i,
    /data-testid="product/i,
  ];

  for (const pattern of structuredIndicators) {
    if (pattern.test(html)) {
      return 'structured';
    }
  }

  return 'image-based';
}

/**
 * Parse H Mart price text into sale/original values.
 *
 * Patterns:
 * - "$X.XX/lb"  → sale = X.XX (per pound)
 * - "$X.XX ea"  → sale = X.XX (each)
 * - "X for $Y"  → sale = Y/X
 * - "$X.XX"     → sale = X.XX
 * - "XX% off"   → original = XX (stores percentage), sale = 0 (marker)
 */
export function parseHMartPrice(text: string): { original: number; sale: number } | null {
  if (!text) return null;

  // X for $Y
  const xForY = text.match(/(\d+)\s+for\s+\$?([\d,.]+)/i);
  if (xForY) {
    const qty = parseInt(xForY[1]);
    const total = parseFloat(xForY[2].replace(/,/g, ''));
    if (qty > 0 && total > 0) {
      return { original: 0, sale: Math.round((total / qty) * 100) / 100 };
    }
  }

  // $X.XX / lb or $X.XX/lb
  const perUnit = text.match(/\$?([\d,.]+)\s*\/\s*(?:lb|oz|ea|pk|ct|kg)\b/i);
  if (perUnit) {
    const sale = parseFloat(perUnit[1].replace(/,/g, ''));
    if (sale > 0) return { original: 0, sale };
  }

  // $X.XX ea
  const ea = text.match(/\$?([\d,.]+)\s*ea\b/i);
  if (ea) {
    const sale = parseFloat(ea[1].replace(/,/g, ''));
    if (sale > 0) return { original: 0, sale };
  }

  // XX% off
  const pctOff = text.match(/(\d+)%\s*off/i);
  if (pctOff) {
    const pct = parseInt(pctOff[1]);
    if (pct > 0 && pct <= 100) return { original: pct, sale: 0 };
  }

  // Simple $X.XX
  const simplePrice = text.match(/\$?([\d,.]+)/);
  if (simplePrice) {
    const sale = parseFloat(simplePrice[1].replace(/,/g, ''));
    if (sale > 0) return { original: 0, sale };
  }

  return null;
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
