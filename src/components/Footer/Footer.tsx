import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-8 border-t border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
      <p className="mx-auto max-w-2xl">{t('footer.disclaimer')}</p>
      <p className="mt-2">{t('footer.madeWith')}</p>
    </footer>
  );
}
