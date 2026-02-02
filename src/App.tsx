import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import Header from './components/Header/Header';
import SearchBar from './components/Search/SearchBar';
import StoreFilter from './components/Filters/StoreFilter';
import CategoryFilter from './components/Filters/CategoryFilter';
import DealGrid from './components/Deals/DealGrid';
import Footer from './components/Footer/Footer';
import AddressSearch from './components/Map/AddressSearch';
import MapToggle from './components/Map/MapToggle';
import { useDeals } from './hooks/useDeals';
import { useFilters } from './hooks/useFilters';
import { useLanguage } from './hooks/useLanguage';
import { useMap } from './hooks/useMap';

const DealMap = lazy(() => import('./components/Map/DealMap'));

function MapFallback() {
  return (
    <div className="flex h-full items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400">
      Loading map...
    </div>
  );
}

function AppContent() {
  const { t } = useTranslation();
  const { deals, lastUpdated } = useDeals();
  const { filters, clearFilters } = useFilters();
  const { isZh } = useLanguage();
  const { mapVisible } = useMap();

  const hasActiveFilters =
    filters.selectedStores.length > 0 ||
    filters.selectedCategories.length > 0 ||
    filters.searchQuery.trim() !== '' ||
    filters.userLocation !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-4">
        {/* Address search */}
        <div className="mb-4">
          <AddressSearch />
        </div>

        {/* Search */}
        <div className="mb-4">
          <SearchBar />
        </div>

        {/* Filters */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">
            {t('filters.stores')}
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-medium text-orange hover:text-orange-dark"
            >
              {t('filters.clearAll')}
            </button>
          )}
        </div>
        <StoreFilter />

        <div className="mb-2 mt-3">
          <span className="text-xs font-medium text-gray-500">
            {t('filters.categories')}
          </span>
        </div>
        <CategoryFilter />

        {/* Last updated + count */}
        <div className="mt-4 mb-3 flex items-center justify-between text-xs text-gray-400">
          <span>
            {t('deals.lastUpdated', {
              date: isZh ? '2026年2月1日' : lastUpdated,
            })}
          </span>
          <span>
            {deals.length} {isZh ? '条折扣' : 'deals'}
          </span>
        </div>

        {/* Mobile map toggle */}
        <div className="mb-3 md:hidden">
          <MapToggle />
        </div>

        {/* Mobile collapsible map */}
        {mapVisible && (
          <div className="mb-4 h-[300px] md:hidden">
            <Suspense fallback={<MapFallback />}>
              <DealMap />
            </Suspense>
          </div>
        )}

        {/* Desktop: split layout */}
        <div className="flex gap-4">
          {/* Deal list */}
          <div className="w-full md:w-[45%] md:overflow-auto">
            <DealGrid />
          </div>

          {/* Desktop map */}
          <div className="sticky top-0 hidden h-[calc(100vh-2rem)] md:block md:w-[55%]">
            <Suspense fallback={<MapFallback />}>
              <DealMap />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
          Loading...
        </div>
      }
    >
      <AppContent />
    </Suspense>
  );
}
