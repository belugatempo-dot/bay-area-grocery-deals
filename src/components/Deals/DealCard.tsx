import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';
import { formatPrice, formatDateShort, getDaysUntilExpiry, getDiscountPercent } from '../../utils/formatPrice';
import { allCities } from '../../data/cities';
import storesData from '../../data/stores.json';
import type { Deal, Store } from '../../types';

const stores = storesData as Store[];

interface DealCardProps {
  deal: Deal;
}

export default function DealCard({ deal }: DealCardProps) {
  const { t } = useTranslation();
  const { isZh } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const store = stores.find((s) => s.id === deal.storeId)!;
  const daysLeft = getDaysUntilExpiry(deal.expiryDate);
  const discount = getDiscountPercent(deal.originalPrice, deal.salePrice);

  const title = isZh ? deal.titleZh : deal.title;
  const description = isZh ? deal.descriptionZh : deal.description;
  const details = isZh ? deal.detailsZh : deal.details;
  const unit = isZh ? (deal.unitZh ?? '') : (deal.unit ?? '');

  const startFormatted = formatDateShort(deal.startDate);
  const endFormatted = formatDateShort(deal.expiryDate);

  let expiryLabel: string;
  let expiryColor: string;
  if (daysLeft < 0) {
    expiryLabel = t('deals.validPeriodExpired', { start: startFormatted, end: endFormatted });
    expiryColor = 'text-gray-400';
  } else if (daysLeft === 0) {
    expiryLabel = t('deals.validPeriodToday', { start: startFormatted, end: endFormatted });
    expiryColor = 'text-red font-bold';
  } else if (daysLeft <= 2) {
    expiryLabel = t('deals.validPeriod', { start: startFormatted, end: endFormatted, days: daysLeft });
    expiryColor = 'text-red font-semibold';
  } else {
    expiryLabel = t('deals.validPeriod', { start: startFormatted, end: endFormatted, days: daysLeft });
    expiryColor = 'text-gray-500';
  }

  return (
    <div id={`deal-${deal.id}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Top row: store badge + hot + expiry */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: store.color }}
        >
          {isZh ? store.nameZh : store.name}
        </span>
        {deal.isHot && (
          <span className="rounded-full bg-red px-2 py-0.5 text-xs font-bold text-white">
            🔥 {t('deals.hot')}
          </span>
        )}
        <span className={`ml-auto text-xs ${expiryColor}`}>{expiryLabel}</span>
      </div>

      {/* Title & description (with optional image) */}
      <div className="flex gap-3">
        {deal.imageUrl && (
          <img
            src={deal.imageUrl}
            alt={title}
            className="h-16 w-16 flex-shrink-0 rounded-lg object-cover sm:h-20 sm:w-20"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 sm:text-base">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
      </div>

      {/* Price row */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-lg font-bold text-green sm:text-xl">
          {formatPrice(deal.salePrice)}
          {unit && <span className="text-sm font-normal text-gray-500">{unit}</span>}
        </span>
        <span className="text-sm text-gray-400 line-through">
          {formatPrice(deal.originalPrice)}
        </span>
        {discount > 0 && (
          <span className="rounded bg-green-light px-1.5 py-0.5 text-xs font-semibold text-green">
            {t('deals.off', { percent: discount })}
          </span>
        )}
      </div>

      {/* Expand/collapse */}
      {details && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-orange hover:text-orange-dark"
          >
            {expanded ? t('deals.hideDetails') : t('deals.showDetails')}
          </button>
          {expanded && (
            <div className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              <p>{details}</p>
              <p className="mt-2 font-medium text-gray-700">
                {t('deals.availableAt')}
              </p>
              <p className="mt-1 text-gray-500">
                {deal.locations
                  .map((locId) => {
                    const city = allCities.find((c) => c.id === locId);
                    return city ? (isZh ? city.nameZh : city.name) : locId;
                  })
                  .join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
