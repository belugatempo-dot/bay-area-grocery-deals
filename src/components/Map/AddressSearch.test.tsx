import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddressSearch from './AddressSearch';

const mockSetUserLocation = vi.fn();
const mockSetRadius = vi.fn();

vi.mock('../../hooks/useMap', () => ({
  useMap: () => ({
    userLocation: null,
    radiusMiles: 10,
    setUserLocation: mockSetUserLocation,
    setRadius: mockSetRadius,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'map.searchAddress': 'Search address or zipcode',
        'map.radius': 'Radius',
        'map.clearLocation': 'Clear',
      };
      if (key === 'map.miles') return `${params?.count} mi`;
      return translations[key] ?? key;
    },
  }),
}));

const mockGeocodeAddress = vi.fn();
vi.mock('../../utils/geocode', () => ({
  geocodeAddress: (...args: unknown[]) => mockGeocodeAddress(...args),
}));

describe('AddressSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGeocodeAddress.mockReset();
    mockSetUserLocation.mockClear();
    mockSetRadius.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input with placeholder', () => {
    render(<AddressSearch />);
    expect(screen.getByPlaceholderText('Search address or zipcode')).toBeInTheDocument();
  });

  it('renders radius selector with default value', () => {
    render(<AddressSearch />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('10');
  });

  it('renders all radius options', () => {
    render(<AddressSearch />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(5);
    expect(options.map((o) => o.textContent)).toEqual(['5 mi', '10 mi', '15 mi', '20 mi', '25 mi']);
  });

  it('calls setRadius when radius option is changed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AddressSearch />);

    await user.selectOptions(screen.getByRole('combobox'), '25');
    expect(mockSetRadius).toHaveBeenCalledWith(25);
  });

  it('debounces geocode call by 500ms', async () => {
    mockGeocodeAddress.mockResolvedValue([]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AddressSearch />);

    await user.type(screen.getByPlaceholderText('Search address or zipcode'), 'San Jose');

    // Should not have been called yet (debounce not elapsed)
    expect(mockGeocodeAddress).not.toHaveBeenCalled();

    // Advance past debounce
    await vi.advanceTimersByTimeAsync(600);
    expect(mockGeocodeAddress).toHaveBeenCalledWith('San Jose');
  });

  it('shows dropdown results from geocode', async () => {
    mockGeocodeAddress.mockResolvedValue([
      { lat: 37.33, lng: -121.88, displayName: 'San Jose, CA, USA' },
    ]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AddressSearch />);

    await user.type(screen.getByPlaceholderText('Search address or zipcode'), 'San Jose');
    await vi.advanceTimersByTimeAsync(600);

    await waitFor(() => {
      expect(screen.getByText('San Jose, CA, USA')).toBeInTheDocument();
    });
  });

  it('selects a result and calls setUserLocation', async () => {
    mockGeocodeAddress.mockResolvedValue([
      { lat: 37.33, lng: -121.88, displayName: 'San Jose, CA, USA' },
    ]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AddressSearch />);

    await user.type(screen.getByPlaceholderText('Search address or zipcode'), 'San Jose');
    await vi.advanceTimersByTimeAsync(600);

    await waitFor(() => {
      expect(screen.getByText('San Jose, CA, USA')).toBeInTheDocument();
    });

    await user.click(screen.getByText('San Jose, CA, USA'));
    expect(mockSetUserLocation).toHaveBeenCalledWith({ lat: 37.33, lng: -121.88 });
  });

  it('clears results when input is emptied', async () => {
    mockGeocodeAddress.mockResolvedValue([
      { lat: 37.33, lng: -121.88, displayName: 'San Jose, CA, USA' },
    ]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AddressSearch />);

    await user.type(screen.getByPlaceholderText('Search address or zipcode'), 'SJ');
    await vi.advanceTimersByTimeAsync(600);

    await waitFor(() => {
      expect(screen.getByText('San Jose, CA, USA')).toBeInTheDocument();
    });

    await user.clear(screen.getByPlaceholderText('Search address or zipcode'));
    expect(screen.queryByText('San Jose, CA, USA')).not.toBeInTheDocument();
  });
});
