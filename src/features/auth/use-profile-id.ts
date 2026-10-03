import { useQuery } from '@tanstack/react-query';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-context';

/**
 * uuid de public.users del usuario actual.
 *
 * `user.id` es el id de Clerk (user_xxx) y nunca coincide con columnas como
 * properties.owner_id o visit_requests.requester_id, que guardan el uuid de
 * Supabase. current_profile() lo resuelve desde el mismo token que usan las
 * políticas RLS.
 */
export function useProfileId(): string | undefined {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['profile', 'current', user?.id ?? 'guest'],
    enabled: Boolean(user) && isSupabaseConfigured,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('current_profile');
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as { id?: unknown } | undefined;
      return typeof row?.id === 'string' ? row.id : null;
    },
  });

  return query.data ?? undefined;
}
