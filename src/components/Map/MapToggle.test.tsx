import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MapToggle from './MapToggle';

const mockToggleMapVisible = vi.fn();
let mockMapVisible = false;

vi.mock('../../hooks/useMap', () => ({
  useMap: () => ({
    mapVisible: mockMapVisible,
    toggleMapVisible: mockToggleMapVisible,
    userLocation: null,
    radiusMiles: 10,
    setUserLocation: vi.fn(),
    setRadius: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'map.showMap': 'Show Map',
        'map.hideMap': 'Hide Map',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('MapToggle', () => {
  it('shows "Show Map" when map is hidden', () => {
    mockMapVisible = false;
    render(<MapToggle />);
    expect(screen.getByText('Show Map')).toBeInTheDocument();
  });

  it('shows "Hide Map" when map is visible', () => {
    mockMapVisible = true;
    render(<MapToggle />);
    expect(screen.getByText('Hide Map')).toBeInTheDocument();
  });

  it('renders an svg icon', () => {
    const { container } = render(<MapToggle />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('calls toggleMapVisible on click', async () => {
    mockToggleMapVisible.mockClear();
    const user = userEvent.setup();
    render(<MapToggle />);

    await user.click(screen.getByRole('button'));
    expect(mockToggleMapVisible).toHaveBeenCalledOnce();
  });
});
