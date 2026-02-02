import { useTranslation } from 'react-i18next';
import { useMap } from '../../hooks/useMap';

export default function MapToggle() {
  const { t } = useTranslation();
  const { mapVisible, toggleMapVisible } = useMap();

  return (
    <button
      onClick={toggleMapVisible}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 md:hidden"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
      {mapVisible ? t('map.hideMap') : t('map.showMap')}
    </button>
  );
}
