import { createContext, useContext } from 'react';
import type { TranslationKey } from '@/providers/i18n-provider';

export type Locale = 'es' | 'fr' | 'en';

export type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, variables?: Record<string, string>) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
