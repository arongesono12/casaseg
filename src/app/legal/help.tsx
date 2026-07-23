import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { ChevronDown, ChevronUp, HelpCircle, Mail, MessageCircle, ShieldCheck } from '@/components/ui/icons';
import { IconTile, PremiumButton, SectionTitle } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-context';

const faqs = [
  { question: '¿Cómo guardo una propiedad?', answer: 'Pulsa el corazón de cualquier anuncio. Si has iniciado sesión, la propiedad quedará sincronizada en la pestaña Guardados.' },
  { question: '¿Cómo solicito una visita?', answer: 'Abre la ficha de la propiedad y selecciona “Solicitar visita”. Propón una fecha y el propietario podrá revisarla.' },
  { question: '¿Dónde reviso pagos y contratos?', answer: 'Desde Perfil puedes acceder a Contratos y Pagos. Los propietarios también disponen de un centro de gestión profesional.' },
  { question: '¿Cómo protege CasaSeg mis operaciones?', answer: 'Los estados sensibles se validan en el servidor. Los pagos se confirman mediante el proveedor y los documentos privados usan accesos temporales.' },
];

function contactSupport(subject: string) {
  void Linking.openURL(`mailto:soporte@casaseg.com?subject=${encodeURIComponent(subject)}`);
}

export default function Help() {
  const { palette } = useAppTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <RouteScreen title="Centro de ayuda" description="Respuestas rápidas y soporte cuando lo necesites.">
      <View style={[styles.supportCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <IconTile icon={MessageCircle} size={52} />
        <View style={styles.supportCopy}><Text style={[styles.supportTitle, { color: palette.text }]}>¿Necesitas ayuda personal?</Text><Text style={[styles.supportText, { color: palette.textSecondary }]}>Cuéntanos qué ocurre y nuestro equipo revisará tu consulta.</Text></View>
        <PremiumButton label="Escribir a soporte" icon={Mail} onPress={() => contactSupport('Ayuda con CasaSeg')} style={styles.supportButton} />
      </View>

      <View style={[styles.security, { backgroundColor: `${colors.success}0D`, borderColor: `${colors.success}25` }]}>
        <ShieldCheck color={colors.success} size={23} />
        <Text style={[styles.securityText, { color: palette.textSecondary }]}>Nunca compartas contraseñas, códigos de verificación ni datos completos de tarjeta por correo.</Text>
      </View>

      <SectionTitle title="Preguntas frecuentes" detail="Toca una pregunta para ver la respuesta." />
      <View style={styles.faqList}>
        {faqs.map((faq, index) => {
          const open = openIndex === index;
          return (
            <Pressable key={faq.question} accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpenIndex(open ? null : index)} style={({ pressed }) => [styles.faq, { backgroundColor: palette.surface, borderColor: open ? `${colors.brand}38` : palette.border }, pressed && styles.pressed]}>
              <View style={styles.faqHeader}>
                <View style={[styles.faqIcon, { backgroundColor: open ? `${colors.brand}14` : palette.subtle }]}><HelpCircle color={open ? colors.brand : palette.textSecondary} size={20} /></View>
                <Text style={[styles.question, { color: palette.text }]}>{faq.question}</Text>
                {open ? <ChevronUp color={colors.brand} size={20} /> : <ChevronDown color={palette.muted} size={20} />}
              </View>
              {open ? <Text style={[styles.answer, { color: palette.textSecondary, borderTopColor: palette.border }]}>{faq.answer}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      <PremiumButton variant="secondary" label="Reportar un problema" icon={Mail} onPress={() => contactSupport('Reporte de problema en CasaSeg')} />
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  supportCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 20, alignItems: 'center', gap: 10, boxShadow: '0 12px 30px rgba(15,23,42,0.07)' },
  supportCopy: { alignItems: 'center', gap: 5 },
  supportTitle: { fontSize: 19, fontWeight: '900', textAlign: 'center' },
  supportText: { maxWidth: 420, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  supportButton: { width: '100%', maxWidth: 320, marginTop: 7 },
  security: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  securityText: { flex: 1, fontSize: 12, lineHeight: 18 },
  faqList: { gap: 9 },
  faq: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', paddingHorizontal: 15, overflow: 'hidden' },
  faqHeader: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11 },
  faqIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  question: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  answer: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 14, fontSize: 13, lineHeight: 20 },
  pressed: { opacity: 0.78 },
});
