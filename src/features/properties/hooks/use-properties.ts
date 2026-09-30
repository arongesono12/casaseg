import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchMapProperties, fetchProperties, fetchPropertiesPage, fetchProperty, fetchPropertyCount } from '@/features/properties/api/property.queries';
import { propertyKeys } from '@/features/properties/api/property.keys';
import type { PropertyFilters } from '@/features/properties/schemas/property-filters.schema';

export function useProperties(filters: PropertyFilters) {
  return useQuery({ queryKey: propertyKeys.list(filters), queryFn: ({ signal }) => fetchProperties(filters, signal), placeholderData: (previous) => previous });
}

export function useInfiniteProperties(filters: PropertyFilters) {
  return useInfiniteQuery({
    queryKey: [...propertyKeys.list(filters), 'infinite'],
    queryFn: ({ pageParam, signal }) => fetchPropertiesPage(filters, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}

export function useProperty(id: string) {
  return useQuery({ queryKey: propertyKeys.detail(id), queryFn: ({ signal }) => fetchProperty(id, signal), enabled: Boolean(id) });
}

export function useMapProperties(filters: PropertyFilters) {
  return useQuery({ queryKey: propertyKeys.map(filters), queryFn: ({ signal }) => fetchMapProperties(filters, signal) });
}

export function usePropertyCount(filters: PropertyFilters | null) {
  return useQuery({ queryKey: filters ? propertyKeys.count(filters) : [...propertyKeys.all, 'count', 'invalid'], queryFn: ({ signal }) => fetchPropertyCount(filters!, signal), enabled: Boolean(filters) });
}
