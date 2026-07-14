import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { DraftImage } from '@/features/owner/property-draft.store';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
export async function pickAndCompressImages() {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 1, selectionLimit: 10 });
  if (result.canceled) return [];
  const valid = result.assets.filter((asset) => (!asset.fileSize || asset.fileSize <= 12 * 1024 * 1024) && allowedTypes.has(asset.mimeType ?? 'image/jpeg'));
  return Promise.all(valid.map(async (asset): Promise<DraftImage> => { const compressed = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: Math.min(asset.width, 1600) } }], { compress: .78, format: ImageManipulator.SaveFormat.JPEG }); return { uri: compressed.uri, mimeType: 'image/jpeg', width: compressed.width, height: compressed.height }; }));
}

export async function uploadPropertyImages(userId: string, propertyId: string, images: DraftImage[], onProgress: (value: number) => void) {
  if (!isSupabaseConfigured) return images.map((image) => image.uri);
  const paths: string[] = [];
  for (let index = 0; index < images.length; index += 3) {
    const batch = images.slice(index, index + 3);
    const uploaded = await Promise.all(batch.map(async (image, batchIndex) => { const path = `${userId}/${propertyId}/${Date.now()}-${index + batchIndex}.jpg`; const body = await (await fetch(image.uri)).arrayBuffer(); const { error } = await supabase.storage.from('property-images').upload(path, body, { contentType: image.mimeType, upsert: false }); if (error) throw error; return path; }));
    paths.push(...uploaded); onProgress(paths.length / images.length);
  }
  return paths;
}

export async function removeOrphanImages(paths: string[]) { if (isSupabaseConfigured && paths.length) await supabase.storage.from('property-images').remove(paths); }
