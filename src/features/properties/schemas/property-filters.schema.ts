import { z } from 'zod';

export const propertyFiltersSchema = z.object({
  location: z.string().trim().max(80, 'La ubicación es demasiado larga'),
  name: z.string().trim().max(100, 'El nombre es demasiado largo'),
  category: z.enum(['Todos', 'Apartamentos', 'Casas', 'Estudios']),
  maxPrice: z.string().trim().refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) > 0), 'Introduce un precio válido'),
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
