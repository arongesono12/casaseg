import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Locale } from '@/providers/i18n-provider';
import type { ThemeMode } from '@/providers/theme-provider';

export async function saveUserSettings(userId: string, settings: { theme?: ThemeMode; locale?: Locale }) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('user_settings').upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}
