import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { CheckCircle2, Clock, CreditCard, Inbox, Wallet, XCircle } from '@/components/ui/icons';
import { IconTile, MetricCard, PremiumButton, PremiumEmptyState, PremiumErrorState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius, touchTarget, withAlpha } from '@/constants/theme';
import { BankTransferProofForm } from '@/components/payments/bank-transfer-proof-form';
import { OwnerPayoutAccountCard } from '@/components/payments/owner-payout-account-card';
import { useProfileId } from '@/features/auth/use-profile-id';
import { useAuth } from '@/providers/auth-context';
import { contractKeys, fetchContracts } from '@/features/contracts/contracts.api';
import { fetchPaymentOrders, initiateRentalPayment, isOpenPaymentStatus, openPaymentCheckout, paymentKeys, paymentProviderLabels, paymentProviders, providerRequiresPhone, type PaymentOrder, type PaymentProvider } from '@/features/payments/payments.api';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatXaf } from '@/utils/formatters';

const paymentsCopy = defineCopy({
  es: { completed: 'Completado', failed: 'Fallido', cancelled: 'Cancelado', expired: 'Caducado', awaitingReview: 'En revisión', processing: 'Procesando', pending: 'Pendiente', acceptCharges: 'Acepto el desglose de cargos y la política de cancelación de esta vivienda.', noPayableContract: 'No hay ningún contrato firmado pendiente de pago.', operations: 'Operaciones', completedMetric: 'Completadas', confirmedTotal: 'Total confirmado', paymentMethod: 'Método de pago', phoneLabel: 'Número de teléfono para el cobro', checkingContracts: 'Comprobando contratos…', chargeContract: 'Se cobrará el contrato de {title}.', historyTitle: 'Historial de operaciones', historyDetail: 'Estados confirmados directamente por el proveedor.', inProgress: '{count} en curso', loadingTitle: 'Cargando operaciones', loadingBody: 'Estamos comprobando los estados más recientes.', errorTitle: 'No pudimos cargar los pagos', errorBody: 'Comprueba la conexión y vuelve a intentarlo.', emptyTitle: 'Sin operaciones todavía', emptyBody: 'Cuando realices o recibas un pago, su estado verificado aparecerá aquí.' },
  fr: { completed: 'Terminé', failed: 'Échoué', cancelled: 'Annulé', expired: 'Expiré', awaitingReview: 'En vérification', processing: 'En cours', pending: 'En attente', acceptCharges: 'J’accepte le détail des frais et la politique d’annulation de ce logement.', noPayableContract: 'Aucun contrat signé en attente de paiement.', operations: 'Opérations', completedMetric: 'Terminées', confirmedTotal: 'Total confirmé', paymentMethod: 'Moyen de paiement', phoneLabel: 'Numéro de téléphone pour le paiement', checkingContracts: 'Vérification des contrats…', chargeContract: 'Le contrat de {title} sera facturé.', historyTitle: 'Historique des opérations', historyDetail: 'Statuts confirmés directement par le prestataire.', inProgress: '{count} en cours', loadingTitle: 'Chargement des opérations', loadingBody: 'Nous vérifions les statuts les plus récents.', errorTitle: 'Impossible de charger les paiements', errorBody: 'Vérifiez la connexion et réessayez.', emptyTitle: 'Aucune opération pour le moment', emptyBody: 'Lorsque vous effectuez ou recevez un paiement, son statut vérifié apparaîtra ici.' },
  en: { completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled', expired: 'Expired', awaitingReview: 'Under review', processing: 'Processing', pending: 'Pending', acceptCharges: 'I accept the charges breakdown and the cancellation policy for this home.', noPayableContract: 'There is no signed contract awaiting payment.', operations: 'Transactions', completedMetric: 'Completed', confirmedTotal: 'Confirmed total', paymentMethod: 'Payment method', phoneLabel: 'Phone number for the payment', checkingContracts: 'Checking contracts…', chargeContract: 'The contract for {title} will be charged.', historyTitle: 'Transaction history', historyDetail: 'Statuses confirmed directly by the provider.', inProgress: '{count} in progress', loadingTitle: 'Loading transactions', loadingBody: 'We are checking the latest statuses.', errorTitle: 'We could not load the payments', errorBody: 'Check your connection and try again.', emptyTitle: 'No transactions yet', emptyBody: 'When you make or receive a payment, its verified status will appear here.' },
});
type PaymentsCopy = (typeof paymentsCopy)['es'];

function paymentStatus(order: PaymentOrder, copy: PaymentsCopy) {
  if (order.status === 'completed') return { label: copy.completed, tone: colors.success, icon: CheckCircle2 };
  if (order.status === 'failed') return { label: copy.failed, tone: colors.error, icon: XCircle };
  if (order.status === 'cancelled' || order.status === 'expired') return { label: order.status === 'expired' ? copy.expired : copy.cancelled, tone: colors.muted, icon: XCircle };
  if (order.status === 'awaiting_review') return { label: copy.awaitingReview, tone: colors.warning, icon: Clock };
  return { label: order.status === 'processing' ? copy.processing : copy.pending, tone: colors.warning, icon: Clock };
}

export default function Payments() {
  const { palette } = useAppTheme();
  const { locale, t } = useI18n();
  const copy = useCopy(paymentsCopy);
  const client = useQueryClient();
  const profileId = useProfileId();
  const { role } = useAuth();
  const [provider, setProvider] = useState<PaymentProvider>('fondoseg');
  const [phone, setPhone] = useState('');
  const [chargesAccepted, setChargesAccepted] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const orders = useQuery({ queryKey: paymentKeys.all, queryFn: fetchPaymentOrders, refetchInterval: (query) => query.state.data?.some((order) => isOpenPaymentStatus(order.status)) ? 5000 : false });
  const contracts = useQuery({ queryKey: contractKeys.all, queryFn: fetchContracts });

  // create_rental_payment_order solo admite al arrendatario de un contrato
  // firmado por las dos partes.
  const payableContract = contracts.data?.find((contract) => contract.status === 'signed' && contract.clientId === profileId);

  const pay = useMutation({
    mutationFn: async () => {
      if (!payableContract) throw new Error(copy.noPayableContract);
      const result = await initiateRentalPayment({ contractId: payableContract.id, provider, phoneNumber: phone, chargesAccepted, cancellationPolicyAccepted: chargesAccepted });
      setResultMessage(result.message);
      return openPaymentCheckout(result);
    },
    onMutate: () => setResultMessage(null),
    onSettled: () => client.invalidateQueries({ queryKey: paymentKeys.all }),
  });

  const completed = (orders.data ?? []).filter((order) => order.status === 'completed');
  const total = completed.reduce((sum, order) => sum + order.amount, 0);
  const pending = (orders.data ?? []).filter((order) => isOpenPaymentStatus(order.status)).length;
  const missingPhone = providerRequiresPhone(provider) && !phone.trim();

  return (
    <RouteScreen title={t('payments')} description={t('paymentsSubtitle')}>
      <View style={styles.metrics}>
        <MetricCard label={copy.operations} value={orders.isLoading ? '—' : orders.data?.length ?? 0} icon={Wallet} />
        <MetricCard label={copy.completedMetric} value={orders.isLoading ? '—' : completed.length} icon={CheckCircle2} tone={colors.success} />
        <MetricCard label={copy.confirmedTotal} value={orders.isLoading ? '—' : total ? formatXaf(total, undefined, locale) : '0'} icon={CreditCard} tone={colors.primary} />
      </View>

      {role === 'owner' && profileId ? <OwnerPayoutAccountCard ownerId={profileId} /> : null}

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

        {providerRequiresPhone(provider) ? (
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

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: chargesAccepted }}
          onPress={() => setChargesAccepted((value) => !value)}
          style={styles.consent}
        >
          {chargesAccepted ? <CheckCircle2 color={colors.success} size={20} /> : <View style={[styles.checkbox, { borderColor: palette.border }]} />}
          <Text style={[styles.hint, styles.consentText, { color: palette.textSecondary }]}>{copy.acceptCharges}</Text>
        </Pressable>

        <PremiumButton
          label={pay.isPending ? t('checking') : t('paySecure')}
          icon={CreditCard}
          loading={pay.isPending}
          disabled={!payableContract || missingPhone || !chargesAccepted || pay.isPending}
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
          const card = (
            <View key={order.id} style={[styles.order, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <IconTile icon={CreditCard} tone={status.tone} size={46} />
              <View style={styles.orderCopy}>
                <Text selectable style={[styles.amount, { color: palette.text }]}>{formatXaf(order.amount, undefined, locale)}</Text>
                <Text style={[styles.provider_, { color: palette.textSecondary }]}>{order.provider.toUpperCase()} · #{order.id.slice(0, 8).toUpperCase()}</Text>
              </View>
              <StatusPill label={status.label} tone={status.tone} icon={status.icon} />
            </View>
          );
          // El arrendatario completa aquí una transferencia pendiente subiendo el comprobante.
          const needsProof = order.provider === 'bank_transfer' && order.status === 'pending' && profileId && order.tenantId === profileId;
          return needsProof ? <View key={order.id} style={styles.orderWithProof}>{card}<BankTransferProofForm order={order} tenantId={profileId} /></View> : card;
        })}
      </View>
      {resultMessage && !pay.error ? <Text accessibilityRole="alert" style={[styles.hint, { color: palette.textSecondary }]}>{resultMessage}</Text> : null}
      {pay.error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{pay.error.message}</Text> : null}
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  payBlock: { gap: 10 },
  label: { fontSize: 13, fontFamily: fontFamily.extrabold },
  providers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  provider: { minHeight: 44, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, justifyContent: 'center' },
  providerText: { fontSize: 13, fontFamily: fontFamily.bold },
  input: { fontFamily: fontFamily.regular, minHeight: touchTarget, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 14, fontSize: 16 },
  hint: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  consent: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 10 },
  consentText: { flex: 1 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5 },
  list: { gap: 10 },
  orderWithProof: { gap: 8 },
  order: { minHeight: 86, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  orderCopy: { flex: 1, minWidth: 0, gap: 4 },
  amount: { fontSize: 17, fontFamily: fontFamily.bold, fontVariant: ['tabular-nums'] },
  provider_: { fontSize: 11, fontFamily: fontFamily.bold, letterSpacing: 0.3 },
  error: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
});
