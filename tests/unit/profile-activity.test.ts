import { describe, expect, test } from 'bun:test';

import type { VisitRequest } from '../../src/features/properties/api/visit-requests';
import { latestVisitRequests, summarizeOwnerProperties } from '../../src/features/profile/profile-activity';

const visit = (id: string, proposedAt: string): VisitRequest => ({
  id,
  propertyId: 'p1',
  propertyTitle: 'Piso en Malabo',
  proposedAt,
  status: 'pending',
  note: '',
  clientId: 'c1',
  ownerId: 'o1',
});

describe('actividad reciente del perfil', () => {
  test('cuenta las viviendas publicadas y promedia solo las que tienen reseñas', () => {
    const summary = summarizeOwnerProperties([
      { legalStatus: 'verified', rating: 4, reviewCount: 3 },
      { legalStatus: 'verified', rating: 5, reviewCount: 1 },
      { legalStatus: 'pending', rating: 0, reviewCount: 0 },
      { legalStatus: 'restricted', rating: 0, reviewCount: 0 },
    ]);

    expect(summary).toEqual({ total: 4, published: 2, averageRating: 4.5 });
  });

  test('sin reseñas no inventa una media de 0', () => {
    expect(summarizeOwnerProperties([{ legalStatus: 'verified', rating: 0, reviewCount: 0 }]).averageRating).toBe(null);
    expect(summarizeOwnerProperties([])).toEqual({ total: 0, published: 0, averageRating: null });
  });

  test('muestra primero las visitas más recientes sin alterar la lista original', () => {
    const requests = [visit('a', '2026-10-01T10:00:00Z'), visit('b', '2026-10-20T10:00:00Z'), visit('c', '2026-10-10T10:00:00Z')];

    expect(latestVisitRequests(requests, 2).map((request) => request.id)).toEqual(['b', 'c']);
    expect(requests.map((request) => request.id)).toEqual(['a', 'b', 'c']);
  });
});
