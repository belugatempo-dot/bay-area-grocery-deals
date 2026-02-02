import type { LatLng } from '../types';
import { allCities } from '../data/cities';

const EARTH_RADIUS_MILES = 3958.8;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function distanceMiles(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

export function citiesWithinRadius(
  origin: LatLng,
  radiusMiles: number
): string[] {
  return allCities
    .filter((city) => distanceMiles(origin, { lat: city.lat, lng: city.lng }) <= radiusMiles)
    .map((city) => city.id);
}
