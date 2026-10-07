import { describe, expect, test } from 'bun:test';
import { mapProperty, PROPERTY_LIST_COLUMNS, PROPERTY_MAP_COLUMNS } from '../../src/features/properties/api/property.mapper';
import { propertyInitialTotal } from '../../src/features/properties/pricing';

// Columnas reales de public.properties (consultado en Supabase el 2026-09-30).
// Pedir una columna que no existe hace que PostgREST responda 400 y la lista
// de viviendas se quede vacía: así estuvo el inicio de la app.
const PROPERTIES_TABLE_COLUMNS = new Set([
  'id', 'owner_id', 'title', 'description', 'price', 'location', 'image_urls', 'bedrooms', 'bathrooms', 'area',
  'is_occupied', 'features', 'waiting_list', 'status', 'rating', 'review_count', 'created_at', 'category',
  'coordinates', 'price_type', 'assigned_admin_id', 'fondoseg_reference', 'city', 'region', 'rental_category',
  'country_code', 'regulatory_jurisdiction', 'tourist_license_number', 'tourist_license_authority',
  'tourist_license_status', 'tourist_license_verified_at', 'cancellation_policy', 'service_fee_amount',
  'cleaning_fee_amount', 'tax_amount', 'security_deposit_amount', 'updated_at', 'owner_name', 'owner_avatar',
  'is_featured', 'featured_at', 'owner_plan_type', 'search_priority', 'owner_verification_level',
]);

const NOW = new Date('2026-09-30T12:00:00Z');

describe('consultas de viviendas', () => {
  test('la lista solo pide columnas que existen en la tabla', () => {
    const missing = PROPERTY_LIST_COLUMNS.split(',').filter((column) => !PROPERTIES_TABLE_COLUMNS.has(column));
    expect(missing).toEqual([]);
  });

  test('el mapa solo pide columnas que existen en la tabla', () => {
    const missing = PROPERTY_MAP_COLUMNS.split(',').filter((column) => !PROPERTIES_TABLE_COLUMNS.has(column));
    expect(missing).toEqual([]);
  });
});

describe('mapProperty', () => {
  test('no muestra una puntuación antigua cuando no hay reseñas', () => {
    expect(mapProperty({ id: 'a', rating: 5, review_count: 0 }, NOW).rating).toBe(0);
    expect(mapProperty({ id: 'a', rating: 4.5, review_count: 2 }, NOW).rating).toBe(4.5);
  });
  test('una vivienda activa sin licencia pendiente se muestra verificada', () => {
    expect(mapProperty({ id: 'a', status: 'active', tourist_license_status: 'not_required' }, NOW).legalStatus).toBe('verified');
  });

  test('una licencia en revisión deja la vivienda pendiente', () => {
    expect(mapProperty({ id: 'a', status: 'active', tourist_license_status: 'pending' }, NOW).legalStatus).toBe('pending');
  });

  test('una licencia revocada restringe la vivienda', () => {
    expect(mapProperty({ id: 'a', status: 'active', tourist_license_status: 'revoked' }, NOW).legalStatus).toBe('restricted');
  });

  test('es nueva si se publicó en los últimos 14 días', () => {
    expect(mapProperty({ id: 'a', created_at: '2026-09-25T10:00:00Z' }, NOW).isNew).toBe(true);
    expect(mapProperty({ id: 'b', created_at: '2026-08-01T10:00:00Z' }, NOW).isNew).toBe(false);
  });

  test('sin fecha de publicación no se marca como nueva', () => {
    expect(mapProperty({ id: 'a' }, NOW).isNew).toBe(false);
  });

  test('las comodidades salen de la columna features', () => {
    expect(mapProperty({ id: 'a', features: ['Piscina', 'Internet'] }, NOW).amenities).toEqual(['Piscina', 'Internet']);
  });

  test('los cuatro cargos proceden de la fila y forman el total inicial', () => {
    const property = mapProperty({ id: 'a', price: 150000, service_fee_amount: 5000, cleaning_fee_amount: 2500, tax_amount: 1000, security_deposit_amount: 30000 }, NOW);
    expect([property.serviceFeeAmount, property.cleaningFeeAmount, property.taxAmount, property.securityDepositAmount]).toEqual([5000, 2500, 1000, 30000]);
    expect(propertyInitialTotal(property)).toBe(188500);
  });
});
