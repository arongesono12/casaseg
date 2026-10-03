import { z } from 'zod';

import { getActiveLocale } from '@/lib/active-locale';
import { defineCopy } from '@/providers/i18n-context';

// Mensajes evaluados al validar, en el idioma activo.
const filterMessages = defineCopy({
  es: { locationTooLong: 'La ubicación es demasiado larga', nameTooLong: 'El nombre es demasiado largo', invalidPrice: 'Introduce un precio válido' },
  fr: { locationTooLong: 'Le lieu est trop long', nameTooLong: 'Le nom est trop long', invalidPrice: 'Saisissez un prix valide' },
  en: { locationTooLong: 'The location is too long', nameTooLong: 'The name is too long', invalidPrice: 'Enter a valid price' },
});
const message = (key: keyof (typeof filterMessages)['es']) => () => filterMessages[getActiveLocale()][key];

export const propertyFiltersSchema = z.object({
  location: z.string().trim().max(80, { error: message('locationTooLong') }),
  name: z.string().trim().max(100, { error: message('nameTooLong') }),
  category: z.enum(['Todos', 'Apartamentos', 'Casas', 'Estudios']),
  maxPrice: z.string().trim().refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) > 0), { error: message('invalidPrice') }),
  availability: z.enum(['all', 'available', 'occupied']),
  sort: z.enum(['recommended', 'rating', 'price-asc', 'price-desc', 'newest']),
});

export type PropertyFilters = z.infer<typeof propertyFiltersSchema>;

export const defaultPropertyFilters: PropertyFilters = {
  location: '',
  name: '',
  category: 'Todos',
  maxPrice: '',
  availability: 'all',
  sort: 'recommended',
};
