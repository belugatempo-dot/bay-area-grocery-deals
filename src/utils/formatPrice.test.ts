import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatPrice, getDaysUntilExpiry, formatDateShort, getDiscountPercent } from './formatPrice';

describe('formatPrice', () => {
  it('formats whole dollar amounts', () => {
    expect(formatPrice(5)).toBe('$5.00');
  });

  it('formats cents correctly', () => {
    expect(formatPrice(3.5)).toBe('$3.50');
  });

  it('formats typical grocery price', () => {
    expect(formatPrice(12.99)).toBe('$12.99');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('formats large prices', () => {
    expect(formatPrice(1299.99)).toBe('$1299.99');
  });

  it('rounds to two decimal places', () => {
    expect(formatPrice(1.999)).toBe('$2.00');
  });

  it('handles very small values', () => {
    expect(formatPrice(0.01)).toBe('$0.01');
  });

  it('handles three-decimal floats', () => {
    expect(formatPrice(4.995)).toBe('$5.00');
  });
});

describe('getDaysUntilExpiry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T12:00:00'));
    expect(getDaysUntilExpiry('2026-02-01')).toBe(0);
  });

  it('returns positive days for future date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T12:00:00'));
    expect(getDaysUntilExpiry('2026-02-08')).toBe(7);
  });

  it('returns negative days for past date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T12:00:00'));
    expect(getDaysUntilExpiry('2026-02-08')).toBe(-2);
  });

  it('returns 1 for tomorrow', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T23:59:00'));
    expect(getDaysUntilExpiry('2026-02-02')).toBe(1);
  });

  it('handles year boundaries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-30T12:00:00'));
    expect(getDaysUntilExpiry('2026-01-02')).toBe(3);
  });

  it('returns -1 for yesterday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-02T12:00:00'));
    expect(getDaysUntilExpiry('2026-02-01')).toBe(-1);
  });
});

describe('formatDateShort', () => {
  it('formats a simple date', () => {
    expect(formatDateShort('2026-02-01')).toBe('2/1');
  });

  it('formats double-digit month and day', () => {
    expect(formatDateShort('2026-12-25')).toBe('12/25');
  });

  it('formats January 1st', () => {
    expect(formatDateShort('2026-01-01')).toBe('1/1');
  });

  it('formats month with leading zero in source', () => {
    expect(formatDateShort('2026-03-05')).toBe('3/5');
  });

  it('formats end of month', () => {
    expect(formatDateShort('2026-02-28')).toBe('2/28');
  });

  it('formats leap year date', () => {
    expect(formatDateShort('2028-02-29')).toBe('2/29');
  });

  it('formats October date', () => {
    expect(formatDateShort('2026-10-15')).toBe('10/15');
  });

  it('formats November 30', () => {
    expect(formatDateShort('2026-11-30')).toBe('11/30');
  });
});

describe('getDiscountPercent', () => {
  it('calculates 50% discount', () => {
    expect(getDiscountPercent(10, 5)).toBe(50);
  });

  it('calculates 25% discount', () => {
    expect(getDiscountPercent(20, 15)).toBe(25);
  });

  it('calculates 0% when prices are equal', () => {
    expect(getDiscountPercent(10, 10)).toBe(0);
  });

  it('returns 0 when originalPrice is 0', () => {
    expect(getDiscountPercent(0, 5)).toBe(0);
  });

  it('returns 0 when originalPrice is negative', () => {
    expect(getDiscountPercent(-10, 5)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(getDiscountPercent(3, 2)).toBe(33);
  });

  it('calculates 100% discount (free)', () => {
    expect(getDiscountPercent(10, 0)).toBe(100);
  });

  it('calculates small discount', () => {
    expect(getDiscountPercent(9.99, 8.99)).toBe(10);
  });
});
