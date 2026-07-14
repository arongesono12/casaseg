import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';
import { AuthLogo } from '@/components/auth-logo';
import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { colors, radius } from '@/constants/theme';
import { registerSchema } from '@/features/auth/auth.schemas';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { useAppTheme } from '@/providers/theme-provider';

type Values = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const [message, setMessage] = useState('');
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', role: 'client' },
  });
  const submit = handleSubmit(async (values) => {
    try {
      await signUp(values);
      router.push({ pathname: '/(auth)/verify', params: { email: values.email } });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('connectionError'));
    }
  });

  return (
    <RouteScreen title={t('registerTitle')} description={t('registerSubtitle')} headerContent={<AuthLogo />}>
      <Controller control={control} name="name" render={({ field }) => <FormField label={t('name')} value={field.value} onChangeText={field.onChange} error={errors.name?.message} />} />
      <Controller control={control} name="email" render={({ field }) => <FormField label={t('email')} autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} error={errors.email?.message} />} />
      <Controller control={control} name="password" render={({ field }) => <FormField label={t('password')} secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.password?.message} />} />
      <Controller control={control} name="role" render={({ field }) => <View style={styles.roles}>{(['client', 'owner'] as const).map((role) => <Pressable key={role} onPress={() => field.onChange(role)} style={[styles.role, { borderColor: field.value === role ? colors.brand : palette.border }]}><Text style={{ color: palette.text, fontWeight: '800' }}>{role === 'client' ? t('client') : t('owner')}</Text></Pressable>)}</View>} />
      {message && <Text style={styles.error}>{message}</Text>}
      <Pressable disabled={isSubmitting} onPress={() => void submit()} style={styles.submit}><Text style={styles.submitText}>{isSubmitting ? t('loading') : t('createAccount')}</Text></Pressable>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  role: { flex: 1, minWidth: 140, minHeight: 52, borderWidth: 2, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  submit: { minHeight: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  submitText: { color: 'white', fontSize: 16, fontWeight: '900' },
  error: { color: colors.error },
});
