import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { CheckCircle2, Clock, CreditCard, Inbox, Lock, Wallet, XCircle } from '@/components/ui/icons';
import { IconTile, MetricCard, PremiumButton, PremiumEmptyState, PremiumErrorState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { createPaymentOrder, fetchPaymentOrders, openPaymentCheckout, type PaymentOrder } from '@/features/payments/payments.api';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatXaf } from '@/utils/formatters';

const key = ['payment-orders'] as const;

function paymentStatus(order: PaymentOrder) {
  if (order.status === 'completed') return { label: 'Completado', tone: colors.success, icon: CheckCircle2 };
  if (order.status === 'failed' || order.status === 'cancelled') return { label: order.status === 'failed' ? 'Fallido' : 'Cancelado', tone: colors.error, icon: XCircle };
  return { label: order.status === 'processing' ? 'Procesando' : 'Pendiente', tone: colors.warning, icon: Clock };
}

export default function Payments() {
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const client = useQueryClient();
  const orders = useQuery({ queryKey: key, queryFn: fetchPaymentOrders, refetchInterval: (query) => query.state.data?.some((order) => order.status === 'pending' || order.status === 'processing') ? 5000 : false });
  const pay = useMutation({ mutationFn: async () => openPaymentCheckout(await createPaymentOrder('active-contract', 'stripe')), onSettled: () => client.invalidateQueries({ queryKey: key }) });
  const completed = (orders.data ?? []).filter((order) => order.status === 'completed');
  const total = completed.reduce((sum, order) => sum + order.amount, 0);
  const pending = (orders.data ?? []).filter((order) => order.status === 'pending' || order.status === 'processing').length;

  return (
    <RouteScreen title={t('payments')} description={t('paymentsSubtitle')}>
      <View style={styles.metrics}>
        <MetricCard label="Operaciones" value={orders.isLoading ? '—' : orders.data?.length ?? 0} icon={Wallet} />
        <MetricCard label="Completadas" value={orders.isLoading ? '—' : completed.length} icon={CheckCircle2} tone={colors.success} />
        <MetricCard label="Total confirmado" value={orders.isLoading ? '—' : total ? formatXaf(total).replace(' XAF', '') : '0'} icon={CreditCard} tone="#7C3AED" />
      </View>

      <View style={[styles.notice, { backgroundColor: `${colors.success}0E`, borderColor: `${colors.success}25` }]}>
        <IconTile icon={Lock} tone={colors.success} size={44} />
        <Text style={[styles.noticeText, { color: palette.textSecondary }]}>{t('paymentSecurity')}</Text>
      </View>

      <PremiumButton label={pay.isPending ? t('checking') : t('paySecure')} icon={CreditCard} loading={pay.isPending} onPress={() => pay.mutate()} />
      <SectionTitle title="Historial de operaciones" detail="Estados confirmados directamente por el proveedor." action={pending ? <StatusPill label={`${pending} en curso`} tone={colors.warning} icon={Clock} /> : undefined} />

      {orders.isLoading ? <PremiumEmptyState icon={Wallet} title="Cargando operaciones" description="Estamos comprobando los estados más recientes." loading /> : null}
      {orders.isError ? <PremiumErrorState title="No pudimos cargar los pagos" description="Comprueba la conexión y vuelve a intentarlo." onRetry={() => void orders.refetch()} /> : null}
      {!orders.isLoading && !orders.isError && !orders.data?.length ? <PremiumEmptyState icon={Inbox} title="Sin operaciones todavía" description="Cuando realices o recibas un pago, su estado verificado aparecerá aquí." /> : null}

      <View style={styles.list}>
        {orders.data?.map((order) => {
          const status = paymentStatus(order);
          return (
            <View key={order.id} style={[styles.order, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <IconTile icon={CreditCard} tone={status.tone} size={46} />
              <View style={styles.orderCopy}>
                <Text selectable style={[styles.amount, { color: palette.text }]}>{formatXaf(order.amount).replace('XAF', order.currency)}</Text>
                <Text style={[styles.provider, { color: palette.textSecondary }]}>{order.provider.toUpperCase()} · #{order.id.slice(0, 8).toUpperCase()}</Text>
              </View>
              <StatusPill label={status.label} tone={status.tone} icon={status.icon} />
            </View>
          );
        })}
      </View>
      {pay.error ? <Text accessibilityRole="alert" style={styles.error}>{pay.error.message}</Text> : null}
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  notice: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  list: { gap: 10 },
  order: { minHeight: 86, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  orderCopy: { flex: 1, minWidth: 0, gap: 4 },
  amount: { fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
  provider: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  error: { color: colors.error, fontSize: 13, lineHeight: 18 },
});
