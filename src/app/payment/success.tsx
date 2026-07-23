import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { CheckCircle2, Clock, CreditCard, RefreshCw, ShieldCheck } from '@/components/ui/icons';
import { IconTile, PremiumButton, StatusPill } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { confirmPaymentOrder } from '@/features/payments/payments.api';
import { useAppTheme } from '@/providers/theme-context';

export default function PaymentSuccess() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const { palette } = useAppTheme();
  const verification = useQuery({ queryKey: ['payment-order', orderId], queryFn: () => confirmPaymentOrder(orderId!), enabled: Boolean(orderId), refetchInterval: (query) => query.state.data?.status === 'pending' || query.state.data?.status === 'processing' ? 3000 : false });
  const completed = verification.data?.status === 'completed';
  const failed = verification.data?.status === 'failed' || verification.data?.status === 'cancelled';
  const title = completed ? 'Pago confirmado' : failed ? 'No se completó el pago' : 'Verificando el pago';
  const description = completed ? 'El proveedor ha confirmado la operación de forma segura.' : failed ? 'El proveedor no confirmó ningún cobro.' : 'Estamos consultando el estado directamente con el proveedor.';
  const Icon = completed ? CheckCircle2 : failed ? CreditCard : Clock;
  const tone = completed ? colors.success : failed ? colors.error : colors.warning;

  return (
    <RouteScreen title={title} description={description}>
      <View style={[styles.result, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.resultIcon, { backgroundColor: `${tone}12` }]}><Icon color={tone} size={44} /></View>
        <StatusPill label={completed ? 'Confirmado' : failed ? 'No completado' : 'Comprobando'} tone={tone} icon={Icon} />
        <Text style={[styles.resultTitle, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.resultText, { color: palette.textSecondary }]}>{description}</Text>
        {orderId ? <Text selectable style={[styles.reference, { color: palette.muted }]}>Referencia #{orderId.slice(0, 12).toUpperCase()}</Text> : null}
      </View>
      <View style={[styles.security, { backgroundColor: `${colors.success}0D`, borderColor: `${colors.success}25` }]}>
        <IconTile icon={ShieldCheck} tone={colors.success} size={42} />
        <Text style={[styles.securityText, { color: palette.textSecondary }]}>CasaSeg no considera un pago válido hasta recibir la confirmación del servidor.</Text>
      </View>
      {verification.isError ? <Text accessibilityRole="alert" style={styles.error}>No se pudo consultar el estado. Puedes reintentarlo o revisar el historial.</Text> : null}
      {orderId && !completed && !failed ? <PremiumButton variant="secondary" label="Comprobar de nuevo" icon={RefreshCw} loading={verification.isFetching} onPress={() => void verification.refetch()} /> : null}
      <PremiumButton label="Ver historial de pagos" icon={CreditCard} onPress={() => router.replace('/owner/payments')} />
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  result: { minHeight: 280, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 24, alignItems: 'center', justifyContent: 'center', gap: 11, boxShadow: '0 12px 30px rgba(15,23,42,0.07)' },
  resultIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  resultTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  resultText: { maxWidth: 400, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  reference: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  security: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  securityText: { flex: 1, fontSize: 12, lineHeight: 18 },
  error: { color: colors.error, fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
