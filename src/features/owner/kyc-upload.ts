import * as ImagePicker from 'expo-image-picker';
import { readLocalFile } from '@/lib/read-local-file';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export async function uploadKycDocument() {
  if (!isSupabaseConfigured) throw new Error('Configura Supabase para enviar documentos KYC.');
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: .9 });
  if (picked.canceled) return false;
  const asset = picked.assets[0];
  if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) throw new Error('El documento supera 10 MB.');
  const { data, error } = await supabase.functions.invoke('create-kyc-upload-url', { body: { content_type: asset.mimeType ?? 'image/jpeg', size: asset.fileSize } });
  if (error) throw error;
  const body = await readLocalFile(asset.uri);
  const result = await supabase.storage.from('kyc-private').uploadToSignedUrl(String(data.path), String(data.token), body, { contentType: asset.mimeType ?? 'image/jpeg' });
  if (result.error) throw result.error;
  return true;
}
