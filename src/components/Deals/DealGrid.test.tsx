import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DealGrid from './DealGrid';
import type { Deal } from '../../types';

const mockDeals: Deal[] = [];

vi.mock('../../hooks/useDeals', () => ({
  useDeals: () => ({ deals: mockDeals }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'deals.noDeals': 'No deals found',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock DealCard to avoid its complex dependencies
vi.mock('./DealCard', () => ({
  default: ({ deal }: { deal: Deal }) => (
    <div data-testid={`deal-card-${deal.id}`}>{deal.title}</div>
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

describe('DealGrid', () => {
  it('shows empty state when no deals', () => {
    mockDeals.length = 0;
    render(<DealGrid />);
    expect(screen.getByText('No deals found')).toBeInTheDocument();
  });

  it('shows cart emoji in empty state', () => {
    mockDeals.length = 0;
    render(<DealGrid />);
    expect(screen.getByText('🛒')).toBeInTheDocument();
  });

  it('renders deal cards when deals exist', () => {
    mockDeals.length = 0;
    mockDeals.push(makeDeal({ id: 'costco-001' }));
    mockDeals.push(makeDeal({ id: 'costco-002', title: 'Bananas' }));
    render(<DealGrid />);

    expect(screen.getByTestId('deal-card-costco-001')).toBeInTheDocument();
    expect(screen.getByTestId('deal-card-costco-002')).toBeInTheDocument();
  });

  it('renders correct number of cards', () => {
    mockDeals.length = 0;
    mockDeals.push(makeDeal({ id: 'd1' }));
    mockDeals.push(makeDeal({ id: 'd2' }));
    mockDeals.push(makeDeal({ id: 'd3' }));
    render(<DealGrid />);

    expect(screen.getAllByTestId(/deal-card/)).toHaveLength(3);
  });
});
