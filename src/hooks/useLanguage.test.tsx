import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppProvider } from '../context/AppContext';
import { useLanguage } from './useLanguage';

const mockChangeLanguage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { changeLanguage: mockChangeLanguage },
    t: (key: string) => key,
  }),
}));

vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
});

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

describe('useLanguage', () => {
  it('returns default language zh', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe('zh');
    expect(result.current.isZh).toBe(true);
  });

  it('toggleLanguage switches from zh to en', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    act(() => result.current.toggleLanguage());
    expect(result.current.language).toBe('en');
    expect(result.current.isZh).toBe(false);
  });

  it('toggleLanguage calls i18n.changeLanguage', () => {
    mockChangeLanguage.mockClear();
    const { result } = renderHook(() => useLanguage(), { wrapper });

    act(() => result.current.toggleLanguage());
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });

  it('toggleLanguage persists to localStorage', () => {
    const setItem = vi.mocked(localStorage.setItem);
    setItem.mockClear();
    const { result } = renderHook(() => useLanguage(), { wrapper });

    act(() => result.current.toggleLanguage());
    expect(setItem).toHaveBeenCalledWith('bay-area-deals-lang', expect.any(String));
  });

  it('double toggle returns to original language', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    act(() => result.current.toggleLanguage());
    act(() => result.current.toggleLanguage());
    expect(result.current.language).toBe('zh');
    expect(result.current.isZh).toBe(true);
  });
});
