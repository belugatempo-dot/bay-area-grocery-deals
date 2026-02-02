import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

export function useFilters() {
  const { state, dispatch } = useAppContext();

  const toggleStore = useCallback(
    (storeId: string) => dispatch({ type: 'TOGGLE_STORE', storeId }),
    [dispatch]
  );

  const toggleCategory = useCallback(
    (categoryId: string) => dispatch({ type: 'TOGGLE_CATEGORY', categoryId }),
    [dispatch]
  );

  const setSearchQuery = useCallback(
    (query: string) => dispatch({ type: 'SET_SEARCH_QUERY', query }),
    [dispatch]
  );

  const setCity = useCallback(
    (city: string) => dispatch({ type: 'SET_CITY', city }),
    [dispatch]
  );

  const clearFilters = useCallback(
    () => dispatch({ type: 'CLEAR_FILTERS' }),
    [dispatch]
  );

  return {
    filters: state.filters,
    toggleStore,
    toggleCategory,
    setSearchQuery,
    setCity,
    clearFilters,
  };
}
