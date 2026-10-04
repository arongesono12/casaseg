import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { fontFamily, radius } from '@/constants/theme';
import { saveUserSettings } from '@/features/auth/user-settings';
import { useAuth } from '@/providers/auth-context';
import { useI18n, type Locale } from '@/providers/i18n-context';
import { useAppTheme, type ThemeMode } from '@/providers/theme-context';

export default function SettingsScreen() {
  const { mode, setMode, palette } = useAppTheme();
  const { locale, setLocale, t } = useI18n();
  const { user } = useAuth();
  const [syncError, setSyncError] = useState<string>();

  const persistSettings = (settings: { theme?: ThemeMode; locale?: Locale }) => {
    if (!user) return;
    setSyncError(undefined);
    void saveUserSettings(user.id, settings).catch(() => setSyncError(t('settingsSaveError')));
  };

  const changeTheme = (value: string) => {
    const theme = value as ThemeMode;
    setMode(theme);
    persistSettings({ theme });
  };

  const changeLocale = (value: string) => {
    const nextLocale = value as Locale;
    setLocale(nextLocale);
    persistSettings({ locale: nextLocale });
  };

  return (
    <RouteScreen title={t('settings')} description={t('settingsSubtitle')}>
      <OptionGroup title={t('theme')} values={[['light', t('light')], ['dark', t('dark')], ['system', t('system')]]} selected={mode} onSelect={changeTheme} />
      <OptionGroup title={t('language')} values={[['es', 'Español'], ['fr', 'Français'], ['en', 'English']]} selected={locale} onSelect={changeLocale} />
      {syncError && <Text selectable accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{syncError}</Text>}
      <Text selectable style={{ fontFamily: fontFamily.regular, color: palette.textSecondary, fontSize: 13, lineHeight: 19 }}>{t('settingsSecurityNote')}</Text>
    </RouteScreen>
  );
}

function OptionGroup({ title, values, selected, onSelect }: { title: string; values: string[][]; selected: string; onSelect: (value: string) => void }) {
  const { palette } = useAppTheme();
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: palette.text }]}>{title}</Text>
      <View style={styles.options}>
        {values.map(([value, label]) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selected === value }}
            key={value}
            onPress={() => onSelect(value)}
            style={[styles.option, { borderColor: selected === value ? palette.brand : palette.border, backgroundColor: selected === value ? palette.subtle : palette.surface }]}
          >
            <Text style={{ color: palette.text, fontFamily: fontFamily.bold }}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  label: { fontSize: 17, fontFamily: fontFamily.bold },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1 },
  error: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.bold },
});
