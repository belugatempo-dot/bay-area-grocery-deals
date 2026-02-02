import { describe, it, expect } from 'vitest';
import { distanceMiles, citiesWithinRadius } from './geo';

describe('distanceMiles', () => {
  it('returns 0 for same point', () => {
    const p = { lat: 37.3382, lng: -121.8863 };
    expect(distanceMiles(p, p)).toBe(0);
  });

  it('calculates distance between San Jose and San Francisco (~42mi)', () => {
    const sj = { lat: 37.3382, lng: -121.8863 };
    const sf = { lat: 37.7749, lng: -122.4194 };
    const dist = distanceMiles(sj, sf);
    expect(dist).toBeGreaterThan(40);
    expect(dist).toBeLessThan(50);
  });

  it('calculates distance between San Jose and Sunnyvale (~6mi)', () => {
    const sj = { lat: 37.3382, lng: -121.8863 };
    const sv = { lat: 37.3688, lng: -122.0363 };
    const dist = distanceMiles(sj, sv);
    expect(dist).toBeGreaterThan(5);
    expect(dist).toBeLessThan(10);
  });

  it('is symmetric', () => {
    const a = { lat: 37.3382, lng: -121.8863 };
    const b = { lat: 37.7749, lng: -122.4194 };
    expect(distanceMiles(a, b)).toBeCloseTo(distanceMiles(b, a), 10);
  });

  it('calculates distance between nearby points', () => {
    const a = { lat: 37.3382, lng: -121.8863 };
    const b = { lat: 37.3400, lng: -121.8880 };
    const dist = distanceMiles(a, b);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(1);
  });

  it('handles equator to north pole distance', () => {
    const eq = { lat: 0, lng: 0 };
    const np = { lat: 90, lng: 0 };
    const dist = distanceMiles(eq, np);
    // quarter of earth circumference ~6215 miles
    expect(dist).toBeGreaterThan(6000);
    expect(dist).toBeLessThan(6300);
  });

  it('handles points across prime meridian', () => {
    const a = { lat: 51.5, lng: -0.1 }; // London
    const b = { lat: 48.8, lng: 2.3 };  // Paris
    const dist = distanceMiles(a, b);
    expect(dist).toBeGreaterThan(200);
    expect(dist).toBeLessThan(220);
  });

  it('calculates Oakland to Berkeley (~4mi)', () => {
    const oakland = { lat: 37.8044, lng: -122.2712 };
    const berkeley = { lat: 37.8716, lng: -122.2727 };
    const dist = distanceMiles(oakland, berkeley);
    expect(dist).toBeGreaterThan(3);
    expect(dist).toBeLessThan(6);
  });
});

describe('citiesWithinRadius', () => {
  it('includes nearby cities within 5 miles of San Jose', () => {
    const sj = { lat: 37.3382, lng: -121.8863 };
    const nearby = citiesWithinRadius(sj, 5);
    expect(nearby).toContain('san_jose');
  });

  it('excludes far cities from small radius', () => {
    const sj = { lat: 37.3382, lng: -121.8863 };
    const nearby = citiesWithinRadius(sj, 5);
    expect(nearby).not.toContain('san_francisco');
  });

  it('includes SF with 50 mile radius from San Jose', () => {
    const sj = { lat: 37.3382, lng: -121.8863 };
    const nearby = citiesWithinRadius(sj, 50);
    expect(nearby).toContain('san_francisco');
  });

  it('returns empty for a point far from Bay Area', () => {
    const remote = { lat: 0, lng: 0 };
    const nearby = citiesWithinRadius(remote, 10);
    expect(nearby).toHaveLength(0);
  });

  it('returns all cities with very large radius', () => {
    const center = { lat: 37.5, lng: -122.0 };
    const nearby = citiesWithinRadius(center, 500);
    expect(nearby.length).toBeGreaterThan(30);
  });

  it('includes Sunnyvale within 10mi of San Jose', () => {
    const sj = { lat: 37.3382, lng: -121.8863 };
    const nearby = citiesWithinRadius(sj, 10);
    expect(nearby).toContain('sunnyvale');
  });

  it('radius of 0 returns only exact matches', () => {
    const sj = { lat: 37.3382, lng: -121.8863 };
    const nearby = citiesWithinRadius(sj, 0);
    // Only cities at exact same coordinates (unlikely)
    expect(nearby.length).toBeLessThanOrEqual(1);
  });

  it('includes East Bay cities within 20mi of Fremont', () => {
    const fremont = { lat: 37.5485, lng: -121.9886 };
    const nearby = citiesWithinRadius(fremont, 20);
    expect(nearby).toContain('fremont');
    expect(nearby).toContain('newark');
    expect(nearby).toContain('union_city');
    expect(nearby).toContain('hayward');
  });

  it('returns string[] of city IDs', () => {
    const sj = { lat: 37.3382, lng: -121.8863 };
    const nearby = citiesWithinRadius(sj, 10);
    for (const id of nearby) {
      expect(typeof id).toBe('string');
      expect(id).not.toContain(' ');
    }
  });
});
