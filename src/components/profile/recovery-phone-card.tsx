import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { CheckCircle2, ShieldCheck } from '@/components/ui/icons';
import { PremiumButton, SurfaceCard } from '@/components/ui/premium';
import { colors, fontFamily, touchTarget, type AppPalette } from '@/constants/theme';
import { formatPhoneForDisplay } from '@/features/auth/profile-phone';
import type { RecoveryPhone } from '@/features/auth/use-recovery-phone';
import { defineCopy, interpolate, useCopy } from '@/providers/i18n-context';

const copy = defineCopy({
  es: { pendingTitle: 'Usa tu teléfono para recuperar la cuenta', pendingBody: 'Verifica {phone} y, si olvidas tu contraseña, podrás recibir el código por SMS.', send: 'Enviar código por SMS', code: 'Código del SMS', verify: 'Verificar teléfono', resend: 'Reenviar código', sent: 'Te enviamos un SMS con el código.', activeTitle: 'Recuperación por SMS activa', activeBody: 'Si olvidas tu contraseña, podrás recibir el código en {phone}.', failed: 'No se pudo completar la verificación.' },
  fr: { pendingTitle: 'Utilisez votre téléphone pour récupérer le compte', pendingBody: 'Vérifiez {phone} et, si vous oubliez votre mot de passe, vous pourrez recevoir le code par SMS.', send: 'Envoyer le code par SMS', code: 'Code reçu par SMS', verify: 'Vérifier le téléphone', resend: 'Renvoyer le code', sent: 'Nous vous avons envoyé un SMS avec le code.', activeTitle: 'Récupération par SMS activée', activeBody: 'Si vous oubliez votre mot de passe, vous pourrez recevoir le code au {phone}.', failed: 'La vérification n’a pas abouti.' },
  en: { pendingTitle: 'Use your phone to recover your account', pendingBody: 'Verify {phone} so you can get a code by text message if you forget your password.', send: 'Text me a code', code: 'Code from the text message', verify: 'Verify phone', resend: 'Resend code', sent: 'We texted you a code.', activeTitle: 'Text message recovery is on', activeBody: 'If you forget your password, we can text the code to {phone}.', failed: 'Verification could not be completed.' },
});

/** Paso que hace útil el teléfono del perfil para recuperar la contraseña: verificarlo por SMS en Clerk. */
export function RecoveryPhoneCard({ phone, recovery, palette }: { phone: string; recovery: RecoveryPhone; palette: AppPalette }) {
  const labels = useCopy(copy);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const display = formatPhoneForDisplay(phone);

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : labels.failed);
    } finally {
      setBusy(false);
    }
  };

  if (recovery.status === 'verified') {
    return (
      <SurfaceCard style={styles.card}>
        <View style={styles.heading}>
          <CheckCircle2 color={colors.success} size={20} />
          <Text style={[styles.title, { color: palette.text }]}>{labels.activeTitle}</Text>
        </View>
        <Text style={[styles.body, { color: palette.textSecondary }]}>{interpolate(labels.activeBody, { phone: display })}</Text>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.heading}>
        <ShieldCheck color={palette.brandIcon} size={20} />
        <Text style={[styles.title, { color: palette.text }]}>{labels.pendingTitle}</Text>
      </View>
      <Text style={[styles.body, { color: palette.textSecondary }]}>{interpolate(labels.pendingBody, { phone: display })}</Text>
      {codeSent ? (
        <>
          <Text style={[styles.body, { color: palette.textSecondary }]}>{labels.sent}</Text>
          <FormField
            label={labels.code}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={6}
          />
          <PremiumButton label={labels.verify} loading={busy} disabled={code.trim().length < 6} onPress={() => void run(() => recovery.verifyCode(code))} />
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(recovery.sendCode)} style={styles.inlineTarget}>
            <Text style={[styles.link, { color: palette.brandText }]}>{labels.resend}</Text>
          </Pressable>
        </>
      ) : (
        <PremiumButton
          variant="secondary"
          label={labels.send}
          loading={busy}
          onPress={() => void run(async () => { await recovery.sendCode(); setCodeSent(true); })}
        />
      )}
      {error ? <Text accessibilityRole="alert" style={[styles.body, { color: palette.errorText }]}>{error}</Text> : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 16, lineHeight: 21, fontFamily: fontFamily.bold },
  body: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.regular },
  inlineTarget: { minHeight: touchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { fontFamily: fontFamily.extrabold },
});
