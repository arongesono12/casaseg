import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Locale } from '@/providers/i18n-context';
import type { ThemeMode } from '@/providers/theme-context';

export type UserSettings = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  propertyAlerts: boolean;
  messageNotifications: boolean;
  marketingEmails: boolean;
  profileVisibility: 'public' | 'private';
  showEmail: boolean;
  showPhone: boolean;
  currency: string;
  propertiesPerPage: number;
  defaultView: 'grid' | 'list';
  showMapByDefault: boolean;
};

export const defaultUserSettings: UserSettings = {
  emailNotifications: true,
  pushNotifications: true,
  propertyAlerts: true,
  messageNotifications: true,
  marketingEmails: false,
  profileVisibility: 'public',
  showEmail: false,
  showPhone: false,
  currency: 'XAF',
  propertiesPerPage: 12,
  defaultView: 'grid',
  showMapByDefault: false,
};

const settingColumns: Record<keyof UserSettings, string> = {
  emailNotifications: 'email_notifications', pushNotifications: 'push_notifications',
  propertyAlerts: 'property_alerts', messageNotifications: 'message_notifications',
  marketingEmails: 'marketing_emails', profileVisibility: 'profile_visibility',
  showEmail: 'show_email', showPhone: 'show_phone', currency: 'currency',
  propertiesPerPage: 'properties_per_page', defaultView: 'default_view',
  showMapByDefault: 'show_map_by_default',
};

export async function fetchUserSettings(userId: string): Promise<UserSettings> {
  if (!isSupabaseConfigured) return defaultUserSettings;
  const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return defaultUserSettings;
  return Object.fromEntries(Object.entries(settingColumns).map(([key, column]) =>
    [key, data[column] ?? defaultUserSettings[key as keyof UserSettings]],
  )) as UserSettings;
}

export async function saveUserSettings(userId: string, settings: Partial<UserSettings> & { theme?: ThemeMode; locale?: Locale }) {
  if (!isSupabaseConfigured) return;
  const { locale, theme, ...rest } = settings;
  const mapped = Object.fromEntries(Object.entries(rest).map(([key, value]) => [settingColumns[key as keyof UserSettings], value]));
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      ...mapped,
      ...(theme ? { theme } : {}),
      ...(locale ? { language: locale } : {}),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) throw error;
}
