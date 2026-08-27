import { describe, expect, test } from 'bun:test';

import { InputError } from '../../supabase/functions/_shared/http';
import { futureIsoDate, oneOf, optionalText, uuid } from '../../supabase/functions/_shared/validate';

const validUuid = '3f8a1c2e-9b47-4d5a-8e61-0c2d4f6a8b90';

function capture(run: () => unknown) {
  try {
    run();
    return undefined;
  } catch (error) {
    return error;
  }
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe('uuid', () => {
  test('normalizes a valid uuid to lowercase', () => {
    expect(uuid(validUuid.toUpperCase(), 'Identificador')).toBe(validUuid);
  });

  test('rejects a non-uuid identifier', () => {
    // El literal que la pantalla de pagos enviaba antes de corregirla.
    expect(capture(() => uuid('active-contract', 'Identificador')) instanceof InputError).toBe(true);
  });

  test('rejects a uuid with the wrong shape', () => {
    expect(capture(() => uuid('3f8a1c2e9b474d5a8e610c2d4f6a8b90', 'Identificador')) instanceof InputError).toBe(true);
  });
});

describe('oneOf', () => {
  test('accepts a listed value', () => {
    expect(oneOf('bank_transfer', 'Método', ['fondoseg', 'bank_transfer', 'card'])).toBe('bank_transfer');
  });

  test('rejects a provider the database does not know', () => {
    // 'stripe' era el valor que enviaba la pantalla de pagos.
    expect(capture(() => oneOf('stripe', 'Método', ['fondoseg', 'bank_transfer', 'card'])) instanceof InputError).toBe(true);
  });
});

describe('optionalText', () => {
  test('treats an absent value as empty', () => {
    expect(optionalText(undefined, 'Nota', 100)).toBe('');
    expect(optionalText('', 'Nota', 100)).toBe('');
  });

  test('trims a provided value', () => {
    expect(optionalText('  hola  ', 'Nota', 100)).toBe('hola');
  });

  test('rejects a value past the limit', () => {
    expect(capture(() => optionalText('x'.repeat(101), 'Nota', 100)) instanceof InputError).toBe(true);
  });
});

describe('futureIsoDate', () => {
  test('accepts a date inside the window', () => {
    expect(typeof futureIsoDate(daysFromNow(3), 'Fecha', 90)).toBe('string');
  });

  test('rejects a date in the past', () => {
    expect(capture(() => futureIsoDate(daysFromNow(-1), 'Fecha', 90)) instanceof InputError).toBe(true);
  });

  test('rejects a date beyond the window', () => {
    expect(capture(() => futureIsoDate(daysFromNow(120), 'Fecha', 90)) instanceof InputError).toBe(true);
  });

  test('rejects text that is not a date', () => {
    expect(capture(() => futureIsoDate('mañana', 'Fecha', 90)) instanceof InputError).toBe(true);
  });
});
