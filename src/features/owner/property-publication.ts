import * as Network from 'expo-network';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { usePropertyDraft } from '@/features/owner/property-draft.store';

type Draft = ReturnType<typeof usePropertyDraft.getState>;
export async function publishProperty(draft: Draft, imagePaths: string[]) {
  const network = await Network.getNetworkStateAsync();
  if (!network.isConnected) throw new Error('La publicación final requiere conexión. El borrador sigue guardado.');
  if (!isSupabaseConfigured) return `draft-${Date.now()}`;
  const { data, error } = await supabase.functions.invoke('create-property', { body: { title: draft.title, description: draft.description, location: draft.location, coordinates: draft.coordinates, price: Number(draft.price), price_type: draft.priceType, bedrooms: Number(draft.bedrooms), bathrooms: Number(draft.bathrooms), amenities: draft.amenities, image_paths: imagePaths } });
  if (error) throw error;
  return String(data.id);
}
