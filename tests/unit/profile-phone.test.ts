import { describe, expect, test } from 'bun:test';

import { isValidProfilePhone, normalizeProfilePhone } from '../../src/features/auth/profile-phone';

describe('teléfono del perfil', () => {
  test('acepta números locales e internacionales y conserva un formato legible', () => {
    expect(isValidProfilePhone('222 123 456')).toBe(true);
    expect(isValidProfilePhone('+240 (222) 123-456')).toBe(true);
    expect(normalizeProfilePhone('  +240   222 123 456  ')).toBe('+240 222 123 456');
  });

  test('permite quitar el número y rechaza letras o longitudes no válidas', () => {
    expect(normalizeProfilePhone('   ')).toBe(null);
    expect(isValidProfilePhone('')).toBe(true);
    expect(isValidProfilePhone('abc 222123456')).toBe(false);
    expect(isValidProfilePhone('123456')).toBe(false);
    expect(isValidProfilePhone('+1234567890123456')).toBe(false);
  });
});
