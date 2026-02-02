import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import type { LatLng } from '../types';

export function useMap() {
  const { state, dispatch } = useAppContext();

  const setUserLocation = useCallback(
    (location: LatLng | null) =>
      dispatch({ type: 'SET_USER_LOCATION', location }),
    [dispatch]
  );

  const setRadius = useCallback(
    (radiusMiles: number) => dispatch({ type: 'SET_RADIUS', radiusMiles }),
    [dispatch]
  );

  const toggleMapVisible = useCallback(
    () => dispatch({ type: 'TOGGLE_MAP_VISIBLE' }),
    [dispatch]
  );

  return {
    userLocation: state.filters.userLocation,
    radiusMiles: state.filters.radiusMiles,
    mapVisible: state.mapVisible,
    setUserLocation,
    setRadius,
    toggleMapVisible,
  };
}
