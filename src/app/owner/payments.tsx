import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { CheckCircle2, Clock, CreditCard, Inbox, Lock, Wallet, XCircle } from '@/components/ui/icons';
import { IconTile, MetricCard, PremiumButton, PremiumEmptyState, PremiumErrorState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, radius, touchTarget } from '@/constants/theme';
import { fetchContracts } from '@/features/contracts/contracts.api';
import { createPaymentOrder, fetchPaymentOrders, openPaymentCheckout, paymentProviderLabels, paymentProviders, type PaymentOrder, type PaymentProvider } from '@/features/payments/payments.api';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatXaf } from '@/utils/formatters';

const key = ['payment-orders'] as const;
const contractsKey = ['contracts'] as const;

function paymentStatus(order: PaymentOrder) {
  if (order.status === 'completed') return { label: 'Completado', tone: colors.success, icon: CheckCircle2 };
  if (order.status === 'failed' || order.status === 'cancelled') return { label: order.status === 'failed' ? 'Fallido' : 'Cancelado', tone: colors.error, icon: XCircle };
  return { label: order.status === 'processing' ? 'Procesando' : 'Pendiente', tone: colors.warning, icon: Clock };
}

export default function Payments() {
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const client = useQueryClient();
  const [provider, setProvider] = useState<PaymentProvider>('bank_transfer');
  const [phone, setPhone] = useState('');

  const orders = useQuery({ queryKey: key, queryFn: fetchPaymentOrders, refetchInterval: (query) => query.state.data?.some((order) => order.status === 'pending' || order.status === 'processing') ? 5000 : false });
  const contracts = useQuery({ queryKey: contractsKey, queryFn: fetchContracts });

  // Solo un contrato firmado admite cobro. Antes se enviaba el literal
  // 'active-contract', que ni era un contrato ni un identificador válido.
  const payableContract = contracts.data?.find((contract) => contract.status === 'signed');

  const pay = useMutation({
    mutationFn: async () => {
      if (!payableContract) throw new Error('No hay ningún contrato firmado pendiente de pago.');
      return openPaymentCheckout(await createPaymentOrder(payableContract.id, provider, phone));
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });

  const completed = (orders.data ?? []).filter((order) => order.status === 'completed');
  const total = completed.reduce((sum, order) => sum + order.amount, 0);
  const pending = (orders.data ?? []).filter((order) => order.status === 'pending' || order.status === 'processing').length;
  const missingPhone = provider === 'fondoseg' && !phone.trim();

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

      <View style={styles.payBlock}>
        <Text style={[styles.label, { color: palette.text }]}>Método de pago</Text>
        <View style={styles.providers}>
          {paymentProviders.map((option) => {
            const selected = provider === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setProvider(option)}
                style={[styles.provider, { borderColor: selected ? colors.brand : palette.border, backgroundColor: selected ? 'rgba(37,99,235,0.12)' : palette.surface }]}
              >
                <Text style={[styles.providerText, { color: selected ? colors.brandDark : palette.textSecondary }]}>{paymentProviderLabels[option]}</Text>
              </Pressable>
            );
          })}
        </View>

        {provider === 'fondoseg' ? (
          <TextInput
            accessibilityLabel="Número de teléfono para FondoSeg"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+240 222 000 000"
            placeholderTextColor={palette.muted}
            style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
          />
        ) : null}

        {contracts.isLoading ? (
          <Text style={[styles.hint, { color: palette.textSecondary }]}>Comprobando contratos…</Text>
        ) : payableContract ? (
          <Text style={[styles.hint, { color: palette.textSecondary }]}>Se cobrará el contrato de {payableContract.propertyTitle}.</Text>
        ) : (
          <Text style={[styles.hint, { color: palette.textSecondary }]}>No hay ningún contrato firmado pendiente de pago.</Text>
        )}

        <PremiumButton
          label={pay.isPending ? t('checking') : t('paySecure')}
          icon={CreditCard}
          loading={pay.isPending}
          disabled={!payableContract || missingPhone || pay.isPending}
          onPress={() => pay.mutate()}
        />
      </View>

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
                <Text style={[styles.provider_, { color: palette.textSecondary }]}>{order.provider.toUpperCase()} · #{order.id.slice(0, 8).toUpperCase()}</Text>
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
  payBlock: { gap: 10 },
  label: { fontSize: 13, fontWeight: '800' },
  providers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  provider: { minHeight: 44, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, justifyContent: 'center' },
  providerText: { fontSize: 13, fontWeight: '700' },
  input: { minHeight: touchTarget, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, fontSize: 16 },
  hint: { fontSize: 13, lineHeight: 19 },
  list: { gap: 10 },
  order: { minHeight: 86, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  orderCopy: { flex: 1, minWidth: 0, gap: 4 },
  amount: { fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
  provider_: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  error: { color: colors.error, fontSize: 13, lineHeight: 18 },
});
