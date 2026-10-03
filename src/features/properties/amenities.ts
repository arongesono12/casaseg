import type { Locale } from '@/providers/i18n-context';

// Las comodidades se guardan en la base de datos con su nombre en español, que
// actúa como identificador estable. Aquí solo se traduce lo que se muestra.
export const amenityOptions = ['Aire acondicionado', 'Aparcamiento', 'Seguridad', 'Internet', 'Piscina', 'Jardín'] as const;

const amenityLabels: Record<Exclude<Locale, 'es'>, Record<(typeof amenityOptions)[number], string>> = {
  fr: { 'Aire acondicionado': 'Climatisation', Aparcamiento: 'Parking', Seguridad: 'Sécurité', Internet: 'Internet', Piscina: 'Piscine', Jardín: 'Jardin' },
  en: { 'Aire acondicionado': 'Air conditioning', Aparcamiento: 'Parking', Seguridad: 'Security', Internet: 'Internet', Piscina: 'Pool', Jardín: 'Garden' },
};

/** Nombre visible de una comodidad; las que escribió el propietario se muestran tal cual. */
export function amenityLabel(amenity: string, locale: Locale): string {
  if (locale === 'es') return amenity;
  return (amenityLabels[locale] as Record<string, string>)[amenity] ?? amenity;
}
