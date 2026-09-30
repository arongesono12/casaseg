import type { PropertyFilters } from '@/features/properties/schemas/property-filters.schema';

export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (filters: PropertyFilters) => [...propertyKeys.lists(), filters] as const,
  map: (filters: PropertyFilters) => [...propertyKeys.all, 'map', filters] as const,
  count: (filters: PropertyFilters) => [...propertyKeys.all, 'count', filters] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
  favorites: (userId: string) => [...propertyKeys.all, 'favorites', userId] as const,
};
