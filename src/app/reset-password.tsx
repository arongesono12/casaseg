import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import type { z } from 'zod';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { PremiumButton } from '@/components/ui/premium';
import { colors } from '@/constants/theme';
import { resetSchema } from '@/features/auth/auth.schemas';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';

type Values = z.infer<typeof resetSchema>;

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState('');
  const { control, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const submit = handleSubmit(async ({ password }) => {
    try {
      setError('');
      await updatePassword(password);
      // The protected-route guard owns the post-auth transition.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('connectionError'));
    }
  });

  return (
    <RouteScreen title={t('resetTitle')} description={t('resetSubtitle')}>
      <Controller control={control} name="password" render={({ field }) => <FormField label={t('password')} secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.password?.message} />} />
      <Controller control={control} name="confirmPassword" render={({ field }) => <FormField label={t('repeatPassword')} secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.confirmPassword?.message} />} />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <PremiumButton label={t('savePassword')} onPress={() => void submit()} />
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.error },
});
