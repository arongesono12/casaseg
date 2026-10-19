import type { VisitRequest } from '@/features/properties/api/visit-requests';
import type { Property } from '@/types';

export type OwnerActivitySummary = {
  total: number;
  published: number;
  /** Media de las viviendas con reseñas; `null` si ninguna tiene todavía. */
  averageRating: number | null;
};

/**
 * Resumen de la pestaña «Actividad reciente» del propietario. A diferencia de
 * la web, las viviendas sin reseñas no cuentan como 0 en la media.
 */
export function summarizeOwnerProperties(properties: readonly Pick<Property, 'legalStatus' | 'rating' | 'reviewCount'>[]): OwnerActivitySummary {
  const rated = properties.filter((property) => property.reviewCount > 0 && property.rating > 0);
  return {
    total: properties.length,
    published: properties.filter((property) => property.legalStatus === 'verified').length,
    averageRating: rated.length ? rated.reduce((sum, property) => sum + property.rating, 0) / rated.length : null,
  };
}

/** Las visitas más recientes primero (por la fecha propuesta). */
export function latestVisitRequests(requests: readonly VisitRequest[], limit: number): VisitRequest[] {
  return [...requests]
    .sort((a, b) => new Date(b.proposedAt).getTime() - new Date(a.proposedAt).getTime())
    .slice(0, limit);
}
