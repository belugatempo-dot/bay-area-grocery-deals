import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DealMap from './DealMap';
import type { Deal, CityDealCluster } from '../../types';

// Mock react-leaflet components
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="marker">{children}</div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
  Circle: ({ radius }: { radius: number }) => (
    <div data-testid="circle" data-radius={radius} />
  ),
  useMap: () => ({
    flyTo: vi.fn(),
  }),
}));

// Mock leaflet
vi.mock('leaflet', () => {
  function IconMock() { return {}; }
  IconMock.Default = {
    prototype: { _getIconUrl: '' },
    mergeOptions: vi.fn(),
  };
  const L = { Icon: IconMock };
  return { default: L, __esModule: true };
});

// Mock leaflet image imports
vi.mock('leaflet/dist/images/marker-icon-2x.png', () => ({ default: 'marker-icon-2x.png' }));
vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: 'marker-icon.png' }));
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: 'marker-shadow.png' }));

const mockDeals: Deal[] = [];
const mockSetSelectedDeal = vi.fn();
const mockClusters: CityDealCluster[] = [];
const mockUserLocation = { current: null as { lat: number; lng: number } | null };
const mockRadiusMiles = { current: 10 };

vi.mock('../../hooks/useDeals', () => ({
  useDeals: () => ({
    deals: mockDeals,
    setSelectedDeal: mockSetSelectedDeal,
  }),
}));

vi.mock('../../hooks/useMap', () => ({
  useMap: () => ({
    userLocation: mockUserLocation.current,
    radiusMiles: mockRadiusMiles.current,
  }),
}));

vi.mock('../../hooks/useDealClusters', () => ({
  useDealClusters: () => mockClusters,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('./MapPopupContent', () => ({
  default: ({ cluster }: { cluster: CityDealCluster }) => (
    <div data-testid={`popup-${cluster.cityId}`}>{cluster.cityName}</div>
  ),
}));

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'costco-001',
    storeId: 'costco',
    categoryId: 'produce',
    title: 'Organic Strawberries',
    titleZh: '有机草莓',
    description: 'Fresh',
    descriptionZh: '新鲜',
    originalPrice: 5.99,
    salePrice: 3.99,
    startDate: '2026-01-28',
    expiryDate: '2026-02-04',
    isHot: false,
    locations: ['san_jose'],
    ...overrides,
  };
}

describe('DealMap', () => {
  it('renders map container', () => {
    mockDeals.length = 0;
    mockClusters.length = 0;
    mockUserLocation.current = null;
    render(<DealMap />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('renders tile layer', () => {
    mockDeals.length = 0;
    mockClusters.length = 0;
    mockUserLocation.current = null;
    render(<DealMap />);
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
  });

  it('renders cluster markers', () => {
    mockDeals.length = 0;
    mockDeals.push(makeDeal());
    mockClusters.length = 0;
    mockClusters.push({
      cityId: 'san_jose',
      cityName: 'San Jose',
      cityNameZh: '圣何塞',
      lat: 37.3382,
      lng: -121.8863,
      deals: [makeDeal()],
    });
    mockUserLocation.current = null;
    render(<DealMap />);
    expect(screen.getByTestId('popup-san_jose')).toBeInTheDocument();
  });

  it('does not render user marker when no location', () => {
    mockDeals.length = 0;
    mockClusters.length = 0;
    mockUserLocation.current = null;
    render(<DealMap />);
    expect(screen.queryByTestId('circle')).not.toBeInTheDocument();
  });
});
