import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Keyboard, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { ProfileHeaderCard } from '@/components/profile/profile-header-card';
import { ArrowRight, Bell, Building2, Calendar, Check, CheckCircle2, HomeCheck, Lock, LogOut, Settings, ShieldCheck, Sparkles } from '@/components/ui/icons';
import { PremiumButton, SectionTitle, SurfaceCard } from '@/components/ui/premium';
import { actionGradient, colors, fontFamily, radius, withAlpha, type AppPalette } from '@/constants/theme';
import { useCurrentProfile } from '@/features/auth/use-current-profile';
import { isAdminRole, isOwnerRole } from '@/lib/access-control';
import { onBrandRipple, pressRipple, usesRipple } from '@/lib/press-feedback';
import { useAuth } from '@/providers/auth-context';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const PROFILE_MAX_WIDTH = 960;

const profileCopy = defineCopy({
  es: { myVisits: 'Mis visitas', myVisitsBody: 'Consulta y cancela las visitas que has solicitado.', superadmin: 'Superadministrador', admin: 'Administrador', adminEyebrow: 'RESPONSABILIDAD ADMINISTRATIVA', adminPanel: 'Panel de administración', adminPanelBody: 'Supervisa usuarios, roles, publicaciones y revisiones pendientes.', saved: 'Tu perfil se ha actualizado correctamente.', saveFailed: 'No pudimos actualizar tu perfil.', personalInfo: 'Información personal', nameRequired: 'Introduce tu nombre.', nameTooShort: 'Introduce al menos 2 caracteres.', fullName: 'Nombre completo', becomeOwner: 'Hazte propietario', becomeOwnerBody: 'Solicita publicar tus viviendas en CasaSeg.' },
  fr: { myVisits: 'Mes visites', myVisitsBody: 'Consultez et annulez les visites demandées.', superadmin: 'Super-administrateur', admin: 'Administrateur', adminEyebrow: 'RESPONSABILITÉ ADMINISTRATIVE', adminPanel: 'Panneau d’administration', adminPanelBody: 'Supervisez utilisateurs, rôles, annonces et vérifications en attente.', saved: 'Votre profil a bien été mis à jour.', saveFailed: 'Impossible de mettre à jour votre profil.', personalInfo: 'Informations personnelles', nameRequired: 'Saisissez votre nom.', nameTooShort: 'Saisissez au moins 2 caractères.', fullName: 'Nom complet', becomeOwner: 'Devenez propriétaire', becomeOwnerBody: 'Demandez à publier vos logements sur CasaSeg.' },
  en: { myVisits: 'My visits', myVisitsBody: 'Review and cancel the visits you requested.', superadmin: 'Super administrator', admin: 'Administrator', adminEyebrow: 'ADMIN RESPONSIBILITY', adminPanel: 'Admin dashboard', adminPanelBody: 'Oversee users, roles, listings and pending reviews.', saved: 'Your profile has been updated.', saveFailed: 'We could not update your profile.', personalInfo: 'Personal information', nameRequired: 'Enter your name.', nameTooShort: 'Enter at least 2 characters.', fullName: 'Full name', becomeOwner: 'Become an owner', becomeOwnerBody: 'Apply to list your homes on CasaSeg.' },
});

export default function ProfileScreen() {
  const { user, role, isRoleLoading, roleError, signOut, updateProfileName } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const copy = useCopy(profileCopy);
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const profile = useCurrentProfile();
  const insets = useSafeAreaInsets();

  if (!user) return <Redirect href="/(auth)/login" />;

  const roleLabel = isRoleLoading ? t('verifyingRole') : role === 'owner' ? t('owner') : role === 'client' ? t('client') : role === 'superadmin' ? copy.superadmin : role === 'admin' ? copy.admin : t('roleUnavailable');
  const roleTone = isAdminRole(role) ? colors.primary : isOwnerRole(role) ? colors.brand : role === 'client' ? colors.success : palette.muted;
  const RoleIcon = isAdminRole(role) ? ShieldCheck : isOwnerRole(role) ? Building2 : role === 'client' ? HomeCheck : Lock;

  return (
    <RouteScreen
      title={t('profile')}
      description={t('profileSubtitle')}
      showBack={false}
      showHero={false}
      maxWidth={PROFILE_MAX_WIDTH}
      bottomInsetHandled={Platform.OS === 'android'}
      topContent={(
        <ProfileHeaderCard
          name={user.name}
          email={user.email}
          avatar={user.avatar ?? profile.data?.avatar}
          profile={profile.data}
          profileLoading={profile.isLoading}
          roleLabel={roleLabel}
          roleTone={roleTone}
          roleIcon={RoleIcon}
          palette={palette}
          wide={wide}
          topInset={insets.top}
          contentMaxWidth={PROFILE_MAX_WIDTH}
        />
      )}
    >
      {roleError ? (
        <View style={[styles.roleWarning, { backgroundColor: `${colors.error}0E`, borderColor: `${colors.error}26` }]}>
          <Lock color={colors.error} size={20} />
          <View style={styles.trustCopy}>
            <Text style={[styles.trustTitle, { color: palette.text }]}>{t('roleCheckFailed')}</Text>
            <Text style={[styles.trustDescription, { color: palette.textSecondary }]}>{t('roleCheckFailedBody')}</Text>
          </View>
        </View>
      ) : null}

      {isAdminRole(role) ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/admin' as Href)} android_ripple={onBrandRipple} style={({ pressed }) => [styles.ownerCta, pressed && !usesRipple && styles.pressed]}>
          <LinearGradient colors={actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ownerGradient}>
            <View style={styles.ownerCopy}>
              <View style={styles.ownerEyebrow}><ShieldCheck color={colors.onBrandMuted} size={15} /><Text style={styles.ownerEyebrowText}>{copy.adminEyebrow}</Text></View>
              <Text style={styles.ownerTitle}>{copy.adminPanel}</Text>
              <Text style={styles.ownerDescription}>{copy.adminPanelBody}</Text>
            </View>
            <View style={styles.ownerArrow}><ArrowRight color="white" size={22} /></View>
          </LinearGradient>
        </Pressable>
      ) : null}

      {isOwnerRole(role) ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/owner')} android_ripple={onBrandRipple} style={({ pressed }) => [styles.ownerCta, pressed && !usesRipple && styles.pressed]}>
          <LinearGradient colors={actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ownerGradient}>
            <View style={styles.ownerCopy}>
              <View style={styles.ownerEyebrow}><Sparkles color={colors.onBrandMuted} size={15} /><Text style={styles.ownerEyebrowText}>{t('professionalSpace')}</Text></View>
              <Text style={styles.ownerTitle}>{t('ownerPanel')}</Text>
              <Text style={styles.ownerDescription}>{t('ownerPanelSubtitle')}</Text>
            </View>
            <View style={styles.ownerArrow}><ArrowRight color="white" size={22} /></View>
          </LinearGradient>
        </Pressable>
      ) : null}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{t('account')}</Text>
        <View style={[styles.actions, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Action title={copy.myVisits} description={copy.myVisitsBody} icon={<Calendar color={palette.brandIcon} size={21} />} tone={colors.brand} onPress={() => router.push('/visits' as Href)} palette={palette} />
          {role === 'client' ? (
            <>
              <View style={[styles.divider, { backgroundColor: palette.border }]} />
              <Action title={copy.becomeOwner} description={copy.becomeOwnerBody} icon={<Building2 color={palette.brandIcon} size={21} />} tone={colors.brand} onPress={() => router.push('/owner/onboarding' as Href)} palette={palette} />
            </>
          ) : null}
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <Action title={t('notifications')} description={t('notificationsActionDetail')} icon={<Bell color={palette.brandIcon} size={21} />} tone={colors.brand} onPress={() => router.push('/notifications')} palette={palette} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <Action title={t('settings')} description={t('settingsActionDetail')} icon={<Settings color={palette.brandIcon} size={21} />} tone={colors.primary} onPress={() => router.push('/settings')} palette={palette} />
        </View>
      </View>

      <ProfileDetailsForm
        key={user.id}
        initialName={user.name}
        onSave={updateProfileName}
        palette={palette}
        wide={wide}
      />

      <Pressable accessibilityRole="button" accessibilityLabel={t('signOut')} android_ripple={pressRipple} onPress={() => void signOut()} style={({ pressed }) => [styles.signOut, { backgroundColor: `${colors.error}0E`, borderColor: `${colors.error}26` }, pressed && !usesRipple && styles.pressed]}>
        <LogOut color={colors.error} size={21} />
        <Text style={[styles.signOutText, { color: palette.errorText }]}>{t('signOut')}</Text>
      </Pressable>
      {Platform.OS !== 'android' && <View style={styles.tabSpacer} />}
    </RouteScreen>
  );
}

function Action({ title, description, icon, tone, onPress, palette }: { title: string; description: string; icon: ReactNode; tone: string; onPress: () => void; palette: AppPalette }) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      android_ripple={pressRipple}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: (pressed && !usesRipple) || hovered ? palette.subtle : palette.surface },
        focused && styles.focusRing,
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${tone}14` }]}>{icon}</View>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionText, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.actionDescription, { color: palette.textSecondary }]}>{description}</Text>
      </View>
      <ArrowRight color={palette.muted} size={20} />
    </Pressable>
  );
}

function ProfileDetailsForm({
  initialName,
  onSave,
  palette,
  wide,
}: {
  initialName: string;
  onSave: (name: string) => Promise<void>;
  palette: AppPalette;
  wide: boolean;
}) {
  const { t } = useI18n();
  const copy = useCopy(profileCopy);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string }>();
  const { control, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { name: initialName },
  });

  const submit = handleSubmit(async ({ name }) => {
    Keyboard.dismiss();
    setFeedback(undefined);
    try {
      await onSave(name);
      setFeedback({ tone: 'success', message: copy.saved });
    } catch (error) {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : copy.saveFailed });
    }
  });

  return (
    <SurfaceCard style={styles.profileForm}>
      <SectionTitle title={copy.personalInfo} />
      <View style={[styles.formFields, wide && styles.formFieldsWide]}>
        <View style={styles.formField}>
          <Controller
            control={control}
            name="name"
            rules={{ required: copy.nameRequired, minLength: { value: 2, message: copy.nameTooShort } }}
            render={({ field, fieldState }) => (
              <FormField
                label={copy.fullName}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="done"
                textContentType="name"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                onSubmitEditing={() => void submit()}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
      </View>
      {feedback ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.feedback,
            {
              backgroundColor: feedback.tone === 'success' ? `${colors.success}10` : `${colors.error}10`,
              borderColor: feedback.tone === 'success' ? `${colors.success}30` : `${colors.error}30`,
            },
          ]}
        >
          {feedback.tone === 'success' ? <CheckCircle2 color={colors.success} size={19} /> : <Lock color={colors.error} size={19} />}
          <Text selectable style={[styles.feedbackText, { color: feedback.tone === 'success' ? colors.success : colors.error }]}>{feedback.message}</Text>
        </View>
      ) : null}
      <PremiumButton label={isSubmitting ? t('saving') : t('saveChanges')} icon={Check} loading={isSubmitting} onPress={() => void submit()} style={wide ? styles.saveButton : undefined} />
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  profileForm: { padding: 20, gap: 16 },
  formFields: { gap: 14 },
  formFieldsWide: { flexDirection: 'row' },
  formField: { flex: 1, minWidth: 0 },
  feedback: { minHeight: 46, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  feedbackText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: fontFamily.bold },
  saveButton: { alignSelf: 'flex-end', width: '100%', maxWidth: 240 },
  roleWarning: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  trustCopy: { flex: 1, gap: 3 },
  trustTitle: { fontSize: 14, fontFamily: fontFamily.bold },
  trustDescription: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  ownerCta: { borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', boxShadow: `0 14px 30px ${withAlpha(colors.brand, 0.20)}` },
  ownerGradient: { minHeight: 164, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  ownerCopy: { flex: 1, gap: 8 },
  ownerEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ownerEyebrowText: { color: colors.onBrandMuted, fontSize: 10, fontFamily: fontFamily.bold, letterSpacing: 1 },
  ownerTitle: { color: 'white', fontSize: 22, fontFamily: fontFamily.extrabold },
  ownerDescription: { fontFamily: fontFamily.regular, color: colors.onBrandMuted, fontSize: 13, lineHeight: 19 },
  ownerArrow: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 19, lineHeight: 24, fontFamily: fontFamily.bold },
  actions: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: '0 10px 24px rgba(15,23,42,0.05)' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 70 },
  action: { minHeight: 76, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  focusRing: { boxShadow: `0 0 0 3px ${withAlpha(colors.primary, 0.38)}` },
  actionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, minWidth: 0, gap: 3 },
  actionText: { fontSize: 15, fontFamily: fontFamily.bold },
  actionDescription: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  signOut: { minHeight: 56, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, borderCurve: 'continuous', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden' },
  signOutText: { fontSize: 15, fontFamily: fontFamily.bold },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
  tabSpacer: { height: 92 },
});
