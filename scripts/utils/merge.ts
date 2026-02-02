import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { Deal } from '../../src/types/index.js';

const DEALS_PATH = resolve(import.meta.dirname, '../../src/data/deals.json');

export function mergeToDealsJson(newDeals: Deal[]): void {
  const existing: Deal[] = JSON.parse(readFileSync(DEALS_PATH, 'utf-8'));
  const today = new Date().toISOString().split('T')[0];

  // Collect storeIds that have new data
  const updatedStoreIds = new Set(newDeals.map((d) => d.storeId));

  // Keep deals from stores that weren't scraped, and remove expired deals
  const kept = existing.filter(
    (d) => !updatedStoreIds.has(d.storeId) && d.expiryDate >= today
  );

  // Merge: kept deals from other stores + new deals
  const merged = [...kept, ...newDeals];

  // Reassign IDs to be sequential per store
  const counters: Record<string, number> = {};
  for (const deal of merged) {
    const store = deal.storeId;
    counters[store] = (counters[store] ?? 0) + 1;
    deal.id = `${store}-${counters[store].toString().padStart(3, '0')}`;
  }

  writeFileSync(DEALS_PATH, JSON.stringify(merged, null, 2) + '\n');
  console.log(`Merged ${merged.length} deals to ${DEALS_PATH} (${kept.length} kept + ${newDeals.length} new)`);
}
