import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';
import { formatPrice } from '../../utils/formatPrice';
import storesData from '../../data/stores.json';
import type { CityDealCluster, Store } from '../../types';

const stores = storesData as Store[];

interface MapPopupContentProps {
  cluster: CityDealCluster;
  onDealClick?: (dealId: string) => void;
}

export default function MapPopupContent({ cluster, onDealClick }: MapPopupContentProps) {
  const { t } = useTranslation();
  const { isZh } = useLanguage();

  const cityName = isZh ? cluster.cityNameZh : cluster.cityName;
  const displayDeals = cluster.deals.slice(0, 5);

  return (
    <div className="min-w-[200px] max-w-[280px]">
      <h3 className="mb-1 text-sm font-bold text-gray-900">
        {t('map.dealsInCity', { count: cluster.deals.length, city: cityName })}
      </h3>
      <ul className="space-y-1.5">
        {displayDeals.map((deal) => {
          const store = stores.find((s) => s.id === deal.storeId);
          return (
            <li
              key={deal.id}
              className="cursor-pointer rounded px-1 py-0.5 hover:bg-gray-100"
              onClick={() => onDealClick?.(deal.id)}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: store?.color ?? '#999' }}
                />
                <span className="truncate text-xs text-gray-800">
                  {isZh ? deal.titleZh : deal.title}
                </span>
                <span className="ml-auto shrink-0 text-xs font-semibold text-green">
                  {formatPrice(deal.salePrice)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {cluster.deals.length > 5 && (
        <p className="mt-1 text-xs text-gray-400">
          +{cluster.deals.length - 5} more
        </p>
      )}
    </div>
  );
}
