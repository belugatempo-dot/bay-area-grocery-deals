import { chromium } from 'playwright';
import { BaseScraper, type ScrapedDeal } from './BaseScraper.js';
import { ocrFlyer, type OcrDeal } from '../utils/ocr.js';

const RANCH99_URL = 'https://h5.awsprod.99ranch.com/stores/ad/1009';

const RANCH99_LOCATIONS = [
  'san_jose', 'milpitas', 'cupertino', 'mountain_view', 'daly_city',
  'fremont', 'newark', 'richmond', 'union_city', 'foster_city',
  'concord', 'dublin', 'pleasanton',
];

interface AdSection {
  name: string;
  date: string;
  imageUrl: string;
}

const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

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

/**
 * Parse Ranch 99 date format "Feb.13 - Feb.19" into YYYY-MM-DD pair.
 * Assumes current year; handles Dec→Jan year boundary.
 */
export function parseRanch99Dates(dateStr: string): { startDate: string; expiryDate: string } | null {
  const match = dateStr.trim().match(
    /([A-Z][a-z]{2})\.(\d{1,2})\s*-\s*([A-Z][a-z]{2})\.(\d{1,2})/,
  );
  if (!match) return null;

  const [, startMonth, startDay, endMonth, endDay] = match;
  const sm = MONTH_MAP[startMonth];
  const em = MONTH_MAP[endMonth];
  if (!sm || !em) return null;

  const now = new Date();
  const startYear = now.getFullYear();
  let endYear = startYear;

  // Handle year boundary: Dec start → Jan end means end is next year
  if (sm === '12' && em === '01') {
    endYear = startYear + 1;
  }

  return {
    startDate: `${startYear}-${sm}-${startDay.padStart(2, '0')}`,
    expiryDate: `${endYear}-${em}-${endDay.padStart(2, '0')}`,
  };
}

export class Ranch99Scraper extends BaseScraper {
  readonly storeId = 'ranch99';
  readonly locations = RANCH99_LOCATIONS;

  async scrape(): Promise<ScrapedDeal[]> {
    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled'],
      });
    } catch (err) {
      console.log(`  [ranch99] Browser launch failed: ${err instanceof Error ? err.message : err}`);
      return [];
    }

    try {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
      });

      const page = await context.newPage();

      await sleep(1000 + Math.random() * 2000);

      await page.goto(RANCH99_URL, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });

      // Wait for Next.js hydration
      await sleep(3000 + Math.random() * 2000);

      // Extract ad section data from the page
      const adSections: AdSection[] = await page.evaluate(() => {
        const results: Array<{ name: string; date: string; imageUrl: string }> = [];

        // Extract from Next.js hydration data embedded in script tags
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const text = script.textContent ?? '';
          // Look for storeActivities data in __next_f push calls
          const activityPattern = /"name"\s*:\s*"([^"]+)"[^}]*"date"\s*:\s*"([^"]+)"[^}]*"imageUrl"\s*:\s*"([^"]+)"/g;
          let m;
          while ((m = activityPattern.exec(text)) !== null) {
            results.push({ name: m[1], date: m[2], imageUrl: m[3] });
          }
        }

        // Fallback: extract from rendered img elements if no script data found
        if (results.length === 0) {
          const images = document.querySelectorAll('img');
          for (const img of images) {
            const src = img.src || img.getAttribute('data-src') || '';
            if (src.includes('99ranch') && (src.includes('.jpeg') || src.includes('.jpg') || src.includes('.png'))) {
              // Extract the actual image URL from Next.js optimized URL
              const urlMatch = src.match(/url=([^&]+)/);
              const actualUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : src;
              results.push({ name: 'Weekly Deal', date: '', imageUrl: actualUrl });
            }
          }
        }

        return results;
      });

      console.log(`  Found ${adSections.length} ad sections`);

      if (adSections.length === 0) {
        return [];
      }

      // Process each ad section through OCR
      const allDeals: ScrapedDeal[] = [];

      for (const section of adSections) {
        const dates = parseRanch99Dates(section.date);
        if (!dates && section.date) {
          console.log(`  Skipping section "${section.name}": unparseable date "${section.date}"`);
          continue;
        }

        if (!section.imageUrl) continue;

        const ocrDeals = await ocrFlyer(section.imageUrl);

        // Use parsed dates, or fallback to current week
        const startDate = dates?.startDate ?? getFallbackStartDate();
        const expiryDate = dates?.expiryDate ?? getFallbackExpiryDate();

        for (const deal of ocrDeals) {
          allDeals.push(ocrDealToScrapedDeal(deal, startDate, expiryDate, section.name));
        }
      }

      console.log(`  Extracted ${allDeals.length} total deals via OCR`);
      return allDeals;
    } catch (err) {
      if (isKnownBlockError(err)) {
        console.log(`  [ranch99] Blocked or connection error: ${err instanceof Error ? err.message : err}`);
        return [];
      }
      throw err;
    } finally {
      await browser.close();
    }
  }
}

function ocrDealToScrapedDeal(
  deal: OcrDeal,
  startDate: string,
  expiryDate: string,
  sectionName: string,
): ScrapedDeal {
  return {
    title: deal.title,
    description: `99 Ranch ${sectionName}`,
    originalPrice: deal.originalPrice,
    salePrice: deal.salePrice,
    unit: deal.unit,
    startDate,
    expiryDate,
    categoryHints: deal.categoryHints,
    details: `99 Ranch Market weekly special - ${sectionName}`,
  };
}

function getFallbackStartDate(): string {
  const now = new Date();
  const day = now.getDay();
  // Start from last Thursday (Ranch 99 ads typically run Thu-Wed)
  const offset = (day + 3) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - offset);
  return start.toISOString().slice(0, 10);
}

function getFallbackExpiryDate(): string {
  const start = getFallbackStartDate();
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
