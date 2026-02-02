import { useFilters } from '../../hooks/useFilters';
import { useLanguage } from '../../hooks/useLanguage';
import storesData from '../../data/stores.json';
import type { Store } from '../../types';

const stores = storesData as Store[];

export default function StoreFilter() {
  const { filters, toggleStore } = useFilters();
  const { isZh } = useLanguage();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {stores.map((store) => {
        const active = filters.selectedStores.includes(store.id);
        return (
          <button
            key={store.id}
            onClick={() => toggleStore(store.id)}
            className="flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all sm:text-sm"
            style={
              active
                ? { backgroundColor: store.color, borderColor: store.color, color: '#fff' }
                : { borderColor: '#E5E7EB', color: '#4B5563' }
            }
          >
            {isZh ? store.nameZh : store.name}
          </button>
        );
      })}
    </div>
  );
}
