import { describe, expect, test } from 'bun:test';
import { amenityLabel } from '../../src/features/properties/amenities';

describe('amenityLabel', () => {
  test('keeps the stored Spanish name in Spanish', () => expect(amenityLabel('Piscina', 'es')).toBe('Piscina'));
  test('translates known amenities', () => expect(amenityLabel('Aire acondicionado', 'en')).toBe('Air conditioning'));
  test('shows owner-written amenities unchanged', () => expect(amenityLabel('Vistas al mar', 'fr')).toBe('Vistas al mar'));
});
