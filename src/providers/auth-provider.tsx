import { useAuth as useClerkAuth, useSession, useSignIn, useSignUp, useSSO, useUser } from '@clerk/expo';
import * as Linking from 'expo-linking';
import { type PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { parseUserRole } from '@/lib/access-control';
import { isSupabaseConfigured } from '@/lib/supabase';
import { revokePushDevices } from '@/features/notifications/push-notifications';
import { appStorage } from '@/lib/local-storage';
import type { AppUser, UserRole } from '@/types';
import { AuthContext, type AuthContextValue } from '@/providers/auth-context';

const DEMO_KEY = 'casaseg.demo-session';

/**
 * Los métodos del API `Future` de Clerk devuelven `{ error }` en vez de lanzar.
 * Las pantallas esperan excepciones, así que traducimos aquí.
 */
function lanzarSiFalla(resultado: { error: unknown }, respaldo: string) {
  const error = resultado.error;
  if (!error) return;

  if (error instanceof Error) {
    const largo = (error as { longMessage?: string }).longMessage;
    throw new Error(largo ?? error.message ?? respaldo);
  }

  throw new Error(respaldo);
}

/**
 * El rol nunca puede venir del cliente. `publicMetadata` solo se escribe desde
 * el backend de Clerk (la migración lo rellenó desde public.users), así que es
 * la única fuente aceptable aquí.
 */
function rolDesdeMetadata(metadata: unknown): { role: UserRole; error: string | null } {
  const bruto = (metadata as Record<string, unknown> | undefined)?.role;
  if (bruto === undefined || bruto === null || bruto === '') {
    // Cuenta recién registrada: el webhook aún no le ha asignado rol.
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
  const { signIn: clerkSignIn } = useSignIn();
  const { signUp: clerkSignUp } = useSignUp();
  const { startSSOFlow } = useSSO();

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

  const signIn = useCallback(async (email: string, password: string) => {
    if (!clerkSignIn) throw new Error('El servicio de acceso todavía se está iniciando.');

    lanzarSiFalla(
      await clerkSignIn.password({ identifier: email.trim().toLowerCase(), password }),
      'No se pudo iniciar sesión.',
    );

    if (clerkSignIn.status !== 'complete') {
      throw new Error('Se requieren pasos adicionales para completar el acceso.');
    }

    lanzarSiFalla(await clerkSignIn.finalize(), 'No se pudo abrir la sesión.');
  }, [clerkSignIn]);

  const signUp = useCallback(async ({ email, password, name, role }: { email: string; password: string; name: string; role: 'client' | 'owner' }) => {
    if (!clerkSignUp) throw new Error('El servicio de registro todavía se está iniciando.');

    const nombre = name.trim();
    const [firstName, ...resto] = nombre.split(' ');

    lanzarSiFalla(await clerkSignUp.password({
      emailAddress: email.trim().toLowerCase(),
      password,
      firstName,
      lastName: resto.join(' ') || undefined,
      // unsafeMetadata lo escribe el cliente, así que NUNCA puede otorgar un
      // rol. Solo deja constancia de lo que la persona pidió; el webhook crea
      // la cuenta como `client` y, si pidió `owner`, abre la solicitud.
      unsafeMetadata: { name: nombre, requestedRole: role },
    }), 'No se pudo crear la cuenta.');

    // Si la instancia no exige verificar el correo, la cuenta ya está lista.
    if (clerkSignUp.status === 'complete') {
      lanzarSiFalla(await clerkSignUp.finalize(), 'No se pudo abrir la sesión.');
      return;
    }

    lanzarSiFalla(await clerkSignUp.verifications.sendEmailCode(), 'No se pudo enviar el código.');
  }, [clerkSignUp]);

  const verifyOtp = useCallback(async (_email: string, token: string) => {
    if (!clerkSignUp) throw new Error('El registro expiró. Vuelve a crear la cuenta.');

    lanzarSiFalla(
      await clerkSignUp.verifications.verifyEmailCode({ code: token.trim() }),
      'El código no es válido.',
    );

    if (clerkSignUp.status !== 'complete') {
      throw new Error('La verificación no se completó. Solicita un código nuevo.');
    }

    lanzarSiFalla(await clerkSignUp.finalize(), 'No se pudo abrir la sesión.');
  }, [clerkSignUp]);

  const resendSignupOtp = useCallback(async (_email: string) => {
    if (!clerkSignUp) throw new Error('El registro expiró. Vuelve a crear la cuenta.');
    lanzarSiFalla(await clerkSignUp.verifications.sendEmailCode(), 'No se pudo reenviar el código.');
  }, [clerkSignUp]);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple') => {
    // startSSOFlow abre el navegador del sistema vía expo-web-browser, así que
    // funciona igual en Expo Go que en un development build.
    const { createdSessionId, setActive } = await startSSOFlow({
      strategy: provider === 'google' ? 'oauth_google' : 'oauth_apple',
      redirectUrl: Linking.createURL('/'),
    });

    // Sin sesión creada el usuario canceló: no es un error que mostrar.
    if (!createdSessionId) return false;

    await setActive?.({ session: createdSessionId });
    return true;
  }, [startSSOFlow]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!clerkSignIn) throw new Error('El servicio de acceso todavía se está iniciando.');

    lanzarSiFalla(
      await clerkSignIn.create({ identifier: email.trim().toLowerCase() }),
      'No se pudo encontrar esa cuenta.',
    );

    lanzarSiFalla(
      await clerkSignIn.resetPasswordEmailCode.sendCode(),
      'No se pudo enviar el código de recuperación.',
    );
  }, [clerkSignIn]);

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
