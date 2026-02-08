import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoryFilter from './CategoryFilter';

const mockToggleCategory = vi.fn();
const mockFilters = {
  selectedStores: [],
  selectedCategories: [] as string[],
  searchQuery: '',
  selectedCity: '',
  userLocation: null,
  radiusMiles: 10,
};

vi.mock('../../hooks/useFilters', () => ({
  useFilters: () => ({
    filters: mockFilters,
    toggleCategory: mockToggleCategory,
  }),
}));

vi.mock('../../hooks/useLanguage', () => ({
  useLanguage: () => ({ isZh: false, language: 'en', toggleLanguage: vi.fn() }),
}));

vi.mock('../../data/categories.json', () => ({
  default: [
    { id: 'produce', name: 'Produce', nameZh: '果蔬', icon: '🥬' },
    { id: 'meat', name: 'Meat', nameZh: '肉类', icon: '🥩' },
  ],
}));

describe('CategoryFilter', () => {
  it('renders all category buttons', () => {
    render(<CategoryFilter />);
    expect(screen.getByText('Produce')).toBeInTheDocument();
    expect(screen.getByText('Meat')).toBeInTheDocument();
  });

  it('renders category icons', () => {
    render(<CategoryFilter />);
    expect(screen.getByText('🥬')).toBeInTheDocument();
    expect(screen.getByText('🥩')).toBeInTheDocument();
  });

  it('highlights active category', () => {
    mockFilters.selectedCategories = ['produce'];
    render(<CategoryFilter />);
    const button = screen.getByText('Produce').closest('button');
    expect(button?.className).toContain('border-orange');
  });

  it('calls toggleCategory on click', async () => {
    mockToggleCategory.mockClear();
    mockFilters.selectedCategories = [];
    const user = userEvent.setup();
    render(<CategoryFilter />);

    await user.click(screen.getByText('Produce'));
    expect(mockToggleCategory).toHaveBeenCalledWith('produce');
  });

  it('inactive category has default border', () => {
    mockFilters.selectedCategories = [];
    render(<CategoryFilter />);
    const button = screen.getByText('Produce').closest('button');
    expect(button?.className).toContain('border-gray-200');
  });
});
