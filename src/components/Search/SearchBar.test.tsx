import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from './SearchBar';

// Mock useFilters hook
const mockSetSearchQuery = vi.fn();
const mockFilters = {
  searchQuery: '',
  selectedStores: [],
  selectedCategories: [],
  selectedCity: '',
  userLocation: null,
  radiusMiles: 10,
};

vi.mock('../../hooks/useFilters', () => ({
  useFilters: () => ({
    filters: mockFilters,
    setSearchQuery: mockSetSearchQuery,
  }),
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'search.placeholder': 'Search deals...',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockSetSearchQuery.mockClear();
    mockFilters.searchQuery = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders an input element', () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText('Search deals...');
    expect(input).toBeInTheDocument();
  });

  it('renders with correct placeholder text', () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText('Search deals...')).toBeInTheDocument();
  });

  it('renders a search icon (svg)', () => {
    const { container } = render(<SearchBar />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('has text input type', () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText('Search deals...');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('updates input value on typing', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBar />);
    const input = screen.getByPlaceholderText('Search deals...');

    await user.type(input, 'organic');
    expect(input).toHaveValue('organic');
  });

  it('calls setSearchQuery after debounce', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBar />);
    const input = screen.getByPlaceholderText('Search deals...');

    await user.type(input, 'apple');
    // Advance past 300ms debounce
    await vi.advanceTimersByTimeAsync(350);

    expect(mockSetSearchQuery).toHaveBeenCalledWith('apple');
  });

  it('debounces rapid typing', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBar />);
    const input = screen.getByPlaceholderText('Search deals...');

    await user.type(input, 'a');
    await vi.advanceTimersByTimeAsync(100);
    await user.type(input, 'b');
    await vi.advanceTimersByTimeAsync(100);
    await user.type(input, 'c');
    await vi.advanceTimersByTimeAsync(350);

    // Should have been called with intermediate values as each keystroke triggers a new timeout
    const lastCall = mockSetSearchQuery.mock.calls[mockSetSearchQuery.mock.calls.length - 1];
    expect(lastCall[0]).toBe('abc');
  });

  it('starts with empty value when filters.searchQuery is empty', () => {
    mockFilters.searchQuery = '';
    render(<SearchBar />);
    const input = screen.getByPlaceholderText('Search deals...');
    expect(input).toHaveValue('');
  });

  it('renders within a relative container', () => {
    const { container } = render(<SearchBar />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('relative');
  });
});
