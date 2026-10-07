import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { PremiumButton } from '@/components/ui/premium';
import { fontFamily, radius, touchTarget } from '@/constants/theme';
import { ACCOUNT_DELETION_CONFIRMATION, isDeletionConfirmed, requestAccountDeletion } from '@/features/account/account-deletion.api';
import { useProfileId } from '@/features/auth/use-profile-id';
import { saveUserSettings } from '@/features/auth/user-settings';
import { useAuth } from '@/providers/auth-context';
import { defineCopy, interpolate, useCopy, useI18n, type Locale } from '@/providers/i18n-context';
import { useAppTheme, type ThemeMode } from '@/providers/theme-context';
import { formatDate } from '@/utils/formatters';

const deletionCopy = defineCopy({
  es: { title: 'Eliminar cuenta', body: 'Tu cuenta y tus publicaciones se suspenden de inmediato y se eliminan al terminar el plazo de recuperación. Escribe {word} para confirmar.', action: 'Eliminar mi cuenta', scheduled: 'Eliminación programada para el {date}. Contacta con soporte si cambias de opinión.' },
  fr: { title: 'Supprimer le compte', body: 'Votre compte et vos annonces sont suspendus immédiatement, puis supprimés à la fin du délai de récupération. Saisissez {word} pour confirmer.', action: 'Supprimer mon compte', scheduled: 'Suppression programmée le {date}. Contactez le support si vous changez d’avis.' },
  en: { title: 'Delete account', body: 'Your account and listings are suspended right away and deleted when the recovery period ends. Type {word} to confirm.', action: 'Delete my account', scheduled: 'Deletion scheduled for {date}. Contact support if you change your mind.' },
});

export default function SettingsScreen() {
  const { mode, setMode, palette } = useAppTheme();
  const { locale, setLocale, t } = useI18n();
  const { user, signOut } = useAuth();
  // user_settings.user_id es el uuid de public.users; user.id es el id de Clerk.
  const profileId = useProfileId();
  const [syncError, setSyncError] = useState<string>();

  const persistSettings = (settings: { theme?: ThemeMode; locale?: Locale }) => {
    if (!profileId) return;
    setSyncError(undefined);
    void saveUserSettings(profileId, settings).catch(() => setSyncError(t('settingsSaveError')));
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
      {user ? <AccountDeletion onScheduled={signOut} /> : null}
    </RouteScreen>
  );
}

function AccountDeletion({ onScheduled }: { onScheduled: () => Promise<void> }) {
  const { palette } = useAppTheme();
  const { locale } = useI18n();
  const copy = useCopy(deletionCopy);
  const [confirmation, setConfirmation] = useState('');
  const deletion = useMutation({ mutationFn: () => requestAccountDeletion(confirmation) });

  if (deletion.data) {
    return (
      <View style={styles.group}>
        <Text style={[styles.label, { color: palette.text }]}>{copy.title}</Text>
        <Text selectable style={[styles.body, { color: palette.textSecondary }]}>{interpolate(copy.scheduled, { date: formatDate(deletion.data.scheduledFor, locale) })}</Text>
        <PremiumButton variant="secondary" label="OK" onPress={() => void onScheduled()} />
      </View>
    );
  }

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: palette.text }]}>{copy.title}</Text>
      <Text style={[styles.body, { color: palette.textSecondary }]}>{interpolate(copy.body, { word: ACCOUNT_DELETION_CONFIRMATION })}</Text>
      <TextInput
        accessibilityLabel={copy.title}
        value={confirmation}
        onChangeText={setConfirmation}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={ACCOUNT_DELETION_CONFIRMATION}
        placeholderTextColor={palette.muted}
        style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
      />
      <PremiumButton variant="danger" label={copy.action} loading={deletion.isPending} disabled={!isDeletionConfirmed(confirmation)} onPress={() => deletion.mutate()} />
      {deletion.error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{deletion.error.message}</Text> : null}
    </View>
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
  body: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1 },
  input: { fontFamily: fontFamily.regular, minHeight: touchTarget, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, fontSize: 16 },
  error: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.bold },
});
