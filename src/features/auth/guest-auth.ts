import type { AuthContextValue } from '@/providers/auth-context';

async function requireClerkConfiguration(): Promise<never> {
  throw new Error('El acceso no está configurado. Añade EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY a .env.local y reinicia Expo.');
}

// Development preview only: no session, role or simulated authenticated user.
export const guestAuth: AuthContextValue = {
  session: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isRoleLoading: false,
  roleError: null,
  signIn: requireClerkConfiguration,
  signUp: requireClerkConfiguration,
  verifyOtp: requireClerkConfiguration,
  resendSignupOtp: requireClerkConfiguration,
  signInWithOAuth: requireClerkConfiguration,
  requestPasswordReset: requireClerkConfiguration,
  updateProfileName: requireClerkConfiguration,
  updatePassword: requireClerkConfiguration,
  signInDemo: requireClerkConfiguration,
  signOut: async () => {},
};
