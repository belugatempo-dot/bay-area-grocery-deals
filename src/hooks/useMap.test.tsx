import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppProvider } from '../context/AppContext';
import { useMap } from './useMap';

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
});

describe('useMap', () => {
  it('returns initial map state', () => {
    const { result } = renderHook(() => useMap(), { wrapper });
    expect(result.current.userLocation).toBeNull();
    expect(result.current.radiusMiles).toBe(10);
    expect(result.current.mapVisible).toBe(false);
  });

  it('setUserLocation updates location', () => {
    const { result } = renderHook(() => useMap(), { wrapper });

    act(() => result.current.setUserLocation({ lat: 37, lng: -122 }));
    expect(result.current.userLocation).toEqual({ lat: 37, lng: -122 });
  });

  it('setUserLocation clears with null', () => {
    const { result } = renderHook(() => useMap(), { wrapper });

    act(() => result.current.setUserLocation({ lat: 37, lng: -122 }));
    act(() => result.current.setUserLocation(null));
    expect(result.current.userLocation).toBeNull();
  });

  it('setRadius updates radius', () => {
    const { result } = renderHook(() => useMap(), { wrapper });

    act(() => result.current.setRadius(25));
    expect(result.current.radiusMiles).toBe(25);
  });

  it('toggleMapVisible toggles visibility', () => {
    const { result } = renderHook(() => useMap(), { wrapper });

    act(() => result.current.toggleMapVisible());
    expect(result.current.mapVisible).toBe(true);

    act(() => result.current.toggleMapVisible());
    expect(result.current.mapVisible).toBe(false);
  });

  it('exposes all expected functions', () => {
    const { result } = renderHook(() => useMap(), { wrapper });
    expect(typeof result.current.setUserLocation).toBe('function');
    expect(typeof result.current.setRadius).toBe('function');
    expect(typeof result.current.toggleMapVisible).toBe('function');
  });
});
