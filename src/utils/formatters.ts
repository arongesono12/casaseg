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

export function formatXaf(amount: number, priceType?: PriceType, locale = 'es-GQ') {
  const suffix = priceType === 'per_month' ? ' / mes' : priceType === 'per_night' ? ' / noche' : '';
  return `${getNumberFormatter(locale).format(amount)} FCFA${suffix}`;
}

export function formatDate(value: string | Date, locale = 'es-GQ') {
  return getDateFormatter(locale).format(new Date(value));
}
