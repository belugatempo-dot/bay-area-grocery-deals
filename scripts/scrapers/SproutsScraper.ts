import { chromium, type Page } from 'playwright';
import { BaseScraper, type ScrapedDeal } from './BaseScraper.js';

const SPROUTS_URL = 'https://www.sprouts.com/weekly-ad/';

const SPROUTS_LOCATIONS = [
  'san_jose', 'sunnyvale', 'santa_clara', 'mountain_view', 'san_mateo', 'fremont',
];

interface RawSproutsItem {
  name: string;
  price: number;
  promoText: string;
  size: string;
}

export class SproutsScraper extends BaseScraper {
  readonly storeId = 'sprouts';
  readonly locations = SPROUTS_LOCATIONS;

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
      await page.goto(SPROUTS_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Wait for page to fully render (it's a SPA)
      await sleep(5000 + Math.random() * 2000);

      // Scroll to load more items
      for (let i = 0; i < 5; i++) {
        await page.evaluate((i) => window.scrollTo(0, (i + 1) * 800), i);
        await sleep(1000);
      }

      const rawItems = await this.extractFromPage(page);
      console.log(`  Extracted ${rawItems.length} items from page`);

      const { startDate, expiryDate } = getSproutsWeekDates();
      return rawItems
        .map((item) => this.toScrapedDeal(item, startDate, expiryDate))
        .filter((d): d is ScrapedDeal => d !== null);
    } finally {
      await browser.close();
    }
  }

  private async extractFromPage(page: Page): Promise<RawSproutsItem[]> {
    // Sprouts uses hashed CSS classes (e.g. e-1rr4qq7) that change on rebuilds.
    // The h3 elements each contain one deal's full text blob, like:
    //   "OrganicCurrent price: $6.99$699Buy 1, get 1 50% offOrganic Strawberries★★★★★(502)1 lb container"
    // We parse each h3's textContent to extract: product name, price, promo, and size.
    return await page.evaluate(() => {
      const items: { name: string; price: number; promoText: string; size: string }[] = [];
      const seen = new Set<string>();

      const headings = document.querySelectorAll('h3');
      for (const h3 of headings) {
        const blob = h3.textContent?.trim() || '';
        if (blob.length < 10 || !blob.includes('$')) continue;

        // Extract product name — appears after promo text, before the star ratings
        // Pattern: "Buy 1, get 1 free<NAME>★" or "Original Price: ...<NAME>★"
        let name = '';

        // Try BOGO pattern: text between promo and star rating
        const bogoNameMatch = blob.match(/(?:Buy \d+, get \d+ (?:free|\d+% off))([A-Z][^★]+?)(?:★|$)/);
        if (bogoNameMatch) {
          name = bogoNameMatch[1].trim();
        }

        // Try "Original Price" pattern (price-drop deals)
        if (!name) {
          const origPriceMatch = blob.match(/Original Price:[^$]*\$[\d,.]+(?:\s*\/\s*\w+)?(.+?)(?:★|$)/);
          if (origPriceMatch) {
            name = origPriceMatch[1].trim();
          }
        }

        // Fallback: try to find a capitalized product name after dollar amounts
        if (!name) {
          const fallbackMatch = blob.match(/\$\d[\d,.]*([A-Z][A-Za-z' &\-]+(?:\s+[A-Z][A-Za-z' &\-]+)*)/);
          if (fallbackMatch) {
            name = fallbackMatch[1].trim();
          }
        }

        if (!name || name.length < 3 || seen.has(name)) continue;

        // Extract current/sale price
        const currentPriceMatch = blob.match(/Current price:\s*\$?([\d,.]+)/i);
        if (!currentPriceMatch) continue;
        const price = parseFloat(currentPriceMatch[1].replace(/,/g, ''));
        if (!price || price <= 0) continue;

        // Extract promo text
        let promoText = '';
        const bogoFreeMatch = blob.match(/buy\s+\d+[,.]?\s*get\s+\d+\s+free/i);
        const bogoPercentMatch = blob.match(/buy\s+\d+[,.]?\s*get\s+\d+\s+(\d+)%\s*off/i);
        const origPriceValMatch = blob.match(/Original Price:[^$]*\$([\d,.]+)/i);

        if (bogoFreeMatch) promoText = bogoFreeMatch[0];
        else if (bogoPercentMatch) promoText = bogoPercentMatch[0];
        else if (origPriceValMatch) promoText = `was $${origPriceValMatch[1]}`;

        if (!promoText) continue;

        // Extract size/unit
        const sizeMatch = blob.match(/(\d+(?:\.\d+)?)\s*(oz|lb|ct|fl oz|gal|qt|pt|pk|count|each|container)\b/i);
        const size = sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2]}` : '';

        // Clean up name: remove leading price artifacts like "$7.49" or "per pound$14.99"
        name = name.replace(/^(?:per\s+\w+)?\$[\d,.]+/i, '').trim();
        if (!name || name.length < 3) continue;

        seen.add(name);
        items.push({ name, price, promoText, size });
      }

      return items;
    });
  }

  private toScrapedDeal(item: RawSproutsItem, startDate: string, expiryDate: string): ScrapedDeal | null {
    const { name, price, promoText, size } = item;

    let originalPrice: number;
    let salePrice: number;
    let description: string;

    const bogoFree = /buy\s+\d+[,.]?\s*get\s+\d+\s+free/i.test(promoText);
    const bogoPercent = promoText.match(/buy\s+\d+[,.]?\s*get\s+\d+\s+(\d+)%\s*off/i);
    const wasPrice = promoText.match(/was\s+\$?([\d,.]+)/i);
    const saveAmount = promoText.match(/save\s+\$?([\d,.]+)/i);
    const percentOff = promoText.match(/(\d+)%\s*off/i);

    if (bogoFree) {
      // BOGO free: effective price per unit = price / 2
      originalPrice = price;
      salePrice = Math.round(price / 2 * 100) / 100;
      description = `Buy 1 get 1 free (${size || 'each'})`;
    } else if (bogoPercent) {
      // BOGO X% off: effective price per unit = price * (1 + (1 - X/100)) / 2
      const pct = parseInt(bogoPercent[1]);
      originalPrice = price;
      salePrice = Math.round(price * (2 - pct / 100) / 2 * 100) / 100;
      description = `Buy 1 get 1 ${pct}% off (${size || 'each'})`;
    } else if (wasPrice) {
      // Price-drop deal: "was $X.XX", current price is the sale price
      originalPrice = parseFloat(wasPrice[1].replace(/,/g, ''));
      salePrice = price;
      description = `Was $${originalPrice.toFixed(2)}, now $${salePrice.toFixed(2)} (${size || 'each'})`;
    } else if (saveAmount) {
      const savings = parseFloat(saveAmount[1].replace(/,/g, ''));
      salePrice = price;
      originalPrice = price + savings;
      description = `Save $${savings.toFixed(2)} (${size || 'each'})`;
    } else if (percentOff && !bogoPercent) {
      const pct = parseInt(percentOff[1]);
      salePrice = price;
      originalPrice = Math.round(price / (1 - pct / 100) * 100) / 100;
      description = `${pct}% off (${size || 'each'})`;
    } else {
      return null;
    }

    if (originalPrice <= 0 || salePrice <= 0 || originalPrice <= salePrice) return null;

    // Extract unit from size
    const unitMatch = size.match(/(lb|oz|ct|gal|each|pk)/i);
    const unit = unitMatch ? `/${unitMatch[1].toLowerCase()}` : undefined;

    return {
      title: name.substring(0, 200),
      description,
      originalPrice,
      salePrice,
      unit,
      startDate,
      expiryDate,
      categoryHints: [],
      details: `Sprouts Farmers Market weekly special. ${promoText}.`,
    };
  }
}

/** Sprouts weekly ad runs Wednesday to Tuesday */
function getSproutsWeekDates(): { startDate: string; expiryDate: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 3=Wed
  // Days since most recent Wednesday
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

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
