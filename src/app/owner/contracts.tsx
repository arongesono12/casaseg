import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { CheckCircle2, ExternalLink, FileText, Inbox, Lock, ShieldCheck } from '@/components/ui/icons';
import { IconTile, PremiumButton, PremiumEmptyState, PremiumErrorState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { fetchContracts, openContractPdf, signContract, type LeaseContract } from '@/features/contracts/contracts.api';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatDate } from '@/utils/formatters';

const key = ['lease-contracts'] as const;

function contractStatus(contract: LeaseContract) {
  if (contract.status === 'signed') return { label: 'Firmado', tone: colors.success, icon: CheckCircle2 };
  if (contract.status === 'awaiting_signature') return { label: 'Firma pendiente', tone: colors.warning, icon: Lock };
  return { label: 'Borrador', tone: colors.muted, icon: FileText };
}

export default function Contracts() {
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const client = useQueryClient();
  const contracts = useQuery({ queryKey: key, queryFn: fetchContracts });
  const sign = useMutation({ mutationFn: (contract: LeaseContract) => signContract(contract.id, contract.version), onSuccess: () => client.invalidateQueries({ queryKey: key }) });
  const [openingContractId, setOpeningContractId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<Error | null>(null);
  const pendingCount = (contracts.data ?? []).filter((contract) => contract.status === 'awaiting_signature').length;
  const confirm = (contract: LeaseContract) => Alert.alert(t('confirm'), `${t('version', { count: String(contract.version) })} · La firma requerirá confirmación segura.`, [{ text: t('cancel'), style: 'cancel' }, { text: t('confirm'), onPress: () => sign.mutate(contract) }]);
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
    <RouteScreen title={t('contracts')} description={t('contractsSubtitle')}>
      <View style={[styles.security, { backgroundColor: `${colors.success}0E`, borderColor: `${colors.success}25` }]}>
        <IconTile icon={ShieldCheck} tone={colors.success} size={44} />
        <View style={styles.securityCopy}><Text style={[styles.securityTitle, { color: palette.text }]}>Documentos protegidos</Text><Text style={[styles.securityText, { color: palette.textSecondary }]}>Cada versión es inmutable y los PDF se abren mediante enlaces privados temporales.</Text></View>
      </View>
      <SectionTitle title="Tus contratos" detail="Versiones, firmas y documentos privados." action={pendingCount ? <StatusPill label={`${pendingCount} por firmar`} tone={colors.warning} icon={Lock} /> : undefined} />

      {contracts.isLoading ? <PremiumEmptyState icon={FileText} title="Cargando contratos" description="Estamos verificando las versiones disponibles." loading /> : null}
      {contracts.isError ? <PremiumErrorState title="No pudimos cargar los contratos" description="Comprueba la conexión y vuelve a intentarlo." onRetry={() => void contracts.refetch()} /> : null}
      {!contracts.isLoading && !contracts.isError && !contracts.data?.length ? <PremiumEmptyState icon={Inbox} title="Aún no tienes contratos" description="Los contratos vinculados a tus propiedades aparecerán aquí cuando estén listos." /> : null}

      <View style={styles.list}>
        {contracts.data?.map((contract) => {
          const status = contractStatus(contract);
          return (
            <View key={contract.id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.cardHeader}>
                <IconTile icon={FileText} tone={status.tone} size={48} />
                <View style={styles.copy}>
                  <Text style={[styles.title, { color: palette.text }]}>{contract.propertyTitle}</Text>
                  <View style={styles.badges}><StatusPill label={t('version', { count: String(contract.version) })} tone={colors.brand} /><StatusPill label={status.label} tone={status.tone} icon={status.icon} /></View>
                </View>
              </View>
              {contract.signedAt ? <Text selectable style={[styles.signedAt, { color: palette.textSecondary }]}>Firmado el {formatDate(contract.signedAt)}</Text> : null}
              <View style={styles.actions}>
                <PremiumButton variant="secondary" label={t('openPdf')} icon={ExternalLink} loading={openingContractId === contract.id} onPress={() => void handleOpenPdf(contract.id)} style={styles.action} />
                {contract.status === 'awaiting_signature' ? <PremiumButton label={t('signMfa')} icon={Lock} loading={sign.isPending && sign.variables?.id === contract.id} onPress={() => confirm(contract)} style={styles.action} /> : null}
              </View>
            </View>
          );
        })}
      </View>
      {sign.error || pdfError ? <Text accessibilityRole="alert" style={styles.error}>{(sign.error ?? pdfError)?.message}</Text> : null}
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  security: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  securityCopy: { flex: 1, gap: 3 },
  securityTitle: { fontSize: 14, fontWeight: '900' },
  securityText: { fontSize: 12, lineHeight: 17 },
  list: { gap: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 16, gap: 15, boxShadow: '0 10px 26px rgba(15,23,42,0.06)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, minWidth: 0, gap: 8 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '900' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  signedAt: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  action: { flex: 1, minWidth: 190 },
  error: { color: colors.error, fontSize: 13, lineHeight: 18 },
});
