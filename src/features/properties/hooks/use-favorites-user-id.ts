import { useProfileId } from '@/features/auth/use-profile-id';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-context';

/**
 * Id con el que se guardan los favoritos del usuario actual.
 *
 * favorites.user_id es el uuid de public.users; con Clerk, user.id es
 * "user_xxx" y filtrar por él devolvía 400 ("invalid input syntax for type
 * uuid"), así que los corazones nunca se marcaban. En modo demo no hay perfil
 * de Supabase y se usa el id de la sesión. undefined mientras se resuelve.
 */
export function useFavoritesUserId(): string | undefined {
  const { user } = useAuth();
  const profileId = useProfileId();
  if (!user) return undefined;
  return isSupabaseConfigured ? profileId : user.id;
}
