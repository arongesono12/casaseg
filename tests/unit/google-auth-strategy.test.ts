import { describe, expect, test } from 'bun:test';
import { getGoogleAuthStrategy } from '../../src/features/auth/google-auth-strategy';

describe('Google authentication strategy', () => {
  test('uses browser OAuth inside Expo Go on Android', () => {
    expect(getGoogleAuthStrategy('android', true)).toBe('oauth');
  });

  test('keeps native Google authentication for Gradle Android builds', () => {
    expect(getGoogleAuthStrategy('android', false)).toBe('native');
  });

  test('uses OAuth on platforms without the Android native module', () => {
    expect(getGoogleAuthStrategy('web', false)).toBe('oauth');
    expect(getGoogleAuthStrategy('ios', false)).toBe('oauth');
  });
});
