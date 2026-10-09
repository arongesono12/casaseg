import { useAuth as useClerkAuth, useSession, useSignIn, useSignUp, useSSO, useUser } from '@clerk/expo';
import { useSignInWithApple } from '@clerk/expo/apple';
import { useSignInWithGoogle } from '@clerk/expo/google';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { type PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { authMessage } from '@/features/auth/auth-messages';
import { codigoDeClerk, comoError, lanzarSiFalla } from '@/features/auth/clerk-errors';
import { getOAuthTransport } from '@/features/auth/oauth-transport';
import { isExpoGo } from '@/lib/execution-environment';
import { parseUserRole } from '@/lib/access-control';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { revokePushDevices } from '@/features/notifications/push-notifications';
import { appStorage } from '@/lib/local-storage';
import type { AppUser, UserRole } from '@/types';
import { AuthContext, type AuthContextValue } from '@/providers/auth-context';

const DEMO_KEY = 'casaseg.demo-session';

/**
 * Clerk no devuelve `complete` cuando el acceso necesita otro paso. Antes todos
 * esos casos caian en un mismo mensaje sin salida ("Se requieren pasos
 * adicionales"), que no dice ni que pasa ni que hacer. Cada estado tiene una
 * causa concreta y una accion distinta.
 */
export class AccesoPendienteError extends Error {
  constructor(readonly estado: string, mensaje: string, readonly accion: 'restablecer' | 'oauth' | 'codigo' | 'registrarse' | 'ninguna') {
    super(mensaje);
    this.name = 'AccesoPendienteError';
  }
}

/**
 * El camino nativo puede no estar disponible por dos motivos distintos, y
 * ninguno debe dejar al usuario sin forma de entrar:
 *
 *  - El modulo nativo no esta en la build (falta el plugin, o es Expo Go).
 *  - Faltan los client IDs de Google que el hook exige.
 *
 * El flujo por navegador no necesita ninguna de las dos cosas, asi que sirve de
 * red. Cualquier otro error (una cancelacion, un fallo de red) sube tal cual.
 */
function nativoNoDisponible(error: unknown) {
  const mensaje = error instanceof Error ? error.message : String(error);
  return /native module|not (available|installed|supported|found)|only works on|missing.*plugin|credentials/i.test(mensaje);
}

/**
 * Clerk publica en `supportedFirstFactors` los metodos con los que ESA cuenta
 * puede entrar. Leerlos evita adivinar: una cuenta migrada sin contrasena solo
 * admite `reset_password_email_code`, y decirle al usuario que entre con Apple
 * seria mandarle a una puerta que tampoco existe.
 */
function accesoPendiente(
  estado: string | null | undefined,
  factores: readonly { strategy?: string }[] | undefined,
): AccesoPendienteError {
  const estrategias = new Set((factores ?? []).map((f) => f?.strategy).filter(Boolean) as string[]);
  const admiteContrasena = estrategias.has('password');
  const admiteReset = estrategias.has('reset_password_email_code');
  const oauth = [...estrategias].filter((e) => e.startsWith('oauth_')).map((e) => e.replace('oauth_', ''));

  if (estado === 'needs_second_factor') {
    return new AccesoPendienteError(
      'needs_second_factor',
      authMessage('secondFactor'),
      'codigo',
    );
  }

  if (estado === 'needs_identifier') {
    return new AccesoPendienteError('needs_identifier', authMessage('unknownEmail'), 'ninguna');
  }

  // Sin `password` entre los factores, la contrasena escrita nunca va a servir:
  // la cuenta se creo sin ella (migracion sin hash utilizable, o solo OAuth).
  if (!admiteContrasena && admiteReset) {
    const conOauth = oauth.length ? ` También puedes entrar con ${oauth.join(' o ')}.` : '';
    return new AccesoPendienteError(
      estado ?? 'needs_first_factor',
      `Esta cuenta no tiene contraseña todavía. Puedes crear una con un código que te enviaremos por correo.${conOauth}`,
      'restablecer',
    );
  }

  if (!admiteContrasena && oauth.length) {
    return new AccesoPendienteError(
      estado ?? 'needs_first_factor',
      `Esta cuenta se creó con ${oauth.join(' o ')}. Entra con ese mismo método.`,
      'oauth',
    );
  }

  if (estado === 'needs_new_password') {
    return new AccesoPendienteError(
      'needs_new_password',
      authMessage('needsNewPassword'),
      'restablecer',
    );
  }

  return new AccesoPendienteError(
    estado ?? 'desconocido',
    `El acceso quedó a medias (estado: ${estado ?? 'desconocido'}). Vuelve a intentarlo o restablece la contraseña.`,
    'ninguna',
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
    // Cuenta recién registrada: el webhook aún no le ha asignado rol.
    return { role: 'client', error: null };
  }

  const role = parseUserRole(bruto);
  if (!role) {
    return { role: 'client', error: authMessage('unknownRole') };
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
  const queryClient = useQueryClient();
  const { isLoaded: authCargado, isSignedIn, signOut: clerkSignOut } = useClerkAuth();
  const { session } = useSession();
  const { user: clerkUser } = useUser();
  const { signIn: clerkSignIn } = useSignIn();
  const { signUp: clerkSignUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  // Los hooks se llaman siempre (no pueden ir tras un condicional); en las
  // plataformas sin soporte devuelven una funcion que lanza al invocarla.
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
  const { startAppleAuthenticationFlow } = useSignInWithApple();

  const [demoUser, setDemoUser] = useState<AppUser | null>(() => {
    const stored = !isSupabaseConfigured ? appStorage.getItem(DEMO_KEY) : null;
    return stored ? JSON.parse(stored) as AppUser : null;
  });

  const { role: rolClerk, error: metadataRoleError } = useMemo(
    () => (clerkUser ? rolDesdeMetadata(clerkUser.publicMetadata) : { role: 'client' as UserRole, error: null }),
    [clerkUser],
  );

  const databaseRole = useQuery({
    queryKey: ['auth', 'database-role', clerkUser?.id ?? 'guest'],
    enabled: Boolean(isSignedIn && clerkUser && isSupabaseConfigured),
    staleTime: 30_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('current_profile');
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as { role?: unknown; status?: unknown } | undefined;
      const resolved = parseUserRole(row?.role);
      if (!resolved) return null; // El webhook puede seguir creando el perfil.
      return { role: resolved, status: row?.status };
    },
  });
  const resolvedRole = databaseRole.data?.role ?? rolClerk;
  const roleError = metadataRoleError ?? (databaseRole.error ? 'No se pudo actualizar el rol de la cuenta.' : null);

  const user = useMemo(
    () => demoUser ?? (clerkUser ? mapearUsuario(clerkUser, resolvedRole) : null),
    [clerkUser, demoUser, resolvedRole],
  );

  const role = demoUser?.role ?? (clerkUser ? resolvedRole : undefined);

  const updateProfileName = useCallback(async (name: string) => {
    const nextName = name.trim();
    if (nextName.length < 2) throw new Error(authMessage('invalidName'));

    if (demoUser) {
      const nextDemoUser = { ...demoUser, name: nextName };
      setDemoUser(nextDemoUser);
      appStorage.setItem(DEMO_KEY, JSON.stringify(nextDemoUser));
      return;
    }

    if (!clerkUser) throw new Error(authMessage('noSession'));

    const [firstName, ...resto] = nextName.split(' ');
    await clerkUser.update({ firstName, lastName: resto.join(' ') || undefined });
  }, [clerkUser, demoUser]);

  const updatePassword = useCallback(async (password: string) => {
    if (!clerkUser) throw new Error(authMessage('noSession'));
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
    queryClient.clear();
    appStorage.removeItem('casaseg.query-cache');
    setDemoUser(null);
    appStorage.removeItem(DEMO_KEY);
  }, [clerkSignOut, isSignedIn, queryClient, user]);

  /**
   * Cuando la contraseña no sirve, Clerk no dice con qué SÍ se entra: el error
   * llega igual para "esta cuenta no tiene contraseña" que para "la has escrito
   * mal". Crear el intento solo con el correo devuelve `supportedFirstFactors`,
   * que es la lista real de métodos de ESA cuenta. Cuesta una llamada de más,
   * así que solo se pide en los códigos donde el dato cambia el mensaje.
   */
  const metodosDeLaCuenta = useCallback(async (identifier: string) => {
    if (!clerkSignIn) return null;

    const { error } = await clerkSignIn.create({ identifier });
    if (error) return null;

    const factores = clerkSignIn.supportedFirstFactors ?? [];
    // Si la contraseña sí figura entre los métodos, lo que falló fue la que se
    // escribió; mandar al usuario a otra puerta solo le despistaría.
    if (factores.some((factor) => factor?.strategy === 'password')) return null;

    return accesoPendiente(clerkSignIn.status, factores);
  }, [clerkSignIn]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!clerkSignIn) throw new Error(authMessage('signInStarting'));

    const identifier = email.trim().toLowerCase();
    const { error } = await clerkSignIn.password({ identifier, password });

    if (error) {
      const codigo = codigoDeClerk(error);

      // El fallo más habitual tras la migración: la cuenta existe en Supabase o
      // en otra instancia de Clerk, pero no en la que apunta esta build.
      if (codigo === 'form_identifier_not_found') {
        throw new AccesoPendienteError(
          'form_identifier_not_found',
          authMessage('noAccountForEmail'),
          'registrarse',
        );
      }

      // Una cuenta puede existir sin admitir contraseña (se creó con Google o
      // Apple, o la migración no trajo un hash utilizable). Clerk lo reporta
      // como un fallo de contraseña más, así que hay que preguntar por los
      // métodos reales antes de acusar al usuario de escribirla mal.
      if (codigo === 'strategy_for_user_invalid'
        || codigo === 'form_password_incorrect'
        || codigo === 'form_password_or_identifier_incorrect') {
        const pendiente = await metodosDeLaCuenta(identifier);
        if (pendiente) throw pendiente;
      }

      throw comoError(error, authMessage('signInFailed'));
    }

    if (clerkSignIn.status !== 'complete') {
      throw accesoPendiente(clerkSignIn.status, clerkSignIn.supportedFirstFactors ?? undefined);
    }

    lanzarSiFalla(await clerkSignIn.finalize(), authMessage('openSessionFailed'));
  }, [clerkSignIn, metodosDeLaCuenta]);

  const signUp = useCallback(async ({ email, password, name, role }: { email: string; password: string; name: string; role: 'client' | 'owner' }) => {
    if (!clerkSignUp) throw new Error(authMessage('signUpStarting'));

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
    }), authMessage('signUpFailed'));

    // Si la instancia no exige verificar el correo, la cuenta ya está lista.
    if (clerkSignUp.status === 'complete') {
      lanzarSiFalla(await clerkSignUp.finalize(), authMessage('openSessionFailed'));
      return;
    }

    lanzarSiFalla(await clerkSignUp.verifications.sendEmailCode(), authMessage('sendCodeFailed'));
  }, [clerkSignUp]);

  const verifyOtp = useCallback(async (_email: string, token: string) => {
    if (!clerkSignUp) throw new Error(authMessage('signUpExpired'));

    lanzarSiFalla(
      await clerkSignUp.verifications.verifyEmailCode({ code: token.trim() }),
      authMessage('invalidCode'),
    );

    if (clerkSignUp.status !== 'complete') {
      throw new Error(authMessage('verificationIncomplete'));
    }

    lanzarSiFalla(await clerkSignUp.finalize(), authMessage('openSessionFailed'));
  }, [clerkSignUp]);

  const resendSignupOtp = useCallback(async (_email: string) => {
    if (!clerkSignUp) throw new Error(authMessage('signUpExpired'));
    lanzarSiFalla(await clerkSignUp.verifications.sendEmailCode(), authMessage('resendCodeFailed'));
  }, [clerkSignUp]);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple') => {
    const abrirSesion = async (
      resultado: { createdSessionId: string | null; setActive?: (params: { session: string }) => Promise<unknown> },
    ) => {
      // Sin sesion creada el usuario cancelo: no es un error que mostrar.
      if (!resultado.createdSessionId) return false;
      await resultado.setActive?.({ session: resultado.createdSessionId });
      return true;
    };

    const transporte = getOAuthTransport({ platform: Platform.OS, expoGo: isExpoGo, dev: __DEV__ });

    if (transporte === 'native') {
      try {
        const flujoNativo = provider === 'google' ? startGoogleAuthenticationFlow : startAppleAuthenticationFlow;
        return await abrirSesion(await flujoNativo());
      } catch (error) {
        // Un modulo ausente no debe bloquear el acceso: se reintenta por el
        // navegador. Cualquier otro error (cancelacion incluida) sube tal cual.
        if (!nativoNoDisponible(error)) throw error;
        console.warn(`[casaseg] Acceso nativo con ${provider} no disponible; se usa el navegador interno.`, error);
      }
    }

    // startSSOFlow abre el navegador interno via expo-web-browser, asi que
    // funciona igual en Expo Go que en un development build.
    return abrirSesion(await startSSOFlow({
      strategy: provider === 'google' ? 'oauth_google' : 'oauth_apple',
      redirectUrl: Linking.createURL('/'),
    }));
  }, [startAppleAuthenticationFlow, startGoogleAuthenticationFlow, startSSOFlow]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!clerkSignIn) throw new Error(authMessage('signInStarting'));

    lanzarSiFalla(
      await clerkSignIn.create({ identifier: email.trim().toLowerCase() }),
      authMessage('accountNotFound'),
    );

    lanzarSiFalla(
      await clerkSignIn.resetPasswordEmailCode.sendCode(),
      authMessage('recoveryCodeFailed'),
    );
  }, [clerkSignIn]);

  const value = useMemo<AuthContextValue>(() => ({
    session: session ?? null,
    user,
    role,
    isAuthenticated: Boolean(demoUser || isSignedIn),
    isLoading: !authCargado,
    isRoleLoading: Boolean(isSignedIn && isSupabaseConfigured && databaseRole.isPending),
    roleError,
    signIn, signUp, verifyOtp, resendSignupOtp, signInWithOAuth, requestPasswordReset,
    updateProfileName, updatePassword, signInDemo, signOut,
  }), [
    authCargado, databaseRole.isPending, demoUser, isSignedIn, requestPasswordReset, resendSignupOtp, role, roleError,
    session, signIn, signInDemo, signInWithOAuth, signOut, signUp, updatePassword,
    updateProfileName, user, verifyOtp,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
