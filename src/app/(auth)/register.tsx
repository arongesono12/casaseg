import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { z } from 'zod';
import { AdaptiveKeyboardView } from '@/components/adaptive-keyboard-view';
import { AuthLogo } from '@/components/auth-logo';
import { FormField } from '@/components/form-field';
import { NativeActionButton } from '@/components/native-action-button';
import { ArrowLeft, Building2, Check, Eye, EyeOff, ShieldCheck, UserRound } from '@/components/ui/icons';
import { colors, radius, touchTarget } from '@/constants/theme';
import { registerSchema } from '@/features/auth/auth.schemas';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

type RegisterValues = z.infer<typeof registerSchema>;
type AccountRole = RegisterValues['role'];

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const [submitError, setSubmitError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { height, width } = useWindowDimensions();
  const compact = height < 760 || width < 380;
  const narrow = width < 430;
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', role: 'client' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      setSubmitError('');
      await signUp(values);
      router.push({ pathname: '/(auth)/verify', params: { email: values.email } });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('connectionError'));
    }
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View pointerEvents="none" style={styles.decor}>
        <View style={styles.orbTop} />
        <View style={styles.orbBottom} />
      </View>

      <AdaptiveKeyboardView style={styles.safe}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, compact && styles.contentCompact]}
        >
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('back')}
              hitSlop={8}
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}
            >
              <ArrowLeft color={palette.text} size={21} />
            </Pressable>
            <View style={[styles.securePill, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <ShieldCheck color={colors.success} size={16} />
              <Text style={[styles.securePillText, { color: palette.textSecondary }]}>{t('secureRegistration')}</Text>
            </View>
          </View>

          <View style={styles.heading}>
            <AuthLogo compact={compact} />
            <Text style={[styles.title, compact && styles.titleCompact, { color: palette.text }]}>{t('registerTitle')}</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{t('registerSubtitle')}</Text>
          </View>

          <View style={styles.roleSection}>
            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>{t('accountType')}</Text>
              <Text style={[styles.sectionHint, { color: palette.textSecondary }]}>{t('accountTypeHint')}</Text>
            </View>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <View accessibilityRole="radiogroup" style={styles.roles}>
                  <RoleCard
                    compact={narrow}
                    description={t('clientRoleDescription')}
                    icon="client"
                    label={t('client')}
                    onPress={() => field.onChange('client')}
                    palette={palette}
                    selected={field.value === 'client'}
                  />
                  <RoleCard
                    compact={narrow}
                    description={t('ownerRoleDescription')}
                    icon="owner"
                    label={t('owner')}
                    onPress={() => field.onChange('owner')}
                    palette={palette}
                    selected={field.value === 'owner'}
                  />
                </View>
              )}
            />
          </View>

          <View style={[styles.formCard, compact && styles.formCardCompact, { backgroundColor: palette.elevated, borderColor: palette.border }]}>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <FormField
                  label={t('name')}
                  autoCapitalize="words"
                  autoComplete="name"
                  returnKeyType="next"
                  textContentType="name"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.name?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <FormField
                  label={t('email')}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="next"
                  textContentType="emailAddress"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <FormField
                  label={t('password')}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  returnKeyType="done"
                  secureTextEntry={!passwordVisible}
                  textContentType="newPassword"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.password?.message}
                  onSubmitEditing={() => void submit()}
                  rightAccessory={(
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={passwordVisible ? t('hidePassword') : t('showPassword')}
                      hitSlop={8}
                      onPress={() => setPasswordVisible((visible) => !visible)}
                      style={styles.eyeButton}
                    >
                      {passwordVisible ? <EyeOff color={palette.textSecondary} size={22} /> : <Eye color={palette.textSecondary} size={22} />}
                    </Pressable>
                  )}
                />
              )}
            />
            <View style={styles.passwordHint}>
              <ShieldCheck color={colors.success} size={16} />
              <Text style={[styles.passwordHintText, { color: palette.textSecondary }]}>{t('passwordRequirement')}</Text>
            </View>
          </View>

          {submitError ? <View accessibilityRole="alert" style={styles.errorBanner}><Text style={styles.errorText}>{submitError}</Text></View> : null}

          <NativeActionButton
            disabled={isSubmitting}
            label={isSubmitting ? t('creatingAccount') : t('createAccount')}
            onPress={() => void submit()}
            style={styles.primaryShadow}
          />

          <View style={[styles.trustNote, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <ShieldCheck color={colors.brand} size={19} />
            <Text style={[styles.trustText, { color: palette.textSecondary }]}>{t('registrationSecurity')}</Text>
          </View>

          <View style={styles.signInRow}>
            <Text style={[styles.signInPrompt, { color: palette.textSecondary }]}>{t('alreadyHaveAccount')}</Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}><Text style={styles.signInLink}>{t('signIn')}</Text></Pressable>
          </View>

          <View style={styles.legalLinks}>
            <Pressable onPress={() => router.push('/legal/terms')}><Text style={[styles.legalLink, { color: palette.textSecondary }]}>{t('termsAndConditions')}</Text></Pressable>
            <Text style={{ color: palette.muted }}>·</Text>
            <Pressable onPress={() => router.push('/legal/privacy')}><Text style={[styles.legalLink, { color: palette.textSecondary }]}>{t('privacy')}</Text></Pressable>
          </View>
        </ScrollView>
      </AdaptiveKeyboardView>
    </SafeAreaView>
  );
}

function RoleCard({ compact, description, icon, label, onPress, palette, selected }: {
  compact: boolean;
  description: string;
  icon: AccountRole;
  label: string;
  onPress: () => void;
  palette: ReturnType<typeof useAppTheme>['palette'];
  selected: boolean;
}) {
  const Icon = icon === 'client' ? UserRound : Building2;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}. ${description}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.role,
        compact && styles.roleCompact,
        { backgroundColor: selected ? 'rgba(37,99,235,0.09)' : palette.surface, borderColor: selected ? colors.brand : palette.border },
        selected && styles.roleSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.roleTop}>
        <View style={[styles.roleIcon, { backgroundColor: selected ? colors.brand : palette.subtle }]}>
          <Icon color={selected ? 'white' : palette.textSecondary} size={23} />
        </View>
        <View style={[styles.roleCheck, { borderColor: selected ? colors.brand : palette.border, backgroundColor: selected ? colors.brand : 'transparent' }]}>
          {selected && <Check color="white" size={14} />}
        </View>
      </View>
      <Text style={[styles.roleTitle, { color: palette.text }]}>{label}</Text>
      <Text style={[styles.roleDescription, { color: palette.textSecondary }]}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  decor: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orbTop: { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -150, right: -115, backgroundColor: 'rgba(59,130,246,0.10)' },
  orbBottom: { position: 'absolute', width: 220, height: 220, borderRadius: 110, bottom: -130, left: -100, backgroundColor: 'rgba(20,179,170,0.08)' },
  content: { flexGrow: 1, width: '100%', maxWidth: 600, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32, gap: 18 },
  contentCompact: { justifyContent: 'flex-start', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24, gap: 15 },
  topBar: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backButton: { width: touchTarget, height: touchTarget, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  securePill: { minHeight: 36, maxWidth: '75%', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  securePillText: { flexShrink: 1, fontSize: 12, fontWeight: '800' },
  heading: { gap: 8, marginBottom: 2 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.6 },
  titleCompact: { fontSize: 26, lineHeight: 31 },
  subtitle: { fontSize: 16, lineHeight: 24 },
  roleSection: { gap: 12 },
  sectionHeading: { gap: 3 },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '900' },
  sectionHint: { fontSize: 13, lineHeight: 19 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  role: { flex: 1, minWidth: 150, minHeight: 148, borderWidth: 1.5, borderRadius: radius.lg, padding: 15 },
  roleCompact: { minWidth: '100%' },
  roleSelected: { boxShadow: '0 6px 14px rgba(37,99,235,0.16)' },
  roleTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roleIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  roleCheck: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  roleTitle: { marginTop: 12, fontSize: 16, fontWeight: '900' },
  roleDescription: { marginTop: 5, fontSize: 12.5, lineHeight: 18 },
  formCard: { borderWidth: 1, borderRadius: radius.lg, padding: 18, gap: 15, boxShadow: '0 8px 18px rgba(15,23,42,0.06)' },
  formCardCompact: { padding: 15 },
  eyeButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  passwordHint: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: -3 },
  passwordHintText: { flex: 1, fontSize: 12, lineHeight: 18 },
  errorBanner: { borderWidth: 1, borderColor: 'rgba(239,68,68,0.24)', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: 'rgba(239,68,68,0.08)' },
  errorText: { color: colors.error, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  primaryShadow: { borderRadius: radius.md, boxShadow: '0 8px 16px rgba(37,99,235,0.28)' },
  primary: { minHeight: 56, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryText: { color: 'white', fontSize: 16, fontWeight: '900' },
  primaryPressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  disabled: { opacity: 0.68 },
  trustNote: { minHeight: 54, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  trustText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  signInRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 2 },
  signInPrompt: { fontSize: 14 },
  signInLink: { color: colors.brandDark, fontSize: 14, fontWeight: '900', paddingVertical: 6 },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
  legalLink: { fontSize: 13, fontWeight: '600', paddingVertical: 4 },
  pressed: { opacity: 0.78 },
});
