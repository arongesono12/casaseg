import type { Session as SupabaseSession } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { getNativeAppleAuthResult } from '@/features/auth/apple-native-auth';
import { getNativeGoogleAuthResult } from '@/features/auth/google-native-auth';
import { createOAuthRedirectUrl, exchangeOAuthCode, getOAuthCode } from '@/features/auth/oauth-session';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { revokePushDevices } from '@/features/notifications/push-notifications';
import { appStorage } from '@/lib/local-storage';
import type { AppUser, UserRole } from '@/types';
import { AuthContext, type AuthContextValue } from '@/providers/auth-context';

const DEMO_KEY = 'casaseg.demo-session';

function metadataAvatar(metadata: Record<string, unknown>) {
  const value = metadata.avatar_url ?? metadata.picture ?? metadata.avatar;
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function mapUser(session: SupabaseSession | null): AppUser | null {
  if (!session?.user) return null;
  const metadata = session.user.user_metadata;
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name: String(metadata.name ?? metadata.full_name ?? session.user.email?.split('@')[0] ?? 'Usuario'),
    role: (metadata.role ?? 'client') as UserRole,
    avatar: metadataAvatar(metadata),
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [demoUser, setDemoUser] = useState<AppUser | null>(() => { const stored = !isSupabaseConfigured ? appStorage.getItem(DEMO_KEY) : null; return stored ? JSON.parse(stored) as AppUser : null; });
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session)).finally(() => setIsLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user || !isSupabaseConfigured) return;
    let active = true;
    setProfileUser(null);
    void supabase.from('users').select('id,name,email,role,avatar').eq('id', session.user.id).maybeSingle().then(({ data }) => {
      if (!active || !data) return;
      const oauthAvatar = metadataAvatar(session.user.user_metadata);
      const avatar = data.avatar ? String(data.avatar) : oauthAvatar;
      setProfileUser({ id: String(data.id), name: String(data.name ?? session.user.user_metadata.name ?? 'Usuario'), email: String(data.email ?? session.user.email ?? ''), role: (data.role ?? 'client') as UserRole, avatar });
      if (!data.avatar && oauthAvatar) {
        void supabase.from('users').update({ avatar: oauthAvatar }).eq('id', session.user.id);
      }
    });
    return () => { active = false; };
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async ({ email, password, name, role }: { email: string; password: string; name: string; role: 'client' | 'owner' }) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name, role } } });
    if (error) throw error;
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple') => {
    if (provider === 'google') {
      const nativeResult = await getNativeGoogleAuthResult();
      if (nativeResult.type === 'cancelled') return false;
      if (nativeResult.type === 'success') {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: nativeResult.idToken,
        });
        if (error) throw error;
        return true;
      }
      if (Platform.OS === 'android') {
        throw new Error('Google requiere el cliente Android nativo de CasaSeg. Recompílalo con "npm run android:native".');
      }
    }

    if (provider === 'apple') {
      const nativeResult = await getNativeAppleAuthResult();
      if (nativeResult.type === 'cancelled') return false;
      if (nativeResult.type === 'success') {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: nativeResult.identityToken,
        });
        if (error) throw error;
        return true;
      }
    }

    const redirectTo = createOAuthRedirectUrl();
    const queryParams = provider === 'google' ? { prompt: 'select_account' } : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true, queryParams },
    });
    if (error) throw error;
    if (!data.url) throw new Error('No se pudo iniciar OAuth');
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      preferEphemeralSession: true,
      showInRecents: false,
    });
    if (result.type !== 'success') return false;
    const code = getOAuthCode(result.url);
    await exchangeOAuthCode(code);
    return true;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: Linking.createURL('reset-password') });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const signInDemo = useCallback(async (role: UserRole = 'client') => {
    const next: AppUser = { id: role === 'owner' ? 'owner-elena' : `demo-${role}`, name: role === 'owner' ? 'Elena' : 'Aron', email: `${role}@casaseg.app`, role };
    setDemoUser(next);
    appStorage.setItem(DEMO_KEY, JSON.stringify(next));
  }, []);

  const user = demoUser ?? (session ? profileUser ?? mapUser(session) : null);

  const signOut = useCallback(async () => {
    if (user) await revokePushDevices();
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setDemoUser(null);
    appStorage.removeItem(DEMO_KEY);
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    session, user, role: user?.role, isAuthenticated: Boolean(user), isLoading,
    signIn, signUp, verifyOtp, signInWithOAuth, requestPasswordReset, updatePassword, signInDemo, signOut,
  }), [isLoading, requestPasswordReset, session, signIn, signInDemo, signInWithOAuth, signOut, signUp, updatePassword, user, verifyOtp]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
