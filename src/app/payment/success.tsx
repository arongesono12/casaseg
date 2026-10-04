import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { CheckCircle2, Clock, CreditCard, RefreshCw, ShieldCheck } from '@/components/ui/icons';
import { IconTile, PremiumButton, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius } from '@/constants/theme';
import { confirmPaymentOrder } from '@/features/payments/payments.api';
import { defineCopy, interpolate, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const successCopy = defineCopy({
  es: { confirmedTitle: 'Pago confirmado', failedTitle: 'No se completó el pago', checkingTitle: 'Verificando el pago', confirmedBody: 'El proveedor ha confirmado la operación de forma segura.', failedBody: 'El proveedor no confirmó ningún cobro.', checkingBody: 'Estamos consultando el estado directamente con el proveedor.', confirmed: 'Confirmado', notCompleted: 'No completado', checking: 'Comprobando', reference: 'Referencia #{id}', security: 'CasaSeg no considera un pago válido hasta recibir la confirmación del servidor.', error: 'No se pudo consultar el estado. Puedes reintentarlo o revisar el historial.', checkAgain: 'Comprobar de nuevo', history: 'Ver historial de pagos' },
  fr: { confirmedTitle: 'Paiement confirmé', failedTitle: 'Le paiement n’a pas abouti', checkingTitle: 'Vérification du paiement', confirmedBody: 'Le prestataire a confirmé l’opération en toute sécurité.', failedBody: 'Le prestataire n’a confirmé aucun débit.', checkingBody: 'Nous vérifions le statut directement auprès du prestataire.', confirmed: 'Confirmé', notCompleted: 'Non abouti', checking: 'Vérification', reference: 'Référence n° {id}', security: 'CasaSeg ne considère un paiement comme valide qu’après confirmation du serveur.', error: 'Impossible de consulter le statut. Réessayez ou consultez l’historique.', checkAgain: 'Vérifier à nouveau', history: 'Voir l’historique des paiements' },
  en: { confirmedTitle: 'Payment confirmed', failedTitle: 'The payment was not completed', checkingTitle: 'Verifying the payment', confirmedBody: 'The provider has securely confirmed the transaction.', failedBody: 'The provider did not confirm any charge.', checkingBody: 'We are checking the status directly with the provider.', confirmed: 'Confirmed', notCompleted: 'Not completed', checking: 'Checking', reference: 'Reference #{id}', security: 'CasaSeg only treats a payment as valid once the server confirms it.', error: 'We could not check the status. Try again or review the history.', checkAgain: 'Check again', history: 'View payment history' },
});

export default function PaymentSuccess() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const { palette } = useAppTheme();
  const copy = useCopy(successCopy);
  const verification = useQuery({ queryKey: ['payment-order', orderId], queryFn: () => confirmPaymentOrder(orderId!), enabled: Boolean(orderId), refetchInterval: (query) => query.state.data?.status === 'pending' || query.state.data?.status === 'processing' ? 3000 : false });
  const completed = verification.data?.status === 'completed';
  const failed = verification.data?.status === 'failed' || verification.data?.status === 'cancelled';
  const title = completed ? copy.confirmedTitle : failed ? copy.failedTitle : copy.checkingTitle;
  const description = completed ? copy.confirmedBody : failed ? copy.failedBody : copy.checkingBody;
  const Icon = completed ? CheckCircle2 : failed ? CreditCard : Clock;
  const tone = completed ? colors.success : failed ? colors.error : colors.warning;

  return (
    <RouteScreen title={title} description={description}>
      <View style={[styles.result, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.resultIcon, { backgroundColor: `${tone}12` }]}><Icon color={tone} size={44} /></View>
        <StatusPill label={completed ? copy.confirmed : failed ? copy.notCompleted : copy.checking} tone={tone} icon={Icon} />
        <Text style={[styles.resultTitle, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.resultText, { color: palette.textSecondary }]}>{description}</Text>
        {orderId ? <Text selectable style={[styles.reference, { color: palette.textSecondary }]}>{interpolate(copy.reference, { id: orderId.slice(0, 12).toUpperCase() })}</Text> : null}
      </View>
      <View style={[styles.security, { backgroundColor: `${colors.success}0D`, borderColor: `${colors.success}25` }]}>
        <IconTile icon={ShieldCheck} tone={colors.success} size={42} />
        <Text style={[styles.securityText, { color: palette.textSecondary }]}>{copy.security}</Text>
      </View>
      {verification.isError ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{copy.error}</Text> : null}
      {orderId && !completed && !failed ? <PremiumButton variant="secondary" label={copy.checkAgain} icon={RefreshCw} loading={verification.isFetching} onPress={() => void verification.refetch()} /> : null}
      <PremiumButton label={copy.history} icon={CreditCard} onPress={() => router.replace('/owner/payments')} />
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  result: { minHeight: 280, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 24, alignItems: 'center', justifyContent: 'center', gap: 11, boxShadow: '0 12px 30px rgba(15,23,42,0.07)' },
  resultIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  resultTitle: { fontSize: 22, fontFamily: fontFamily.extrabold, textAlign: 'center' },
  resultText: { fontFamily: fontFamily.regular, maxWidth: 400, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  reference: { fontSize: 11, fontFamily: fontFamily.bold, letterSpacing: 0.4 },
  security: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  securityText: { fontFamily: fontFamily.regular, flex: 1, fontSize: 12, lineHeight: 18 },
  error: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
