import type { PriceType } from '@/types';

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function getNumberFormatter(locale: string) {
  let formatter = numberFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale);
    numberFormatters.set(locale, formatter);
  }
  return formatter;
}

function getDateFormatter(locale: string) {
  let formatter = dateFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
    dateFormatters.set(locale, formatter);
  }
  return formatter;
}

const rentalSuffixes: Record<string, { per_month: string; per_night: string }> = {
  es: { per_month: ' / mes', per_night: ' / noche' },
  fr: { per_month: ' / mois', per_night: ' / nuit' },
  en: { per_month: ' / month', per_night: ' / night' },
};

export function formatXaf(amount: number, priceType?: PriceType, locale = 'es-GQ') {
  const suffixes = rentalSuffixes[locale.slice(0, 2).toLowerCase()] ?? rentalSuffixes.es;
  const suffix = priceType === 'per_month' || priceType === 'per_night' ? suffixes[priceType] : '';
  return `${getNumberFormatter(locale).format(amount)} FCFA${suffix}`;
}

export function formatDate(value: string | Date, locale = 'es-GQ') {
  return getDateFormatter(locale).format(new Date(value));
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

/** Hora corta de un mensaje ("9:07"). Una fecha inválida no debe romper la lista. */
export function formatTime(value: string | Date, locale = 'es-GQ'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  let formatter = timeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
    timeFormatters.set(locale, formatter);
  }
  return formatter.format(date);
}
