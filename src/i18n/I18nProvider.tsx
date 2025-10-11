/* eslint-disable react-refresh/only-export-components */
import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AVAILABLE_LOCALES, LocaleCode, TRANSLATIONS } from './translations';

interface I18nContextValue {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
  availableLocales: typeof AVAILABLE_LOCALES;
}

const I18N_STORAGE_KEY = 'prismaglow-locale';

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function normaliseLocale(candidate: string | null | undefined): LocaleCode {
  if (!candidate) return 'en';
  const normalized = candidate.split('-')[0].toLowerCase();
  return (['en', 'fr'] as LocaleCode[]).includes(normalized as LocaleCode)
    ? (normalized as LocaleCode)
    : 'en';
}

export function I18nProvider({ children }: PropsWithChildren) {
  const initial = normaliseLocale(
    typeof window !== 'undefined'
      ? window.localStorage.getItem(I18N_STORAGE_KEY) ?? navigator.language
      : 'en',
  );

  const [locale, setLocaleState] = useState<LocaleCode>(initial);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(I18N_STORAGE_KEY, next);
    }
  }, []);

  const translate = useCallback(
    (key: string, variables?: Record<string, string | number>) => {
      const table = TRANSLATIONS[locale] ?? TRANSLATIONS.en;
      const template = table[key] ?? TRANSLATIONS.en[key] ?? key;
      if (!variables) return template;
      return Object.entries(variables).reduce((acc, [token, value]) => {
        const placeholder = `{${token}}`;
        if (!acc.includes(placeholder)) {
          return acc;
        }
        return acc.split(placeholder).join(String(value));
      }, template);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: translate,
      availableLocales: AVAILABLE_LOCALES,
    }),
    [locale, setLocale, translate],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18nContext(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18nContext must be used within I18nProvider');
  }
  return ctx;
}
