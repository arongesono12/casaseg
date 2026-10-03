import { describe, expect, test } from 'bun:test';
import { authMessage } from '../../src/features/auth/auth-messages';
import { loginSchema } from '../../src/features/auth/auth.schemas';
import { comoError } from '../../src/features/auth/clerk-errors';
import { setActiveLocale } from '../../src/lib/active-locale';

function inLocale<T>(locale: 'es' | 'fr' | 'en', run: () => T): T {
  setActiveLocale(locale);
  try {
    return run();
  } finally {
    setActiveLocale('es');
  }
}

describe('auth messages follow the active language', () => {
  test('plain messages', () => {
    expect(inLocale('fr', () => authMessage('noSession'))).toBe('Aucune session active.');
  });

  test('Clerk errors are translated by code', () => {
    const error = Object.assign(new Error('Password is incorrect.'), { code: 'form_password_incorrect' });
    expect(inLocale('en', () => comoError(error, 'fallback').message)).toBe('The password is incorrect.');
  });

  test('validation messages are resolved when validating, not when the schema loads', () => {
    const result = inLocale('en', () => loginSchema.safeParse({ email: 'not-an-email', password: '12345678' }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Invalid email');
  });
});
