import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle';
import LocationSelector from './LocationSelector';

export default function Header() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
            {t('app.title')}
          </h1>
          <p className="hidden text-xs text-gray-500 sm:block">
            {t('app.tagline')}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <LocationSelector />
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
