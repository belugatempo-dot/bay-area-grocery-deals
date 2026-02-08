import type { AppState, AppAction } from '../types';

const STORAGE_KEY = 'bay-area-deals-state';

export function loadPersistedState(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

export function persistState(state: AppState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        filters: {
          ...state.filters,
          searchQuery: '',
          userLocation: null,
        },
        language: state.language,
        mapVisible: state.mapVisible,
      })
    );
  } catch {
    // ignore
  }
}

export const defaultState: AppState = {
  filters: {
    selectedStores: [],
    selectedCategories: [],
    searchQuery: '',
    selectedCity: '',
    userLocation: null,
    radiusMiles: 10,
  },
  language: 'zh',
  selectedDealId: null,
  mapVisible: false,
};

export function initState(): AppState {
  const persisted = loadPersistedState();
  return {
    ...defaultState,
    ...persisted,
    filters: {
      ...defaultState.filters,
      ...persisted.filters,
      userLocation: null,
    },
  };
}

export function reducer(state: AppState, action: AppAction): AppState {
  let next: AppState;
  switch (action.type) {
    case 'TOGGLE_STORE': {
      const stores = state.filters.selectedStores.includes(action.storeId)
        ? state.filters.selectedStores.filter((s) => s !== action.storeId)
        : [...state.filters.selectedStores, action.storeId];
      next = { ...state, filters: { ...state.filters, selectedStores: stores } };
      break;
    }
    case 'TOGGLE_CATEGORY': {
      const cats = state.filters.selectedCategories.includes(action.categoryId)
        ? state.filters.selectedCategories.filter((c) => c !== action.categoryId)
        : [...state.filters.selectedCategories, action.categoryId];
      next = { ...state, filters: { ...state.filters, selectedCategories: cats } };
      break;
    }
    case 'SET_SEARCH_QUERY':
      next = { ...state, filters: { ...state.filters, searchQuery: action.query } };
      break;
    case 'SET_CITY':
      next = {
        ...state,
        filters: { ...state.filters, selectedCity: action.city, userLocation: null },
      };
      break;
    case 'SET_LANGUAGE':
      next = { ...state, language: action.language };
      break;
    case 'SET_SELECTED_DEAL':
      next = { ...state, selectedDealId: action.dealId };
      break;
    case 'SET_USER_LOCATION':
      next = {
        ...state,
        filters: { ...state.filters, userLocation: action.location, selectedCity: '' },
      };
      break;
    case 'SET_RADIUS':
      next = {
        ...state,
        filters: { ...state.filters, radiusMiles: action.radiusMiles },
      };
      break;
    case 'TOGGLE_MAP_VISIBLE':
      next = { ...state, mapVisible: !state.mapVisible };
      break;
    case 'CLEAR_FILTERS':
      next = {
        ...state,
        filters: {
          selectedStores: [],
          selectedCategories: [],
          searchQuery: '',
          selectedCity: state.filters.selectedCity,
          userLocation: null,
          radiusMiles: state.filters.radiusMiles,
        },
      };
      break;
    default:
      return state;
  }
  persistState(next);
  return next;
}
