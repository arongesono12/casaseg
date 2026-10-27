import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { AlertCircle, CheckCircle2, XCircle } from '@/components/ui/icons';
import { PremiumButton } from '@/components/ui/premium';
import { colors, fontFamily, radius, withAlpha } from '@/constants/theme';
import {
  contractKeys,
  requestContractCancellation,
  respondContractCancellation,
  withdrawContractCancellation,
  type LeaseContract,
  type LeaseContractCancellationRequest,
} from '@/features/contracts/contracts.api';
import { canRequestCancellation, cancellationReasonError, CANCELLATION_REASON_MAX_LENGTH, contractPartyOf } from '@/features/contracts/lease-contract.model';
import { paymentKeys } from '@/features/payments/payments.api';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatDate } from '@/utils/formatters';

// Mismo flujo que la web: una parte pide anular, la otra acepta o rechaza.
const cancellationCopy = defineCopy({
  es: { request: 'Anular contrato', reasonLabel: 'Motivo de la anulación', reasonHint: 'La otra parte lo verá y tendrá que aceptar la anulación.', send: 'Enviar solicitud', close: 'Cerrar', byMe: 'Pediste anular este contrato el {date}. Esperando la respuesta de la otra parte.', byOwner: 'El arrendador pide anular este contrato.', byClient: 'El arrendatario pide anular este contrato.', reason: 'Motivo: {reason}', accept: 'Aceptar anulación', reject: 'Rechazar', withdraw: 'Retirar solicitud', acceptTitle: 'Anular contrato', acceptBody: 'El contrato quedará anulado para ambas partes. No se puede deshacer.', noteLabel: 'Nota para la otra parte (opcional)' },
  fr: { request: 'Annuler le contrat', reasonLabel: 'Motif de l’annulation', reasonHint: 'L’autre partie le verra et devra accepter l’annulation.', send: 'Envoyer la demande', close: 'Fermer', byMe: 'Vous avez demandé l’annulation le {date}. En attente de la réponse de l’autre partie.', byOwner: 'Le bailleur demande l’annulation de ce contrat.', byClient: 'Le locataire demande l’annulation de ce contrat.', reason: 'Motif : {reason}', accept: 'Accepter l’annulation', reject: 'Refuser', withdraw: 'Retirer la demande', acceptTitle: 'Annuler le contrat', acceptBody: 'Le contrat sera annulé pour les deux parties. Action irréversible.', noteLabel: 'Note pour l’autre partie (facultatif)' },
  en: { request: 'Cancel contract', reasonLabel: 'Reason for cancelling', reasonHint: 'The other party will see it and must accept the cancellation.', send: 'Send request', close: 'Close', byMe: 'You asked to cancel this contract on {date}. Waiting for the other party.', byOwner: 'The landlord asks to cancel this contract.', byClient: 'The tenant asks to cancel this contract.', reason: 'Reason: {reason}', accept: 'Accept cancellation', reject: 'Reject', withdraw: 'Withdraw request', acceptTitle: 'Cancel contract', acceptBody: 'The contract will be cancelled for both parties. This cannot be undone.', noteLabel: 'Note for the other party (optional)' },
});

type Props = { contract: LeaseContract; request?: LeaseContractCancellationRequest; profileId?: string };

export function ContractCancellation({ contract, request, profileId }: Props) {
  const { palette } = useAppTheme();
  const { locale, t } = useI18n();
  const copy = useCopy(cancellationCopy);
  const client = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: contractKeys.all }),
    client.invalidateQueries({ queryKey: paymentKeys.all }),
  ]);

  const send = useMutation({
    mutationFn: () => requestContractCancellation(contract.id, reason),
    onSuccess: async () => { setComposing(false); setReason(''); await refresh(); },
  });
  const respond = useMutation({
    mutationFn: (accept: boolean) => respondContractCancellation(request!.id, accept, note),
    onSuccess: async () => { setNote(''); await refresh(); },
  });
  const withdraw = useMutation({ mutationFn: () => withdrawContractCancellation(request!.id), onSuccess: refresh });
  const error = formError ?? (send.error ?? respond.error ?? withdraw.error)?.message;
  const busy = send.isPending || respond.isPending || withdraw.isPending;

  const submit = () => {
    const reasonError = cancellationReasonError(reason);
    setFormError(reasonError);
    if (!reasonError) send.mutate();
  };
  const confirmAccept = () => Alert.alert(copy.acceptTitle, copy.acceptBody, [
    { text: t('cancel'), style: 'cancel' },
    { text: copy.accept, style: 'destructive', onPress: () => respond.mutate(true) },
  ]);

  const errorText = error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{error}</Text> : null;
  const input = (value: string, onChange: (next: string) => void, label: string) => (
    <TextInput accessibilityLabel={label} placeholder={label} placeholderTextColor={palette.muted} value={value} onChangeText={onChange} multiline maxLength={CANCELLATION_REASON_MAX_LENGTH} style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]} />
  );

  if (request?.status === 'pending') {
    const mine = request.requestedBy === profileId;
    const responder = !mine && contractPartyOf(contract, profileId) !== null;
    return (
      <View style={[styles.notice, { backgroundColor: withAlpha(colors.warning, 0.08), borderColor: withAlpha(colors.warning, 0.3) }]}>
        <View style={styles.noticeHeader}>
          <AlertCircle color={colors.warning} size={20} />
          <Text style={[styles.noticeTitle, { color: palette.text }]}>
            {mine ? interpolate(copy.byMe, { date: formatDate(request.createdAt, locale) }) : request.requesterRole === 'owner' ? copy.byOwner : copy.byClient}
          </Text>
        </View>
        <Text selectable style={[styles.reason, { color: palette.textSecondary }]}>{interpolate(copy.reason, { reason: request.reason })}</Text>
        {responder ? input(note, setNote, copy.noteLabel) : null}
        <View style={styles.actions}>
          {mine ? <PremiumButton variant="secondary" label={copy.withdraw} loading={withdraw.isPending} disabled={busy} onPress={() => withdraw.mutate()} style={styles.action} /> : null}
          {responder ? <PremiumButton label={copy.accept} icon={CheckCircle2} loading={respond.isPending && respond.variables === true} disabled={busy} onPress={confirmAccept} style={styles.action} /> : null}
          {responder ? <PremiumButton variant="secondary" label={copy.reject} icon={XCircle} loading={respond.isPending && respond.variables === false} disabled={busy} onPress={() => respond.mutate(false)} style={styles.action} /> : null}
        </View>
        {errorText}
      </View>
    );
  }

  if (!canRequestCancellation(contract, profileId, request)) return null;
  if (!composing) return <PremiumButton variant="secondary" label={copy.request} icon={XCircle} onPress={() => setComposing(true)} />;
  return (
    <View style={styles.form}>
      <Text style={[styles.label, { color: palette.text }]}>{copy.reasonLabel}</Text>
      {input(reason, (next) => { setReason(next); setFormError(null); }, copy.reasonLabel)}
      <Text style={[styles.hint, { color: palette.textSecondary }]}>{copy.reasonHint}</Text>
      <View style={styles.actions}>
        <PremiumButton variant="secondary" label={copy.close} disabled={send.isPending} onPress={() => { setComposing(false); setFormError(null); }} style={styles.action} />
        <PremiumButton label={copy.send} loading={send.isPending} onPress={submit} style={styles.action} />
      </View>
      {errorText}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { borderWidth: 1, borderRadius: radius.md, padding: 12, gap: 10 },
  noticeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noticeTitle: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 19, fontFamily: fontFamily.bold },
  reason: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.regular },
  form: { gap: 8 },
  label: { fontSize: 13, fontFamily: fontFamily.extrabold },
  hint: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily.regular },
  input: { minHeight: 88, borderWidth: 1, borderRadius: radius.md, padding: 12, fontSize: 15, fontFamily: fontFamily.regular, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  action: { flex: 1, minWidth: 150 },
  error: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
});
