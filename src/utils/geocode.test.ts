import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isZipCode, geocodeAddress } from './geocode';

describe('isZipCode', () => {
  it('recognizes valid 5-digit zip code', () => {
    expect(isZipCode('94086')).toBe(true);
  });

  it('recognizes 5+4 zip code format', () => {
    expect(isZipCode('94086-1234')).toBe(true);
  });

  it('rejects non-numeric string', () => {
    expect(isZipCode('abcde')).toBe(false);
  });

  it('rejects too-short zip code', () => {
    expect(isZipCode('9408')).toBe(false);
  });

  it('rejects too-long zip code', () => {
    expect(isZipCode('940860')).toBe(false);
  });

  it('handles trimming whitespace', () => {
    expect(isZipCode('  94086  ')).toBe(true);
  });
});

describe('geocodeAddress', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns empty array for empty query', async () => {
    const result = await geocodeAddress('');
    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns empty array for whitespace-only query', async () => {
    const result = await geocodeAddress('   ');
    expect(result).toEqual([]);
  });

  it('uses postalcode param for zip code queries', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

    await geocodeAddress('94086');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('postalcode=94086');
    expect(calledUrl).toContain('country=us');
    expect(calledUrl).not.toContain('viewbox');
  });

  it('uses q param and viewbox for non-zip queries', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

    // Advance time to avoid rate limit from previous test
    await vi.advanceTimersByTimeAsync(2000);
    await geocodeAddress('San Jose');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('q=San+Jose');
    expect(calledUrl).toContain('viewbox=');
    expect(calledUrl).toContain('bounded=1');
  });

  it('sends correct User-Agent header', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

    await vi.advanceTimersByTimeAsync(2000);
    await geocodeAddress('test');

    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['User-Agent']).toBe('BayAreaGroceryDeals/1.0');
  });

  it('returns empty array for non-ok response', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response('', { status: 500 }));

    await vi.advanceTimersByTimeAsync(2000);
    const result = await geocodeAddress('test');
    expect(result).toEqual([]);
  });

  it('maps response to GeocodingResult format', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify([
          { display_name: 'San Jose, CA', lat: '37.3382', lon: '-121.8863' },
        ]),
        { status: 200 }
      )
    );

    await vi.advanceTimersByTimeAsync(2000);
    const result = await geocodeAddress('San Jose');

    expect(result).toEqual([
      { displayName: 'San Jose, CA', lat: 37.3382, lng: -121.8863 },
    ]);
  });

  it('maps multiple results', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify([
          { display_name: 'Result 1', lat: '37.0', lon: '-122.0' },
          { display_name: 'Result 2', lat: '37.5', lon: '-122.5' },
        ]),
        { status: 200 }
      )
    );

    await vi.advanceTimersByTimeAsync(2000);
    const result = await geocodeAddress('test');
    expect(result).toHaveLength(2);
  });

  it('respects rate limiting between requests', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    );

    // First request
    await vi.advanceTimersByTimeAsync(2000);
    await geocodeAddress('first');

    // Second request immediately should wait
    const start = Date.now();
    await geocodeAddress('second');
    const elapsed = Date.now() - start;

    // Should have waited close to 1000ms for rate limit
    expect(elapsed).toBeGreaterThanOrEqual(900);
  });

  it('uses 5-digit part of 5+4 zip for postalcode param', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

    await vi.advanceTimersByTimeAsync(2000);
    await geocodeAddress('94086-1234');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('postalcode=94086');
    expect(calledUrl).not.toContain('94086-1234');
  });

  it('includes correct base params in all requests', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

    await vi.advanceTimersByTimeAsync(2000);
    await geocodeAddress('test');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('format=json');
    expect(calledUrl).toContain('addressdetails=1');
    expect(calledUrl).toContain('limit=5');
    expect(calledUrl).toContain('nominatim.openstreetmap.org');
  });
});
