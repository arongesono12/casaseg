import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { PremiumButton } from '@/components/ui/premium';
import { colors } from '@/constants/theme';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const submit = async () => {
    try {
      await requestPasswordReset(email);
      setMessage(t('checkEmail'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('connectionError'));
    }
  };

  return (
    <RouteScreen title={t('forgotTitle')} description={t('forgotSubtitle')}>
      <FormField label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <PremiumButton label={t('sendLink')} onPress={() => void submit()} />
      {message ? <Text>{message}</Text> : null}
      <Pressable onPress={() => router.push('/(auth)/login')}>
        <Text style={styles.link}>{t('backToLogin')}</Text>
      </Pressable>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.brandDark, fontWeight: '800' },
});
