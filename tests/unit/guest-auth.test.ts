import { describe, expect, test } from 'bun:test';
import { guestAuth } from '../../src/features/auth/guest-auth';

describe('development guest authentication', () => {
  test('keeps private routes inaccessible without Clerk configuration', () => {
    expect(guestAuth.isLoading).toBe(false);
    expect(guestAuth.isAuthenticated).toBe(false);
    expect(guestAuth.session).toBe(null);
    expect(guestAuth.user).toBe(null);
    expect(guestAuth.role).toBeUndefined();
  });

  test('rejects sign-in and simulated roles instead of granting access', async () => {
    const errorMessage = (operation: Promise<unknown>) => operation.then(
      () => '',
      (error: unknown) => error instanceof Error ? error.message : String(error),
    );
    expect(await errorMessage(guestAuth.signIn('guest@example.com', 'password'))).toContain('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
    expect(await errorMessage(guestAuth.signInDemo('admin'))).toContain('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
    expect(await errorMessage(guestAuth.signInWithOAuth('google'))).toContain('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
    expect(guestAuth.isAuthenticated).toBe(false);
  });
});
