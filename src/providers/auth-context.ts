import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';
import type { AppUser, UserRole } from '@/types';

export type AuthContextValue = {
  session: SupabaseSession | null;
  user: AppUser | null;
  role?: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRoleLoading: boolean;
  roleError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; name: string; role: 'client' | 'owner' }) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signInDemo: (role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
