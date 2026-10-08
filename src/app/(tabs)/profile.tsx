import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Keyboard, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { ProfileHeaderCard } from '@/components/profile/profile-header-card';
import { ArrowRight, Bell, Building2, Calendar, Check, CheckCircle2, HomeCheck, Lock, LogOut, Settings, ShieldCheck } from '@/components/ui/icons';
import { PremiumButton, SurfaceCard } from '@/components/ui/premium';
import { actionGradient, colors, fontFamily, radius, withAlpha, type AppPalette } from '@/constants/theme';
import { useCurrentProfile, useUpdateProfilePhone } from '@/features/auth/use-current-profile';
import { isValidProfilePhone, normalizeProfilePhone } from '@/features/auth/profile-phone';
import { isAdminRole, isOwnerRole } from '@/lib/access-control';
import { onBrandRipple, pressRipple, usesRipple } from '@/lib/press-feedback';
import { useAuth } from '@/providers/auth-context';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const PROFILE_MAX_WIDTH = 960;

const profileCopy = defineCopy({
  es: { myVisits: 'Mis visitas', myVisitsBody: 'Consulta y cancela las visitas que has solicitado.', superadmin: 'Superadministrador', admin: 'Administrador', adminEyebrow: 'RESPONSABILIDAD ADMINISTRATIVA', adminPanel: 'Panel de administración', adminPanelBody: 'Supervisa usuarios, roles, publicaciones y revisiones pendientes.', saved: 'Tu perfil se ha actualizado correctamente.', saveFailed: 'No pudimos guardar todos los cambios. Comprueba el perfil e inténtalo de nuevo.', personalInfo: 'Información personal', nameRequired: 'Introduce tu nombre.', nameTooShort: 'Introduce al menos 2 caracteres.', fullName: 'Nombre completo', becomeOwner: 'Hazte propietario', becomeOwnerBody: 'Solicita publicar tus viviendas en CasaSeg.' },
  fr: { myVisits: 'Mes visites', myVisitsBody: 'Consultez et annulez les visites demandées.', superadmin: 'Super-administrateur', admin: 'Administrateur', adminEyebrow: 'RESPONSABILITÉ ADMINISTRATIVE', adminPanel: 'Panneau d’administration', adminPanelBody: 'Supervisez utilisateurs, rôles, annonces et vérifications en attente.', saved: 'Votre profil a bien été mis à jour.', saveFailed: 'Impossible d’enregistrer tous les changements. Vérifiez votre profil et réessayez.', personalInfo: 'Informations personnelles', nameRequired: 'Saisissez votre nom.', nameTooShort: 'Saisissez au moins 2 caractères.', fullName: 'Nom complet', becomeOwner: 'Devenez propriétaire', becomeOwnerBody: 'Demandez à publier vos logements sur CasaSeg.' },
  en: { myVisits: 'My visits', myVisitsBody: 'Review and cancel the visits you requested.', superadmin: 'Super administrator', admin: 'Administrator', adminEyebrow: 'ADMIN RESPONSIBILITY', adminPanel: 'Admin dashboard', adminPanelBody: 'Oversee users, roles, listings and pending reviews.', saved: 'Your profile has been updated.', saveFailed: 'We could not save every change. Check your profile and try again.', personalInfo: 'Personal information', nameRequired: 'Enter your name.', nameTooShort: 'Enter at least 2 characters.', fullName: 'Full name', becomeOwner: 'Become an owner', becomeOwnerBody: 'Apply to list your homes on CasaSeg.' },
});

const detailsCopy = defineCopy({
  es: { edit: 'Editar perfil', email: 'Correo electrónico', phone: 'Número de teléfono', phoneMissing: 'Sin añadir', phoneInvalid: 'Introduce un número válido de 7 a 15 cifras.', cancel: 'Cancelar', loading: 'Cargando información personal…', unavailable: 'No pudimos cargar tu información personal.', retry: 'Reintentar' },
  fr: { edit: 'Modifier le profil', email: 'E-mail', phone: 'Numéro de téléphone', phoneMissing: 'Non renseigné', phoneInvalid: 'Saisissez un numéro valide de 7 à 15 chiffres.', cancel: 'Annuler', loading: 'Chargement des informations personnelles…', unavailable: 'Impossible de charger vos informations personnelles.', retry: 'Réessayer' },
  en: { edit: 'Edit profile', email: 'Email', phone: 'Phone number', phoneMissing: 'Not added', phoneInvalid: 'Enter a valid number with 7 to 15 digits.', cancel: 'Cancel', loading: 'Loading personal information…', unavailable: 'We could not load your personal information.', retry: 'Retry' },
});

export default function ProfileScreen() {
  const { user, role, isRoleLoading, roleError, signOut, updateProfileName } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const copy = useCopy(profileCopy);
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const profile = useCurrentProfile();
  const updatePhone = useUpdateProfilePhone();
  const insets = useSafeAreaInsets();

  if (!user) return <Redirect href="/(auth)/login" />;

  const roleLabel = isRoleLoading ? t('verifyingRole') : role === 'owner' ? t('owner') : role === 'client' ? t('client') : role === 'superadmin' ? copy.superadmin : role === 'admin' ? copy.admin : t('roleUnavailable');
  const roleTone = isAdminRole(role) ? colors.primary : isOwnerRole(role) ? colors.brand : role === 'client' ? colors.success : palette.muted;
  const RoleIcon = isAdminRole(role) ? ShieldCheck : isOwnerRole(role) ? Building2 : role === 'client' ? HomeCheck : Lock;
  const saveProfile = async ({ name, phone }: { name: string; phone: string | null }) => {
    if (phone !== (profile.data?.phone ?? null)) await updatePhone(phone);
    if (name !== user.name.trim()) await updateProfileName(name);
  };

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
              <View style={styles.ownerEyebrow}><Text style={styles.ownerEyebrowText}>{t('professionalSpace')}</Text></View>
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
        email={user.email}
        initialPhone={profile.data?.phone ?? ''}
        canEdit={Boolean(profile.data)}
        profileLoading={!profile.data && !profile.isError && !profile.isSuccess}
        profileUnavailable={!profile.data && (profile.isError || profile.isSuccess)}
        onRetry={() => void profile.refetch()}
        onSave={saveProfile}
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
  email,
  initialPhone,
  canEdit,
  profileLoading,
  profileUnavailable,
  onRetry,
  onSave,
  palette,
  wide,
}: {
  initialName: string;
  email: string;
  initialPhone: string;
  canEdit: boolean;
  profileLoading: boolean;
  profileUnavailable: boolean;
  onRetry: () => void;
  onSave: (values: { name: string; phone: string | null }) => Promise<void>;
  palette: AppPalette;
  wide: boolean;
}) {
  const { t } = useI18n();
  const copy = useCopy(profileCopy);
  const details = useCopy(detailsCopy);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string }>();
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ name: string; phone: string }>({
    defaultValues: { name: initialName, phone: initialPhone },
  });

  const startEditing = () => {
    reset({ name: initialName, phone: initialPhone });
    setFeedback(undefined);
    setEditing(true);
  };

  const cancelEditing = () => {
    Keyboard.dismiss();
    reset({ name: initialName, phone: initialPhone });
    setFeedback(undefined);
    setEditing(false);
  };

  const submit = handleSubmit(async ({ name, phone }) => {
    Keyboard.dismiss();
    setFeedback(undefined);
    try {
      await onSave({ name: name.trim(), phone: normalizeProfilePhone(phone) });
      setEditing(false);
      setFeedback({ tone: 'success', message: copy.saved });
    } catch {
      setFeedback({ tone: 'error', message: copy.saveFailed });
    }
  });

  return (
    <SurfaceCard style={styles.profileForm}>
      <View style={styles.profileFormHeading}>
        <Text accessibilityRole="header" style={[styles.profileFormTitle, { color: palette.text }]}>{copy.personalInfo}</Text>
        {editing ? (
          <Pressable accessibilityRole="button" accessibilityLabel={details.cancel} disabled={isSubmitting} android_ripple={pressRipple} onPress={cancelEditing} style={({ pressed }) => [styles.editButton, { backgroundColor: palette.subtle }, pressed && !usesRipple && styles.pressed]}>
            <Text style={[styles.editButtonText, { color: palette.textSecondary }]}>{details.cancel}</Text>
          </Pressable>
        ) : canEdit ? (
          <Pressable accessibilityRole="button" accessibilityLabel={details.edit} android_ripple={pressRipple} onPress={startEditing} style={({ pressed }) => [styles.editButton, { backgroundColor: palette.brandSoft }, pressed && !usesRipple && styles.pressed]}>
            <Text style={[styles.editButtonText, { color: palette.brandText }]}>{details.edit}</Text>
          </Pressable>
        ) : null}
      </View>

      {profileLoading ? <Text style={[styles.formNotice, { color: palette.textSecondary }]}>{details.loading}</Text> : null}
      {profileUnavailable ? (
        <View style={styles.unavailable}>
          <Text style={[styles.formNotice, { color: palette.textSecondary }]}>{details.unavailable}</Text>
          <PremiumButton label={details.retry} variant="secondary" onPress={onRetry} style={styles.retryButton} />
        </View>
      ) : null}

      {canEdit && !editing ? (
        <View style={styles.infoList}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: palette.muted }]}>{copy.fullName}</Text>
            <Text selectable style={[styles.infoValue, { color: palette.text }]}>{initialName}</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: palette.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: palette.muted }]}>{details.email}</Text>
            <Text selectable style={[styles.infoValue, { color: palette.text }]}>{email}</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: palette.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: palette.muted }]}>{details.phone}</Text>
            <Text selectable style={[styles.infoValue, { color: initialPhone ? palette.text : palette.textSecondary }]}>{initialPhone || details.phoneMissing}</Text>
          </View>
        </View>
      ) : null}

      {editing ? (
        <>
          <View style={[styles.formFields, wide && styles.formFieldsWide]}>
            <View style={styles.formField}>
              <Controller
                control={control}
                name="name"
                rules={{ required: copy.nameRequired, validate: (value) => value.trim().length >= 2 || copy.nameTooShort }}
                render={({ field, fieldState }) => (
                  <FormField
                    label={copy.fullName}
                    autoCapitalize="words"
                    autoComplete="name"
                    returnKeyType="next"
                    textContentType="name"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>
            <View style={styles.formField}>
              <Controller
                control={control}
                name="phone"
                rules={{ validate: (value) => isValidProfilePhone(value) || details.phoneInvalid }}
                render={({ field, fieldState }) => (
                  <FormField
                    label={details.phone}
                    autoComplete="tel"
                    keyboardType="phone-pad"
                    maxLength={24}
                    placeholder="+240 222 000 000"
                    returnKeyType="done"
                    textContentType="telephoneNumber"
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
          <View style={[styles.emailReadOnly, { backgroundColor: palette.subtle }]}>
            <Text style={[styles.infoLabel, { color: palette.muted }]}>{details.email}</Text>
            <Text selectable style={[styles.infoValue, { color: palette.textSecondary }]}>{email}</Text>
          </View>
        </>
      ) : null}

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
      {editing ? (
        <View style={styles.formActions}>
          <PremiumButton label={isSubmitting ? t('saving') : t('saveChanges')} icon={Check} loading={isSubmitting} onPress={() => void submit()} style={styles.saveButton} />
        </View>
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  profileForm: { padding: 20, gap: 16 },
  profileFormHeading: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  profileFormTitle: { minWidth: 0, flexShrink: 1, fontSize: 19, lineHeight: 24, fontFamily: fontFamily.bold, letterSpacing: -0.3 },
  editButton: { minHeight: 36, borderRadius: radius.pill, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  editButtonText: { fontSize: 11, fontFamily: fontFamily.bold },
  infoList: { gap: 0 },
  infoRow: { minHeight: 54, justifyContent: 'center', gap: 4 },
  infoLabel: { fontSize: 10, lineHeight: 14, fontFamily: fontFamily.bold, letterSpacing: 0.5, textTransform: 'uppercase' },
  infoValue: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.semibold },
  infoDivider: { height: StyleSheet.hairlineWidth },
  emailReadOnly: { borderRadius: radius.md, padding: 14, gap: 4 },
  formNotice: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.regular },
  unavailable: { gap: 12 },
  retryButton: { maxWidth: 200 },
  formFields: { gap: 14 },
  formFieldsWide: { flexDirection: 'row' },
  formField: { flex: 1, minWidth: 0 },
  formActions: { width: '100%', maxWidth: 320, gap: 10 },
  feedback: { minHeight: 46, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  feedbackText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: fontFamily.bold },
  saveButton: { width: '100%' },
  roleWarning: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  trustCopy: { flex: 1, gap: 3 },
  trustTitle: { fontSize: 14, fontFamily: fontFamily.bold },
  trustDescription: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  ownerCta: { borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', boxShadow: `0 14px 30px ${withAlpha(colors.brand, 0.20)}` },
  ownerGradient: { minHeight: 136, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  ownerCopy: { flex: 1, gap: 8 },
  ownerEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ownerEyebrowText: { color: colors.onBrandMuted, fontSize: 10, fontFamily: fontFamily.bold, letterSpacing: 1 },
  ownerTitle: { color: 'white', fontSize: 22, fontFamily: fontFamily.extrabold },
  ownerDescription: { fontFamily: fontFamily.regular, color: colors.onBrandMuted, fontSize: 13, lineHeight: 19 },
  ownerArrow: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 19, lineHeight: 24, fontFamily: fontFamily.bold },
  actions: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  action: { minHeight: 68, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  focusRing: { boxShadow: `0 0 0 3px ${withAlpha(colors.primary, 0.38)}` },
  actionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, minWidth: 0, gap: 3 },
  actionText: { fontSize: 15, fontFamily: fontFamily.bold },
  actionDescription: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  signOut: { minHeight: 56, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, borderCurve: 'continuous', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden' },
  signOutText: { fontSize: 15, fontFamily: fontFamily.bold },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
  tabSpacer: { height: 92 },
});
