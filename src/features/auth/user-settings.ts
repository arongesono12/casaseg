import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Locale } from '@/providers/i18n-context';
import type { ThemeMode } from '@/providers/theme-context';

export async function saveUserSettings(settings: { theme?: ThemeMode; locale?: Locale }) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('user_settings')
    .upsert({ ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}
