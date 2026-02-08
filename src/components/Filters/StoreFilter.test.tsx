import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StoreFilter from './StoreFilter';

const mockToggleStore = vi.fn();
const mockFilters = {
  selectedStores: [] as string[],
  selectedCategories: [],
  searchQuery: '',
  selectedCity: '',
  userLocation: null,
  radiusMiles: 10,
};

vi.mock('../../hooks/useFilters', () => ({
  useFilters: () => ({
    filters: mockFilters,
    toggleStore: mockToggleStore,
  }),
}));

vi.mock('../../hooks/useLanguage', () => ({
  useLanguage: () => ({ isZh: false, language: 'en', toggleLanguage: vi.fn() }),
}));

vi.mock('../../data/stores.json', () => ({
  default: [
    { id: 'costco', name: 'Costco', nameZh: 'Costco 好市多', color: '#E31837', cities: [] },
    { id: 'sprouts', name: 'Sprouts', nameZh: 'Sprouts', color: '#3E7D1E', cities: [] },
  ],
}));

describe('StoreFilter', () => {
  it('renders all store buttons', () => {
    render(<StoreFilter />);
    expect(screen.getByText('Costco')).toBeInTheDocument();
    expect(screen.getByText('Sprouts')).toBeInTheDocument();
  });

  it('renders English names when not zh', () => {
    render(<StoreFilter />);
    expect(screen.getByText('Costco')).toBeInTheDocument();
  });

  it('highlights active store with store color', () => {
    mockFilters.selectedStores = ['costco'];
    render(<StoreFilter />);
    const button = screen.getByText('Costco');
    expect(button.style.backgroundColor).toBe('#E31837');
  });

  it('calls toggleStore on click', async () => {
    mockToggleStore.mockClear();
    mockFilters.selectedStores = [];
    const user = userEvent.setup();
    render(<StoreFilter />);

    await user.click(screen.getByText('Costco'));
    expect(mockToggleStore).toHaveBeenCalledWith('costco');
  });

  it('inactive store has no background color', () => {
    mockFilters.selectedStores = [];
    render(<StoreFilter />);
    const button = screen.getByText('Costco');
    expect(button.style.backgroundColor).toBe('');
  });
});
