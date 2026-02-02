import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';

export function useLanguage() {
  const { i18n } = useTranslation();
  const { state, dispatch } = useAppContext();

  const toggleLanguage = useCallback(() => {
    const next = state.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(next);
    dispatch({ type: 'SET_LANGUAGE', language: next });
    localStorage.setItem('bay-area-deals-lang', next);
  }, [state.language, i18n, dispatch]);

  return {
    language: state.language,
    isZh: state.language === 'zh',
    toggleLanguage,
  };
}
