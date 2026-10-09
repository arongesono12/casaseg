import { Host, Switch } from '@expo/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { PremiumButton } from '@/components/ui/premium';
import { fontFamily, radius, touchTarget } from '@/constants/theme';
import { ACCOUNT_DELETION_CONFIRMATION, isDeletionConfirmed, requestAccountDeletion } from '@/features/account/account-deletion.api';
import { useProfileId } from '@/features/auth/use-profile-id';
import { fetchUserSettings, saveUserSettings, type UserSettings } from '@/features/auth/user-settings';
import { registerPushDevice, revokePushDevices } from '@/features/notifications/push-notifications';
import { useAuth } from '@/providers/auth-context';
import { defineCopy, interpolate, useCopy, useI18n, type Locale } from '@/providers/i18n-context';
import { useAppTheme, type ThemeMode } from '@/providers/theme-context';
import { formatDate } from '@/utils/formatters';

const deletionCopy = defineCopy({
  es: { title: 'Eliminar cuenta', body: 'Tu cuenta y tus publicaciones se suspenden de inmediato y se eliminan al terminar el plazo de recuperación. Escribe {word} para confirmar.', action: 'Eliminar mi cuenta', scheduled: 'Eliminación programada para el {date}. Contacta con soporte si cambias de opinión.' },
  fr: { title: 'Supprimer le compte', body: 'Votre compte et vos annonces sont suspendus immédiatement, puis supprimés à la fin du délai de récupération. Saisissez {word} pour confirmer.', action: 'Supprimer mon compte', scheduled: 'Suppression programmée le {date}. Contactez le support si vous changez d’avis.' },
  en: { title: 'Delete account', body: 'Your account and listings are suspended right away and deleted when the recovery period ends. Type {word} to confirm.', action: 'Delete my account', scheduled: 'Deletion scheduled for {date}. Contact support if you change your mind.' },
});

const preferencesCopy = defineCopy({
  es: { notifications: 'Notificaciones', privacy: 'Privacidad', display: 'Visualización', emailNotifications: 'Avisos por correo', pushNotifications: 'Notificaciones push', propertyAlerts: 'Alertas de propiedades', messageNotifications: 'Avisos de mensajes', marketingEmails: 'Novedades y ofertas', showEmail: 'Mostrar mi correo', showPhone: 'Mostrar mi teléfono', profileVisibility: 'Visibilidad del perfil', public: 'Público', private: 'Privado', defaultView: 'Vista predeterminada', grid: 'Cuadrícula', list: 'Lista', showMapByDefault: 'Abrir el mapa por defecto', propertiesPerPage: 'Resultados por página', currency: 'Moneda', preferencesUnavailable: 'No se pudieron cargar tus preferencias.', retry: 'Reintentar', savingFailed: 'No se pudo guardar el cambio.' },
  fr: { notifications: 'Notifications', privacy: 'Confidentialité', display: 'Affichage', emailNotifications: 'Alertes par e-mail', pushNotifications: 'Notifications push', propertyAlerts: 'Alertes logement', messageNotifications: 'Alertes de messages', marketingEmails: 'Actualités et offres', showEmail: 'Afficher mon e-mail', showPhone: 'Afficher mon téléphone', profileVisibility: 'Visibilité du profil', public: 'Public', private: 'Privé', defaultView: 'Vue par défaut', grid: 'Grille', list: 'Liste', showMapByDefault: 'Ouvrir la carte par défaut', propertiesPerPage: 'Résultats par page', currency: 'Devise', preferencesUnavailable: 'Impossible de charger vos préférences.', retry: 'Réessayer', savingFailed: 'Impossible d’enregistrer la modification.' },
  en: { notifications: 'Notifications', privacy: 'Privacy', display: 'Display', emailNotifications: 'Email alerts', pushNotifications: 'Push notifications', propertyAlerts: 'Property alerts', messageNotifications: 'Message alerts', marketingEmails: 'News and offers', showEmail: 'Show my email', showPhone: 'Show my phone', profileVisibility: 'Profile visibility', public: 'Public', private: 'Private', defaultView: 'Default view', grid: 'Grid', list: 'List', showMapByDefault: 'Open map by default', propertiesPerPage: 'Results per page', currency: 'Currency', preferencesUnavailable: 'Could not load your preferences.', retry: 'Retry', savingFailed: 'Could not save the change.' },
});

export default function SettingsScreen() {
  const { mode, setMode, palette } = useAppTheme();
  const { locale, setLocale, t } = useI18n();
  const { user, signOut } = useAuth();
  // user_settings.user_id es el uuid de public.users; user.id es el id de Clerk.
  const profileId = useProfileId();
  const [syncError, setSyncError] = useState<string>();
  const queryClient = useQueryClient();
  const preferences = useQuery({ queryKey: ['user-settings', profileId], queryFn: () => fetchUserSettings(profileId!), enabled: Boolean(profileId) });
  const savePreference = useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      if (patch.pushNotifications === true) await registerPushDevice();
      await saveUserSettings(profileId!, patch);
      if (patch.pushNotifications === false) await revokePushDevices();
    },
    onSuccess: (_data, patch) => queryClient.setQueryData<UserSettings>(['user-settings', profileId], (current) => current ? { ...current, ...patch } : current),
  });

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
      {user && profileId ? (
        <PreferencesSection
          value={preferences.data}
          loading={preferences.isPending}
          error={preferences.error || savePreference.error}
          saving={savePreference.isPending}
          onRetry={() => void preferences.refetch()}
          onChange={(patch) => savePreference.mutate(patch)}
        />
      ) : null}
      {syncError && <Text selectable accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{syncError}</Text>}
      <Text selectable style={{ fontFamily: fontFamily.regular, color: palette.textSecondary, fontSize: 13, lineHeight: 19 }}>{t('settingsSecurityNote')}</Text>
      {user ? <AccountDeletion onScheduled={signOut} /> : null}
    </RouteScreen>
  );
}

function PreferencesSection({ value, loading, error, saving, onRetry, onChange }: {
  value?: UserSettings;
  loading: boolean;
  error: Error | null;
  saving: boolean;
  onRetry: () => void;
  onChange: (patch: Partial<UserSettings>) => void;
}) {
  const { palette } = useAppTheme();
  const copy = useCopy(preferencesCopy);
  if (loading && !value) return <Text style={[styles.body, { color: palette.textSecondary }]}>Cargando preferencias…</Text>;
  if (!value) return (
    <View style={styles.group}>
      <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{copy.preferencesUnavailable}</Text>
      <PremiumButton variant="secondary" label={copy.retry} onPress={onRetry} />
    </View>
  );
  const notificationToggles: { key: keyof UserSettings; label: string }[] = [
    { key: 'emailNotifications', label: copy.emailNotifications },
    { key: 'pushNotifications', label: copy.pushNotifications },
    { key: 'propertyAlerts', label: copy.propertyAlerts },
    { key: 'messageNotifications', label: copy.messageNotifications },
    { key: 'marketingEmails', label: copy.marketingEmails },
  ];
  const privacyToggles: { key: keyof UserSettings; label: string }[] = [
    { key: 'showEmail', label: copy.showEmail },
    { key: 'showPhone', label: copy.showPhone },
  ];
  const renderToggle = ({ key, label }: { key: keyof UserSettings; label: string }) => (
    <View key={key} style={[styles.preferenceRow, { borderColor: palette.border }]}>
      <Text style={[styles.body, { color: palette.text, flex: 1 }]}>{label}</Text>
      <Host matchContents>
        <Switch value={Boolean(value[key])} disabled={saving} onValueChange={(next) => onChange({ [key]: next })} testID={`setting-${key}`} />
      </Host>
    </View>
  );
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header" style={[styles.label, { color: palette.text }]}>{copy.notifications}</Text>
      {notificationToggles.map(renderToggle)}
      <Text accessibilityRole="header" style={[styles.label, { color: palette.text }]}>{copy.privacy}</Text>
      {privacyToggles.map(renderToggle)}
      <OptionGroup title={copy.profileVisibility} values={[["public", copy.public], ["private", copy.private]]} selected={value.profileVisibility} onSelect={(profileVisibility) => onChange({ profileVisibility: profileVisibility as UserSettings['profileVisibility'] })} />
      <Text accessibilityRole="header" style={[styles.label, { color: palette.text }]}>{copy.display}</Text>
      {renderToggle({ key: 'showMapByDefault', label: copy.showMapByDefault })}
      <OptionGroup title={copy.defaultView} values={[["grid", copy.grid], ["list", copy.list]]} selected={value.defaultView} onSelect={(defaultView) => onChange({ defaultView: defaultView as UserSettings['defaultView'] })} />
      <OptionGroup title={copy.propertiesPerPage} values={[["12", "12"], ["24", "24"], ["48", "48"]]} selected={String(value.propertiesPerPage)} onSelect={(propertiesPerPage) => onChange({ propertiesPerPage: Number(propertiesPerPage) })} />
      <OptionGroup title={copy.currency} values={[["XAF", "XAF"], ["EUR", "EUR"], ["USD", "USD"]]} selected={value.currency} onSelect={(currency) => onChange({ currency })} />
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{copy.savingFailed} {error.message}</Text> : null}
    </View>
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
  preferenceRow: { minHeight: 50, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  label: { fontSize: 17, fontFamily: fontFamily.bold },
  body: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1 },
  input: { fontFamily: fontFamily.regular, minHeight: touchTarget, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 14, fontSize: 16 },
  error: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.bold },
});
