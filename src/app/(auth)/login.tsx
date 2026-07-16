import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
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
import { Check, Eye, EyeOff } from '@/components/ui/icons';
import { colors, radius, touchTarget } from '@/constants/theme';
import { loginSchema } from '@/features/auth/auth.schemas';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const googleIcon = require('../../../public/icons/google-icon.svg');
const appleIcon = require('../../../public/icons/icono-apple.svg');

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const auth = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const [submitError, setSubmitError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { height, width } = useWindowDimensions();
  const compact = height < 700 || width < 360;
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      setSubmitError('');
      await auth.signIn(values.email, values.password);
      router.replace('/(tabs)/explore');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('connectionError'));
    }
  });

  const oauth = async (provider: 'google' | 'apple') => {
    try {
      setSubmitError('');
      await auth.signInWithOAuth(provider);
      router.replace('/(tabs)/explore');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('connectionError'));
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <AdaptiveKeyboardView style={styles.safe}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
          <View style={styles.heading}>
            <AuthLogo compact={compact} />
            <Text style={[styles.title, compact && styles.titleCompact, { color: palette.text }]}>{t('loginTitle')}</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{t('loginSubtitle')}</Text>
          </View>

          <Controller control={control} name="email" render={({ field }) => <FormField label={t('email')} autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.email?.message} />} />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <FormField
                label={t('password')}
                secureTextEntry={!passwordVisible}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password?.message}
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

          <View style={styles.optionsRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
              onPress={() => setRememberMe((remember) => !remember)}
              style={styles.rememberControl}
            >
              <View style={[styles.checkbox, { borderColor: rememberMe ? colors.brand : palette.border, backgroundColor: rememberMe ? colors.brand : 'transparent' }]}>
                {rememberMe && <Check color="white" size={16} />}
              </View>
              <Text style={[styles.optionText, { color: palette.text }]}>{t('rememberMe')}</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(auth)/forgot-password')}><Text style={[styles.forgotLink, { color: colors.brandDark }]}>{t('forgotPassword')}</Text></Pressable>
          </View>

          {submitError && <Text accessibilityRole="alert" style={styles.error}>{submitError}</Text>}
          <NativeActionButton
            disabled={isSubmitting}
            label={isSubmitting ? t('signingIn') : t('signIn')}
            onPress={() => void submit()}
          />

          <View style={styles.oauthRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('signInWithGoogle')} onPress={() => void oauth('google')} style={styles.googleOauth}>
              <Image contentFit="contain" source={googleIcon} style={styles.googleIcon} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('signInWithApple')} onPress={() => void oauth('apple')} style={[styles.appleOauth, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Image contentFit="contain" source={appleIcon} style={styles.appleIcon} />
              <Text style={{ color: palette.text, fontWeight: '800' }}>Apple</Text>
            </Pressable>
          </View>

          {!isSupabaseConfigured && <View style={styles.demo}><Text style={[styles.demoTitle, { color: palette.textSecondary }]}>{t('devMode')}</Text><Pressable onPress={async () => { await auth.signInDemo('client'); router.replace('/(tabs)/explore'); }}><Text style={styles.link}>{t('clientDemo')}</Text></Pressable><Pressable onPress={async () => { await auth.signInDemo('owner'); router.replace('/(tabs)/explore'); }}><Text style={styles.link}>{t('ownerDemo')}</Text></Pressable></View>}

          <Pressable onPress={() => router.push('/(auth)/register')}><Text style={styles.link}>{t('createAccount')}</Text></Pressable>
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

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  contentCompact: { justifyContent: 'flex-start', paddingHorizontal: 18, paddingVertical: 18, gap: 12 },
  heading: { gap: 10, marginBottom: 12 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '900' },
  titleCompact: { fontSize: 26, lineHeight: 31 },
  subtitle: { fontSize: 16, lineHeight: 24 },
  eyeButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  optionsRow: { minHeight: 32, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rememberControl: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 9 },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 14, fontWeight: '700' },
  forgotLink: { fontSize: 14, fontWeight: '700', paddingVertical: 6 },
  primary: { minHeight: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: 'white', fontSize: 16, fontWeight: '800' },
  oauthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  googleOauth: { flex: 1, minWidth: 140, minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  googleIcon: { width: '100%', height: 44 },
  appleOauth: { flex: 1, minWidth: 140, minHeight: 52, borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  appleIcon: { width: 24, height: 24 },
  demo: { alignItems: 'center', gap: 2, paddingVertical: 8 },
  demoTitle: { fontSize: 12, fontWeight: '800' },
  link: { color: colors.brandDark, textAlign: 'center', fontSize: 15, fontWeight: '800', padding: 9 },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 4 },
  legalLink: { fontSize: 13, fontWeight: '600', paddingVertical: 4 },
  error: { color: colors.error, fontSize: 13 },
});
