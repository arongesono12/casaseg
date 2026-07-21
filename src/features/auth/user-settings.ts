import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Locale } from '@/providers/i18n-context';
import type { ThemeMode } from '@/providers/theme-context';

export async function saveUserSettings(userId: string, settings: { theme?: ThemeMode; locale?: Locale }) {
  if (!isSupabaseConfigured) return;
  const { locale, ...rest } = settings;
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      ...rest,
      ...(locale ? { language: locale } : {}),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) throw error;
}
