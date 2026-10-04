import { useSignIn } from '@clerk/expo';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { PremiumButton } from '@/components/ui/premium';
import { colors, fontFamily } from '@/constants/theme';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

/**
 * Segundo paso de la recuperación de contraseña.
 *
 * Clerk envía un código de 6 dígitos (no un enlace, como hacía Supabase), así
 * que aquí se introduce junto con la contraseña nueva. El intento de sign-in lo
 * mantiene vivo el propio cliente de Clerk desde forgot-password, por eso se
 * usa `useSignIn()` directamente en vez de pasar por el contrato de AuthContext.
 */
export default function ResetPasswordScreen() {
  const { signIn } = useSignIn();
  const { t } = useI18n();
  const { palette } = useAppTheme();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [enviando, setEnviando] = useState(false);

  const submit = async () => {
    if (enviando) return;

    if (password.length < 8) {
      setMessage(t('passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setMessage(t('passwordsDontMatch'));
      return;
    }
    if (!signIn) {
      setMessage(t('resetExpired'));
      return;
    }

    setEnviando(true);
    setMessage('');

    try {
      const verificado = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (verificado.error) throw verificado.error;

      const actualizado = await signIn.resetPasswordEmailCode.submitPassword({ password });
      if (actualizado.error) throw actualizado.error;

      const abierta = await signIn.finalize();
      if (abierta.error) throw abierta.error;

      router.replace('/(tabs)/explore');
    } catch (error) {
      const largo = error instanceof Error ? (error as { longMessage?: string }).longMessage : undefined;
      setMessage(largo ?? (error instanceof Error ? error.message : t('connectionError')));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <RouteScreen title={t('resetTitle')} description={t('resetCodeSubtitle')}>
      <FormField
        label={t('verificationCode')}
        placeholder="123456"
        autoCapitalize="none"
        autoComplete="one-time-code"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        value={code}
        onChangeText={setCode}
      />
      <FormField
        label={t('password')}
        autoCapitalize="none"
        autoComplete="new-password"
        secureTextEntry
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
      />
      <FormField
        label={t('repeatPassword')}
        autoCapitalize="none"
        autoComplete="new-password"
        secureTextEntry
        textContentType="newPassword"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <PremiumButton label={enviando ? t('loading') : t('savePassword')} onPress={() => void submit()} />
      {message ? <Text accessibilityRole="alert" style={{ color: palette.text }}>{message}</Text> : null}
      <Pressable onPress={() => router.replace('/(auth)/login')}>
        <Text style={[styles.link, { color: palette.brandText }]}>{t('backToLogin')}</Text>
      </Pressable>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.brandDark, fontFamily: fontFamily.extrabold },
});
