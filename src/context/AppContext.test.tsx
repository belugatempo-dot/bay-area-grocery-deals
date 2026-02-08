import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppProvider, useAppContext } from './AppContext';
import { reducer, defaultState } from './reducer';
import type { AppState, AppAction } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

describe('reducer', () => {
  let state: AppState;

  beforeEach(() => {
    localStorageMock.clear();
    state = { ...defaultState, filters: { ...defaultState.filters } };
  });

  it('TOGGLE_STORE adds a store', () => {
    const next = reducer(state, { type: 'TOGGLE_STORE', storeId: 'costco' });
    expect(next.filters.selectedStores).toEqual(['costco']);
  });

  it('TOGGLE_STORE removes an existing store', () => {
    state.filters.selectedStores = ['costco'];
    const next = reducer(state, { type: 'TOGGLE_STORE', storeId: 'costco' });
    expect(next.filters.selectedStores).toEqual([]);
  });

  it('TOGGLE_CATEGORY adds a category', () => {
    const next = reducer(state, { type: 'TOGGLE_CATEGORY', categoryId: 'produce' });
    expect(next.filters.selectedCategories).toEqual(['produce']);
  });

  it('TOGGLE_CATEGORY removes an existing category', () => {
    state.filters.selectedCategories = ['produce'];
    const next = reducer(state, { type: 'TOGGLE_CATEGORY', categoryId: 'produce' });
    expect(next.filters.selectedCategories).toEqual([]);
  });

  it('SET_SEARCH_QUERY updates search query', () => {
    const next = reducer(state, { type: 'SET_SEARCH_QUERY', query: 'apple' });
    expect(next.filters.searchQuery).toBe('apple');
  });

  it('SET_CITY sets city and clears userLocation', () => {
    state.filters.userLocation = { lat: 37, lng: -122 };
    const next = reducer(state, { type: 'SET_CITY', city: 'san_jose' });
    expect(next.filters.selectedCity).toBe('san_jose');
    expect(next.filters.userLocation).toBeNull();
  });

  it('SET_LANGUAGE changes language', () => {
    const next = reducer(state, { type: 'SET_LANGUAGE', language: 'en' });
    expect(next.language).toBe('en');
  });

  it('SET_SELECTED_DEAL sets deal id', () => {
    const next = reducer(state, { type: 'SET_SELECTED_DEAL', dealId: 'costco-001' });
    expect(next.selectedDealId).toBe('costco-001');
  });

  it('SET_SELECTED_DEAL clears deal id with null', () => {
    state.selectedDealId = 'costco-001';
    const next = reducer(state, { type: 'SET_SELECTED_DEAL', dealId: null });
    expect(next.selectedDealId).toBeNull();
  });

  it('SET_USER_LOCATION sets location and clears selectedCity', () => {
    state.filters.selectedCity = 'san_jose';
    const next = reducer(state, { type: 'SET_USER_LOCATION', location: { lat: 37, lng: -122 } });
    expect(next.filters.userLocation).toEqual({ lat: 37, lng: -122 });
    expect(next.filters.selectedCity).toBe('');
  });

  it('SET_RADIUS updates radius', () => {
    const next = reducer(state, { type: 'SET_RADIUS', radiusMiles: 25 });
    expect(next.filters.radiusMiles).toBe(25);
  });

  it('TOGGLE_MAP_VISIBLE toggles map visibility', () => {
    expect(state.mapVisible).toBe(false);
    const next = reducer(state, { type: 'TOGGLE_MAP_VISIBLE' });
    expect(next.mapVisible).toBe(true);
    const next2 = reducer(next, { type: 'TOGGLE_MAP_VISIBLE' });
    expect(next2.mapVisible).toBe(false);
  });

  it('CLEAR_FILTERS resets filters but preserves city and radius', () => {
    state.filters.selectedStores = ['costco'];
    state.filters.selectedCategories = ['produce'];
    state.filters.searchQuery = 'apple';
    state.filters.selectedCity = 'san_jose';
    state.filters.radiusMiles = 25;
    state.filters.userLocation = { lat: 37, lng: -122 };

    const next = reducer(state, { type: 'CLEAR_FILTERS' });
    expect(next.filters.selectedStores).toEqual([]);
    expect(next.filters.selectedCategories).toEqual([]);
    expect(next.filters.searchQuery).toBe('');
    expect(next.filters.selectedCity).toBe('san_jose');
    expect(next.filters.radiusMiles).toBe(25);
    expect(next.filters.userLocation).toBeNull();
  });

  it('returns same state for unknown action', () => {
    const next = reducer(state, { type: 'UNKNOWN' } as unknown as AppAction);
    expect(next).toBe(state);
  });
});

describe('persistState', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('persists state excluding transient fields', () => {
    localStorageMock.setItem.mockClear();

    const state: AppState = {
      ...defaultState,
      filters: {
        ...defaultState.filters,
        searchQuery: 'apple',
        userLocation: { lat: 37, lng: -122 },
        selectedStores: ['costco'],
      },
      language: 'en',
      mapVisible: true,
    };

    // Trigger persist by dispatching through reducer
    reducer(state, { type: 'TOGGLE_MAP_VISIBLE' });

    const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(stored.filters.searchQuery).toBe('');
    expect(stored.filters.userLocation).toBeNull();
    expect(stored.language).toBe('en');
    expect(stored.mapVisible).toBe(false);
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('QuotaExceeded');
    });

    // Should not throw
    expect(() => {
      reducer(defaultState, { type: 'SET_LANGUAGE', language: 'en' });
    }).not.toThrow();
  });
});

describe('loadPersistedState', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorageMock.getItem.mockReturnValueOnce('invalid json{{{');

    // Rendering the provider triggers initState → loadPersistedState
    const { result } = renderHook(() => useAppContext(), { wrapper });
    expect(result.current.state.language).toBe('zh'); // default
  });

  it('loads persisted state on init', () => {
    localStorageMock.getItem.mockReturnValueOnce(
      JSON.stringify({ language: 'en', mapVisible: true })
    );

    const { result } = renderHook(() => useAppContext(), { wrapper });
    expect(result.current.state.language).toBe('en');
    expect(result.current.state.mapVisible).toBe(true);
  });
});

describe('AppProvider', () => {
  it('useAppContext throws outside provider', () => {
    expect(() => {
      renderHook(() => useAppContext());
    }).toThrow('useAppContext must be used within AppProvider');
  });

  it('provides state and dispatch', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    expect(result.current.state).toBeDefined();
    expect(result.current.dispatch).toBeDefined();
  });

  it('dispatch updates state', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'SET_LANGUAGE', language: 'en' });
    });

    expect(result.current.state.language).toBe('en');
  });
});
