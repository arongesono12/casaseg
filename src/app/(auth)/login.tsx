import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { z } from 'zod';
import { AdaptiveKeyboardView } from '@/components/adaptive-keyboard-view';
import { AppleAuthButton } from '@/components/apple-auth-button';
import { AuthBrand } from '@/components/auth-brand';
import { FormField } from '@/components/form-field';
import { GoogleAuthButton } from '@/components/google-auth-button';
import { NativeActionButton } from '@/components/native-action-button';
import { ArrowLeft, Check, Eye, EyeOff } from '@/components/ui/icons';
import { colors, fontFamily, radius, touchTarget } from '@/constants/theme';
import { loginSchema } from '@/features/auth/auth.schemas';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AccesoPendienteError } from '@/providers/auth-provider';
import { useAuth } from '@/providers/auth-context';
import { haptics } from '@/lib/haptics';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

type LoginValues = z.infer<typeof loginSchema>;

// Se puede llegar aquí desde una pantalla pública o por enlace directo. Sin
// historial no hay a dónde volver, así que caemos a la pestaña de exploración.
// `router` es el singleton de expo-router, así que esto no depende del render.
function volver() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/explore');
}

export default function LoginScreen() {
  const auth = useAuth();
  const { palette, resolvedMode } = useAppTheme();
  const { t } = useI18n();
  const [oauthProvider, setOauthProvider] = useState<'google' | 'apple' | null>(null);
  const [submitError, setSubmitError] = useState('');
  // El tipo sale de la propia excepción: así añadir una acción nueva allí no
  // deja esta pantalla sin actualizar en silencio.
  const [submitAccion, setSubmitAccion] = useState<AccesoPendienteError['accion']>('ninguna');
  const [correoIntentado, setCorreoIntentado] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const passwordRef = useRef<TextInput>(null);
  const { height, width } = useWindowDimensions();
  const compact = height < 760 || width < 380;
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      Keyboard.dismiss();
      setSubmitError('');
      setSubmitAccion('ninguna');
      await auth.signIn(values.email, values.password);
      haptics.success();
      router.replace('/(tabs)/explore');
    } catch (error) {
      haptics.error();
      // Un acceso a medias no es un fallo: trae el paso que falta y como darlo.
      if (error instanceof AccesoPendienteError) {
        setSubmitAccion(error.accion);
        setCorreoIntentado(values.email.trim().toLowerCase());
      }
      setSubmitError(error instanceof Error ? error.message : t('connectionError'));
    }
  });

  const oauth = async (provider: 'google' | 'apple') => {
    if (oauthProvider) return;

    try {
      Keyboard.dismiss();
      setOauthProvider(provider);
      setSubmitError('');
      const authenticated = await auth.signInWithOAuth(provider);
      if (authenticated) router.replace('/(tabs)/explore');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('connectionError'));
    } finally {
      setOauthProvider(null);
    }
  };

  const oauthDisabled = isSubmitting || oauthProvider !== null;

  // Cada acceso a medias tiene una salida distinta. La pantalla ofrece solo la
  // que corresponde, con el correo ya escrito, para no pedir dos veces el dato.
  const salida = {
    restablecer: { ruta: '/(auth)/forgot-password' as const, etiqueta: t('sendResetCode') },
    oauth: { ruta: '/(auth)/forgot-password' as const, etiqueta: t('createPasswordForAccount') },
    registrarse: { ruta: '/(auth)/register' as const, etiqueta: t('createAccountWithEmail') },
    codigo: null,
    ninguna: null,
  }[submitAccion];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t('back')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={volver}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <ArrowLeft color={palette.text} size={24} />
        </Pressable>
      </View>
      <AdaptiveKeyboardView style={styles.safe}>
        <ScrollView
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, compact && styles.contentCompact]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heading}>
            <AuthBrand compact={compact} />
            <Text style={[styles.title, compact && styles.titleCompact, { color: palette.text }]}>{t('loginTitle')}</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{t('loginSubtitle')}</Text>
          </View>

          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <FormField
                label={t('email')}
                placeholder={t('emailPlaceholder')}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                importantForAutofill="yes"
                keyboardType="email-address"
                returnKeyType="next"
                spellCheck={false}
                textContentType="emailAddress"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                onSubmitEditing={() => passwordRef.current?.focus()}
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
                placeholder={t('passwordPlaceholder')}
                autoCapitalize="none"
                autoComplete="current-password"
                autoCorrect={false}
                importantForAutofill="yes"
                inputRef={passwordRef}
                returnKeyType="done"
                secureTextEntry={!passwordVisible}
                spellCheck={false}
                textContentType="password"
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
            <Pressable accessibilityRole="link" onPress={() => router.push('/(auth)/forgot-password')} style={styles.inlineTarget}><Text style={[styles.forgotLink, { color: palette.brandText }]}>{t('forgotPassword')}</Text></Pressable>
          </View>

          {submitError ? (
            <View style={styles.errorBlock}>
              <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{submitError}</Text>
              {salida ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: salida.ruta, params: { email: correoIntentado } })}
                  style={styles.inlineTarget}
                >
                  <Text style={[styles.forgotLink, { color: palette.brandText }]}>{salida.etiqueta}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <NativeActionButton
            disabled={isSubmitting}
            label={isSubmitting ? t('signingIn') : t('signIn')}
            onPress={() => void submit()}
          />

          <View style={[styles.oauthButtons, Platform.OS !== 'android' && styles.oauthButtonsRow]}>
            <View style={Platform.OS !== 'android' && styles.oauthButtonCell}>
              <GoogleAuthButton
                accessibilityLabel={t('signInWithGoogle')}
                backgroundColor={palette.surface}
                borderColor={palette.border}
                colorScheme={resolvedMode}
                disabled={oauthDisabled}
                label={Platform.OS === 'android' ? t('signInWithGoogle') : 'Google'}
                onPress={() => void oauth('google')}
                textColor={palette.text}
              />
            </View>
            {Platform.OS !== 'android' ? (
              <View style={styles.oauthButtonCell}>
                <AppleAuthButton
                  accessibilityLabel={t('signInWithApple')}
                  backgroundColor={palette.surface}
                  borderColor={palette.border}
                  colorScheme={resolvedMode}
                  disabled={oauthDisabled}
                  label="Apple"
                  onPress={() => void oauth('apple')}
                  textColor={palette.text}
                />
              </View>
            ) : null}
          </View>

          {!isSupabaseConfigured && <View style={styles.demo}><Text style={[styles.demoTitle, { color: palette.textSecondary }]}>{t('devMode')}</Text><Pressable accessibilityRole="button" onPress={() => void auth.signInDemo('client')}><Text style={styles.link}>{t('clientDemo')}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => void auth.signInDemo('owner')}><Text style={styles.link}>{t('ownerDemo')}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => void auth.signInDemo('admin')}><Text style={styles.link}>{t('adminDemo')}</Text></Pressable></View>}

          <Pressable accessibilityRole="link" onPress={() => router.push('/(auth)/register')}><Text style={[styles.link, { color: palette.brandText }]}>{t('createAccount')}</Text></Pressable>
          <View style={styles.legalLinks}>
            <Pressable accessibilityRole="link" onPress={() => router.push('/legal/terms')} style={styles.inlineTarget}><Text style={[styles.legalLink, { color: palette.textSecondary }]}>{t('termsAndConditions')}</Text></Pressable>
            <Text style={{ color: palette.muted }}>·</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/legal/privacy')} style={styles.inlineTarget}><Text style={[styles.legalLink, { color: palette.textSecondary }]}>{t('privacy')}</Text></Pressable>
          </View>
        </ScrollView>
      </AdaptiveKeyboardView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 4 },
  backButton: { alignItems: 'center', borderRadius: touchTarget / 2, height: touchTarget, justifyContent: 'center', width: touchTarget },
  backButtonPressed: { opacity: 0.6 },
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 18, gap: 12 },
  contentCompact: { justifyContent: 'flex-start', paddingHorizontal: 18, paddingVertical: 12, gap: 9 },
  heading: { alignItems: 'center', gap: 5, marginBottom: 5 },
  title: { fontSize: 30, lineHeight: 36, fontFamily: fontFamily.extrabold, textAlign: 'center' },
  titleCompact: { fontSize: 26, lineHeight: 31 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  eyeButton: { width: touchTarget, height: touchTarget, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  optionsRow: { minHeight: touchTarget, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rememberControl: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 9 },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 14, fontFamily: fontFamily.bold },
  forgotLink: { fontSize: 14, fontFamily: fontFamily.bold },
  inlineTarget: { minHeight: touchTarget, justifyContent: 'center' },
  oauthButtons: { gap: 10 },
  oauthButtonsRow: { flexDirection: 'row' },
  oauthButtonCell: { flex: 1 },
  demo: { alignItems: 'center', gap: 2, paddingVertical: 8 },
  demoTitle: { fontSize: 12, fontFamily: fontFamily.extrabold },
  link: { minHeight: touchTarget, color: colors.brandDark, textAlign: 'center', textAlignVertical: 'center', fontSize: 15, lineHeight: 20, fontFamily: fontFamily.extrabold, paddingHorizontal: 9, paddingVertical: 14 },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
  legalLink: { fontSize: 13, fontFamily: fontFamily.semibold },
  errorBlock: { gap: 2 },
  error: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
});
