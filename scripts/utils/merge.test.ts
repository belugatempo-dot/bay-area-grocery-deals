import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mergeToDealsJson } from './merge';
import type { Deal } from '../../src/types';

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'costco-001',
    storeId: 'costco',
    categoryId: 'produce',
    title: 'Strawberries',
    titleZh: '草莓',
    description: 'Fresh berries',
    descriptionZh: '新鲜浆果',
    originalPrice: 5.99,
    salePrice: 3.99,
    startDate: '2026-01-28',
    expiryDate: '2026-02-10',
    isHot: false,
    locations: ['san_jose'],
    ...overrides,
  };
}

// Mock fs module - hoisted fns must be created via vi.hoisted
const { mockReadFileSync, mockWriteFileSync } = vi.hoisted(() => {
  return {
    mockReadFileSync: vi.fn<(...args: unknown[]) => string>(),
    mockWriteFileSync: vi.fn<(...args: unknown[]) => void>(),
  };
});

vi.mock('fs', () => {
  return {
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    default: { readFileSync: mockReadFileSync, writeFileSync: mockWriteFileSync },
  };
});

describe('mergeToDealsJson', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset();
    mockWriteFileSync.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('merges new deals with empty existing deals', () => {
    mockReadFileSync.mockReturnValue('[]');
    const newDeals = [makeDeal({ storeId: 'costco' })];

    mergeToDealsJson(newDeals);

    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written).toHaveLength(1);
    expect(written[0].storeId).toBe('costco');
  });

  it('replaces deals from updated stores', () => {
    const existing = [
      makeDeal({ id: 'costco-001', storeId: 'costco', title: 'Old deal' }),
    ];
    mockReadFileSync.mockReturnValue(JSON.stringify(existing));

    const newDeals = [makeDeal({ storeId: 'costco', title: 'New deal' })];
    mergeToDealsJson(newDeals);

    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written).toHaveLength(1);
    expect(written[0].title).toBe('New deal');
  });

  it('keeps deals from stores not being scraped', () => {
    const existing = [
      makeDeal({ id: 'sprouts-001', storeId: 'sprouts', title: 'Sprouts deal', expiryDate: '2026-02-10' }),
    ];
    mockReadFileSync.mockReturnValue(JSON.stringify(existing));

    const newDeals = [makeDeal({ storeId: 'costco', title: 'Costco deal' })];
    mergeToDealsJson(newDeals);

    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written).toHaveLength(2);
    expect(written.find((d: Deal) => d.storeId === 'sprouts')!.title).toBe('Sprouts deal');
  });

  it('removes expired deals from other stores', () => {
    const existing = [
      makeDeal({ storeId: 'sprouts', expiryDate: '2026-01-30' }), // expired (before 2026-02-01)
    ];
    mockReadFileSync.mockReturnValue(JSON.stringify(existing));

    const newDeals = [makeDeal({ storeId: 'costco' })];
    mergeToDealsJson(newDeals);

    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written).toHaveLength(1);
    expect(written[0].storeId).toBe('costco');
  });

  it('keeps deals expiring today', () => {
    const existing = [
      makeDeal({ storeId: 'sprouts', expiryDate: '2026-02-01' }), // today
    ];
    mockReadFileSync.mockReturnValue(JSON.stringify(existing));

    const newDeals = [makeDeal({ storeId: 'costco' })];
    mergeToDealsJson(newDeals);

    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written).toHaveLength(2);
  });

  it('reassigns IDs sequentially per store', () => {
    mockReadFileSync.mockReturnValue('[]');
    const newDeals = [
      makeDeal({ storeId: 'costco', title: 'Deal 1' }),
      makeDeal({ storeId: 'costco', title: 'Deal 2' }),
      makeDeal({ storeId: 'sprouts', title: 'Deal 3' }),
    ];

    mergeToDealsJson(newDeals);

    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written[0].id).toBe('costco-001');
    expect(written[1].id).toBe('costco-002');
    expect(written[2].id).toBe('sprouts-001');
  });

  it('handles mixed kept + new deals with correct IDs', () => {
    const existing = [
      makeDeal({ storeId: 'sprouts', expiryDate: '2026-02-10', title: 'Kept deal' }),
    ];
    mockReadFileSync.mockReturnValue(JSON.stringify(existing));

    const newDeals = [
      makeDeal({ storeId: 'costco', title: 'New costco 1' }),
      makeDeal({ storeId: 'costco', title: 'New costco 2' }),
    ];
    mergeToDealsJson(newDeals);

    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written).toHaveLength(3);
    // IDs reassigned: sprouts-001, costco-001, costco-002
    const sproutsDeal = written.find((d: Deal) => d.storeId === 'sprouts');
    expect(sproutsDeal.id).toBe('sprouts-001');
  });

  it('pads IDs with leading zeros', () => {
    mockReadFileSync.mockReturnValue('[]');
    const newDeals = [makeDeal({ storeId: 'costco' })];

    mergeToDealsJson(newDeals);

    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written[0].id).toBe('costco-001');
  });

  it('writes JSON with 2-space indentation and trailing newline', () => {
    mockReadFileSync.mockReturnValue('[]');
    mergeToDealsJson([makeDeal()]);

    const rawContent = mockWriteFileSync.mock.calls[0][1] as string;
    expect(rawContent).toMatch(/^\[/); // starts with [
    expect(rawContent).toMatch(/\n$/); // ends with newline
    // Verify it's valid JSON with indentation
    expect(rawContent).toContain('\n  ');
  });

  it('handles empty new deals array', () => {
    const existing = [
      makeDeal({ storeId: 'sprouts', expiryDate: '2026-02-10' }),
    ];
    mockReadFileSync.mockReturnValue(JSON.stringify(existing));

    mergeToDealsJson([]);

    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    // No stores to update, so all existing non-expired deals kept
    expect(written).toHaveLength(1);
  });

  it('logs merge summary', () => {
    mockReadFileSync.mockReturnValue('[]');
    mergeToDealsJson([makeDeal()]);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Merged'));
  });
});
