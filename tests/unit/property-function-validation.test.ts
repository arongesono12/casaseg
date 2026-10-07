import { describe, expect, test } from 'bun:test';

import { InputError } from '../../supabase/functions/_shared/http';
import { parseCreatePropertyInput, parseUpdatePropertyInput } from '../../supabase/functions/_shared/property-input';

const validCreate = {
  title: 'Apartamento con vistas',
  description: 'Una propiedad amplia y luminosa en el centro.',
  location: 'Malabo',
  coordinates: { latitude: 3.7504, longitude: 8.7371 },
  price: 450000,
  price_type: 'per_month',
  bedrooms: 2,
  bathrooms: 1,
  amenities: ['Seguridad', 'Internet'],
  image_paths: ['owner-id/property-id/photo.jpg'],
};

describe('property Edge Function validation', () => {
  test('normalizes valid create input', () => {
    const result = parseCreatePropertyInput({ ...validCreate, service_fee_amount: 5000, cleaning_fee_amount: 2500, tax_amount: 1000, security_deposit_amount: 30000 });
    expect(result.priceType).toBe('per_month');
    expect(result.amenities.length).toBe(2);
    expect(result.coordinates.latitude).toBe(3.7504);
    expect(result.fees).toEqual({ serviceFeeAmount: 5000, cleaningFeeAmount: 2500, taxAmount: 1000, securityDepositAmount: 30000 });
  });

  test('los clientes anteriores siguen creando con cargos cero', () => {
    expect(parseCreatePropertyInput(validCreate).fees).toEqual({ serviceFeeAmount: 0, cleaningFeeAmount: 0, taxAmount: 0, securityDepositAmount: 0 });
  });

  test('rechaza cargos negativos y fraccionarios', () => {
    expect(() => parseCreatePropertyInput({ ...validCreate, service_fee_amount: -1 })).toThrow();
    expect(() => parseCreatePropertyInput({ ...validCreate, cleaning_fee_amount: 1.5 })).toThrow('importe entero');
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

  test('rejects missing or out-of-range property coordinates', () => {
    expect(() => parseCreatePropertyInput({ ...validCreate, coordinates: null })).toThrow('Selecciona la ubicación');
    expect(() => parseCreatePropertyInput({ ...validCreate, coordinates: { latitude: 91, longitude: 8.7371 } })).toThrow('Las coordenadas');
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

  test('la actualización antigua no borra cargos y la nueva acepta importes', () => {
    const base = { property_id: 'property-id', title: 'Título válido', description: 'Descripción suficientemente larga.', price: 450000 };
    expect(parseUpdatePropertyInput(base).fees).toEqual({});
    expect(parseUpdatePropertyInput({ ...base, security_deposit_amount: 30000 }).fees).toEqual({ securityDepositAmount: 30000 });
  });
});
