import { useTranslation } from 'react-i18next';
import { useDeals } from '../../hooks/useDeals';
import DealCard from './DealCard';

export default function DealGrid() {
  const { t } = useTranslation();
  const { deals } = useDeals();

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl">🛒</span>
        <p className="mt-3 text-sm text-gray-500">{t('deals.noDeals')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} />
      ))}
    </div>
  );
}
