import { describe, expect, test } from 'bun:test';

import { otpSchema, registerSchema } from '../../src/features/auth/auth.schemas';

describe('registration and OTP validation', () => {
  test('normalizes registration email and phone', () => {
    const result = registerSchema.parse({
      name: 'Aron',
      email: '  NEW.USER@Example.COM ',
      phone: '  +240   222 123 456  ',
      password: 'secure-password',
      role: 'client',
      acceptedTerms: true,
    });

    expect(result.email).toBe('new.user@example.com');
    expect(result.phone).toBe('+240 222 123 456');
  });

  test('requires a valid phone during registration', () => {
    const registration = { name: 'Aron', email: 'user@example.com', password: 'secure-password', role: 'client', acceptedTerms: true };
    expect(registerSchema.safeParse(registration).success).toBe(false);
    expect(registerSchema.safeParse({ ...registration, phone: '123' }).success).toBe(false);
  });

  test('blocks registration until terms are accepted', () => {
    const registration = { name: 'Aron', email: 'user@example.com', phone: '+240 222 123 456', password: 'secure-password', role: 'client' };
    expect(registerSchema.safeParse({ ...registration, acceptedTerms: false }).success).toBe(false);
    expect(registerSchema.safeParse({ ...registration, acceptedTerms: true }).success).toBe(true);
  });

  test('accepts only a complete six digit OTP', () => {
    expect(otpSchema.safeParse({ email: 'user@example.com', token: '123456' }).success).toBe(true);
    expect(otpSchema.safeParse({ email: 'user@example.com', token: '12345' }).success).toBe(false);
    expect(otpSchema.safeParse({ email: 'user@example.com', token: '12A456' }).success).toBe(false);
  });
});
