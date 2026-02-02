import { useLanguage } from '../../hooks/useLanguage';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-sm font-medium transition-colors hover:border-orange"
    >
      <span className={language === 'en' ? 'text-orange font-bold' : 'text-gray-500'}>
        EN
      </span>
      <span className="text-gray-300">|</span>
      <span className={language === 'zh' ? 'text-orange font-bold' : 'text-gray-500'}>
        中文
      </span>
    </button>
  );
}
