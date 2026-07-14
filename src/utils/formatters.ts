import type { PriceType } from '@/types';

export function formatXaf(amount: number, priceType?: PriceType, locale = 'es-GQ') {
  const suffix = priceType === 'per_month' ? ' / mes' : priceType === 'per_night' ? ' / noche' : '';
  return `${new Intl.NumberFormat(locale).format(amount)} XAF${suffix}`;
}

export function formatDate(value: string | Date, locale = 'es-GQ') {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
}
