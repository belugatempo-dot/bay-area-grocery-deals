import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MapPopupContent from './MapPopupContent';
import type { CityDealCluster, Deal } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'map.dealsInCity') return `${params?.count} deals in ${params?.city}`;
      return key;
    },
  }),
}));

vi.mock('../../hooks/useLanguage', () => ({
  useLanguage: () => ({ isZh: false, language: 'en', toggleLanguage: vi.fn() }),
}));

vi.mock('../../data/stores.json', () => ({
  default: [
    { id: 'costco', name: 'Costco', nameZh: 'Costco', color: '#E31837', cities: [] },
    { id: 'sprouts', name: 'Sprouts', nameZh: 'Sprouts', color: '#3E7D1E', cities: [] },
  ],
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

function makeCluster(overrides: Partial<CityDealCluster> = {}): CityDealCluster {
  return {
    cityId: 'san_jose',
    cityName: 'San Jose',
    cityNameZh: '圣何塞',
    lat: 37.3382,
    lng: -121.8863,
    deals: [makeDeal()],
    ...overrides,
  };
}

describe('MapPopupContent', () => {
  it('renders city name with deal count', () => {
    render(<MapPopupContent cluster={makeCluster()} />);
    expect(screen.getByText('1 deals in San Jose')).toBeInTheDocument();
  });

  it('renders deal titles', () => {
    render(<MapPopupContent cluster={makeCluster()} />);
    expect(screen.getByText('Organic Strawberries')).toBeInTheDocument();
  });

  it('renders deal prices', () => {
    render(<MapPopupContent cluster={makeCluster()} />);
    expect(screen.getByText('$3.99')).toBeInTheDocument();
  });

  it('shows max 5 deals', () => {
    const deals = Array.from({ length: 7 }, (_, i) =>
      makeDeal({ id: `costco-${i}`, title: `Deal ${i}` })
    );
    render(<MapPopupContent cluster={makeCluster({ deals })} />);

    // Should show 5 deals
    expect(screen.getByText('Deal 0')).toBeInTheDocument();
    expect(screen.getByText('Deal 4')).toBeInTheDocument();
    expect(screen.queryByText('Deal 5')).not.toBeInTheDocument();
  });

  it('shows "+N more" when more than 5 deals', () => {
    const deals = Array.from({ length: 7 }, (_, i) =>
      makeDeal({ id: `costco-${i}`, title: `Deal ${i}` })
    );
    render(<MapPopupContent cluster={makeCluster({ deals })} />);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('calls onDealClick when deal is clicked', async () => {
    const onDealClick = vi.fn();
    const user = userEvent.setup();
    render(<MapPopupContent cluster={makeCluster()} onDealClick={onDealClick} />);

    await user.click(screen.getByText('Organic Strawberries'));
    expect(onDealClick).toHaveBeenCalledWith('costco-001');
  });
});
