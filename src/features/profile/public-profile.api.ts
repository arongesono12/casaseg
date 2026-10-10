import { properties as fallbackProperties } from '@/data/properties';
import { PROPERTY_LIST_COLUMNS, mapProperty, type PropertyRow } from '@/features/properties/api/property.mapper';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Property } from '@/types';

export type VisibleUserProfile = {
  id: string;
  name: string;
  avatar?: string;
  coverPicture?: string;
  about?: string;
  socialLinks?: Record<string, string>;
  role: string;
  createdAt?: string;
};

type VisibleUserProfileRow = {
  id: string;
  name: string;
  avatar: string | null;
  cover_picture: string | null;
  about: string | null;
  social_links: Record<string, string> | null;
  role: string;
  created_at: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function fetchVisibleUserProfile(userId: string): Promise<VisibleUserProfile | null> {
  if (!isSupabaseConfigured) {
    if (userId === 'support') return { id: userId, name: 'Equipo CasaSeg', role: 'admin' };
    const property = fallbackProperties.find((item) => item.ownerId === userId);
    return property ? { id: userId, name: property.ownerName, avatar: property.ownerAvatar, role: 'owner' } : null;
  }
  if (!UUID_PATTERN.test(userId)) return null;
  const { data, error } = await supabase.rpc('get_visible_user_profile', { p_user_id: userId });
  if (error) throw error;
  const row = ((data ?? []) as VisibleUserProfileRow[])[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar ?? undefined,
    coverPicture: row.cover_picture ?? undefined,
    about: row.about ?? undefined,
    socialLinks: row.social_links ?? undefined,
    role: row.role,
    createdAt: row.created_at ?? undefined,
  };
}

export async function fetchVisibleUserProperties(userId: string): Promise<Property[]> {
  if (!isSupabaseConfigured) return fallbackProperties.filter((item) => item.ownerId === userId);
  if (!UUID_PATTERN.test(userId)) return [];
  const { data, error } = await supabase.from('properties')
    .select(PROPERTY_LIST_COLUMNS)
    .eq('owner_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(24);
  if (error) throw error;
  return ((data ?? []) as PropertyRow[]).map((row) => mapProperty(row));
}
