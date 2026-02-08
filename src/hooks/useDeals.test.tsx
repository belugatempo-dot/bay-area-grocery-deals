import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppProvider } from '../context/AppContext';
import { useDeals } from './useDeals';

vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
});

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

describe('useDeals', () => {
  it('returns deals array', () => {
    const { result } = renderHook(() => useDeals(), { wrapper });
    expect(Array.isArray(result.current.deals)).toBe(true);
  });

  it('returns allDeals array', () => {
    const { result } = renderHook(() => useDeals(), { wrapper });
    expect(Array.isArray(result.current.allDeals)).toBe(true);
  });

  it('returns stores array', () => {
    const { result } = renderHook(() => useDeals(), { wrapper });
    expect(Array.isArray(result.current.stores)).toBe(true);
    expect(result.current.stores.length).toBeGreaterThan(0);
  });

  it('returns selectedDeal as null initially', () => {
    const { result } = renderHook(() => useDeals(), { wrapper });
    expect(result.current.selectedDeal).toBeNull();
  });

  it('setSelectedDeal updates selectedDeal', () => {
    const { result } = renderHook(() => useDeals(), { wrapper });
    const firstDealId = result.current.allDeals[0]?.id;

    if (firstDealId) {
      act(() => result.current.setSelectedDeal(firstDealId));
      expect(result.current.selectedDeal?.id).toBe(firstDealId);
    }
  });

  it('setSelectedDeal with null clears selection', () => {
    const { result } = renderHook(() => useDeals(), { wrapper });

    act(() => result.current.setSelectedDeal(null));
    expect(result.current.selectedDeal).toBeNull();
  });

  it('setSelectedDeal with unknown id returns null', () => {
    const { result } = renderHook(() => useDeals(), { wrapper });

    act(() => result.current.setSelectedDeal('nonexistent-deal'));
    expect(result.current.selectedDeal).toBeNull();
  });

  it('returns lastUpdated string', () => {
    const { result } = renderHook(() => useDeals(), { wrapper });
    expect(typeof result.current.lastUpdated).toBe('string');
  });
});
