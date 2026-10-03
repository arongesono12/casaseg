import { derivePropertyReviewStatus } from '@/features/admin/admin-data';
import type { Property } from '@/types';

// Traducción de una fila de public.properties al modelo de la app. Vive aparte
// de las consultas para poder probarla sin cliente de Supabase.
//
// Solo se piden columnas que existen en la tabla (tests/unit/property-mapper.test.ts
// lo comprueba): una sola columna inexistente hace que PostgREST responda 400
// y la pantalla de inicio se queda sin viviendas. `isNew` y `legalStatus` no
// son columnas: se calculan a partir de `created_at` y `tourist_license_status`.
export const PROPERTY_LIST_COLUMNS = 'id,owner_id,title,location,city,image_urls,bedrooms,bathrooms,area,price,price_type,rating,review_count,category,is_occupied,status,tourist_license_status,created_at';
export const PROPERTY_MAP_COLUMNS = 'id,title,location,city,image_urls,price,price_type,coordinates';

/** Días durante los que una vivienda recién publicada lleva la insignia "Nuevo". */
export const NEW_LISTING_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PropertyRow = Record<string, unknown>;

function isRecentlyPublished(createdAt: unknown, now: Date): boolean {
  if (typeof createdAt !== 'string') return false;
  const published = new Date(createdAt).getTime();
  if (Number.isNaN(published)) return false;
  return now.getTime() - published <= NEW_LISTING_DAYS * DAY_MS;
}

export function mapProperty(row: PropertyRow, now: Date = new Date()): Property {
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
    isNew: isRecentlyPublished(row.created_at, now),
    isOccupied: Boolean(row.is_occupied ?? row.isOccupied),
    amenities: (row.amenities ?? row.features ?? []) as string[],
    ownerName: String(row.owner_name ?? row.ownerName ?? 'Propietario verificado'),
    ownerAvatar: row.owner_avatar ? String(row.owner_avatar) : row.ownerAvatar ? String(row.ownerAvatar) : undefined,
    legalStatus: derivePropertyReviewStatus(row.status, row.tourist_license_status),
    coordinates: row.coordinates as Property['coordinates'],
  };
}
