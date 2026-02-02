import type { ScrapedDeal } from '../scrapers/BaseScraper.js';

export interface ValidationResult {
  valid: ScrapedDeal[];
  errors: string[];
}

export function validate(deals: ScrapedDeal[]): ValidationResult {
  const valid: ScrapedDeal[] = [];
  const errors: string[] = [];

  for (const deal of deals) {
    const issues = validateDeal(deal);
    if (issues.length === 0) {
      valid.push(deal);
    } else {
      errors.push(`[${deal.title?.substring(0, 50) || 'unknown'}] ${issues.join('; ')}`);
    }
  }

  if (errors.length > 0) {
    console.log(`  Validation: ${valid.length} valid, ${errors.length} invalid`);
    for (const err of errors.slice(0, 5)) {
      console.log(`    - ${err}`);
    }
    if (errors.length > 5) {
      console.log(`    ... and ${errors.length - 5} more`);
    }
  }

  return { valid, errors };
}

function validateDeal(deal: ScrapedDeal): string[] {
  const issues: string[] = [];

  if (!deal.title || deal.title.trim().length < 3) {
    issues.push('title is missing or too short');
  }

  if (typeof deal.originalPrice !== 'number' || deal.originalPrice <= 0) {
    issues.push(`invalid originalPrice: ${deal.originalPrice}`);
  }

  if (typeof deal.salePrice !== 'number' || deal.salePrice <= 0) {
    issues.push(`invalid salePrice: ${deal.salePrice}`);
  }

  if (
    typeof deal.originalPrice === 'number' &&
    typeof deal.salePrice === 'number' &&
    deal.originalPrice < deal.salePrice
  ) {
    issues.push(`originalPrice (${deal.originalPrice}) < salePrice (${deal.salePrice})`);
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!deal.startDate || !datePattern.test(deal.startDate)) {
    issues.push(`invalid startDate: ${deal.startDate}`);
  }

  if (!deal.expiryDate || !datePattern.test(deal.expiryDate)) {
    issues.push(`invalid expiryDate: ${deal.expiryDate}`);
  }

  if (deal.startDate && deal.expiryDate && deal.startDate >= deal.expiryDate) {
    issues.push(`expiryDate (${deal.expiryDate}) must be after startDate (${deal.startDate})`);
  }

  return issues;
}
