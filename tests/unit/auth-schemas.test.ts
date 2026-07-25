import { describe, expect, test } from 'bun:test';

import { otpSchema, registerSchema } from '../../src/features/auth/auth.schemas';

describe('registration and OTP validation', () => {
  test('normalizes a new registration email before sending it to Supabase', () => {
    const result = registerSchema.parse({
      name: 'Aron',
      email: '  NEW.USER@Example.COM ',
      password: 'secure-password',
      role: 'client',
    });

    expect(result.email).toBe('new.user@example.com');
  });

  test('accepts only a complete six digit OTP', () => {
    expect(otpSchema.safeParse({ email: 'user@example.com', token: '123456' }).success).toBe(true);
    expect(otpSchema.safeParse({ email: 'user@example.com', token: '12345' }).success).toBe(false);
    expect(otpSchema.safeParse({ email: 'user@example.com', token: '12A456' }).success).toBe(false);
  });
});
