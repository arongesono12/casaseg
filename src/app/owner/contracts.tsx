import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { StayReviewForm } from '@/components/contracts/stay-review-form';
import { RouteScreen } from '@/components/route-screen';
import { CheckCircle2, ExternalLink, FileText, Inbox, Lock } from '@/components/ui/icons';
import { HeroBadge, IconTile, PremiumButton, PremiumEmptyState, PremiumErrorState, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius } from '@/constants/theme';
import { useCurrentProfile } from '@/features/auth/use-current-profile';
import { useProfileId } from '@/features/auth/use-profile-id';
import { fetchReviewedContractIds, getReviewEligibility } from '@/features/compliance/compliance.api';
import { contractKeys, fetchContracts, openContractDocument, signContract, type LeaseContract } from '@/features/contracts/contracts.api';
import { needsSignatureFrom } from '@/features/contracts/lease-contract.model';
import { fetchPaymentOrders, paymentKeys } from '@/features/payments/payments.api';
import { useAuth } from '@/providers/auth-context';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatDate } from '@/utils/formatters';

const contractsCopy = defineCopy({
  es: { signed: 'Firmado', awaitingSignature: 'Firmas pendientes', partiallySigned: 'Firmado por una parte', cancelled: 'Cancelado', signConfirm: 'La firma requerirá confirmación segura.', toSign: '{count} por firmar', loadingTitle: 'Cargando contratos', loadingBody: 'Estamos verificando las versiones disponibles.', errorTitle: 'No pudimos cargar los contratos', errorBody: 'Comprueba la conexión y vuelve a intentarlo.', emptyTitle: 'Aún no tienes contratos', emptyBody: 'Los contratos vinculados a tus propiedades aparecerán aquí cuando estén listos.', signedOn: 'Firmado el {date}' },
  fr: { signed: 'Signé', awaitingSignature: 'Signatures en attente', partiallySigned: 'Signé par une partie', cancelled: 'Annulé', signConfirm: 'La signature nécessitera une confirmation sécurisée.', toSign: '{count} à signer', loadingTitle: 'Chargement des contrats', loadingBody: 'Nous vérifions les versions disponibles.', errorTitle: 'Impossible de charger les contrats', errorBody: 'Vérifiez la connexion et réessayez.', emptyTitle: 'Vous n’avez pas encore de contrat', emptyBody: 'Les contrats liés à vos logements apparaîtront ici dès qu’ils seront prêts.', signedOn: 'Signé le {date}' },
  en: { signed: 'Signed', awaitingSignature: 'Awaiting signatures', partiallySigned: 'Signed by one party', cancelled: 'Cancelled', signConfirm: 'Signing will require secure confirmation.', toSign: '{count} to sign', loadingTitle: 'Loading contracts', loadingBody: 'We are verifying the available versions.', errorTitle: 'We could not load the contracts', errorBody: 'Check your connection and try again.', emptyTitle: 'You have no contracts yet', emptyBody: 'Contracts linked to your properties will appear here once they are ready.', signedOn: 'Signed on {date}' },
});
const travelerCopy = defineCopy({ es: { label: 'Parte de viajeros' }, fr: { label: 'Déclaration des voyageurs' }, en: { label: 'Traveler report' } });
type ContractsCopy = (typeof contractsCopy)['es'];

function contractStatus(contract: LeaseContract, copy: ContractsCopy) {
  if (contract.status === 'signed') return { label: copy.signed, tone: colors.success, icon: CheckCircle2 };
  if (contract.status === 'partially_signed') return { label: copy.partiallySigned, tone: colors.warning, icon: Lock };
  if (contract.status === 'cancelled') return { label: copy.cancelled, tone: colors.muted, icon: FileText };
  return { label: copy.awaitingSignature, tone: colors.warning, icon: Lock };
}

export default function Contracts() {
  const { palette } = useAppTheme();
  const { locale, t } = useI18n();
  const copy = useCopy(contractsCopy);
  const travelerLabel = useCopy(travelerCopy).label;
  const client = useQueryClient();
  const { user, role } = useAuth();
  const profileId = useProfileId();
  const profile = useCurrentProfile();
  const contracts = useQuery({ queryKey: contractKeys.all, queryFn: fetchContracts });
  // Datos de la regla de reseñas de la web: contrato firmado, pagado y sin reseña previa.
  const orders = useQuery({ queryKey: paymentKeys.all, queryFn: fetchPaymentOrders });
  const reviewedKey = ['property-reviews', 'mine', profileId ?? 'none'] as const;
  const reviewed = useQuery({ queryKey: reviewedKey, queryFn: () => fetchReviewedContractIds(profileId!), enabled: Boolean(profileId) });
  const paidContractIds = new Set((orders.data ?? []).filter((order) => order.status === 'completed').map((order) => order.contractId));
  const canReview = (contract: LeaseContract) => Boolean(profileId && role && reviewed.data) && getReviewEligibility({
    viewer: { id: profileId!, role: role! },
    contract,
    paidContractIds,
    reviewedContractIds: reviewed.data ?? new Set(),
  }).canReview;
  const sign = useMutation({ mutationFn: (contract: LeaseContract) => signContract(contract.id, profile.data?.name ?? user?.name), onSuccess: () => client.invalidateQueries({ queryKey: contractKeys.all }) });
  const [openingContractId, setOpeningContractId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<Error | null>(null);
  const pendingCount = (contracts.data ?? []).filter((contract) => needsSignatureFrom(contract, profileId)).length;
  const confirm = (contract: LeaseContract) => Alert.alert(t('confirm'), `${t('version', { count: String(contract.templateVersion) })} · ${copy.signConfirm}`, [{ text: t('cancel'), style: 'cancel' }, { text: t('confirm'), onPress: () => sign.mutate(contract) }]);
  const handleOpenPdf = async (contract: LeaseContract) => {
    try {
      setPdfError(null);
      setOpeningContractId(contract.id);
      await openContractDocument(contract, profileId);
    } catch (error) {
      setPdfError(error instanceof Error ? error : new Error(t('connectionError')));
    } finally {
      setOpeningContractId(null);
    }
  };

  return (
    <RouteScreen
      title={t('contracts')}
      description={t('contractsSubtitle')}
      headerContent={pendingCount ? <HeroBadge label={interpolate(copy.toSign, { count: pendingCount })} icon={Lock} /> : undefined}
    >
      {contracts.isLoading ? <PremiumEmptyState icon={FileText} title={copy.loadingTitle} description={copy.loadingBody} loading /> : null}
      {contracts.isError ? <PremiumErrorState title={copy.errorTitle} description={copy.errorBody} onRetry={() => void contracts.refetch()} /> : null}
      {!contracts.isLoading && !contracts.isError && !contracts.data?.length ? <PremiumEmptyState icon={Inbox} title={copy.emptyTitle} description={copy.emptyBody} /> : null}

      <View style={styles.list}>
        {contracts.data?.map((contract) => {
          const status = contractStatus(contract, copy);
          return (
            <View key={contract.id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.cardHeader}>
                <IconTile icon={FileText} tone={status.tone} size={48} />
                <View style={styles.copy}>
                  <Text style={[styles.title, { color: palette.text }]}>{contract.propertyTitle}</Text>
                  <View style={styles.badges}><StatusPill label={t('version', { count: String(contract.templateVersion) })} tone={colors.brand} /><StatusPill label={status.label} tone={status.tone} icon={status.icon} /></View>
                </View>
              </View>
              {contract.signedAt ? <Text selectable style={[styles.signedAt, { color: palette.textSecondary }]}>{interpolate(copy.signedOn, { date: formatDate(contract.signedAt, locale) })}</Text> : null}
              <View style={styles.actions}>
                <PremiumButton variant="secondary" label={t('openPdf')} icon={ExternalLink} loading={openingContractId === contract.id} onPress={() => void handleOpenPdf(contract)} style={styles.action} />
                {needsSignatureFrom(contract, profileId) ? <PremiumButton label={t('signMfa')} icon={Lock} loading={sign.isPending && sign.variables?.id === contract.id} onPress={() => confirm(contract)} style={styles.action} /> : null}
                {role === 'owner' && profileId === contract.ownerId && contract.status === 'signed' ? <PremiumButton variant="secondary" label={travelerLabel} onPress={() => router.push({ pathname: '/owner/traveler-report/[contractId]', params: { contractId: contract.id } } as unknown as Href)} style={styles.action} /> : null}
              </View>
              {canReview(contract) ? <StayReviewForm contractId={contract.id} reviewQueryKey={reviewedKey} /> : null}
            </View>
          );
        })}
      </View>
      {sign.error || pdfError ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{(sign.error ?? pdfError)?.message}</Text> : null}
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 16, gap: 15, boxShadow: '0 10px 26px rgba(15,23,42,0.06)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, minWidth: 0, gap: 8 },
  title: { fontSize: 16, lineHeight: 21, fontFamily: fontFamily.bold },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  signedAt: { fontSize: 12, fontFamily: fontFamily.semibold },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  action: { flex: 1, minWidth: 190 },
  error: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
});
