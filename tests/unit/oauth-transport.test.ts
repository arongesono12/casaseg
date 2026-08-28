import { describe, expect, test } from 'bun:test';
import { getOAuthTransport } from '../../src/features/auth/oauth-transport';

const nativo = { expoGo: false, dev: false };

describe('OAuth transport', () => {
  test('desarrollo usa el navegador interno en iOS y Android', () => {
    expect(getOAuthTransport({ platform: 'ios', expoGo: false, dev: true })).toBe('browser');
    expect(getOAuthTransport({ platform: 'android', expoGo: false, dev: true })).toBe('browser');
  });

  test('Expo Go usa el navegador aunque no sea desarrollo', () => {
    // Expo Go no embebe modulos nativos de terceros: no hay camino nativo.
    expect(getOAuthTransport({ platform: 'ios', expoGo: true, dev: false })).toBe('browser');
    expect(getOAuthTransport({ platform: 'android', expoGo: true, dev: false })).toBe('browser');
  });

  test('produccion compilada usa los dialogos nativos', () => {
    expect(getOAuthTransport({ platform: 'ios', ...nativo })).toBe('native');
    expect(getOAuthTransport({ platform: 'android', ...nativo })).toBe('native');
  });

  test('web siempre por navegador', () => {
    expect(getOAuthTransport({ platform: 'web', ...nativo })).toBe('browser');
    expect(getOAuthTransport({ platform: 'web', expoGo: false, dev: true })).toBe('browser');
  });
});
