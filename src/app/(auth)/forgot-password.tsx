import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { PremiumButton } from '@/components/ui/premium';
import { colors, fontFamily, radius, touchTarget } from '@/constants/theme';
import type { PasswordResetChannel, PasswordResetOption } from '@/features/auth/password-reset';
import { useAuth } from '@/providers/auth-context';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const copy = defineCopy({
  es: { subtitle: 'Te enviaremos un código para crear una contraseña nueva.', continue: 'Continuar', choose: '¿Dónde quieres recibir el código?', email: 'Correo electrónico', phone: 'SMS al teléfono', send: 'Enviar código', otherEmail: 'Usar otro correo', smsHint: 'Si verificaste tu teléfono en el perfil, también podrás recibir el código por SMS.' },
  fr: { subtitle: 'Nous vous enverrons un code pour créer un nouveau mot de passe.', continue: 'Continuer', choose: 'Où voulez-vous recevoir le code ?', email: 'E-mail', phone: 'SMS au téléphone', send: 'Envoyer le code', otherEmail: 'Utiliser un autre e-mail', smsHint: 'Si vous avez vérifié votre téléphone dans le profil, vous pourrez aussi recevoir le code par SMS.' },
  en: { subtitle: 'We will send you a code to create a new password.', continue: 'Continue', choose: 'Where do you want to receive the code?', email: 'Email', phone: 'Text message', send: 'Send code', otherEmail: 'Use another email', smsHint: 'If you verified your phone in your profile, you can also get the code by text message.' },
});

export default function ForgotPasswordScreen() {
  const { startPasswordReset, sendPasswordResetCode } = useAuth();
  const { t } = useI18n();
  const labels = useCopy(copy);
  const { palette } = useAppTheme();
  // El correo llega desde el login cuando el acceso fallo por falta de
  // contrasena: reescribirlo ahi seria pedir dos veces el mismo dato.
  const { email: emailInicial } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(emailInicial ?? '');
  const [options, setOptions] = useState<PasswordResetOption[]>([]);
  const [channel, setChannel] = useState<PasswordResetChannel>('email');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await task();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('connectionError'));
    } finally {
      setBusy(false);
    }
  };

  // Clerk envía un código, no un enlace: hay que llevar al usuario a la
  // pantalla donde lo introduce junto con la contraseña nueva.
  const sendTo = async (option: PasswordResetOption) => {
    await sendPasswordResetCode(option.channel);
    router.push({ pathname: '/reset-password', params: { channel: option.channel, destination: option.destination } });
  };

  const lookUp = () => run(async () => {
    const found = await startPasswordReset(email);
    // Con una sola vía no hay nada que elegir: se envía directamente.
    if (found.length === 1) return sendTo(found[0]);
    setOptions(found);
    setChannel(found[0].channel);
  });

  const selected = options.find((option) => option.channel === channel);

  return (
    <RouteScreen title={t('forgotTitle')} description={labels.subtitle}>
      {options.length > 1 ? (
        <View accessibilityRole="radiogroup" accessibilityLabel={labels.choose} style={styles.group}>
          <Text style={[styles.question, { color: palette.text }]}>{labels.choose}</Text>
          {options.map((option) => {
            const active = option.channel === channel;
            return (
              <Pressable
                key={option.channel}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setChannel(option.channel)}
                style={[styles.option, { borderColor: active ? palette.brand : palette.border, backgroundColor: active ? palette.subtle : palette.surface }]}
              >
                <View style={[styles.radio, { borderColor: active ? palette.brand : palette.muted }]}>
                  {active ? <View style={[styles.radioDot, { backgroundColor: palette.brand }]} /> : null}
                </View>
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionTitle, { color: palette.text }]}>{option.channel === 'phone' ? labels.phone : labels.email}</Text>
                  <Text selectable style={[styles.optionDestination, { color: palette.textSecondary }]}>{option.destination}</Text>
                </View>
              </Pressable>
            );
          })}
          <PremiumButton label={labels.send} loading={busy} onPress={() => { if (selected) void run(() => sendTo(selected)); }} />
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setOptions([]); setMessage(''); }} style={styles.inlineTarget}>
            <Text style={[styles.link, { color: palette.brandText }]}>{labels.otherEmail}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FormField label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" onSubmitEditing={() => void lookUp()} />
          <Text style={[styles.hint, { color: palette.textSecondary }]}>{labels.smsHint}</Text>
          <PremiumButton label={labels.continue} loading={busy} disabled={!email.trim()} onPress={() => void lookUp()} />
        </>
      )}
      {message ? <Text accessibilityRole="alert" style={{ color: palette.errorText }}>{message}</Text> : null}
      <Pressable onPress={() => router.push('/(auth)/login')} style={styles.inlineTarget}>
        <Text style={[styles.link, { color: palette.brandText }]}>{t('backToLogin')}</Text>
      </Pressable>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: 12 },
  question: { fontSize: 15, fontFamily: fontFamily.bold },
  option: { minHeight: 64, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionCopy: { flex: 1, minWidth: 0, gap: 2 },
  optionTitle: { fontSize: 15, fontFamily: fontFamily.bold },
  optionDestination: { fontSize: 13, fontFamily: fontFamily.regular },
  hint: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.regular },
  inlineTarget: { minHeight: touchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { color: colors.brandDark, fontFamily: fontFamily.extrabold },
});
