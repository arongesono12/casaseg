import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { PremiumButton } from '@/components/ui/premium';
import { colors } from '@/constants/theme';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const { t } = useI18n();
  const { palette } = useAppTheme();
  // El correo llega desde el login cuando el acceso fallo por falta de
  // contrasena: reescribirlo ahi seria pedir dos veces el mismo dato.
  const { email: emailInicial } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(emailInicial ?? '');
  const [message, setMessage] = useState('');

  const submit = async () => {
    try {
      await requestPasswordReset(email);
      setMessage(t('checkEmail'));
      // Clerk envía un código, no un enlace: hay que llevar al usuario a la
      // pantalla donde lo introduce junto con la contraseña nueva.
      router.push('/reset-password');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('connectionError'));
    }
  };

  return (
    <RouteScreen title={t('forgotTitle')} description={t('forgotSubtitle')}>
      <FormField label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <PremiumButton label={t('sendLink')} onPress={() => void submit()} />
      {message ? <Text style={{ color: palette.text }}>{message}</Text> : null}
      <Pressable onPress={() => router.push('/(auth)/login')}>
        <Text style={[styles.link, { color: palette.brandText }]}>{t('backToLogin')}</Text>
      </Pressable>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.brandDark, fontWeight: '800' },
});
