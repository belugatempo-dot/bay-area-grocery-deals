export interface LatLng {
  lat: number;
  lng: number;
}

export interface CityDealCluster {
  cityId: string;
  cityName: string;
  cityNameZh: string;
  lat: number;
  lng: number;
  deals: Deal[];
}

export interface Store {
  id: string;
  name: string;
  nameZh: string;
  color: string;
  cities: string[];
}

export interface Category {
  id: string;
  name: string;
  nameZh: string;
  icon: string;
}

export interface Deal {
  id: string;
  storeId: string;
  categoryId: string;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  originalPrice: number;
  salePrice: number;
  unit?: string;
  unitZh?: string;
  startDate: string;
  expiryDate: string;
  isHot: boolean;
  locations: string[];
  details?: string;
  detailsZh?: string;
}

export type BayAreaRegion = 'south_bay' | 'peninsula' | 'sf' | 'east_bay';

export interface CityGroup {
  region: BayAreaRegion;
  regionName: string;
  regionNameZh: string;
  cities: { id: string; name: string; nameZh: string; lat: number; lng: number }[];
}

export interface FilterState {
  selectedStores: string[];
  selectedCategories: string[];
  searchQuery: string;
  selectedCity: string;
  userLocation: LatLng | null;
  radiusMiles: number;
}

export interface AppState {
  filters: FilterState;
  language: 'en' | 'zh';
  selectedDealId: string | null;
  mapVisible: boolean;
}

export type AppAction =
  | { type: 'TOGGLE_STORE'; storeId: string }
  | { type: 'TOGGLE_CATEGORY'; categoryId: string }
  | { type: 'SET_SEARCH_QUERY'; query: string }
  | { type: 'SET_CITY'; city: string }
  | { type: 'SET_LANGUAGE'; language: 'en' | 'zh' }
  | { type: 'SET_SELECTED_DEAL'; dealId: string | null }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_USER_LOCATION'; location: LatLng | null }
  | { type: 'SET_RADIUS'; radiusMiles: number }
  | { type: 'TOGGLE_MAP_VISIBLE' };
