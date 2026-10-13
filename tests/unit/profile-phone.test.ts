import { describe, expect, test } from 'bun:test';

import { formatPhoneForDisplay, isValidProfilePhone, normalizeProfilePhone } from '../../src/features/auth/profile-phone';

describe('teléfono del perfil', () => {
  test('guarda el número en E.164, el formato que exigen la base de datos compartida y Clerk', () => {
    expect(normalizeProfilePhone('  +240   222 123 456  ')).toBe('+240222123456');
    expect(normalizeProfilePhone('+240 (222) 123-456')).toBe('+240222123456');
    expect(isValidProfilePhone('+240 222 123 456')).toBe(true);
    expect(isValidProfilePhone('+34 612 345 678')).toBe(true);
  });

  test('no inventa un prefijo para números locales', () => {
    // "+222…" sería Mauritania: un número sin prefijo no puede pasar por internacional.
    expect(normalizeProfilePhone('222 123 456')).toBe('222123456');
    expect(isValidProfilePhone('222 123 456')).toBe(false);
  });

  test('permite quitar el número y rechaza letras o longitudes no válidas', () => {
    expect(normalizeProfilePhone('   ')).toBe(null);
    expect(isValidProfilePhone('')).toBe(true);
    expect(isValidProfilePhone('abc 222123456')).toBe(false);
    expect(isValidProfilePhone('+240 1234')).toBe(false);
    expect(isValidProfilePhone('+1234567890123456')).toBe(false);
    expect(isValidProfilePhone('+0 222 123 456')).toBe(false);
  });

  test('muestra el número separado del prefijo para leerlo con facilidad', () => {
    expect(formatPhoneForDisplay('+240222123456')).toBe('+240 222 123 456');
    expect(formatPhoneForDisplay('+34612345678')).toBe('+34 612 345 678');
    expect(formatPhoneForDisplay('+12025550123')).toBe('+1 202 555 012 3');
    expect(formatPhoneForDisplay('222 123 456')).toBe('222 123 456');
  });
});
