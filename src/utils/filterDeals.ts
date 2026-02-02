import type { Deal, Store, FilterState } from '../types';
import { getDaysUntilExpiry } from './formatPrice';
import { citiesWithinRadius } from './geo';

export function filterDeals(
  deals: Deal[],
  stores: Store[],
  filters: FilterState
): Deal[] {
  let filtered = deals;

  // Radius filter (mutually exclusive with city filter)
  if (filters.userLocation) {
    const nearbyCityIds = new Set(
      citiesWithinRadius(filters.userLocation, filters.radiusMiles)
    );
    const storesInRadius = new Set(
      stores
        .filter((s) => s.cities.some((c) => nearbyCityIds.has(c)))
        .map((s) => s.id)
    );
    filtered = filtered.filter(
      (d) =>
        storesInRadius.has(d.storeId) &&
        d.locations.some((loc) => nearbyCityIds.has(loc))
    );
  } else if (filters.selectedCity) {
    // Location filter: store must operate in city AND deal must list that city
    const storesInCity = new Set(
      stores
        .filter((s) => s.cities.includes(filters.selectedCity))
        .map((s) => s.id)
    );
    filtered = filtered.filter(
      (d) =>
        storesInCity.has(d.storeId) &&
        d.locations.includes(filters.selectedCity)
    );
  }

  // Store filter
  if (filters.selectedStores.length > 0) {
    const storeSet = new Set(filters.selectedStores);
    filtered = filtered.filter((d) => storeSet.has(d.storeId));
  }

  // Category filter
  if (filters.selectedCategories.length > 0) {
    const catSet = new Set(filters.selectedCategories);
    filtered = filtered.filter((d) => catSet.has(d.categoryId));
  }

  // Full-text bilingual search
  if (filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase().trim();
    filtered = filtered.filter((d) => {
      const store = stores.find((s) => s.id === d.storeId);
      const searchable = [
        d.title,
        d.titleZh,
        d.description,
        d.descriptionZh,
        store?.name ?? '',
        store?.nameZh ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    });
  }

  // Sort: hot deals first, then soonest-expiring
  filtered.sort((a, b) => {
    if (a.isHot !== b.isHot) return a.isHot ? -1 : 1;
    return getDaysUntilExpiry(a.expiryDate) - getDaysUntilExpiry(b.expiryDate);
  });

  return filtered;
}
