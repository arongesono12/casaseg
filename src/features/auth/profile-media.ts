import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { readLocalFile } from '@/lib/read-local-file';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const BUCKET = 'propiedades-images';

export async function pickAndUploadProfileImage(userId: string, kind: 'avatars' | 'covers'): Promise<{ url: string; path: string } | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1 });
  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];
  if (asset.fileSize && asset.fileSize > 12 * 1024 * 1024) throw new Error('La imagen supera el límite de 12 MB.');
  const image = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: Math.min(asset.width, kind === 'avatars' ? 768 : 1600) } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
  );
  if (!isSupabaseConfigured) return { url: image.uri, path: '' };
  const path = `${kind}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const body = await readLocalFile(image.uri);
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: `${data.publicUrl}?t=${Date.now()}`, path };
}

export async function removeUploadedProfileImage(path: string) {
  if (path && isSupabaseConfigured) await supabase.storage.from(BUCKET).remove([path]);
}
