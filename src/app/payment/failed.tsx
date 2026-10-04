import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { ArrowLeft, CreditCard, ShieldCheck, XCircle } from '@/components/ui/icons';
import { IconTile, PremiumButton, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius } from '@/constants/theme';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const failedCopy = defineCopy({
  es: { title: 'Pago no completado', subtitle: 'No se ha confirmado ningún cargo.', noCharge: 'Sin cargo confirmado', stopped: 'La operación se detuvo', stoppedBody: 'Puedes revisar el estado en tu historial o volver a iniciar el pago cuando estés listo.', security: 'Si ves un movimiento inesperado, espera a que el proveedor actualice el estado antes de repetir la operación.', review: 'Revisar pagos' },
  fr: { title: 'Paiement non abouti', subtitle: 'Aucun débit n’a été confirmé.', noCharge: 'Aucun débit confirmé', stopped: 'L’opération a été interrompue', stoppedBody: 'Vous pouvez consulter le statut dans votre historique ou relancer le paiement quand vous serez prêt.', security: 'Si vous voyez un mouvement inattendu, attendez que le prestataire mette à jour le statut avant de recommencer.', review: 'Voir les paiements' },
  en: { title: 'Payment not completed', subtitle: 'No charge has been confirmed.', noCharge: 'No confirmed charge', stopped: 'The transaction was stopped', stoppedBody: 'You can check the status in your history or start the payment again when you are ready.', security: 'If you see an unexpected movement, wait for the provider to update the status before trying again.', review: 'Review payments' },
});

export default function PaymentFailed() {
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const copy = useCopy(failedCopy);
  return (
    <RouteScreen title={copy.title} description={copy.subtitle}>
      <View style={[styles.result, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.resultIcon}><XCircle color={colors.error} size={46} /></View>
        <StatusPill label={copy.noCharge} tone={colors.error} icon={XCircle} />
        <Text style={[styles.resultTitle, { color: palette.text }]}>{copy.stopped}</Text>
        <Text style={[styles.resultText, { color: palette.textSecondary }]}>{copy.stoppedBody}</Text>
      </View>
      <View style={[styles.security, { backgroundColor: `${colors.success}0D`, borderColor: `${colors.success}25` }]}>
        <IconTile icon={ShieldCheck} tone={colors.success} size={42} />
        <Text style={[styles.securityText, { color: palette.textSecondary }]}>{copy.security}</Text>
      </View>
      <PremiumButton label={copy.review} icon={CreditCard} onPress={() => router.replace('/owner/payments')} />
      <PremiumButton variant="secondary" label={t('back')} icon={ArrowLeft} onPress={() => router.back()} />
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  result: { minHeight: 280, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 24, alignItems: 'center', justifyContent: 'center', gap: 11, boxShadow: '0 12px 30px rgba(15,23,42,0.07)' },
  resultIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: `${colors.error}12`, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  resultTitle: { fontSize: 22, fontFamily: fontFamily.extrabold, textAlign: 'center' },
  resultText: { fontFamily: fontFamily.regular, maxWidth: 400, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  security: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  securityText: { fontFamily: fontFamily.regular, flex: 1, fontSize: 12, lineHeight: 18 },
});
