import { useTranslation } from 'react-i18next';
import { useFilters } from '../../hooks/useFilters';
import { useLanguage } from '../../hooks/useLanguage';
import { cityGroups } from '../../data/cities';

export default function LocationSelector() {
  const { t } = useTranslation();
  const { filters, setCity } = useFilters();
  const { isZh } = useLanguage();

  return (
    <select
      value={filters.selectedCity}
      onChange={(e) => setCity(e.target.value)}
      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 outline-none transition-colors hover:border-orange focus:border-orange focus:ring-1 focus:ring-orange"
    >
      <option value="">{t('location.all')}</option>
      {cityGroups.map((group) => (
        <optgroup
          key={group.region}
          label={isZh ? group.regionNameZh : group.regionName}
        >
          {group.cities.map((city) => (
            <option key={city.id} value={city.id}>
              {isZh ? city.nameZh : city.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
