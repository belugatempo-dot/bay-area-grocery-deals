export interface GeocodingResult {
  displayName: string;
  lat: number;
  lng: number;
}

// Bay Area bounding box
const VIEWBOX = '-122.6,37.1,-121.7,38.0';

let lastRequestTime = 0;

// Check if the query looks like a US zip code (5 digits or 5+4)
function isZipCode(query: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(query.trim());
}

export async function geocodeAddress(
  query: string
): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  // Respect Nominatim rate limit: max 1 req/sec
  const now = Date.now();
  const wait = Math.max(0, 1000 - (now - lastRequestTime));
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastRequestTime = Date.now();

  const trimmed = query.trim();
  const params = new URLSearchParams({
    format: 'json',
    addressdetails: '1',
    limit: '5',
  });

  if (isZipCode(trimmed)) {
    // Use postalcode search for zip codes — more accurate
    params.set('postalcode', trimmed.split('-')[0]);
    params.set('country', 'us');
  } else {
    params.set('q', trimmed);
    params.set('viewbox', VIEWBOX);
    params.set('bounded', '1');
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        'User-Agent': 'BayAreaGroceryDeals/1.0',
      },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return data.map(
    (item: { display_name: string; lat: string; lon: string }) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    })
  );
}
