import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export async function addFavorite(userId: string, propertyId: string) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('favorites').insert({ user_id: userId, property_id: propertyId });
  if (error) throw error;
}

export async function removeFavorite(userId: string, propertyId: string) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('favorites').delete().match({ user_id: userId, property_id: propertyId });
  if (error) throw error;
}
