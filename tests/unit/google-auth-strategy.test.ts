import { describe, expect, test } from 'bun:test';
import { getGoogleAuthStrategy } from '../../src/features/auth/google-auth-strategy';

describe('Google authentication strategy', () => {
  test('does not send Expo Go users through an unreliable mobile browser redirect', () => {
    expect(getGoogleAuthStrategy('android', true)).toBe('unavailable');
    expect(getGoogleAuthStrategy('ios', true)).toBe('unavailable');
  });

  test('keeps native Google authentication for Gradle Android builds', () => {
    expect(getGoogleAuthStrategy('android', false)).toBe('native');
  });

  test('uses native Google authentication for iOS builds', () => {
    expect(getGoogleAuthStrategy('ios', false)).toBe('native');
  });

  test('keeps browser OAuth for web only', () => {
    expect(getGoogleAuthStrategy('web', false)).toBe('oauth');
  });
});
