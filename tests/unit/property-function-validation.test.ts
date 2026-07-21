import { describe, expect, test } from 'bun:test';

import { InputError } from '../../supabase/functions/_shared/http';
import { parseCreatePropertyInput, parseUpdatePropertyInput } from '../../supabase/functions/_shared/property-input';

const validCreate = {
  title: 'Apartamento con vistas',
  description: 'Una propiedad amplia y luminosa en el centro.',
  location: 'Malabo',
  price: 450000,
  price_type: 'per_month',
  bedrooms: 2,
  bathrooms: 1,
  amenities: ['Seguridad', 'Internet'],
  image_paths: ['owner-id/property-id/photo.jpg'],
};

describe('property Edge Function validation', () => {
  test('normalizes valid create input', () => {
    const result = parseCreatePropertyInput(validCreate);
    expect(result.priceType).toBe('per_month');
    expect(result.amenities.length).toBe(2);
  });

  test('rejects unsupported price modes', () => {
    let error: unknown;
    try {
      parseCreatePropertyInput({ ...validCreate, price_type: 'weekly' });
    } catch (cause) {
      error = cause;
    }
    expect(error instanceof InputError).toBe(true);
  });

  test('rejects invalid update prices', () => {
    let error: unknown;
    try {
      parseUpdatePropertyInput({
        property_id: 'property-id',
        title: 'Título válido',
        description: 'Descripción suficientemente larga.',
        price: -1,
      });
    } catch (cause) {
      error = cause;
    }
    expect(error instanceof InputError).toBe(true);
  });
});
