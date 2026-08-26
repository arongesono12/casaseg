import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { getClerkInstance } from '@clerk/expo';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// The placeholders below only keep the local demo mode alive. Distributed builds
// cannot reach this branch: app.config.ts fails the EAS build when these
// variables are missing, instead of shipping an app wired to a dead host.
export const isSupabaseConfigured = Boolean(url && publishableKey);

/**
 * Third-Party Auth: Clerk emite el token y Supabase lo valida contra el JWKS
 * de la instancia de Clerk. Ya no existe una sesión de GoTrue que refrescar.
 *
 * Al declarar `accessToken`, supabase-js deshabilita por completo el espacio
 * `supabase.auth`: cualquier llamada a `supabase.auth.*` lanza. Todo el flujo
 * de credenciales vive en las pantallas de (auth), que hablan con Clerk vía
 * sus hooks de JavaScript, así que no queda ninguna llamada a supabase.auth.
 */
async function tokenDeClerk() {
  try {
    // getClerkInstance lanza si Clerk aún no se ha inicializado; devolver null
    // deja la petición como anónima en vez de romper la pantalla que la lanzó.
    const clerk = getClerkInstance();
    return (await clerk.session?.getToken()) ?? null;
  } catch {
    return null;
  }
}

export const supabase = createClient(
  url ?? 'https://not-configured.supabase.co',
  publishableKey ?? 'publishable-key-not-configured',
  { accessToken: tokenDeClerk },
);
