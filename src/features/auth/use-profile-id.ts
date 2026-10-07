import { useQuery } from '@tanstack/react-query';

import { isSupabaseConfigured, refreshClerkToken, supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-context';

/** El perfil todavía no existe o el token aún no lleva su `external_id`. */
class ProfileNotReadyError extends Error {}

/** clerk-user-webhook tarda unos segundos en crear el perfil de un alta nueva. */
const PROFILE_RETRIES = 5;
const PROFILE_RETRY_DELAY_MS = 2_000;

async function fetchCurrentProfileId(): Promise<string | null> {
  const { data, error } = await supabase.rpc('current_profile');
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { id?: unknown } | undefined;
  return typeof row?.id === 'string' ? row.id : null;
}

/**
 * uuid de public.users del usuario actual.
 *
 * `user.id` es el id de Clerk (user_xxx) y nunca coincide con columnas como
 * properties.owner_id o agreements.client_id, que guardan el uuid de
 * Supabase. current_profile() lo resuelve desde el mismo token que usan las
 * políticas RLS.
 *
 * Si no resuelve, se renueva el token de Clerk y se reintenta: tras el
 * registro, el token se emite antes de que el webhook cree el perfil y escriba
 * `external_id` en Clerk.
 */
export function useProfileId(): string | undefined {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['profile', 'current', user?.id ?? 'guest'],
    enabled: Boolean(user) && isSupabaseConfigured,
    staleTime: Infinity,
    retry: (failureCount, error) => error instanceof ProfileNotReadyError && failureCount < PROFILE_RETRIES,
    retryDelay: PROFILE_RETRY_DELAY_MS,
    queryFn: async () => {
      const id = await fetchCurrentProfileId();
      if (id) return id;
      await refreshClerkToken();
      const refreshed = await fetchCurrentProfileId();
      if (refreshed) return refreshed;
      throw new ProfileNotReadyError('El perfil de CasaSeg todavía no está listo.');
    },
  });

  return query.data ?? undefined;
}
