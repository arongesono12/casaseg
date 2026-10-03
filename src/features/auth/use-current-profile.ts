import { useQuery } from '@tanstack/react-query';

import { useProfileId } from '@/features/auth/use-profile-id';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type CurrentProfile = {
  id: string;
  name?: string;
  avatar?: string;
  coverPicture?: string;
  phone?: string;
  about?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt?: string;
};

type UserRow = {
  id: string;
  name: string | null;
  avatar: string | null;
  cover_picture: string | null;
  phone: string | null;
  about: string | null;
  email_verified: boolean | null;
  phone_verified: boolean | null;
  created_at: string | null;
};

function text(value: string | null) {
  return value?.trim() || undefined;
}

/**
 * Ficha del usuario en public.users. Clerk solo conoce nombre, correo y foto;
 * el avatar migrado, el teléfono, la bio y la antigüedad viven aquí.
 */
export function useCurrentProfile() {
  const profileId = useProfileId();

  return useQuery({
    queryKey: ['profile', 'details', profileId ?? 'pending'],
    enabled: Boolean(profileId) && isSupabaseConfigured,
    queryFn: async (): Promise<CurrentProfile | null> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar, cover_picture, phone, about, email_verified, phone_verified, created_at')
        .eq('id', profileId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as UserRow;
      return {
        id: row.id,
        name: text(row.name),
        avatar: text(row.avatar),
        coverPicture: text(row.cover_picture),
        phone: text(row.phone),
        about: text(row.about),
        emailVerified: Boolean(row.email_verified),
        phoneVerified: Boolean(row.phone_verified),
        createdAt: row.created_at ?? undefined,
      };
    },
  });
}
