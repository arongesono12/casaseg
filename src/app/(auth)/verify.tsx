import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyOtp } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState(params.email ?? '');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    try {
      setError('');
      await verifyOtp(email, token);
      // Stack.Protected removes the auth flow after the session becomes valid.
      // Avoid dispatching a second REPLACE from a screen being unmounted.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('connectionError'));
    }
  };

  return (
    <RouteScreen title={t('verifyTitle')} description={t('verifySubtitle')}>
      <FormField label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <FormField label={t('otpCode')} value={token} onChangeText={setToken} keyboardType="number-pad" />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable onPress={() => void submit()} style={styles.button}><Text style={styles.buttonText}>{t('verify')}</Text></Pressable>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 54, backgroundColor: colors.brand, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: 'white', fontWeight: '900' },
  error: { color: colors.error },
});
