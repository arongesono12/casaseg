import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

export async function registerPushDevice() {
  if (Platform.OS === 'web') throw new Error('Las notificaciones push no están disponibles en web.');
  if (isExpoGo()) {
    throw new Error('Expo Go no soporta notificaciones push remotas desde SDK 53. Usa una development build para activar push.');
  }

  if (!Device.isDevice) throw new Error('Las notificaciones push requieren un dispositivo físico.');
  const Notifications = await import('expo-notifications');
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Permiso de notificaciones no concedido.');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'CasaSeg', importance: Notifications.AndroidImportance.DEFAULT });
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('device_tokens').upsert({ expo_push_token: token, platform: Platform.OS, device_name: Device.deviceName, revoked_at: null }, { onConflict: 'user_id,expo_push_token' });
    if (error) throw error;
  }
  return token;
}

export async function revokePushDevices() {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('device_tokens').update({ revoked_at: new Date().toISOString() }).is('revoked_at', null);
  if (error) throw error;
}
