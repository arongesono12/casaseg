import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { z } from 'zod';
import { AdaptiveKeyboardView } from '@/components/adaptive-keyboard-view';
import { AuthBrand } from '@/components/auth-brand';
import { FormField } from '@/components/form-field';
import { NativeActionButton } from '@/components/native-action-button';
import { ArrowLeft, Check, Eye, EyeOff, ShieldCheck } from '@/components/ui/icons';
import { colors, fontFamily, radius, touchTarget, withAlpha } from '@/constants/theme';
import { registerSchema } from '@/features/auth/auth.schemas';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  // Se llega aquí desde el login cuando ese correo no tiene cuenta: volver a
  // pedirlo sería reclamar dos veces el mismo dato.
  const { email: emailInicial } = useLocalSearchParams<{ email?: string }>();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const [submitError, setSubmitError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { height, width } = useWindowDimensions();
  const compact = height < 760 || width < 380;
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: emailInicial ?? '', password: '', role: 'client' },
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
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
              style={({ pressed }) => [styles.backButton, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}
            >
              <ArrowLeft color={palette.text} size={21} />
            </Pressable>
            <AuthBrand />
          </View>

          <View style={styles.heading}>
            <Text style={[styles.title, compact && styles.titleCompact, { color: palette.text }]}>{t('registerTitle')}</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{t('registerSubtitle')}</Text>
          </View>

          <View style={styles.roleSection}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>{t('accountType')}</Text>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <View accessibilityRole="radiogroup" style={styles.roles}>
                  <RoleCard
                    description={t('clientRoleDescription')}
                    label={t('client')}
                    onPress={() => field.onChange('client')}
                    palette={palette}
                    selected={field.value === 'client'}
                  />
                  <RoleCard
                    description={t('ownerRoleDescription')}
                    label={t('owner')}
                    onPress={() => field.onChange('owner')}
                    palette={palette}
                    selected={field.value === 'owner'}
                  />
                </View>
              )}
            />
          </View>

          <View style={styles.formFields}>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <FormField
                  label={t('name')}
                  placeholder={t('namePlaceholder')}
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
                  placeholder={t('emailPlaceholder')}
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
                  placeholder={t('newPasswordPlaceholder')}
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

          {submitError ? <View accessibilityRole="alert" style={styles.errorBanner}><Text style={[styles.errorText, { color: palette.errorText }]}>{submitError}</Text></View> : null}

          <NativeActionButton
            disabled={isSubmitting}
            label={isSubmitting ? t('creatingAccount') : t('createAccount')}
            onPress={() => void submit()}
            style={styles.primaryShadow}
          />

          <View style={styles.signInRow}>
            <Text style={[styles.signInPrompt, { color: palette.textSecondary }]}>{t('alreadyHaveAccount')}</Text>
            <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.replace('/(auth)/login')}><Text style={[styles.signInLink, { color: palette.brandText }]}>{t('signIn')}</Text></Pressable>
          </View>

          <View style={styles.legalLinks}>
            <Pressable accessibilityRole="link" hitSlop={12} onPress={() => router.push('/legal/terms')}><Text style={[styles.legalLink, { color: palette.textSecondary }]}>{t('termsAndConditions')}</Text></Pressable>
            <Text style={{ color: palette.muted }}>·</Text>
            <Pressable accessibilityRole="link" hitSlop={12} onPress={() => router.push('/legal/privacy')}><Text style={[styles.legalLink, { color: palette.textSecondary }]}>{t('privacy')}</Text></Pressable>
          </View>
        </ScrollView>
      </AdaptiveKeyboardView>
    </SafeAreaView>
  );
}

function RoleCard({ description, label, onPress, palette, selected }: {
  description: string;
  label: string;
  onPress: () => void;
  palette: ReturnType<typeof useAppTheme>['palette'];
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}. ${description}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.role,
        { backgroundColor: selected ? withAlpha(colors.brand, 0.09) : palette.surface, borderColor: selected ? colors.brand : palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.roleTop}>
        <Text style={[styles.roleTitle, { color: palette.text }]}>{label}</Text>
        <View style={[styles.roleCheck, { borderColor: selected ? colors.brand : palette.border, backgroundColor: selected ? colors.brand : 'transparent' }]}>
          {selected && <Check color="white" size={12} />}
        </View>
      </View>
      <Text numberOfLines={2} style={[styles.roleDescription, { color: palette.textSecondary }]}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 18, gap: 12 },
  contentCompact: { justifyContent: 'flex-start', paddingHorizontal: 18, paddingVertical: 8, gap: 6 },
  topBar: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backButton: { width: touchTarget, height: touchTarget, borderWidth: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  heading: { gap: 5, marginBottom: 2 },
  title: { fontSize: 30, lineHeight: 36, fontFamily: fontFamily.extrabold, letterSpacing: -0.6 },
  titleCompact: { fontSize: 26, lineHeight: 31 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 21 },
  roleSection: { gap: 6 },
  sectionTitle: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.bold },
  roles: { flexDirection: 'row', gap: 9 },
  role: { flex: 1, minWidth: 0, minHeight: 72, borderWidth: 1.5, borderRadius: radius.xl, paddingHorizontal: 12, paddingVertical: 9 },
  roleTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roleCheck: { width: 18, height: 18, borderWidth: 1.5, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  roleTitle: { flex: 1, fontSize: 14, lineHeight: 19, fontFamily: fontFamily.bold },
  roleDescription: { fontFamily: fontFamily.regular, marginTop: 3, fontSize: 11, lineHeight: 15 },
  formFields: { gap: 10 },
  eyeButton: { width: touchTarget, height: touchTarget, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  passwordHint: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: -2 },
  passwordHintText: { fontFamily: fontFamily.regular, flex: 1, fontSize: 12, lineHeight: 18 },
  errorBanner: { borderWidth: 1, borderColor: 'rgba(239,68,68,0.24)', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: 'rgba(239,68,68,0.08)' },
  errorText: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.bold },
  primaryShadow: { borderRadius: radius.pill, boxShadow: `0 8px 16px ${withAlpha(colors.brand, 0.28)}` },
  signInRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 2 },
  signInPrompt: { fontFamily: fontFamily.regular, fontSize: 14 },
  signInLink: { color: colors.brandDark, fontSize: 14, fontFamily: fontFamily.bold, paddingVertical: 6 },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
  legalLink: { fontSize: 13, fontFamily: fontFamily.semibold, paddingVertical: 4 },
  pressed: { opacity: 0.78 },
});
