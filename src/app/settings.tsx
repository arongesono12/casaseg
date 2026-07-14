import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteScreen } from '@/components/route-screen';
import { radius } from '@/constants/theme';
import { useI18n, type Locale } from '@/providers/i18n-provider';
import { useAppTheme, type ThemeMode } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { saveUserSettings } from '@/features/auth/user-settings';

export default function SettingsScreen() {
  const { mode, setMode, palette } = useAppTheme(); const { locale, setLocale } = useI18n(); const { user } = useAuth();
  const changeTheme = (value: string) => { const theme = value as ThemeMode; setMode(theme); if (user) void saveUserSettings(user.id, { theme }); };
  const changeLocale = (value: string) => { const nextLocale = value as Locale; setLocale(nextLocale); if (user) void saveUserSettings(user.id, { locale: nextLocale }); };
  const { t } = useI18n();
  return <RouteScreen title={t('settings')} description={t('settingsSubtitle')}><OptionGroup title={t('theme')} values={[['light',t('light')],['dark',t('dark')],['system',t('system')]]} selected={mode} onSelect={changeTheme} /><OptionGroup title={t('language')} values={[['es','Español'],['fr','Français'],['en','English']]} selected={locale} onSelect={changeLocale} /><Text style={{ color: palette.textSecondary, fontSize: 13, lineHeight: 19 }}>RLS protege los datos en el servidor.</Text></RouteScreen>;
}
function OptionGroup({ title, values, selected, onSelect }: { title: string; values: string[][]; selected: string; onSelect: (value: string) => void }) { const { palette } = useAppTheme(); return <View style={styles.group}><Text style={[styles.label, { color: palette.text }]}>{title}</Text><View style={styles.options}>{values.map(([value,label]) => <Pressable key={value} onPress={() => onSelect(value)} style={[styles.option, { borderColor: selected === value ? palette.brand : palette.border, backgroundColor: selected === value ? palette.subtle : palette.surface }]}><Text style={{ color: palette.text, fontWeight: '700' }}>{label}</Text></Pressable>)}</View></View>; }
const styles = StyleSheet.create({ group: { gap: 10 }, label: { fontSize: 17, fontWeight: '900' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1 } });
