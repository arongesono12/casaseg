import { describe, expect, test } from 'bun:test';

import { authLogoSize, LOGO_ASPECT_RATIO } from '../../src/lib/auth-logo-size';

describe('auth logo size', () => {
  test('never exceeds 30% of the screen width on narrow phones', () => {
    expect(authLogoSize(360).width).toBe(108);
    expect(authLogoSize(400).width).toBe(120);
  });

  test('caps at 160dp on large phones and tablets', () => {
    expect(authLogoSize(534).width).toBe(160);
    expect(authLogoSize(1024).width).toBe(160);
  });

  test('keeps the logo proportions', () => {
    const { width, height } = authLogoSize(430);
    expect(height).toBe(Math.round(width / LOGO_ASPECT_RATIO));
  });

  test('shrinks on short screens and further while the keyboard is open', () => {
    expect(authLogoSize(430).width).toBe(129);
    expect(authLogoSize(430, { compact: true }).width).toBe(97);
    expect(authLogoSize(430, { keyboardVisible: true }).width).toBe(65);
    expect(authLogoSize(430, { compact: true, keyboardVisible: true }).width).toBe(65);
  });
});
