import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFilters } from '../../hooks/useFilters';

export default function SearchBar() {
  const { t } = useTranslation();
  const { filters, setSearchQuery } = useFilters();
  const [localQuery, setLocalQuery] = useState(filters.searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setSearchQuery(localQuery);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [localQuery, setSearchQuery]);

  // Sync external clear
  useEffect(() => {
    if (filters.searchQuery === '' && localQuery !== '') {
      setLocalQuery('');
    }
  }, [filters.searchQuery]);

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        placeholder={t('search.placeholder')}
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-orange focus:ring-1 focus:ring-orange"
      />
    </div>
  );
}
