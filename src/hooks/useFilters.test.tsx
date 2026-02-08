import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppProvider } from '../context/AppContext';
import { useFilters } from './useFilters';

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

// Mock localStorage
vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
});

describe('useFilters', () => {
  it('returns initial filters state', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    expect(result.current.filters.selectedStores).toEqual([]);
    expect(result.current.filters.selectedCategories).toEqual([]);
    expect(result.current.filters.searchQuery).toBe('');
  });

  it('toggleStore adds and removes store', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => result.current.toggleStore('costco'));
    expect(result.current.filters.selectedStores).toEqual(['costco']);

    act(() => result.current.toggleStore('costco'));
    expect(result.current.filters.selectedStores).toEqual([]);
  });

  it('toggleCategory adds and removes category', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => result.current.toggleCategory('produce'));
    expect(result.current.filters.selectedCategories).toEqual(['produce']);

    act(() => result.current.toggleCategory('produce'));
    expect(result.current.filters.selectedCategories).toEqual([]);
  });

  it('setSearchQuery updates query', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => result.current.setSearchQuery('apple'));
    expect(result.current.filters.searchQuery).toBe('apple');
  });

  it('setCity updates selected city', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => result.current.setCity('san_jose'));
    expect(result.current.filters.selectedCity).toBe('san_jose');
  });

  it('clearFilters resets stores and categories', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.toggleStore('costco');
      result.current.toggleCategory('produce');
      result.current.setSearchQuery('test');
    });

    act(() => result.current.clearFilters());
    expect(result.current.filters.selectedStores).toEqual([]);
    expect(result.current.filters.selectedCategories).toEqual([]);
    expect(result.current.filters.searchQuery).toBe('');
  });

  it('exposes all expected functions', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    expect(typeof result.current.toggleStore).toBe('function');
    expect(typeof result.current.toggleCategory).toBe('function');
    expect(typeof result.current.setSearchQuery).toBe('function');
    expect(typeof result.current.setCity).toBe('function');
    expect(typeof result.current.clearFilters).toBe('function');
  });
});
