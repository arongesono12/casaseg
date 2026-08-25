import type { Session as SupabaseSession } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { getNativeAppleAuthResult } from '@/features/auth/apple-native-auth';
import { getGoogleAuthStrategy } from '@/features/auth/google-auth-strategy';
import { getNativeGoogleAuthResult } from '@/features/auth/google-native-auth';
import { createOAuthRedirectUrl, exchangeOAuthCode, getOAuthCode } from '@/features/auth/oauth-session';
import { parseUserRole } from '@/lib/access-control';
import { isExpoGo } from '@/lib/execution-environment';
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

function mapUser(session: SupabaseSession | null, role?: UserRole): AppUser | null {
  if (!session?.user) return null;
  const metadata = session.user.user_metadata;
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name: String(metadata.name ?? metadata.full_name ?? session.user.email?.split('@')[0] ?? 'Usuario'),
    // user_metadata can be edited by the account owner. Only app_metadata,
    // public.users or a protected RPC may grant a privileged role.
    role: role ?? parseUserRole(session.user.app_metadata.role) ?? 'client',
    avatar: metadataAvatar(metadata),
  };
}

async function fetchProtectedRole() {
  const { data, error } = await supabase.rpc('get_user_role');
  if (error) throw error;
  return parseUserRole(data);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [demoUser, setDemoUser] = useState<AppUser | null>(() => { const stored = !isSupabaseConfigured ? appStorage.getItem(DEMO_KEY) : null; return stored ? JSON.parse(stored) as AppUser : null; });
  const [isSessionLoading, setIsSessionLoading] = useState(isSupabaseConfigured);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    }).finally(() => setIsSessionLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setProfileUser(null);
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user || !isSupabaseConfigured) {
      setProfileUser(null);
      setIsRoleLoading(false);
      setRoleError(null);
      return;
    }
    let active = true;
    setProfileUser(null);
    setIsRoleLoading(true);
    setRoleError(null);
    void (async () => {
      try {
        const { data, error } = await supabase.from('users').select('id,name,email,role,avatar').eq('id', session.user.id).maybeSingle();
        if (!active) return;

        if (error || !data) {
          const protectedRole = await fetchProtectedRole();
          if (!active) return;
          if (!protectedRole) {
            throw error ?? new Error('La cuenta autenticada no tiene un rol asignado.');
          }
          setProfileUser(mapUser(session, protectedRole));
          return;
        }

        const protectedRole = parseUserRole(data.role);
        if (!protectedRole) throw new Error('El perfil contiene un rol no reconocido.');
        const oauthAvatar = metadataAvatar(session.user.user_metadata);
        const avatar = data.avatar ? String(data.avatar) : oauthAvatar;
        setProfileUser({ id: String(data.id), name: String(data.name ?? session.user.user_metadata.name ?? 'Usuario'), email: String(data.email ?? session.user.email ?? ''), role: protectedRole, avatar });
        if (!data.avatar && oauthAvatar) {
          void supabase.from('users').update({ avatar: oauthAvatar }).eq('id', session.user.id);
        }
      } catch (error) {
        if (!active) return;
        setProfileUser(null);
        setRoleError(error instanceof Error ? error.message : 'No se pudo verificar el rol de esta cuenta.');
      } finally {
        if (active) setIsRoleLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async ({ email, password, name, role }: { email: string; password: string; name: string; role: 'client' | 'owner' }) => {
    if (!isSupabaseConfigured) throw new Error('El registro requiere una conexión válida con CasaSeg.');
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { name: name.trim(), role } },
    });
    if (error) throw error;
    if (!data.user) throw new Error('No se pudo crear la cuenta. Inténtalo de nuevo.');
    if (data.user.identities && data.user.identities.length === 0) {
      throw new Error('No se pudo completar el registro. Si ya tienes una cuenta, inicia sesión o recupera tu contraseña.');
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });
    if (error) throw error;
    if (!data.user || !data.session) {
      throw new Error('El código no pudo crear una sesión verificada. Solicita uno nuevo.');
    }
  }, []);

  const resendSignupOtp = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    if (error) throw error;
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple') => {
    const googleStrategy = getGoogleAuthStrategy(Platform.OS, isExpoGo);

    if (provider === 'google' && googleStrategy === 'unavailable') {
      throw new Error('Google nativo no está disponible dentro de Expo Go. Abre CasaSeg con el development build para iniciar sesión sin salir de la app.');
    }

    if (provider === 'google' && googleStrategy === 'native') {
      const nativeResult = await getNativeGoogleAuthResult();
      if (nativeResult.type === 'cancelled') return false;
      if (nativeResult.type === 'unsupported') {
        throw new Error('Este cliente no incluye Google nativo. Recompila la aplicación e instala el nuevo development build.');
      }
      // The nonce is mandatory: Google embeds its SHA-256 hash in the ID token,
      // and GoTrue rejects a token whose nonce claim has no counterpart here.
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: nativeResult.idToken,
        nonce: nativeResult.nonce,
      });
      if (error) throw error;
      return true;
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
    await WebBrowser.dismissBrowser().catch(() => undefined);
    const code = getOAuthCode(result.url);
    await exchangeOAuthCode(code);
    return true;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: Linking.createURL('reset-password') });
    if (error) throw error;
  }, []);

  const updateProfileName = useCallback(async (name: string) => {
    const nextName = name.trim();
    if (nextName.length < 2) throw new Error('Introduce un nombre válido.');

    if (!isSupabaseConfigured) {
      if (!demoUser) throw new Error('No hay una sesión activa.');
      const nextDemoUser = { ...demoUser, name: nextName };
      setDemoUser(nextDemoUser);
      appStorage.setItem(DEMO_KEY, JSON.stringify(nextDemoUser));
      return;
    }

    if (!session?.user) throw new Error('No hay una sesión activa.');

    const { error: profileError } = await supabase
      .from('users')
      .update({ name: nextName })
      .eq('id', session.user.id);
    if (profileError) throw profileError;

    const { error: authError } = await supabase.auth.updateUser({
      data: { ...session.user.user_metadata, name: nextName, full_name: nextName },
    });
    if (authError) throw authError;

    setProfileUser((current) => current ? { ...current, name: nextName } : current);
  }, [demoUser, session]);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const signInDemo = useCallback(async (role: UserRole = 'client') => {
    const next: AppUser = { id: role === 'owner' ? 'owner-elena' : `demo-${role}`, name: role === 'owner' ? 'Elena' : 'Aron', email: `${role}@casaseg.app`, role };
    setDemoUser(next);
    appStorage.setItem(DEMO_KEY, JSON.stringify(next));
  }, []);

  // Keep a secure session identity available while the richer database profile
  // resolves. This lets protected-route guards update without unmounting the
  // root navigator during post-login navigation.
  const sessionRole = parseUserRole(session?.user.app_metadata.role);
  const role = demoUser?.role ?? profileUser?.role ?? sessionRole;
  const user = demoUser ?? (session ? profileUser ?? mapUser(session, role) : null);
  const isLoading = isSessionLoading;

  const signOut = useCallback(async () => {
    // Revoking push devices is best effort: a network failure or a denied RLS
    // policy must never leave the user with a live session they asked to end.
    if (user) await revokePushDevices().catch(() => undefined);
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setDemoUser(null);
    appStorage.removeItem(DEMO_KEY);
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    session, user, role, isAuthenticated: Boolean(demoUser || session), isLoading, isRoleLoading, roleError,
    signIn, signUp, verifyOtp, resendSignupOtp, signInWithOAuth, requestPasswordReset, updateProfileName, updatePassword, signInDemo, signOut,
  }), [demoUser, isLoading, isRoleLoading, requestPasswordReset, resendSignupOtp, role, roleError, session, signIn, signInDemo, signInWithOAuth, signOut, signUp, updatePassword, updateProfileName, user, verifyOtp]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
