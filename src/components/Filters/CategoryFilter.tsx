import { useFilters } from '../../hooks/useFilters';
import { useLanguage } from '../../hooks/useLanguage';
import categoriesData from '../../data/categories.json';
import type { Category } from '../../types';

const categories = categoriesData as Category[];

export default function CategoryFilter() {
  const { filters, toggleCategory } = useFilters();
  const { isZh } = useLanguage();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {categories.map((cat) => {
        const active = filters.selectedCategories.includes(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            className={`flex flex-shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all sm:text-sm ${
              active
                ? 'border-orange bg-orange-light text-orange-dark'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{isZh ? cat.nameZh : cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
