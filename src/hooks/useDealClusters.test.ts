import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDealClusters } from './useDealClusters';
import type { Deal } from '../types';

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'costco-001',
    storeId: 'costco',
    categoryId: 'produce',
    title: 'Organic Strawberries',
    titleZh: '有机草莓',
    description: 'Fresh',
    descriptionZh: '新鲜',
    originalPrice: 5.99,
    salePrice: 3.99,
    startDate: '2026-01-28',
    expiryDate: '2026-02-04',
    isHot: false,
    locations: ['san_jose'],
    ...overrides,
  };
}

describe('useDealClusters', () => {
  it('returns empty array for no deals', () => {
    const { result } = renderHook(() => useDealClusters([]));
    expect(result.current).toEqual([]);
  });

  it('groups deals by city', () => {
    const deals = [
      makeDeal({ id: 'd1', locations: ['san_jose'] }),
      makeDeal({ id: 'd2', locations: ['san_jose'] }),
    ];
    const { result } = renderHook(() => useDealClusters(deals));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].cityId).toBe('san_jose');
    expect(result.current[0].deals).toHaveLength(2);
  });

  it('includes city metadata', () => {
    const deals = [makeDeal({ locations: ['san_jose'] })];
    const { result } = renderHook(() => useDealClusters(deals));
    expect(result.current[0].cityName).toBe('San Jose');
    expect(result.current[0].cityNameZh).toBe('圣何塞');
    expect(result.current[0].lat).toBeCloseTo(37.3382);
    expect(result.current[0].lng).toBeCloseTo(-121.8863);
  });

  it('places multi-location deals in multiple clusters', () => {
    const deals = [makeDeal({ locations: ['san_jose', 'sunnyvale'] })];
    const { result } = renderHook(() => useDealClusters(deals));
    expect(result.current).toHaveLength(2);
    const cityIds = result.current.map((c) => c.cityId).sort();
    expect(cityIds).toEqual(['san_jose', 'sunnyvale']);
  });

  it('excludes unknown city IDs', () => {
    const deals = [makeDeal({ locations: ['unknown_city'] })];
    const { result } = renderHook(() => useDealClusters(deals));
    expect(result.current).toHaveLength(0);
  });

  it('handles mixed known and unknown cities', () => {
    const deals = [makeDeal({ locations: ['san_jose', 'unknown_city'] })];
    const { result } = renderHook(() => useDealClusters(deals));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].cityId).toBe('san_jose');
  });
});
