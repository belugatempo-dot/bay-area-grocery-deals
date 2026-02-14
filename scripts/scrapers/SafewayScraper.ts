import { chromium, type Page } from 'playwright';
import { BaseScraper, type ScrapedDeal } from './BaseScraper.js';

const SAFEWAY_URL = 'https://www.safeway.com/weeklyad/';

const SAFEWAY_LOCATIONS = [
  'san_jose', 'sunnyvale', 'santa_clara', 'cupertino', 'milpitas', 'mountain_view',
  'los_altos', 'campbell', 'saratoga', 'los_gatos', 'palo_alto', 'menlo_park',
  'redwood_city', 'san_mateo', 'foster_city', 'burlingame', 'san_bruno', 'south_sf',
  'daly_city', 'san_carlos', 'belmont', 'san_francisco', 'fremont', 'newark',
  'union_city', 'hayward', 'san_leandro', 'alameda', 'oakland', 'berkeley',
  'richmond', 'walnut_creek', 'concord', 'pleasanton', 'dublin', 'livermore',
  'san_ramon', 'danville',
];

interface RawSafewayItem {
  title: string;
  priceText: string;
  promoText: string;
  imageUrl: string;
}

export class SafewayScraper extends BaseScraper {
  readonly storeId = 'safeway';
  readonly locations = SAFEWAY_LOCATIONS;

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

      await page.goto(SAFEWAY_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Wait for SPA to render
      await sleep(5000 + Math.random() * 2000);

      // Scroll to load lazy content
      for (let i = 0; i < 5; i++) {
        await page.evaluate((i) => window.scrollTo(0, (i + 1) * 800), i);
        await sleep(1000);
      }

      // Try to extract date info from page header
      const dateText = await this.extractDateHeader(page);
      const parsedDates = dateText ? parseSafewayDates(dateText) : null;
      const { startDate, expiryDate } = parsedDates ?? getSafewayWeekDates();

      const rawItems = await this.extractFromPage(page);
      console.log(`  Extracted ${rawItems.length} items from page`);

      return rawItems
        .map((item) => this.toScrapedDeal(item, startDate, expiryDate))
        .filter((d): d is ScrapedDeal => d !== null);
    } finally {
      await browser.close();
    }
  }

  private async extractDateHeader(page: Page): Promise<string | null> {
    try {
      // Safeway page may show "Valid MM/DD - MM/DD" in the header area
      const dateSelectors = [
        '[class*="date"]',
        '[class*="valid"]',
        '.weekly-ad-header',
        '.ad-dates',
        'h1', 'h2', 'h3',
      ];

      for (const sel of dateSelectors) {
        const elements = page.locator(sel);
        const count = await elements.count();
        for (let i = 0; i < Math.min(count, 5); i++) {
          const text = await elements.nth(i).textContent();
          if (text && /\d{1,2}\/\d{1,2}/.test(text)) {
            return text;
          }
        }
      }
    } catch {
      // Date extraction is best-effort
    }
    return null;
  }

  private async extractFromPage(page: Page): Promise<RawSafewayItem[]> {
    // Try multiple selector strategies for deal tiles
    const selectors = [
      '.weekly-ad-item',
      '[data-testid="product-card"]',
      '.grid-item-container',
      '.product-card',
      '[class*="deal"]',
      '[class*="offer"]',
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
      console.log('  No deal tiles found with known selectors, trying page.evaluate fallback');
      return this.extractViaEvaluate(page);
    }

    const items: RawSafewayItem[] = [];
    const seen = new Set<string>();
    const productEls = page.locator(productSelector);
    const count = await productEls.count();

    for (let i = 0; i < count; i++) {
      try {
        const el = productEls.nth(i);
        const text = (await el.textContent()) ?? '';
        if (text.length < 5 || !text.includes('$') && !/\d\s*for\s*\$/i.test(text) && !/save|free|off/i.test(text)) continue;

        const title = this.extractTitle(text);
        if (!title || title.length < 3 || seen.has(title)) continue;

        const priceText = this.extractPriceText(text);
        if (!priceText) continue;

        let imageUrl = '';
        try {
          const img = el.locator('img').first();
          if (await img.count() > 0) {
            imageUrl = (await img.getAttribute('src')) ?? '';
          }
        } catch {
          // Image extraction is best-effort
        }

        seen.add(title);
        items.push({ title, priceText, promoText: '', imageUrl });
      } catch {
        continue;
      }
    }

    return items;
  }

  private async extractViaEvaluate(page: Page): Promise<RawSafewayItem[]> {
    return await page.evaluate(() => {
      const items: { title: string; priceText: string; promoText: string; imageUrl: string }[] = [];
      const seen = new Set<string>();

      // Look for any elements containing price patterns
      const allElements = document.querySelectorAll('div, article, section, li');
      for (const el of allElements) {
        const text = el.textContent?.trim() || '';
        if (text.length < 10 || text.length > 500) continue;
        if (!text.includes('$') && !/\d\s*for\s*\$/i.test(text) && !/save|free/i.test(text)) continue;

        // Try to find a heading-like element for the title
        const heading = el.querySelector('h2, h3, h4, [class*="title"], [class*="name"]');
        const title = heading?.textContent?.trim() || '';
        if (!title || title.length < 3 || title.length > 200 || seen.has(title)) continue;

        // Find image
        let imageUrl = '';
        const img = el.querySelector('img');
        if (img) {
          imageUrl = img.src || '';
        }

        seen.add(title);
        items.push({ title, priceText: text, promoText: '', imageUrl });
      }

      return items;
    });
  }

  private extractTitle(text: string): string {
    // Take the first line or first sentence as title
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    // Find the first line that looks like a product name (not a price)
    for (const line of lines) {
      if (line.length >= 3 && line.length <= 200 && !/^\$/.test(line) && !/^\d+\s*for\s*\$/i.test(line) &&
          !/^save/i.test(line) && !/^club/i.test(line) && !/^buy/i.test(line) && !/^was/i.test(line)) {
        return line;
      }
    }
    return lines[0]?.substring(0, 200) ?? '';
  }

  private extractPriceText(text: string): string {
    // Look for price patterns in the full text blob
    const patterns = [
      /was\s+\$[\d,.]+\s*now\s+\$[\d,.]+/i,
      /\d+\s+for\s+\$[\d,.]+/i,
      /club\s+price\s+\$[\d,.]+/i,
      /\$[\d,.]+\s*ea\b/i,
      /save\s+\$[\d,.]+/i,
      /buy\s+\d+\s+get\s+\d+\s+free/i,
      /\$[\d,.]+/i,
    ];

    for (const p of patterns) {
      const match = text.match(p);
      if (match) return match[0];
    }
    return '';
  }

  private toScrapedDeal(
    item: RawSafewayItem,
    startDate: string,
    expiryDate: string,
  ): ScrapedDeal | null {
    const { title, priceText, promoText, imageUrl } = item;

    const parsed = parseSafewayPrice(priceText);
    if (!parsed) return null;

    let originalPrice: number;
    let salePrice: number;
    let description: string;

    if (parsed.original > 0 && parsed.sale > 0) {
      // Was/Now format — both prices known
      originalPrice = parsed.original;
      salePrice = parsed.sale;
      description = `Was $${originalPrice.toFixed(2)}, now $${salePrice.toFixed(2)}`;
    } else if (parsed.sale === 0 && /buy\s+\d+\s+get\s+\d+\s+free/i.test(priceText)) {
      // BOGO — need a reference price from promoText or elsewhere
      const refPriceMatch = promoText.match(/\$?([\d,.]+)/);
      if (!refPriceMatch) return null;
      const refPrice = parseFloat(refPriceMatch[1].replace(/,/g, ''));
      if (!refPrice || refPrice <= 0) return null;

      const buyMatch = priceText.match(/buy\s+(\d+)\s+get\s+(\d+)\s+free/i);
      const buyQty = buyMatch ? parseInt(buyMatch[1]) : 1;
      const freeQty = buyMatch ? parseInt(buyMatch[2]) : 1;
      originalPrice = refPrice;
      salePrice = Math.round((refPrice * buyQty / (buyQty + freeQty)) * 100) / 100;
      description = `Buy ${buyQty} get ${freeQty} free`;
    } else if (parsed.sale > 0 && parsed.original === 0) {
      // Club price / ea / X for $Y / Save $X — only sale price known
      // Estimate original as sale + 30% markup (conservative)
      if (/save\s+\$/i.test(priceText)) {
        // Save $X format — parsed.sale is the savings amount
        const savingsAmount = parsed.sale;
        salePrice = Math.round((savingsAmount * 2) * 100) / 100; // estimate sale price as 2x savings
        originalPrice = salePrice + savingsAmount;
        description = `Save $${savingsAmount.toFixed(2)}`;
      } else {
        salePrice = parsed.sale;
        originalPrice = Math.round(salePrice * 1.3 * 100) / 100;
        description = `Club price $${salePrice.toFixed(2)}`;
      }
    } else {
      return null;
    }

    if (originalPrice <= 0 || salePrice <= 0 || originalPrice <= salePrice) return null;

    return {
      title: title.substring(0, 200),
      description,
      originalPrice,
      salePrice,
      startDate,
      expiryDate,
      categoryHints: [],
      details: `Safeway weekly ad special.`,
      imageUrl: imageUrl || undefined,
    };
  }
}

/** Safeway weekly ad runs Wednesday to Tuesday (same as Sprouts) */
export function getSafewayWeekDates(): { startDate: string; expiryDate: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 3=Wed
  const diffToLastWed = (dayOfWeek + 4) % 7;
  const lastWed = new Date(now);
  lastWed.setDate(now.getDate() - diffToLastWed);

  const nextTue = new Date(lastWed);
  nextTue.setDate(lastWed.getDate() + 6);

  return {
    startDate: toISO(lastWed),
    expiryDate: toISO(nextTue),
  };
}

/**
 * Parse Safeway-specific price text into original/sale prices.
 *
 * Patterns:
 * - "2 for $5"           → sale = 5/2 = 2.50 per unit
 * - "$3.99 ea"           → sale = 3.99
 * - "CLUB PRICE $4.49"   → sale = 4.49
 * - "Save $2.00"         → sale = 2.00 (savings amount)
 * - "Was $5.99 Now $3.99" → original = 5.99, sale = 3.99
 * - "Buy N Get M Free"   → sale = 0 (marker, needs price context)
 */
export function parseSafewayPrice(text: string): { original: number; sale: number } | null {
  if (!text) return null;

  // Was/Now pattern
  const wasNow = text.match(/was\s+\$?([\d,.]+)\s*now\s+\$?([\d,.]+)/i);
  if (wasNow) {
    const original = parseFloat(wasNow[1].replace(/,/g, ''));
    const sale = parseFloat(wasNow[2].replace(/,/g, ''));
    if (original > 0 && sale > 0) return { original, sale };
  }

  // X for $Y pattern
  const xForY = text.match(/(\d+)\s+for\s+\$?([\d,.]+)/i);
  if (xForY) {
    const qty = parseInt(xForY[1]);
    const total = parseFloat(xForY[2].replace(/,/g, ''));
    if (qty > 0 && total > 0) {
      return { original: 0, sale: Math.round((total / qty) * 100) / 100 };
    }
  }

  // CLUB PRICE $X.XX
  const clubPrice = text.match(/club\s+price\s+\$?([\d,.]+)/i);
  if (clubPrice) {
    const sale = parseFloat(clubPrice[1].replace(/,/g, ''));
    if (sale > 0) return { original: 0, sale };
  }

  // $X.XX ea (with optional "with card")
  const eaPrice = text.match(/\$?([\d,.]+)\s*ea\b/i);
  if (eaPrice) {
    const sale = parseFloat(eaPrice[1].replace(/,/g, ''));
    if (sale > 0) return { original: 0, sale };
  }

  // Save $X.XX (optionally "on N")
  const save = text.match(/save\s+\$?([\d,.]+)/i);
  if (save) {
    const amount = parseFloat(save[1].replace(/,/g, ''));
    if (amount > 0) return { original: 0, sale: amount };
  }

  // Buy N Get M Free
  const bogo = text.match(/buy\s+\d+\s+get\s+\d+\s+free/i);
  if (bogo) {
    return { original: 0, sale: 0 };
  }

  return null;
}

/**
 * Parse dates from Safeway ad text.
 *
 * Patterns:
 * - "Valid MM/DD - MM/DD"         → infer year from current date
 * - "MM/DD/YY - MM/DD/YY"        → 2-digit year
 * - "MM/DD/YYYY - MM/DD/YYYY"    → 4-digit year
 */
export function parseSafewayDates(text: string): { startDate: string; expiryDate: string } | null {
  if (!text) return null;

  // Full dates with year: MM/DD/YY(YY) - MM/DD/YY(YY)
  const withYear = text.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*[-–—]\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/
  );
  if (withYear) {
    const [, sm, sd, sy, em, ed, ey] = withYear;
    const startYear = sy.length === 2 ? `20${sy}` : sy;
    const endYear = ey.length === 2 ? `20${ey}` : ey;
    return {
      startDate: `${startYear}-${sm.padStart(2, '0')}-${sd.padStart(2, '0')}`,
      expiryDate: `${endYear}-${em.padStart(2, '0')}-${ed.padStart(2, '0')}`,
    };
  }

  // Short dates without year: MM/DD - MM/DD
  const noYear = text.match(
    /(\d{1,2})\/(\d{1,2})\s*[-–—]\s*(\d{1,2})\/(\d{1,2})/
  );
  if (noYear) {
    const [, sm, sd, em, ed] = noYear;
    const now = new Date();
    const year = now.getFullYear();

    const startMonth = parseInt(sm);
    const endMonth = parseInt(em);

    // If start month is December and end month is January, start is previous year
    const startYear = startMonth > endMonth ? year - 1 : year;
    const endYear = year;

    return {
      startDate: `${startYear}-${sm.padStart(2, '0')}-${sd.padStart(2, '0')}`,
      expiryDate: `${endYear}-${em.padStart(2, '0')}-${ed.padStart(2, '0')}`,
    };
  }

  return null;
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
