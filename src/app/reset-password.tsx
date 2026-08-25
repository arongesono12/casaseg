import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import type { z } from 'zod';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { PremiumButton } from '@/components/ui/premium';
import { colors } from '@/constants/theme';
import { resetSchema } from '@/features/auth/auth.schemas';
import { exchangeOAuthCode } from '@/features/auth/oauth-session';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';

type Values = z.infer<typeof resetSchema>;

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [error, setError] = useState('');
  // The recovery link carries a PKCE code that has to become a session before
  // updateUser is allowed to set a new password.
  const [isExchangingCode, setIsExchangingCode] = useState(Boolean(params.code));
  const { control, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    const linkError = params.error_description ?? params.error;
    if (linkError) {
      setError(linkError);
      return;
    }
    if (!params.code) return;

    let active = true;
    setIsExchangingCode(true);
    exchangeOAuthCode(params.code)
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : t('connectionError'));
      })
      .finally(() => {
        if (active) setIsExchangingCode(false);
      });
    return () => { active = false; };
  }, [params.code, params.error, params.error_description, t]);

  const submit = handleSubmit(async ({ password }) => {
    try {
      setError('');
      await updatePassword(password);
      // This screen sits outside the (auth) group, so no route guard performs
      // the post-recovery transition on its behalf.
      router.replace('/(tabs)/explore');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('connectionError'));
    }
  });

  return (
    <RouteScreen title={t('resetTitle')} description={t('resetSubtitle')}>
      {isExchangingCode ? (
        <ActivityIndicator color={colors.brand} size="large" />
      ) : (
        <>
          <Controller control={control} name="password" render={({ field }) => <FormField label={t('password')} secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.password?.message} />} />
          <Controller control={control} name="confirmPassword" render={({ field }) => <FormField label={t('repeatPassword')} secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.confirmPassword?.message} />} />
          <PremiumButton label={t('savePassword')} onPress={() => void submit()} />
        </>
      )}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.error },
});
