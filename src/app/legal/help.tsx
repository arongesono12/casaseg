import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { ChevronDown, ChevronUp, HelpCircle, Mail, MessageCircle, ShieldCheck } from '@/components/ui/icons';
import { IconTile, PremiumButton, SectionTitle } from '@/components/ui/premium';
import { colors, fontFamily, radius } from '@/constants/theme';
import { defineCopy, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const helpCopy = defineCopy({
  es: {
    title: 'Centro de ayuda', subtitle: 'Respuestas rápidas y soporte cuando lo necesites.', personalHelp: '¿Necesitas ayuda personal?', personalHelpBody: 'Cuéntanos qué ocurre y nuestro equipo revisará tu consulta.', writeSupport: 'Escribir a soporte', supportSubject: 'Ayuda con CasaSeg', security: 'Nunca compartas contraseñas, códigos de verificación ni datos completos de tarjeta por correo.', faqTitle: 'Preguntas frecuentes', faqDetail: 'Toca una pregunta para ver la respuesta.', report: 'Reportar un problema', reportSubject: 'Reporte de problema en CasaSeg',
    q1: '¿Cómo guardo una propiedad?', a1: 'Pulsa el corazón de cualquier anuncio. Si has iniciado sesión, la propiedad quedará sincronizada en la pestaña Guardados.',
    q2: '¿Cómo solicito una visita?', a2: 'Abre la ficha de la propiedad y selecciona “Solicitar visita”. Propón una fecha y el propietario podrá revisarla.',
    q3: '¿Dónde reviso pagos y contratos?', a3: 'Desde Perfil puedes acceder a Contratos y Pagos. Los propietarios también disponen de un centro de gestión profesional.',
    q4: '¿Cómo protege CasaSeg mis operaciones?', a4: 'Los estados sensibles se validan en el servidor. Los pagos se confirman mediante el proveedor y los documentos privados usan accesos temporales.',
  },
  fr: {
    title: 'Centre d’aide', subtitle: 'Des réponses rapides et de l’aide quand vous en avez besoin.', personalHelp: 'Besoin d’une aide personnalisée ?', personalHelpBody: 'Expliquez-nous la situation et notre équipe examinera votre demande.', writeSupport: 'Écrire au support', supportSubject: 'Aide avec CasaSeg', security: 'Ne partagez jamais de mots de passe, de codes de vérification ni de données complètes de carte par e-mail.', faqTitle: 'Questions fréquentes', faqDetail: 'Touchez une question pour voir la réponse.', report: 'Signaler un problème', reportSubject: 'Signalement de problème sur CasaSeg',
    q1: 'Comment enregistrer un logement ?', a1: 'Touchez le cœur de n’importe quelle annonce. Si vous êtes connecté, le logement sera synchronisé dans l’onglet Favoris.',
    q2: 'Comment demander une visite ?', a2: 'Ouvrez la fiche du logement et choisissez « Demander une visite ». Proposez une date et le propriétaire pourra l’examiner.',
    q3: 'Où consulter paiements et contrats ?', a3: 'Depuis Profil, vous accédez aux Contrats et aux Paiements. Les propriétaires disposent aussi d’un centre de gestion professionnel.',
    q4: 'Comment CasaSeg protège-t-il mes opérations ?', a4: 'Les statuts sensibles sont validés par le serveur. Les paiements sont confirmés par le prestataire et les documents privés utilisent des accès temporaires.',
  },
  en: {
    title: 'Help center', subtitle: 'Quick answers and support whenever you need it.', personalHelp: 'Need personal help?', personalHelpBody: 'Tell us what is happening and our team will review your request.', writeSupport: 'Write to support', supportSubject: 'Help with CasaSeg', security: 'Never share passwords, verification codes or full card details by email.', faqTitle: 'Frequently asked questions', faqDetail: 'Tap a question to see the answer.', report: 'Report a problem', reportSubject: 'Problem report in CasaSeg',
    q1: 'How do I save a property?', a1: 'Tap the heart on any listing. If you are signed in, the property will sync to the Saved tab.',
    q2: 'How do I request a visit?', a2: 'Open the property page and choose “Request a visit”. Propose a date and the owner will be able to review it.',
    q3: 'Where do I check payments and contracts?', a3: 'From Profile you can open Contracts and Payments. Owners also have a professional management hub.',
    q4: 'How does CasaSeg protect my transactions?', a4: 'Sensitive statuses are validated on the server. Payments are confirmed by the provider and private documents use temporary access.',
  },
});

function contactSupport(subject: string) {
  void Linking.openURL(`mailto:soporte@casaseg.com?subject=${encodeURIComponent(subject)}`);
}

export default function Help() {
  const { palette } = useAppTheme();
  const copy = useCopy(helpCopy);
  const faqs = [
    { question: copy.q1, answer: copy.a1 },
    { question: copy.q2, answer: copy.a2 },
    { question: copy.q3, answer: copy.a3 },
    { question: copy.q4, answer: copy.a4 },
  ];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <RouteScreen title={copy.title} description={copy.subtitle}>
      <View style={[styles.supportCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <IconTile icon={MessageCircle} size={52} />
        <View style={styles.supportCopy}><Text style={[styles.supportTitle, { color: palette.text }]}>{copy.personalHelp}</Text><Text style={[styles.supportText, { color: palette.textSecondary }]}>{copy.personalHelpBody}</Text></View>
        <PremiumButton label={copy.writeSupport} icon={Mail} onPress={() => contactSupport(copy.supportSubject)} style={styles.supportButton} />
      </View>

      <View style={[styles.security, { backgroundColor: `${colors.success}0D`, borderColor: `${colors.success}25` }]}>
        <ShieldCheck color={colors.success} size={23} />
        <Text style={[styles.securityText, { color: palette.textSecondary }]}>{copy.security}</Text>
      </View>

      <SectionTitle title={copy.faqTitle} detail={copy.faqDetail} />
      <View style={styles.faqList}>
        {faqs.map((faq, index) => {
          const open = openIndex === index;
          return (
            <Pressable key={faq.question} accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpenIndex(open ? null : index)} style={({ pressed }) => [styles.faq, { backgroundColor: palette.surface, borderColor: open ? `${colors.brand}38` : palette.border }, pressed && styles.pressed]}>
              <View style={styles.faqHeader}>
                <View style={[styles.faqIcon, { backgroundColor: open ? `${colors.brand}14` : palette.subtle }]}><HelpCircle color={open ? colors.brand : palette.textSecondary} size={20} /></View>
                <Text style={[styles.question, { color: palette.text }]}>{faq.question}</Text>
                {open ? <ChevronUp color={palette.brandIcon} size={20} /> : <ChevronDown color={palette.muted} size={20} />}
              </View>
              {open ? <Text style={[styles.answer, { color: palette.textSecondary, borderTopColor: palette.border }]}>{faq.answer}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      <PremiumButton variant="secondary" label={copy.report} icon={Mail} onPress={() => contactSupport(copy.reportSubject)} />
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  supportCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 20, alignItems: 'center', gap: 10, boxShadow: '0 12px 30px rgba(15,23,42,0.07)' },
  supportCopy: { alignItems: 'center', gap: 5 },
  supportTitle: { fontSize: 19, fontFamily: fontFamily.bold, textAlign: 'center' },
  supportText: { fontFamily: fontFamily.regular, maxWidth: 420, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  supportButton: { width: '100%', maxWidth: 320, marginTop: 7 },
  security: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  securityText: { fontFamily: fontFamily.regular, flex: 1, fontSize: 12, lineHeight: 18 },
  faqList: { gap: 9 },
  faq: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', paddingHorizontal: 15, overflow: 'hidden' },
  faqHeader: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11 },
  faqIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  question: { flex: 1, fontSize: 14, lineHeight: 19, fontFamily: fontFamily.bold },
  answer: { fontFamily: fontFamily.regular, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 14, fontSize: 13, lineHeight: 20 },
  pressed: { opacity: 0.78 },
});
