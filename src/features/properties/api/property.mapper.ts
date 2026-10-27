import { derivePropertyReviewStatus } from '@/features/admin/admin-data';
import type { Property, PropertyOwnershipStatus } from '@/types';

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
    serviceFeeAmount: Number(row.service_fee_amount ?? row.serviceFeeAmount ?? 0),
    cleaningFeeAmount: Number(row.cleaning_fee_amount ?? row.cleaningFeeAmount ?? 0),
    taxAmount: Number(row.tax_amount ?? row.taxAmount ?? 0),
    securityDepositAmount: Number(row.security_deposit_amount ?? row.securityDepositAmount ?? 0),
    electricityFeeAmount: Number(row.electricity_fee_amount ?? row.electricityFeeAmount ?? 0),
    waterFeeAmount: Number(row.water_fee_amount ?? row.waterFeeAmount ?? 0),
    rating: Number(row.review_count ?? row.reviewCount ?? 0) > 0 ? Number(row.rating ?? 0) : 0,
    reviewCount: Number(row.review_count ?? row.reviewCount ?? 0),
    category: (row.category ?? 'Apartamentos') as Property['category'],
    isNew: isRecentlyPublished(row.created_at, now),
    isOccupied: Boolean(row.is_occupied ?? row.isOccupied),
    amenities: (row.amenities ?? row.features ?? []) as string[],
    ownerName: String(row.owner_name ?? row.ownerName ?? 'Propietario verificado'),
    ownerAvatar: row.owner_avatar ? String(row.owner_avatar) : row.ownerAvatar ? String(row.ownerAvatar) : undefined,
    legalStatus: derivePropertyReviewStatus(row.status, row.tourist_license_status),
    status: typeof row.status === 'string' ? row.status : undefined,
    ownershipVerificationStatus: parseOwnershipStatus(row.ownership_verification_status ?? row.ownershipVerificationStatus),
    coordinates: parseCoordinates(row.coordinates),
  };
}

const ownershipStatuses: readonly PropertyOwnershipStatus[] = ['exempt', 'missing', 'pending', 'approved', 'rejected'];

function parseOwnershipStatus(value: unknown): PropertyOwnershipStatus | undefined {
  return ownershipStatuses.includes(value as PropertyOwnershipStatus) ? (value as PropertyOwnershipStatus) : undefined;
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

/**
 * public.properties.coordinates llega como { lat, lng } (lo que guarda la web)
 * o como { latitude, longitude } (lo que publicó la app). Sin normalizar, el
 * mapa y "Cómo llegar" recibían undefined con las viviendas de la web.
 */
export function parseCoordinates(value: unknown): Property['coordinates'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const point = value as Record<string, unknown>;
  const latitude = finiteNumber(point.lat ?? point.latitude);
  const longitude = finiteNumber(point.lng ?? point.longitude);
  if (latitude === null || longitude === null) return undefined;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return undefined;
  return { latitude, longitude };
}
