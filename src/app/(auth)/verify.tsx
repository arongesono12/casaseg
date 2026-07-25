import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { CheckCircle2, Clock, Mail, ShieldCheck } from '@/components/ui/icons';
import { PremiumButton } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { otpSchema } from '@/features/auth/auth.schemas';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

type OtpValues = z.infer<typeof otpSchema>;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const lockedEmail = typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';
  const { verifyOtp, resendSignupOtp } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const [submitError, setSubmitError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendIn, setResendIn] = useState(lockedEmail ? RESEND_COOLDOWN_SECONDS : 0);
  const {
    control,
    getValues,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { email: lockedEmail, token: '' },
  });

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => {
      setResendIn((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const submit = handleSubmit(async ({ email, token }) => {
    try {
      setSubmitError('');
      setResendMessage('');
      await verifyOtp(email, token);
      // Stack.Protected removes this route after Supabase creates the verified session.
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : t('connectionError'));
    }
  });

  const resend = async () => {
    if (resendIn > 0 || isResending) return;
    const emailIsValid = await trigger('email');
    if (!emailIsValid) return;

    try {
      setIsResending(true);
      setSubmitError('');
      setResendMessage('');
      await resendSignupOtp(getValues('email'));
      setResendMessage(t('otpResent'));
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : t('connectionError'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <RouteScreen title={t('verifyTitle')} description={t('verifySubtitle')} maxWidth={620}>
      <View style={[styles.notice, { backgroundColor: `${colors.brand}0D`, borderColor: `${colors.brand}24` }]}>
        <View style={[styles.noticeIcon, { backgroundColor: `${colors.brand}14` }]}>
          <Mail color={colors.brand} size={24} />
        </View>
        <View style={styles.noticeCopy}>
          <Text style={[styles.noticeTitle, { color: palette.text }]}>{t('otpEmailSent')}</Text>
          <Text selectable style={[styles.noticeText, { color: palette.textSecondary }]}>{t('verifyInstructions')}</Text>
        </View>
      </View>

      <View style={[styles.form, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <FormField
              label={t('email')}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              autoCapitalize="none"
              autoComplete="email"
              editable={!lockedEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="token"
          render={({ field }) => (
            <FormField
              label={t('otpCode')}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={(value) => field.onChange(value.replace(/\D/g, '').slice(0, 6))}
              autoComplete="one-time-code"
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              textContentType="oneTimeCode"
              error={errors.token?.message}
              onSubmitEditing={() => void submit()}
              style={styles.otpInput}
            />
          )}
        />

        <View style={[styles.security, { backgroundColor: palette.subtle }]}>
          <ShieldCheck color={colors.success} size={18} />
          <Text style={[styles.securityText, { color: palette.textSecondary }]}>{t('otpSecurity')}</Text>
        </View>
      </View>

      {submitError ? <View accessibilityRole="alert" style={styles.errorBanner}><Text selectable style={styles.errorText}>{submitError}</Text></View> : null}
      {resendMessage ? (
        <View accessibilityRole="alert" style={[styles.successBanner, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30` }]}>
          <CheckCircle2 color={colors.success} size={19} />
          <Text selectable style={[styles.successText, { color: palette.text }]}>{resendMessage}</Text>
        </View>
      ) : null}

      <PremiumButton
        label={isSubmitting ? t('verifyingOtp') : t('verify')}
        loading={isSubmitting}
        disabled={isResending}
        onPress={() => void submit()}
      />
      <PremiumButton
        variant="secondary"
        label={isResending ? t('resendingOtp') : resendIn > 0 ? t('resendIn', { count: String(resendIn) }) : t('resendOtp')}
        icon={resendIn > 0 ? Clock : Mail}
        loading={isResending}
        disabled={isSubmitting || resendIn > 0}
        onPress={() => void resend()}
      />
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  notice: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, borderCurve: 'continuous', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  noticeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  noticeCopy: { flex: 1, gap: 3 },
  noticeTitle: { fontSize: 16, lineHeight: 21, fontWeight: '900' },
  noticeText: { fontSize: 13, lineHeight: 19 },
  form: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 18, gap: 16, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  otpInput: { fontSize: 24, lineHeight: 30, fontWeight: '900', letterSpacing: 8, textAlign: 'center', fontVariant: ['tabular-nums'] },
  security: { borderRadius: radius.sm, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  securityText: { flex: 1, fontSize: 12, lineHeight: 18 },
  errorBanner: { borderWidth: StyleSheet.hairlineWidth, borderColor: `${colors.error}40`, borderRadius: radius.md, padding: 13, backgroundColor: `${colors.error}10` },
  errorText: { color: colors.error, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  successBanner: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  successText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '700' },
});
