import { useAuth as useClerkAuth, useSession, useUser } from '@clerk/expo';
import { type PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { parseUserRole } from '@/lib/access-control';
import { isSupabaseConfigured } from '@/lib/supabase';
import { revokePushDevices } from '@/features/notifications/push-notifications';
import { appStorage } from '@/lib/local-storage';
import type { AppUser, UserRole } from '@/types';
import { AuthContext, type AuthContextValue } from '@/providers/auth-context';

const DEMO_KEY = 'casaseg.demo-session';

/**
 * Los flujos de credenciales viven ahora dentro de <AuthView /> (UI nativa de
 * Clerk) en la pantalla de login. Estos métodos permanecen en el contrato para
 * no romper a los consumidores, pero fallan de forma explícita si alguien los
 * invoca desde una pantalla heredada.
 */
function gestionadoPorClerk(accion: string): never {
  throw new Error(
    `${accion} se gestiona dentro de la pantalla de Clerk. ` +
    'Redirige al usuario a /(auth)/login en lugar de llamar a este método.',
  );
}

/**
 * El rol nunca puede venir del cliente. `publicMetadata` solo se escribe desde
 * el backend de Clerk (la migración lo rellenó desde public.users), así que es
 * la única fuente aceptable aquí.
 */
function rolDesdeMetadata(metadata: unknown): { role: UserRole; error: string | null } {
  const bruto = (metadata as Record<string, unknown> | undefined)?.role;
  if (bruto === undefined || bruto === null || bruto === '') {
    // Cuenta recién creada desde AuthView: aún sin rol asignado en el backend.
    return { role: 'client', error: null };
  }

  const role = parseUserRole(bruto);
  if (!role) {
    return { role: 'client', error: 'El perfil contiene un rol no reconocido.' };
  }

  return { role, error: null };
}

function mapearUsuario(clerkUser: NonNullable<ReturnType<typeof useUser>['user']>, role: UserRole): AppUser {
  const email = clerkUser.primaryEmailAddress?.emailAddress ?? '';
  const metadata = clerkUser.publicMetadata as Record<string, unknown> | undefined;
  const avatarMigrado = typeof metadata?.avatar === 'string' && metadata.avatar.trim() ? metadata.avatar : undefined;

  return {
    id: clerkUser.id,
    email,
    name: clerkUser.fullName?.trim() || clerkUser.firstName?.trim() || email.split('@')[0] || 'Usuario',
    role,
    avatar: avatarMigrado ?? (clerkUser.hasImage ? clerkUser.imageUrl : undefined),
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { isLoaded: authCargado, isSignedIn, signOut: clerkSignOut } = useClerkAuth();
  const { session } = useSession();
  const { user: clerkUser } = useUser();

  const [demoUser, setDemoUser] = useState<AppUser | null>(() => {
    const stored = !isSupabaseConfigured ? appStorage.getItem(DEMO_KEY) : null;
    return stored ? JSON.parse(stored) as AppUser : null;
  });

  const { role: rolClerk, error: roleError } = useMemo(
    () => (clerkUser ? rolDesdeMetadata(clerkUser.publicMetadata) : { role: 'client' as UserRole, error: null }),
    [clerkUser],
  );

  const user = useMemo(
    () => demoUser ?? (clerkUser ? mapearUsuario(clerkUser, rolClerk) : null),
    [clerkUser, demoUser, rolClerk],
  );

  const role = demoUser?.role ?? (clerkUser ? rolClerk : undefined);

  const updateProfileName = useCallback(async (name: string) => {
    const nextName = name.trim();
    if (nextName.length < 2) throw new Error('Introduce un nombre válido.');

    if (demoUser) {
      const nextDemoUser = { ...demoUser, name: nextName };
      setDemoUser(nextDemoUser);
      appStorage.setItem(DEMO_KEY, JSON.stringify(nextDemoUser));
      return;
    }

    if (!clerkUser) throw new Error('No hay una sesión activa.');

    const [firstName, ...resto] = nextName.split(' ');
    await clerkUser.update({ firstName, lastName: resto.join(' ') || undefined });
  }, [clerkUser, demoUser]);

  const updatePassword = useCallback(async (password: string) => {
    if (!clerkUser) throw new Error('No hay una sesión activa.');
    await clerkUser.updatePassword({ newPassword: password });
  }, [clerkUser]);

  const signInDemo = useCallback(async (role: UserRole = 'client') => {
    const next: AppUser = {
      id: role === 'owner' ? 'owner-elena' : `demo-${role}`,
      name: role === 'owner' ? 'Elena' : 'Aron',
      email: `${role}@casaseg.app`,
      role,
    };
    setDemoUser(next);
    appStorage.setItem(DEMO_KEY, JSON.stringify(next));
  }, []);

  const signOut = useCallback(async () => {
    // Revocar los dispositivos push es best effort: un fallo de red o una
    // política RLS denegada nunca debe dejar viva una sesión que se quiso cerrar.
    if (user) await revokePushDevices().catch(() => undefined);
    if (isSignedIn) await clerkSignOut();
    setDemoUser(null);
    appStorage.removeItem(DEMO_KEY);
  }, [clerkSignOut, isSignedIn, user]);

  const signIn = useCallback(async (_email: string, _password: string) => gestionadoPorClerk('El inicio de sesión'), []);
  const signUp = useCallback(async (_input: { email: string; password: string; name: string; role: 'client' | 'owner' }) => gestionadoPorClerk('El registro'), []);
  const verifyOtp = useCallback(async (_email: string, _token: string) => gestionadoPorClerk('La verificación por código'), []);
  const resendSignupOtp = useCallback(async (_email: string) => gestionadoPorClerk('El reenvío del código'), []);
  const signInWithOAuth = useCallback(async (_provider: 'google' | 'apple'): Promise<boolean> => gestionadoPorClerk('El acceso con Google o Apple'), []);
  const requestPasswordReset = useCallback(async (_email: string) => gestionadoPorClerk('La recuperación de contraseña'), []);

  const value = useMemo<AuthContextValue>(() => ({
    session: session ?? null,
    user,
    role,
    isAuthenticated: Boolean(demoUser || isSignedIn),
    isLoading: !authCargado,
    // El rol viaja dentro del usuario de Clerk, así que no hay una segunda
    // carga que esperar como ocurría con el RPC de Supabase.
    isRoleLoading: false,
    roleError,
    signIn, signUp, verifyOtp, resendSignupOtp, signInWithOAuth, requestPasswordReset,
    updateProfileName, updatePassword, signInDemo, signOut,
  }), [
    authCargado, demoUser, isSignedIn, requestPasswordReset, resendSignupOtp, role, roleError,
    session, signIn, signInDemo, signInWithOAuth, signOut, signUp, updatePassword,
    updateProfileName, user, verifyOtp,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
