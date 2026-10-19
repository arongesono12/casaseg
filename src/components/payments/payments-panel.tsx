import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { Alert, AppState, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { AlertCircle, CheckCircle2, Clock, CreditCard, ExternalLink, Inbox, Wallet, XCircle } from '@/components/ui/icons';
import { IconTile, MetricCard, PremiumButton, PremiumEmptyState, PremiumErrorState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius, touchTarget, withAlpha } from '@/constants/theme';
import { BankTransferProofForm } from '@/components/payments/bank-transfer-proof-form';
import { OwnerEcobankAccountCard, OwnerPayoutAccountCard } from '@/components/payments/owner-payout-account-card';
import { useProfileId } from '@/features/auth/use-profile-id';
import { generateTaxReportExport } from '@/features/compliance/compliance.api';
import { useAuth } from '@/providers/auth-context';
import { contractKeys, fetchContracts } from '@/features/contracts/contracts.api';
import {
  cancelRentalPayment,
  canTenantCancelPayment,
  confirmPaymentAfterReturn,
  fetchPaymentOrders,
  initiateRentalPayment,
  isOpenPaymentStatus,
  openPaymentCheckout,
  paymentKeys,
  paymentProviderLabels,
  paymentProviders,
  paymentReturnOutcome,
  providerRequiresPhone,
  showsInsufficientFunds,
  type PaymentConfirmation,
  type PaymentOrder,
  type PaymentProvider,
} from '@/features/payments/payments.api';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatXaf } from '@/utils/formatters';

// Los textos de anulación, retorno y saldo insuficiente son los de la web (rentalPayments.*).
const paymentsCopy = defineCopy({
  es: { completed: 'Completado', failed: 'Fallido', cancelled: 'Cancelado', expired: 'Caducado', awaitingReview: 'En revisión', processing: 'Procesando', pending: 'Pendiente', acceptCharges: 'Acepto el desglose de cargos y la política de cancelación de esta vivienda.', noPayableContract: 'No hay ningún contrato firmado pendiente de pago.', operations: 'Operaciones', completedMetric: 'Completadas', confirmedTotal: 'Total confirmado', paymentMethod: 'Método de pago', phoneLabel: 'Número de teléfono para el cobro', checkingContracts: 'Comprobando contratos…', chargeContract: 'Se cobrará el contrato de {title}.', historyTitle: 'Historial de operaciones', historyDetail: 'Estados confirmados directamente por el proveedor.', inProgress: '{count} en curso', loadingTitle: 'Cargando operaciones', loadingBody: 'Estamos comprobando los estados más recientes.', errorTitle: 'No pudimos cargar los pagos', errorBody: 'Comprueba la conexión y vuelve a intentarlo.', emptyTitle: 'Sin operaciones todavía', emptyBody: 'Cuando realices o recibas un pago, su estado verificado aparecerá aquí.', continuePayment: 'Continuar pago', cancelPayment: 'Anular pago', cancelling: 'Anulando…', confirmCancelTitle: '¿Anular este pago?', confirmCancelMessage: 'El proveedor dejará de aceptar este cobro y no se te cargará nada. Podrás iniciar un pago nuevo cuando quieras.', keepPayment: 'Mantener pago', cancelSuccess: 'Pago anulado.', returnConfirming: 'Confirmando tu pago con el proveedor…', returnConfirmed: 'Pago confirmado. Tu alquiler ya consta como pagado.', returnPending: 'Tu pago se está procesando. Se actualizará en cuanto el proveedor lo confirme.', returnCancelled: 'El pago no se completó. No se ha cobrado nada; puedes intentarlo de nuevo.', insufficientFundsTenant: 'El proveedor de pago no pudo cobrar: tu cuenta no tiene saldo suficiente. Recarga y pulsa «Continuar pago», o anula el pago.', insufficientFundsOwner: 'El proveedor de pago informa de que el inquilino no tenía saldo suficiente. El pago sigue pendiente.', cancelledByTenant: 'Anulado por el inquilino', declinedByPayer: 'Rechazado en el proveedor' },
  fr: { completed: 'Terminé', failed: 'Échoué', cancelled: 'Annulé', expired: 'Expiré', awaitingReview: 'En vérification', processing: 'En cours', pending: 'En attente', acceptCharges: 'J’accepte le détail des frais et la politique d’annulation de ce logement.', noPayableContract: 'Aucun contrat signé en attente de paiement.', operations: 'Opérations', completedMetric: 'Terminées', confirmedTotal: 'Total confirmé', paymentMethod: 'Moyen de paiement', phoneLabel: 'Numéro de téléphone pour le paiement', checkingContracts: 'Vérification des contrats…', chargeContract: 'Le contrat de {title} sera facturé.', historyTitle: 'Historique des opérations', historyDetail: 'Statuts confirmés directement par le prestataire.', inProgress: '{count} en cours', loadingTitle: 'Chargement des opérations', loadingBody: 'Nous vérifions les statuts les plus récents.', errorTitle: 'Impossible de charger les paiements', errorBody: 'Vérifiez la connexion et réessayez.', emptyTitle: 'Aucune opération pour le moment', emptyBody: 'Lorsque vous effectuez ou recevez un paiement, son statut vérifié apparaîtra ici.', continuePayment: 'Continuer le paiement', cancelPayment: 'Annuler le paiement', cancelling: 'Annulation…', confirmCancelTitle: 'Annuler ce paiement ?', confirmCancelMessage: 'Le prestataire n’acceptera plus ce débit et rien ne vous sera prélevé. Vous pourrez lancer un nouveau paiement à tout moment.', keepPayment: 'Conserver le paiement', cancelSuccess: 'Paiement annulé.', returnConfirming: 'Confirmation de votre paiement auprès du prestataire…', returnConfirmed: 'Paiement confirmé. Votre loyer est désormais marqué comme payé.', returnPending: 'Votre paiement est en cours de traitement. Il sera mis à jour dès que le prestataire le confirmera.', returnCancelled: 'Le paiement n’a pas abouti. Rien n’a été débité ; vous pouvez réessayer.', insufficientFundsTenant: 'Le prestataire de paiement n’a pas pu vous débiter : solde insuffisant. Rechargez puis appuyez sur « Continuer le paiement », ou annulez le paiement.', insufficientFundsOwner: 'Le prestataire de paiement indique que le locataire n’avait pas un solde suffisant. Le paiement reste en attente.', cancelledByTenant: 'Annulé par le locataire', declinedByPayer: 'Refusé chez le prestataire' },
  en: { completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled', expired: 'Expired', awaitingReview: 'Under review', processing: 'Processing', pending: 'Pending', acceptCharges: 'I accept the charges breakdown and the cancellation policy for this home.', noPayableContract: 'There is no signed contract awaiting payment.', operations: 'Transactions', completedMetric: 'Completed', confirmedTotal: 'Confirmed total', paymentMethod: 'Payment method', phoneLabel: 'Phone number for the payment', checkingContracts: 'Checking contracts…', chargeContract: 'The contract for {title} will be charged.', historyTitle: 'Transaction history', historyDetail: 'Statuses confirmed directly by the provider.', inProgress: '{count} in progress', loadingTitle: 'Loading transactions', loadingBody: 'We are checking the latest statuses.', errorTitle: 'We could not load the payments', errorBody: 'Check your connection and try again.', emptyTitle: 'No transactions yet', emptyBody: 'When you make or receive a payment, its verified status will appear here.', continuePayment: 'Continue payment', cancelPayment: 'Cancel payment', cancelling: 'Cancelling…', confirmCancelTitle: 'Cancel this payment?', confirmCancelMessage: 'The provider will stop accepting this charge and you will not be charged. You can start a new payment at any time.', keepPayment: 'Keep payment', cancelSuccess: 'Payment cancelled.', returnConfirming: 'Confirming your payment with the provider…', returnConfirmed: 'Payment confirmed. Your rent is now marked as paid.', returnPending: 'Your payment is being processed. It will update as soon as the provider confirms it.', returnCancelled: 'The payment was not completed. Nothing was charged; you can try again.', insufficientFundsTenant: 'The payment provider could not charge you: your account has insufficient funds. Top up and press "Continue payment", or cancel the payment.', insufficientFundsOwner: 'The payment provider reports that the tenant had insufficient funds. The payment is still pending.', cancelledByTenant: 'Cancelled by the tenant', declinedByPayer: 'Declined at the provider' },
});
type PaymentsCopy = (typeof paymentsCopy)['es'];
const taxCopy = defineCopy({ es: { export: 'Exportar informe fiscal CSV', error: 'No se pudo generar el informe fiscal.' }, fr: { export: 'Exporter le rapport fiscal CSV', error: 'Impossible de générer le rapport fiscal.' }, en: { export: 'Export tax report CSV', error: 'Could not generate the tax report.' } });

/** Máximo de órdenes que se confirman al volver a primer plano (cada una consulta al proveedor). */
const MAX_CONFIRMATIONS_ON_FOREGROUND = 3;

type NoticeTone = 'info' | 'success' | 'warning';
type Notice = { tone: NoticeTone; text: string };
const noticeStyle = {
  info: { tone: colors.brand, icon: Clock },
  success: { tone: colors.success, icon: CheckCircle2 },
  warning: { tone: colors.warning, icon: AlertCircle },
} as const;

function paymentStatus(order: PaymentOrder, copy: PaymentsCopy) {
  if (order.status === 'completed') return { label: copy.completed, tone: colors.success, icon: CheckCircle2 };
  if (order.status === 'failed') return { label: copy.failed, tone: colors.error, icon: XCircle };
  if (order.status === 'cancelled') {
    const label = order.failureReason === 'cancelled_by_tenant' ? copy.cancelledByTenant : order.failureReason === 'declined_by_payer' ? copy.declinedByPayer : copy.cancelled;
    return { label, tone: colors.muted, icon: XCircle };
  }
  if (order.status === 'expired') return { label: copy.expired, tone: colors.muted, icon: XCircle };
  if (order.status === 'awaiting_review') return { label: copy.awaitingReview, tone: colors.warning, icon: Clock };
  return { label: order.status === 'processing' ? copy.processing : copy.pending, tone: colors.warning, icon: Clock };
}

function returnNotice(confirmation: PaymentConfirmation, copy: PaymentsCopy): Notice {
  const outcome = paymentReturnOutcome({ confirmed: confirmation.confirmed, status: confirmation.order.status });
  if (outcome === 'confirmed') return { tone: 'success', text: copy.returnConfirmed };
  if (outcome === 'notCompleted') return { tone: 'warning', text: copy.returnCancelled };
  return { tone: 'info', text: copy.returnPending };
}

/** Pagos del usuario: la pantalla de pagos y la pestaña del perfil muestran lo mismo. */
export function PaymentsPanel() {
  const { palette } = useAppTheme();
  const { locale, t } = useI18n();
  const copy = useCopy(paymentsCopy);
  const tax = useCopy(taxCopy);
  const client = useQueryClient();
  const profileId = useProfileId();
  const { role } = useAuth();
  const [provider, setProvider] = useState<PaymentProvider>('fondoseg');
  const [phone, setPhone] = useState('');
  const [chargesAccepted, setChargesAccepted] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const paymentAttemptKey = useRef<string | null>(null);
  const checkoutOpen = useRef(false);

  const orders = useQuery({ queryKey: paymentKeys.all, queryFn: fetchPaymentOrders, refetchInterval: (query) => query.state.data?.some((order) => isOpenPaymentStatus(order.status)) ? 5000 : false });
  const contracts = useQuery({ queryKey: contractKeys.all, queryFn: fetchContracts });
  const refreshOrders = () => client.invalidateQueries({ queryKey: paymentKeys.all });

  // create_rental_payment_order solo admite al arrendatario de un contrato
  // firmado por las dos partes.
  const payableContract = contracts.data?.find((contract) => contract.status === 'signed' && contract.clientId === profileId);

  /** Abre el proveedor y, al volver, muestra lo que el servidor confirma (mismos avisos que la web). */
  const checkout = async (order: PaymentOrder) => {
    checkoutOpen.current = true;
    setNotice({ tone: 'info', text: copy.returnConfirming });
    try {
      setNotice(returnNotice(await openPaymentCheckout(order), copy));
    } finally {
      checkoutOpen.current = false;
    }
  };

  const pay = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!payableContract) throw new Error(copy.noPayableContract);
      paymentAttemptKey.current ??= Crypto.randomUUID();
      const result = await initiateRentalPayment({ contractId: payableContract.id, provider, phoneNumber: phone, chargesAccepted, cancellationPolicyAccepted: chargesAccepted, idempotencyKey: paymentAttemptKey.current });
      if (result.requiresRedirect) await checkout(result.order);
      else setNotice({ tone: 'info', text: result.message });
    },
    onMutate: () => setNotice(null),
    onSuccess: () => { paymentAttemptKey.current = null; },
    onSettled: refreshOrders,
  });
  const resume = useMutation({ retry: false, mutationFn: checkout, onSettled: refreshOrders });
  const cancel = useMutation({
    retry: false,
    mutationFn: (orderId: string) => cancelRentalPayment(orderId),
    onSuccess: () => setNotice({ tone: 'success', text: copy.cancelSuccess }),
    onError: (error) => setNotice({ tone: 'warning', text: error.message }),
    onSettled: refreshOrders,
  });
  const confirmCancel = (order: PaymentOrder) => Alert.alert(copy.confirmCancelTitle, copy.confirmCancelMessage, [
    { text: copy.keepPayment, style: 'cancel' },
    { text: copy.cancelPayment, style: 'destructive', onPress: () => cancel.mutate(order.id) },
  ]);

  // Si el inquilino paga en la app del proveedor y vuelve sin pasar por el
  // navegador, se confirma al volver a primer plano (idempotente con el webhook).
  const latestOrders = useRef<PaymentOrder[]>([]);
  useEffect(() => { latestOrders.current = orders.data ?? []; }, [orders.data]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !profileId || checkoutOpen.current) return;
      const pendingCheckouts = latestOrders.current
        .filter((order) => order.checkoutUrl && canTenantCancelPayment(order, profileId))
        .slice(0, MAX_CONFIRMATIONS_ON_FOREGROUND);
      if (!pendingCheckouts.length) return;
      void Promise.allSettled(pendingCheckouts.map((order) => confirmPaymentAfterReturn(order.id)))
        .then(() => client.invalidateQueries({ queryKey: paymentKeys.all }));
    });
    return () => subscription.remove();
  }, [profileId, client]);

  const exportTax = useMutation({
    retry: false,
    mutationFn: async () => {
      const csv = await generateTaxReportExport(new Date().getFullYear());
      await Share.share({ title: `CasasEG-ingresos-${new Date().getFullYear()}.csv`, message: csv });
    },
  });

  const completed = (orders.data ?? []).filter((order) => order.status === 'completed');
  const total = completed.reduce((sum, order) => sum + order.amount, 0);
  const pending = (orders.data ?? []).filter((order) => isOpenPaymentStatus(order.status)).length;
  const missingPhone = providerRequiresPhone(provider) && !phone.trim();
  const busy = pay.isPending || resume.isPending;
  const noticeLook = notice ? noticeStyle[notice.tone] : null;

  return (
    <View style={styles.panel}>
      <View style={styles.metrics}>
        <MetricCard label={copy.operations} value={orders.isLoading ? '—' : orders.data?.length ?? 0} icon={Wallet} />
        <MetricCard label={copy.completedMetric} value={orders.isLoading ? '—' : completed.length} icon={CheckCircle2} tone={colors.success} />
        <MetricCard label={copy.confirmedTotal} value={orders.isLoading ? '—' : total ? formatXaf(total, undefined, locale) : '0'} icon={CreditCard} tone={colors.primary} />
      </View>

      {notice && noticeLook ? (
        <View accessibilityRole={notice.tone === 'warning' ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: withAlpha(noticeLook.tone, 0.1), borderColor: withAlpha(noticeLook.tone, 0.3) }]}>
          <noticeLook.icon color={noticeLook.tone} size={18} />
          <Text style={[styles.noticeText, { color: palette.text }]}>{notice.text}</Text>
        </View>
      ) : null}

      {role === 'owner' && profileId ? <OwnerPayoutAccountCard ownerId={profileId} /> : null}
      {role === 'owner' && profileId ? <OwnerEcobankAccountCard ownerId={profileId} /> : null}
      {role === 'owner' && profileId ? <View style={styles.payBlock}><PremiumButton variant="secondary" label={tax.export} loading={exportTax.isPending} disabled={exportTax.isPending} onPress={() => exportTax.mutate()} />{exportTax.error ? <Text accessibilityRole="alert" style={[styles.hint, { color: palette.errorText }]}>{tax.error} {exportTax.error.message}</Text> : null}</View> : null}

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
          disabled={!payableContract || missingPhone || !chargesAccepted || busy}
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
          const isTenant = Boolean(profileId) && order.tenantId === profileId;
          const tenantCanCancel = canTenantCancelPayment(order, profileId);
          const cancelling = cancel.isPending && cancel.variables === order.id;
          // El arrendatario completa aquí una transferencia pendiente subiendo el comprobante.
          const needsProof = order.provider === 'bank_transfer' && order.status === 'pending' && isTenant;
          return (
            <View key={order.id} style={styles.orderWithProof}>
              <View style={[styles.order, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <IconTile icon={CreditCard} tone={status.tone} size={46} />
                <View style={styles.orderCopy}>
                  <Text selectable style={[styles.amount, { color: palette.text }]}>{formatXaf(order.totalDue, undefined, locale)}</Text>
                  <Text style={[styles.provider_, { color: palette.textSecondary }]}>{order.provider.toUpperCase()} · #{order.id.slice(0, 8).toUpperCase()}</Text>
                </View>
                <StatusPill label={status.label} tone={status.tone} icon={status.icon} />
              </View>
              {showsInsufficientFunds(order) ? (
                <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: withAlpha(colors.error, 0.08), borderColor: withAlpha(colors.error, 0.28) }]}>
                  <AlertCircle color={colors.error} size={18} />
                  <Text style={[styles.noticeText, { color: palette.text }]}>{isTenant ? copy.insufficientFundsTenant : copy.insufficientFundsOwner}</Text>
                </View>
              ) : null}
              {tenantCanCancel ? (
                <View style={styles.orderActions}>
                  {order.checkoutUrl ? <PremiumButton variant="secondary" label={copy.continuePayment} icon={ExternalLink} loading={resume.isPending && resume.variables?.id === order.id} disabled={busy || cancelling} onPress={() => resume.mutate(order)} style={styles.orderAction} /> : null}
                  <PremiumButton variant="danger" label={cancelling ? copy.cancelling : copy.cancelPayment} icon={XCircle} loading={cancelling} disabled={busy || cancelling} onPress={() => confirmCancel(order)} style={styles.orderAction} />
                </View>
              ) : null}
              {needsProof && profileId ? <BankTransferProofForm order={order} tenantId={profileId} /> : null}
            </View>
          );
        })}
      </View>
      {pay.error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{pay.error.message}</Text> : null}
      {resume.error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{resume.error.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 24 },
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
  notice: { borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous', padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noticeText: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 13, lineHeight: 19 },
  list: { gap: 10 },
  orderWithProof: { gap: 8 },
  order: { minHeight: 86, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  orderCopy: { flex: 1, minWidth: 0, gap: 4 },
  orderActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  orderAction: { flexGrow: 1, flexBasis: 150 },
  amount: { fontSize: 17, fontFamily: fontFamily.bold, fontVariant: ['tabular-nums'] },
  provider_: { fontSize: 11, fontFamily: fontFamily.bold, letterSpacing: 0.3 },
  error: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
});
