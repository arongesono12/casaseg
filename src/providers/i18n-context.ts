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

/** Sustituye los marcadores `{nombre}` de un texto. */
export function interpolate(template: string, variables?: Record<string, string | number>): string {
  return Object.entries(variables ?? {}).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    template,
  );
}

type CopyShape<T> = { readonly [K in keyof T]: string };

/**
 * Textos propios de una pantalla, en los tres idiomas. El español define las
 * claves y TypeScript exige que francés e inglés tengan exactamente las mismas.
 */
export function defineCopy<T extends Record<string, string>>(copy: { es: T; fr: CopyShape<T>; en: CopyShape<T> }): Record<Locale, CopyShape<T>> {
  return copy;
}

/** Devuelve los textos de la pantalla en el idioma activo. */
export function useCopy<T>(copy: Record<Locale, T>): T {
  return copy[useI18n().locale];
}
