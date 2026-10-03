import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { CheckCircle2, Clock, CreditCard, Inbox, Wallet, XCircle } from '@/components/ui/icons';
import { IconTile, MetricCard, PremiumButton, PremiumEmptyState, PremiumErrorState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, radius, touchTarget, withAlpha } from '@/constants/theme';
import { fetchContracts } from '@/features/contracts/contracts.api';
import { createPaymentOrder, fetchPaymentOrders, openPaymentCheckout, paymentProviderLabels, paymentProviders, type PaymentOrder, type PaymentProvider } from '@/features/payments/payments.api';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatXaf } from '@/utils/formatters';

const paymentsCopy = defineCopy({
  es: { completed: 'Completado', failed: 'Fallido', cancelled: 'Cancelado', processing: 'Procesando', pending: 'Pendiente', noPayableContract: 'No hay ningún contrato firmado pendiente de pago.', operations: 'Operaciones', completedMetric: 'Completadas', confirmedTotal: 'Total confirmado', paymentMethod: 'Método de pago', phoneLabel: 'Número de teléfono para FondoSeg', checkingContracts: 'Comprobando contratos…', chargeContract: 'Se cobrará el contrato de {title}.', historyTitle: 'Historial de operaciones', historyDetail: 'Estados confirmados directamente por el proveedor.', inProgress: '{count} en curso', loadingTitle: 'Cargando operaciones', loadingBody: 'Estamos comprobando los estados más recientes.', errorTitle: 'No pudimos cargar los pagos', errorBody: 'Comprueba la conexión y vuelve a intentarlo.', emptyTitle: 'Sin operaciones todavía', emptyBody: 'Cuando realices o recibas un pago, su estado verificado aparecerá aquí.' },
  fr: { completed: 'Terminé', failed: 'Échoué', cancelled: 'Annulé', processing: 'En cours', pending: 'En attente', noPayableContract: 'Aucun contrat signé en attente de paiement.', operations: 'Opérations', completedMetric: 'Terminées', confirmedTotal: 'Total confirmé', paymentMethod: 'Moyen de paiement', phoneLabel: 'Numéro de téléphone pour FondoSeg', checkingContracts: 'Vérification des contrats…', chargeContract: 'Le contrat de {title} sera facturé.', historyTitle: 'Historique des opérations', historyDetail: 'Statuts confirmés directement par le prestataire.', inProgress: '{count} en cours', loadingTitle: 'Chargement des opérations', loadingBody: 'Nous vérifions les statuts les plus récents.', errorTitle: 'Impossible de charger les paiements', errorBody: 'Vérifiez la connexion et réessayez.', emptyTitle: 'Aucune opération pour le moment', emptyBody: 'Lorsque vous effectuez ou recevez un paiement, son statut vérifié apparaîtra ici.' },
  en: { completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled', processing: 'Processing', pending: 'Pending', noPayableContract: 'There is no signed contract awaiting payment.', operations: 'Transactions', completedMetric: 'Completed', confirmedTotal: 'Confirmed total', paymentMethod: 'Payment method', phoneLabel: 'Phone number for FondoSeg', checkingContracts: 'Checking contracts…', chargeContract: 'The contract for {title} will be charged.', historyTitle: 'Transaction history', historyDetail: 'Statuses confirmed directly by the provider.', inProgress: '{count} in progress', loadingTitle: 'Loading transactions', loadingBody: 'We are checking the latest statuses.', errorTitle: 'We could not load the payments', errorBody: 'Check your connection and try again.', emptyTitle: 'No transactions yet', emptyBody: 'When you make or receive a payment, its verified status will appear here.' },
});
type PaymentsCopy = (typeof paymentsCopy)['es'];

const key = ['payment-orders'] as const;
const contractsKey = ['contracts'] as const;

function paymentStatus(order: PaymentOrder, copy: PaymentsCopy) {
  if (order.status === 'completed') return { label: copy.completed, tone: colors.success, icon: CheckCircle2 };
  if (order.status === 'failed' || order.status === 'cancelled') return { label: order.status === 'failed' ? copy.failed : copy.cancelled, tone: colors.error, icon: XCircle };
  return { label: order.status === 'processing' ? copy.processing : copy.pending, tone: colors.warning, icon: Clock };
}

export default function Payments() {
  const { palette } = useAppTheme();
  const { locale, t } = useI18n();
  const copy = useCopy(paymentsCopy);
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
      if (!payableContract) throw new Error(copy.noPayableContract);
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
        <MetricCard label={copy.operations} value={orders.isLoading ? '—' : orders.data?.length ?? 0} icon={Wallet} />
        <MetricCard label={copy.completedMetric} value={orders.isLoading ? '—' : completed.length} icon={CheckCircle2} tone={colors.success} />
        <MetricCard label={copy.confirmedTotal} value={orders.isLoading ? '—' : total ? formatXaf(total, undefined, locale) : '0'} icon={CreditCard} tone={colors.primary} />
      </View>

      <View style={styles.payBlock}>
        <Text style={[styles.label, { color: palette.text }]}>{copy.paymentMethod}</Text>
        <View style={styles.providers}>
          {paymentProviders.map((option) => {
            const selected = provider === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setProvider(option)}
                style={[styles.provider, { borderColor: selected ? colors.brand : palette.border, backgroundColor: selected ? withAlpha(colors.brand, 0.12) : palette.surface }]}
              >
                <Text style={[styles.providerText, { color: selected ? colors.brandDark : palette.textSecondary }]}>{paymentProviderLabels[option]}</Text>
              </Pressable>
            );
          })}
        </View>

        {provider === 'fondoseg' ? (
          <TextInput
            accessibilityLabel={copy.phoneLabel}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+240 222 000 000"
            placeholderTextColor={palette.muted}
            style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
          />
        ) : null}

        {contracts.isLoading ? (
          <Text style={[styles.hint, { color: palette.textSecondary }]}>{copy.checkingContracts}</Text>
        ) : payableContract ? (
          <Text style={[styles.hint, { color: palette.textSecondary }]}>{interpolate(copy.chargeContract, { title: payableContract.propertyTitle })}</Text>
        ) : (
          <Text style={[styles.hint, { color: palette.textSecondary }]}>{copy.noPayableContract}</Text>
        )}

        <PremiumButton
          label={pay.isPending ? t('checking') : t('paySecure')}
          icon={CreditCard}
          loading={pay.isPending}
          disabled={!payableContract || missingPhone || pay.isPending}
          onPress={() => pay.mutate()}
        />
      </View>

      <SectionTitle title={copy.historyTitle} detail={copy.historyDetail} action={pending ? <StatusPill label={interpolate(copy.inProgress, { count: pending })} tone={colors.warning} icon={Clock} /> : undefined} />

      {orders.isLoading ? <PremiumEmptyState icon={Wallet} title={copy.loadingTitle} description={copy.loadingBody} loading /> : null}
      {orders.isError ? <PremiumErrorState title={copy.errorTitle} description={copy.errorBody} onRetry={() => void orders.refetch()} /> : null}
      {!orders.isLoading && !orders.isError && !orders.data?.length ? <PremiumEmptyState icon={Inbox} title={copy.emptyTitle} description={copy.emptyBody} /> : null}

      <View style={styles.list}>
        {orders.data?.map((order) => {
          const status = paymentStatus(order, copy);
          return (
            <View key={order.id} style={[styles.order, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <IconTile icon={CreditCard} tone={status.tone} size={46} />
              <View style={styles.orderCopy}>
                <Text selectable style={[styles.amount, { color: palette.text }]}>{formatXaf(order.amount, undefined, locale)}</Text>
                <Text style={[styles.provider_, { color: palette.textSecondary }]}>{order.provider.toUpperCase()} · #{order.id.slice(0, 8).toUpperCase()}</Text>
              </View>
              <StatusPill label={status.label} tone={status.tone} icon={status.icon} />
            </View>
          );
        })}
      </View>
      {pay.error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{pay.error.message}</Text> : null}
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
  amount: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  provider_: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  error: { fontSize: 13, lineHeight: 18 },
});
