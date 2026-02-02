import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMap } from '../../hooks/useMap';
import { geocodeAddress, type GeocodingResult } from '../../utils/geocode';

const RADIUS_OPTIONS = [5, 10, 15, 20, 25];

export default function AddressSearch() {
  const { t } = useTranslation();
  const { userLocation, radiusMiles, setUserLocation, setRadius } = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const r = await geocodeAddress(query);
      setResults(r);
      setOpen(r.length > 0);
    }, 500);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectResult(r: GeocodingResult) {
    setUserLocation({ lat: r.lat, lng: r.lng });
    setQuery(r.displayName.split(',').slice(0, 2).join(','));
    setOpen(false);
  }

  function handleClear() {
    setUserLocation(null);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center" ref={containerRef}>
      {/* Address input */}
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('map.searchAddress')}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-orange focus:ring-1 focus:ring-orange"
        />
        {open && results.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {results.map((r, i) => (
              <li
                key={i}
                onClick={() => selectResult(r)}
                className="cursor-pointer px-3 py-2 text-xs text-gray-700 hover:bg-orange-light"
              >
                {r.displayName}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Radius selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
          {t('map.radius')}:
        </label>
        <select
          value={radiusMiles}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 outline-none focus:border-orange"
        >
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {t('map.miles', { count: r })}
            </option>
          ))}
        </select>

        {/* Clear button */}
        {userLocation && (
          <button
            onClick={handleClear}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-orange hover:bg-orange-light"
          >
            {t('map.clearLocation')}
          </button>
        )}
      </div>
    </div>
  );
}
