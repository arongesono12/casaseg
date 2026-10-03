import { useQuery } from '@tanstack/react-query';

import { useProfileId } from '@/features/auth/use-profile-id';
import { fetchOwnerProperties } from '@/features/properties/api/property.queries';
import { propertyKeys } from '@/features/properties/api/property.keys';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-context';

/**
 * Viviendas del propietario actual.
 *
 * properties.owner_id guarda el uuid de public.users; con Clerk, user.id es
 * "user_xxx" y filtrar por él hacía fallar la consulta (uuid inválido), así que
 * el panel quedaba vacío. En modo demo no hay perfil de Supabase y los datos
 * locales usan el id de la sesión demo.
 */
export function useOwnerProperties() {
  const { user } = useAuth();
  const profileId = useProfileId();
  const ownerId = isSupabaseConfigured ? profileId : user?.id;

  return useQuery({
    queryKey: [...propertyKeys.all, 'owner', ownerId ?? 'pending'],
    queryFn: () => fetchOwnerProperties(ownerId!),
    enabled: Boolean(ownerId),
  });
}
