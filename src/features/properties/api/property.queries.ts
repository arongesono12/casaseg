import { properties as fallbackProperties } from '@/data/properties';
import type { PropertyFilters } from '@/features/properties/schemas/property-filters.schema';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Property } from '@/types';

type PropertyRow = Record<string, unknown>;
export const PROPERTY_PAGE_SIZE = 12;

export type PropertyPage = {
  items: Property[];
  nextPage?: number;
};

function mapProperty(row: PropertyRow): Property {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id ?? row.ownerId ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    location: String(row.location ?? ''),
    city: String(row.city ?? ''),
    imageUrls: (row.image_urls ?? row.imageUrls ?? []) as string[],
    bedrooms: Number(row.bedrooms ?? 0),
    bathrooms: Number(row.bathrooms ?? 0),
    area: Number(row.area ?? 0),
    price: Number(row.price ?? 0),
    priceType: (row.price_type ?? row.priceType ?? 'per_month') as Property['priceType'],
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? row.reviewCount ?? 0),
    category: (row.category ?? 'Apartamentos') as Property['category'],
    isNew: Boolean(row.is_new ?? row.isNew),
    isOccupied: Boolean(row.is_occupied ?? row.isOccupied),
    amenities: (row.amenities ?? row.features ?? []) as string[],
    ownerName: String(row.owner_name ?? row.ownerName ?? 'Propietario verificado'),
    ownerAvatar: row.owner_avatar ? String(row.owner_avatar) : row.ownerAvatar ? String(row.ownerAvatar) : undefined,
    legalStatus: (row.legal_status ?? 'verified') as Property['legalStatus'],
    coordinates: row.coordinates as Property['coordinates'],
  };
}

export async function fetchProperties(filters: PropertyFilters, signal?: AbortSignal) {
  if (!isSupabaseConfigured) return filterFallback(filters);
  let query = supabase.from('properties').select('*').eq('status', 'active').range(0, 19);
  if (filters.location) query = query.ilike('location', `%${filters.location}%`);
  if (filters.name) query = query.ilike('title', `%${filters.name}%`);
  if (filters.category !== 'Todos') query = query.eq('category', filters.category);
  if (filters.maxPrice) query = query.lte('price', Number(filters.maxPrice));
  if (filters.availability !== 'all') query = query.eq('is_occupied', filters.availability === 'occupied');
  if (filters.sort === 'rating') query = query.order('rating', { ascending: false });
  if (filters.sort === 'price-asc') query = query.order('price', { ascending: true });
  if (filters.sort === 'price-desc') query = query.order('price', { ascending: false });
  if (filters.sort === 'newest') query = query.order('created_at', { ascending: false });
  const { data, error } = await query.abortSignal(signal ?? new AbortController().signal);
  if (error) throw error;
  return (data as PropertyRow[]).map(mapProperty);
}

export async function fetchPropertiesPage(filters: PropertyFilters, page: number, signal?: AbortSignal): Promise<PropertyPage> {
  const from = page * PROPERTY_PAGE_SIZE;
  const to = from + PROPERTY_PAGE_SIZE - 1;

  if (!isSupabaseConfigured) {
    const filtered = filterFallback(filters);
    const items = filtered.slice(from, to + 1);
    return { items, nextPage: from + items.length < filtered.length ? page + 1 : undefined };
  }

  let query = supabase.from('properties').select('*').eq('status', 'active').range(from, to);
  if (filters.location) query = query.ilike('location', `%${filters.location}%`);
  if (filters.name) query = query.ilike('title', `%${filters.name}%`);
  if (filters.category !== 'Todos') query = query.eq('category', filters.category);
  if (filters.maxPrice) query = query.lte('price', Number(filters.maxPrice));
  if (filters.availability !== 'all') query = query.eq('is_occupied', filters.availability === 'occupied');
  if (filters.sort === 'rating') query = query.order('rating', { ascending: false });
  else if (filters.sort === 'price-asc') query = query.order('price', { ascending: true });
  else if (filters.sort === 'price-desc') query = query.order('price', { ascending: false });
  else query = query.order('created_at', { ascending: false });
  query = query.order('id', { ascending: true });

  const { data, error } = await query.abortSignal(signal ?? new AbortController().signal);
  if (error) throw error;
  const items = (data as PropertyRow[]).map(mapProperty);
  return { items, nextPage: items.length === PROPERTY_PAGE_SIZE ? page + 1 : undefined };
}

export async function fetchProperty(id: string, signal?: AbortSignal) {
  if (!isSupabaseConfigured) return fallbackProperties.find((property) => property.id === id) ?? null;
  const { data, error } = await supabase.from('properties').select('*').eq('id', id).abortSignal(signal ?? new AbortController().signal).single();
  if (error) throw error;
  return mapProperty(data as PropertyRow);
}

export async function fetchFavorites(userId: string) {
  if (!isSupabaseConfigured) return [] as string[];
  const { data, error } = await supabase.from('favorites').select('property_id').eq('user_id', userId);
  if (error) throw error;
  return data.map((favorite) => String(favorite.property_id));
}

export async function fetchOwnerProperties(userId: string) {
  if (!isSupabaseConfigured) return fallbackProperties.filter((property) => property.ownerId === userId);
  const { data, error } = await supabase.from('properties').select('*').eq('owner_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as PropertyRow[]).map(mapProperty);
}

function filterFallback(filters: PropertyFilters) {
  const result = fallbackProperties.filter((property) => {
    const text = `${property.title} ${property.location}`.toLowerCase();
    return (filters.category === 'Todos' || property.category === filters.category)
      && (!filters.location || property.location.toLowerCase().includes(filters.location.toLowerCase()))
      && (!filters.name || text.includes(filters.name.toLowerCase()))
      && (!filters.maxPrice || property.price <= Number(filters.maxPrice))
      && (filters.availability === 'all' || property.isOccupied === (filters.availability === 'occupied'));
  });
  return [...result].sort((a, b) => filters.sort === 'price-asc' ? a.price - b.price : filters.sort === 'price-desc' ? b.price - a.price : filters.sort === 'rating' ? b.rating - a.rating : 0);
}
