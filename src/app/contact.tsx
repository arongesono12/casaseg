import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { PremiumButton, SurfaceCard } from '@/components/ui/premium';
import { fontFamily, radius, touchTarget } from '@/constants/theme';
import { submitContactForm } from '@/features/contact/contact.api';
import { useAuth } from '@/providers/auth-context';
import { defineCopy, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const contactCopy = defineCopy({
  es: { title: 'Contactar con CasaSeg', subtitle: 'Cuéntanos en qué podemos ayudarte.', name: 'Nombre', email: 'Correo electrónico', message: 'Mensaje', send: 'Enviar mensaje', sent: 'Tu mensaje se ha enviado. Te responderemos por correo.', back: 'Volver al perfil' },
  fr: { title: 'Contacter CasaSeg', subtitle: 'Dites-nous comment nous pouvons vous aider.', name: 'Nom', email: 'E-mail', message: 'Message', send: 'Envoyer le message', sent: 'Votre message a été envoyé. Nous répondrons par e-mail.', back: 'Retour au profil' },
  en: { title: 'Contact CasaSeg', subtitle: 'Tell us how we can help.', name: 'Name', email: 'Email', message: 'Message', send: 'Send message', sent: 'Your message was sent. We will reply by email.', back: 'Back to profile' },
});

export default function ContactScreen() {
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const copy = useCopy(contactCopy);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const send = useMutation({ mutationFn: () => submitContactForm({ name, email, message }), retry: false });
  return (
    <RouteScreen title={copy.title} description={copy.subtitle}>
      <SurfaceCard style={styles.card}>
        {send.isSuccess ? <>
          <Text accessibilityRole="alert" style={[styles.body, { color: palette.text }]}>{copy.sent}</Text>
          <PremiumButton label={copy.back} onPress={() => router.back()} />
        </> : <>
          <TextInput accessibilityLabel={copy.name} value={name} onChangeText={setName} placeholder={copy.name} placeholderTextColor={palette.muted} autoComplete="name" style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]} />
          <TextInput accessibilityLabel={copy.email} value={email} onChangeText={setEmail} placeholder={copy.email} placeholderTextColor={palette.muted} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]} />
          <TextInput accessibilityLabel={copy.message} value={message} onChangeText={setMessage} placeholder={copy.message} placeholderTextColor={palette.muted} multiline maxLength={5000} style={[styles.input, styles.message, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]} />
          {send.error ? <Text accessibilityRole="alert" style={[styles.body, { color: palette.errorText }]}>{send.error.message}</Text> : null}
          <PremiumButton label={copy.send} loading={send.isPending} disabled={send.isPending || !name.trim() || !email.trim() || message.trim().length < 10} onPress={() => send.mutate()} />
        </>}
      </SurfaceCard>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, gap: 14 },
  input: { minHeight: touchTarget, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 16, fontSize: 16, fontFamily: fontFamily.regular },
  message: { minHeight: 150, borderRadius: radius.lg, paddingVertical: 14, textAlignVertical: 'top' },
  body: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21 },
});
