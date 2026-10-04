import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { CheckCircle2, ExternalLink, FileText, Inbox, Lock } from '@/components/ui/icons';
import { HeroBadge, IconTile, PremiumButton, PremiumEmptyState, PremiumErrorState, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius } from '@/constants/theme';
import { fetchContracts, openContractPdf, signContract, type LeaseContract } from '@/features/contracts/contracts.api';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatDate } from '@/utils/formatters';

const key = ['lease-contracts'] as const;

const contractsCopy = defineCopy({
  es: { signed: 'Firmado', awaitingSignature: 'Firma pendiente', draft: 'Borrador', signConfirm: 'La firma requerirá confirmación segura.', toSign: '{count} por firmar', loadingTitle: 'Cargando contratos', loadingBody: 'Estamos verificando las versiones disponibles.', errorTitle: 'No pudimos cargar los contratos', errorBody: 'Comprueba la conexión y vuelve a intentarlo.', emptyTitle: 'Aún no tienes contratos', emptyBody: 'Los contratos vinculados a tus propiedades aparecerán aquí cuando estén listos.', signedOn: 'Firmado el {date}' },
  fr: { signed: 'Signé', awaitingSignature: 'Signature en attente', draft: 'Brouillon', signConfirm: 'La signature nécessitera une confirmation sécurisée.', toSign: '{count} à signer', loadingTitle: 'Chargement des contrats', loadingBody: 'Nous vérifions les versions disponibles.', errorTitle: 'Impossible de charger les contrats', errorBody: 'Vérifiez la connexion et réessayez.', emptyTitle: 'Vous n’avez pas encore de contrat', emptyBody: 'Les contrats liés à vos logements apparaîtront ici dès qu’ils seront prêts.', signedOn: 'Signé le {date}' },
  en: { signed: 'Signed', awaitingSignature: 'Awaiting signature', draft: 'Draft', signConfirm: 'Signing will require secure confirmation.', toSign: '{count} to sign', loadingTitle: 'Loading contracts', loadingBody: 'We are verifying the available versions.', errorTitle: 'We could not load the contracts', errorBody: 'Check your connection and try again.', emptyTitle: 'You have no contracts yet', emptyBody: 'Contracts linked to your properties will appear here once they are ready.', signedOn: 'Signed on {date}' },
});
type ContractsCopy = (typeof contractsCopy)['es'];

function contractStatus(contract: LeaseContract, copy: ContractsCopy) {
  if (contract.status === 'signed') return { label: copy.signed, tone: colors.success, icon: CheckCircle2 };
  if (contract.status === 'awaiting_signature') return { label: copy.awaitingSignature, tone: colors.warning, icon: Lock };
  return { label: copy.draft, tone: colors.muted, icon: FileText };
}

export default function Contracts() {
  const { palette } = useAppTheme();
  const { locale, t } = useI18n();
  const copy = useCopy(contractsCopy);
  const client = useQueryClient();
  const contracts = useQuery({ queryKey: key, queryFn: fetchContracts });
  const sign = useMutation({ mutationFn: (contract: LeaseContract) => signContract(contract.id, contract.version), onSuccess: () => client.invalidateQueries({ queryKey: key }) });
  const [openingContractId, setOpeningContractId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<Error | null>(null);
  const pendingCount = (contracts.data ?? []).filter((contract) => contract.status === 'awaiting_signature').length;
  const confirm = (contract: LeaseContract) => Alert.alert(t('confirm'), `${t('version', { count: String(contract.version) })} · ${copy.signConfirm}`, [{ text: t('cancel'), style: 'cancel' }, { text: t('confirm'), onPress: () => sign.mutate(contract) }]);
  const handleOpenPdf = async (contractId: string) => {
    try {
      setPdfError(null);
      setOpeningContractId(contractId);
      await openContractPdf(contractId);
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
                  <View style={styles.badges}><StatusPill label={t('version', { count: String(contract.version) })} tone={colors.brand} /><StatusPill label={status.label} tone={status.tone} icon={status.icon} /></View>
                </View>
              </View>
              {contract.signedAt ? <Text selectable style={[styles.signedAt, { color: palette.textSecondary }]}>{interpolate(copy.signedOn, { date: formatDate(contract.signedAt, locale) })}</Text> : null}
              <View style={styles.actions}>
                <PremiumButton variant="secondary" label={t('openPdf')} icon={ExternalLink} loading={openingContractId === contract.id} onPress={() => void handleOpenPdf(contract.id)} style={styles.action} />
                {contract.status === 'awaiting_signature' ? <PremiumButton label={t('signMfa')} icon={Lock} loading={sign.isPending && sign.variables?.id === contract.id} onPress={() => confirm(contract)} style={styles.action} /> : null}
              </View>
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
