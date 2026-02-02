import { useMemo } from 'react';
import { allCities } from '../data/cities';
import type { Deal, CityDealCluster } from '../types';

export function useDealClusters(deals: Deal[]): CityDealCluster[] {
  return useMemo(() => {
    const cityMap = new Map<string, Deal[]>();
    for (const deal of deals) {
      for (const locId of deal.locations) {
        const list = cityMap.get(locId);
        if (list) {
          list.push(deal);
        } else {
          cityMap.set(locId, [deal]);
        }
      }
    }

    const clusters: CityDealCluster[] = [];
    for (const [cityId, cityDeals] of cityMap) {
      const city = allCities.find((c) => c.id === cityId);
      if (city) {
        clusters.push({
          cityId,
          cityName: city.name,
          cityNameZh: city.nameZh,
          lat: city.lat,
          lng: city.lng,
          deals: cityDeals,
        });
      }
    }
    return clusters;
  }, [deals]);
}
