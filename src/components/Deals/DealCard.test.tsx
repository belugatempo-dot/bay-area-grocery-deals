import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DealCard from './DealCard';
import type { Deal } from '../../types';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'deals.hot': 'HOT',
        'deals.showDetails': 'Show details',
        'deals.hideDetails': 'Hide details',
        'deals.availableAt': 'Available at:',
        'deals.validPeriod': `${params?.start ?? ''} - ${params?.end ?? ''} (${params?.days ?? ''} days left)`,
        'deals.validPeriodToday': `${params?.start ?? ''} - ${params?.end ?? ''} (Last day!)`,
        'deals.validPeriodExpired': `${params?.start ?? ''} - ${params?.end ?? ''} (Expired)`,
        'deals.off': `${params?.percent ?? ''}% off`,
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock useLanguage
vi.mock('../../hooks/useLanguage', () => ({
  useLanguage: () => ({
    isZh: false,
    language: 'en',
    toggleLanguage: vi.fn(),
  }),
}));

// Mock stores data
vi.mock('../../data/stores.json', () => ({
  default: [
    { id: 'costco', name: 'Costco', nameZh: 'Costco 好市多', color: '#E31837', cities: ['san_jose'] },
    { id: 'sprouts', name: 'Sprouts', nameZh: 'Sprouts', color: '#3E7D1E', cities: ['san_jose'] },
  ],
}));

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'costco-001',
    storeId: 'costco',
    categoryId: 'produce',
    title: 'Organic Strawberries',
    titleZh: '有机草莓',
    description: 'Fresh organic berries from California',
    descriptionZh: '加州新鲜有机浆果',
    originalPrice: 5.99,
    salePrice: 3.99,
    startDate: '2026-01-28',
    expiryDate: '2026-03-10',
    isHot: false,
    locations: ['san_jose', 'sunnyvale'],
    details: 'Costco warehouse savings. Member only.',
    detailsZh: 'Costco仓储优惠。仅限会员。',
    ...overrides,
  };
}

describe('DealCard', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the deal title', () => {
    render(<DealCard deal={makeDeal()} />);
    expect(screen.getByText('Organic Strawberries')).toBeInTheDocument();
  });

  it('renders the deal description', () => {
    render(<DealCard deal={makeDeal()} />);
    expect(screen.getByText('Fresh organic berries from California')).toBeInTheDocument();
  });

  it('renders store badge', () => {
    render(<DealCard deal={makeDeal()} />);
    expect(screen.getByText('Costco')).toBeInTheDocument();
  });

  it('renders store badge with correct color', () => {
    render(<DealCard deal={makeDeal()} />);
    const badge = screen.getByText('Costco');
    expect(badge.style.backgroundColor).toBe('#E31837');
  });

  it('renders sale price', () => {
    render(<DealCard deal={makeDeal()} />);
    expect(screen.getByText('$3.99')).toBeInTheDocument();
  });

  it('renders original price with strikethrough', () => {
    render(<DealCard deal={makeDeal()} />);
    const original = screen.getByText('$5.99');
    expect(original.className).toContain('line-through');
  });

  it('renders discount percentage', () => {
    render(<DealCard deal={makeDeal()} />);
    expect(screen.getByText('33% off')).toBeInTheDocument();
  });

  it('shows HOT badge for hot deals', () => {
    render(<DealCard deal={makeDeal({ isHot: true })} />);
    expect(screen.getByText(/HOT/)).toBeInTheDocument();
  });

  it('does not show HOT badge for non-hot deals', () => {
    render(<DealCard deal={makeDeal({ isHot: false })} />);
    expect(screen.queryByText(/HOT/)).not.toBeInTheDocument();
  });

  it('shows "Show details" button when details exist', () => {
    render(<DealCard deal={makeDeal()} />);
    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('does not show details button when no details', () => {
    render(<DealCard deal={makeDeal({ details: undefined, detailsZh: undefined })} />);
    expect(screen.queryByText('Show details')).not.toBeInTheDocument();
  });

  it('expands details on click', async () => {
    const user = userEvent.setup();
    render(<DealCard deal={makeDeal()} />);

    await user.click(screen.getByText('Show details'));
    expect(screen.getByText('Costco warehouse savings. Member only.')).toBeInTheDocument();
    expect(screen.getByText('Hide details')).toBeInTheDocument();
  });

  it('collapses details on second click', async () => {
    const user = userEvent.setup();
    render(<DealCard deal={makeDeal()} />);

    await user.click(screen.getByText('Show details'));
    expect(screen.getByText('Hide details')).toBeInTheDocument();

    await user.click(screen.getByText('Hide details'));
    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('shows available cities in expanded details', async () => {
    const user = userEvent.setup();
    render(<DealCard deal={makeDeal({ locations: ['san_jose', 'sunnyvale'] })} />);

    await user.click(screen.getByText('Show details'));
    expect(screen.getByText('Available at:')).toBeInTheDocument();
    // Cities should be listed
    expect(screen.getByText(/San Jose/)).toBeInTheDocument();
  });

  it('renders image when imageUrl is provided', () => {
    render(<DealCard deal={makeDeal({ imageUrl: 'https://example.com/img.jpg' })} />);
    const img = screen.getByAltText('Organic Strawberries');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
  });

  it('does not render image when imageUrl is absent', () => {
    render(<DealCard deal={makeDeal({ imageUrl: undefined })} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders expiry information with red color when expiring soon', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-09T12:00:00'));
    render(<DealCard deal={makeDeal({ startDate: '2026-02-01', expiryDate: '2026-02-10' })} />);
    // 1 day left → red
    const expiryEl = screen.getByText(/1 days left/);
    expect(expiryEl.className).toContain('text-red');
  });

  it('renders gray text for expired deals', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T12:00:00'));
    render(<DealCard deal={makeDeal({ startDate: '2026-02-01', expiryDate: '2026-02-10' })} />);
    const expiryEl = screen.getByText(/Expired/);
    expect(expiryEl.className).toContain('text-gray');
  });

  it('renders last day text for deals expiring today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T12:00:00'));
    render(<DealCard deal={makeDeal({ startDate: '2026-02-01', expiryDate: '2026-02-10' })} />);
    expect(screen.getByText(/Last day!/)).toBeInTheDocument();
  });

  it('has correct id attribute for anchoring', () => {
    const { container } = render(<DealCard deal={makeDeal({ id: 'costco-001' })} />);
    expect(container.querySelector('#deal-costco-001')).toBeInTheDocument();
  });

  it('renders unit when provided', () => {
    render(<DealCard deal={makeDeal({ unit: '/lb' })} />);
    expect(screen.getByText('/lb')).toBeInTheDocument();
  });

  it('does not show discount badge when discount is 0', () => {
    render(<DealCard deal={makeDeal({ originalPrice: 5, salePrice: 5 })} />);
    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
  });
});
