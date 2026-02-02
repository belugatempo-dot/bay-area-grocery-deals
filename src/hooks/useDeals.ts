import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { filterDeals } from '../utils/filterDeals';
import dealsData from '../data/deals.json';
import storesData from '../data/stores.json';
import type { Deal, Store } from '../types';

const deals = dealsData as Deal[];
const stores = storesData as Store[];

export function useDeals() {
  const { state, dispatch } = useAppContext();

  const filteredDeals = useMemo(
    () => filterDeals(deals, stores, state.filters),
    [state.filters]
  );

  const selectedDeal = useMemo(
    () =>
      state.selectedDealId
        ? deals.find((d) => d.id === state.selectedDealId) ?? null
        : null,
    [state.selectedDealId]
  );

  const setSelectedDeal = (dealId: string | null) =>
    dispatch({ type: 'SET_SELECTED_DEAL', dealId });

  return {
    deals: filteredDeals,
    allDeals: deals,
    stores,
    selectedDeal,
    setSelectedDeal,
    lastUpdated: '2026-02-01',
  };
}
