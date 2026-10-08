import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useProfileId } from '@/features/auth/use-profile-id';
import { appStorage } from '@/lib/local-storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-context';

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

const profileDetailsKey = (id: string) => ['profile', 'details', id] as const;
const demoPhoneKey = (id: string) => `casaseg.demo-profile-phone.${id}`;

/**
 * Ficha del usuario en public.users. Clerk solo conoce nombre, correo y foto;
 * el avatar migrado, el teléfono, la bio y la antigüedad viven aquí.
 */
export function useCurrentProfile() {
  const { user } = useAuth();
  const profileId = useProfileId();
  const queryId = isSupabaseConfigured ? profileId : user ? `demo:${user.id}` : undefined;

  return useQuery({
    queryKey: profileDetailsKey(queryId ?? 'pending'),
    enabled: Boolean(user && queryId),
    queryFn: async (): Promise<CurrentProfile | null> => {
      if (!isSupabaseConfigured) {
        return user ? {
          id: user.id,
          name: user.name,
          phone: appStorage.getItem(demoPhoneKey(user.id)) || undefined,
          emailVerified: true,
          phoneVerified: false,
        } : null;
      }
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

/** Guarda el teléfono en public.users; la base de datos revoca la verificación al cambiarlo. */
export function useUpdateProfilePhone() {
  const { user } = useAuth();
  const profileId = useProfileId();
  const queryClient = useQueryClient();

  return useCallback(async (phone: string | null) => {
    if (!user) throw new Error('No hay una sesión activa.');

    if (!isSupabaseConfigured) {
      if (phone) appStorage.setItem(demoPhoneKey(user.id), phone);
      else appStorage.removeItem(demoPhoneKey(user.id));
      queryClient.setQueryData<CurrentProfile | null>(profileDetailsKey(`demo:${user.id}`), (current) => ({
        ...(current ?? { id: user.id, emailVerified: true, phoneVerified: false }),
        phone: phone ?? undefined,
        phoneVerified: false,
      }));
      return;
    }

    if (!profileId) throw new Error('El perfil todavía no está disponible.');
    const { data, error } = await supabase
      .from('users')
      .update({ phone })
      .eq('id', profileId)
      .select('phone, phone_verified')
      .single();
    if (error) throw error;
    queryClient.setQueryData<CurrentProfile | null>(profileDetailsKey(profileId), (current) => current ? {
      ...current,
      phone: text(data.phone),
      phoneVerified: Boolean(data.phone_verified),
    } : current);
    await queryClient.invalidateQueries({ queryKey: profileDetailsKey(profileId) });
  }, [profileId, queryClient, user]);
}
