import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { Calendar, CheckCircle2, Clock, XCircle } from '@/components/ui/icons';
import { PremiumButton, PremiumEmptyState, PremiumErrorState, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius, spacing, type AppPalette } from '@/constants/theme';
import { useProfileId } from '@/features/auth/use-profile-id';
import { visitRequestKeys, updateVisitRequestStatus } from '@/features/properties/api/visit-requests';
import { encounterKeys, fetchChatEncounter, fetchEncounterContext, proposeChatEncounter, type ChatEncounter } from '@/features/visits/chat-encounter.api';
import { buildVisitDays, buildVisitSlot, dayHasAvailableSlots, isSlotAvailable, VISIT_HOURS } from '@/features/visits/visit-schedule';
import { haptics } from '@/lib/haptics';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { pressRipple } from '@/lib/press-feedback';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const encounterCopy = defineCopy({
  es: {
    title: 'Encuentros', subtitle: 'Acordad la visita y el precio desde esta conversación.',
    loading: 'Cargando el encuentro', loadingBody: 'Consultando el acuerdo de esta vivienda.',
    error: 'No pudimos abrir el encuentro', errorBody: 'Comprueba la conexión y vuelve a intentarlo.',
    proposal: 'Propuesta actual', noProposal: 'Todavía no hay una propuesta', noProposalBody: 'Elige una fecha, una hora y el precio para enviar una propuesta a la otra persona.',
    waitingYou: 'Esperando tu respuesta', waitingOther: 'Esperando a la otra persona', confirmed: 'Acuerdo confirmado', rejected: 'Propuesta rechazada',
    confirmedBody: 'Ambas partes aceptaron el encuentro. El propietario ya puede continuar con el contrato.', openContract: 'Continuar con el contrato',
    client: 'Cliente', owner: 'Propietario', accepted: 'Confirmado', awaiting: 'Pendiente',
    date: 'Fecha y hora', noDate: 'Sin fecha propuesta', proposedPrice: 'Precio propuesto', agreedPrice: 'Precio acordado', note: 'Nota de la propuesta',
    accept: 'Aceptar propuesta', decline: 'Rechazar', cancel: 'Cancelar acuerdo', change: 'Proponer otra opción',
    formTitle: 'Nueva propuesta', day: 'Día', time: 'Hora', twoWeeks: 'Próximas dos semanas',
    priceInput: 'Precio propuesto (FCFA)', pricePlaceholder: 'Precio de la vivienda',
    noteInput: 'Mensaje (opcional)', notePlaceholder: 'Por ejemplo: nos vemos en la entrada principal.',
    send: 'Enviar propuesta', sending: 'Enviando…', chooseTime: 'Elige una hora', invalidPrice: 'Introduce un precio mayor que cero.',
    mutationError: 'No se pudo actualizar el encuentro: {message}', backToChat: 'Volver al chat',
  },
  fr: {
    title: 'Rencontres', subtitle: 'Convenez de la visite et du prix depuis cette conversation.',
    loading: 'Chargement de la rencontre', loadingBody: 'Consultation de l’accord pour ce logement.',
    error: 'Impossible d’ouvrir la rencontre', errorBody: 'Vérifiez votre connexion et réessayez.',
    proposal: 'Proposition actuelle', noProposal: 'Aucune proposition pour le moment', noProposalBody: 'Choisissez une date, une heure et un prix pour proposer une rencontre.',
    waitingYou: 'En attente de votre réponse', waitingOther: 'En attente de l’autre personne', confirmed: 'Accord confirmé', rejected: 'Proposition refusée',
    confirmedBody: 'Les deux parties ont accepté la rencontre. Le propriétaire peut poursuivre avec le contrat.', openContract: 'Continuer vers le contrat',
    client: 'Client', owner: 'Propriétaire', accepted: 'Confirmé', awaiting: 'En attente',
    date: 'Date et heure', noDate: 'Aucune date proposée', proposedPrice: 'Prix proposé', agreedPrice: 'Prix convenu', note: 'Note de la proposition',
    accept: 'Accepter la proposition', decline: 'Refuser', cancel: 'Annuler l’accord', change: 'Proposer une autre option',
    formTitle: 'Nouvelle proposition', day: 'Jour', time: 'Heure', twoWeeks: 'Deux prochaines semaines',
    priceInput: 'Prix proposé (FCFA)', pricePlaceholder: 'Prix du logement',
    noteInput: 'Message (facultatif)', notePlaceholder: 'Par exemple : retrouvons-nous à l’entrée principale.',
    send: 'Envoyer la proposition', sending: 'Envoi…', chooseTime: 'Choisissez une heure', invalidPrice: 'Saisissez un prix supérieur à zéro.',
    mutationError: 'Impossible de mettre à jour la rencontre : {message}', backToChat: 'Retour à la conversation',
  },
  en: {
    title: 'Meetings', subtitle: 'Agree on the visit and price from this conversation.',
    loading: 'Loading meeting', loadingBody: 'Checking the agreement for this home.',
    error: 'Could not open the meeting', errorBody: 'Check your connection and try again.',
    proposal: 'Current proposal', noProposal: 'No proposal yet', noProposalBody: 'Choose a date, time, and price to send a proposal to the other person.',
    waitingYou: 'Waiting for your response', waitingOther: 'Waiting for the other person', confirmed: 'Agreement confirmed', rejected: 'Proposal declined',
    confirmedBody: 'Both parties accepted the meeting. The owner can now continue with the contract.', openContract: 'Continue to contract',
    client: 'Client', owner: 'Owner', accepted: 'Confirmed', awaiting: 'Pending',
    date: 'Date and time', noDate: 'No proposed date', proposedPrice: 'Proposed price', agreedPrice: 'Agreed price', note: 'Proposal note',
    accept: 'Accept proposal', decline: 'Decline', cancel: 'Cancel agreement', change: 'Propose another option',
    formTitle: 'New proposal', day: 'Day', time: 'Time', twoWeeks: 'Next two weeks',
    priceInput: 'Proposed price (FCFA)', pricePlaceholder: 'Home price',
    noteInput: 'Message (optional)', notePlaceholder: 'For example: meet me at the main entrance.',
    send: 'Send proposal', sending: 'Sending…', chooseTime: 'Choose a time', invalidPrice: 'Enter a price greater than zero.',
    mutationError: 'Could not update the meeting: {message}', backToChat: 'Back to chat',
  },
});

function proposalState(agreement: ChatEncounter, isOwner: boolean, copy: (typeof encounterCopy)['es']) {
  if (agreement.status === 'fully_confirmed') return { label: copy.confirmed, tone: colors.success, icon: CheckCircle2 };
  if (agreement.status === 'rejected') return { label: copy.rejected, tone: colors.error, icon: XCircle };
  const confirmed = isOwner ? agreement.ownerConfirmed : agreement.clientConfirmed;
  return { label: confirmed ? copy.waitingOther : copy.waitingYou, tone: colors.warning, icon: Clock };
}

function ChoiceChip({ label, selected, disabled = false, onPress, palette }: { label: string; selected: boolean; disabled?: boolean; onPress: () => void; palette: AppPalette }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      android_ripple={pressRipple}
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? palette.brandSoft : palette.surface, borderColor: selected ? palette.brandIcon : palette.border }, disabled && styles.disabled]}
    >
      <Text style={[styles.chipText, { color: selected ? palette.brandText : palette.text }]}>{label}</Text>
    </Pressable>
  );
}

export default function ChatEncounterScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const profileId = useProfileId();
  const { locale } = useI18n();
  const copy = useCopy(encounterCopy);
  const { palette } = useAppTheme();
  const queryClient = useQueryClient();
  const [now] = useState(() => new Date());
  const days = useMemo(() => buildVisitDays(now).filter((day) => dayHasAvailableSlots(day, now)), [now]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [priceText, setPriceText] = useState('');
  const [showForm, setShowForm] = useState(false);

  const context = useQuery({
    queryKey: encounterKeys.context(conversationId, profileId ?? 'pending'),
    queryFn: () => fetchEncounterContext(conversationId, profileId!),
    enabled: Boolean(profileId && conversationId),
  });
  const agreement = useQuery({
    queryKey: context.data ? encounterKeys.agreement(context.data) : ['chat-encounter', 'agreement', 'pending'],
    queryFn: () => fetchChatEncounter(context.data!),
    enabled: Boolean(context.data),
    refetchInterval: 10_000,
  });
  useEffect(() => {
    if (!context.data || !isSupabaseConfigured) return;
    const meeting = context.data;
    const channel = supabase.channel(`encounter:${meeting.propertyId}:${meeting.clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agreements', filter: `property_id=eq.${meeting.propertyId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: encounterKeys.agreement(meeting) });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [context.data, queryClient]);
  const current = agreement.data;
  const basePrice = current?.agreedPrice || context.data?.propertyPrice || 0;
  const enteredPrice = priceText.trim() ? Number(priceText.replace(/\s/g, '').replace(',', '.')) : basePrice;
  const day = days[selectedDay];
  const slot = day && selectedHour !== null ? buildVisitSlot(day, selectedHour) : null;
  const canSend = Boolean(context.data && slot && isSlotAvailable(slot, now) && Number.isFinite(enteredPrice) && enteredPrice > 0);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }), [locale]);
  const dayFormat = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }), [locale]);
  const priceFormat = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);

  const propose = useMutation({
    mutationFn: () => proposeChatEncounter(context.data!, slot!, note.slice(0, 500), enteredPrice),
    onSuccess: async () => {
      haptics.success();
      setShowForm(false);
      setSelectedHour(null);
      setPriceText('');
      setNote('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: encounterKeys.agreement(context.data!) }),
        queryClient.invalidateQueries({ queryKey: visitRequestKeys.all }),
      ]);
    },
    onError: () => haptics.error(),
  });
  const respond = useMutation({
    mutationFn: (status: 'accepted' | 'rejected') => updateVisitRequestStatus(current!.id, status),
    onSuccess: async () => {
      haptics.success();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: encounterKeys.agreement(context.data!) }),
        queryClient.invalidateQueries({ queryKey: visitRequestKeys.all }),
      ]);
    },
    onError: () => haptics.error(),
  });

  const loading = !profileId || context.isLoading || (context.data && agreement.isLoading);
  const error = context.error ?? agreement.error;
  const mutationError = propose.error ?? respond.error;
  const busy = propose.isPending || respond.isPending;
  const selfConfirmed = context.data?.isOwner ? current?.ownerConfirmed : current?.clientConfirmed;
  const pending = current && current.status !== 'fully_confirmed' && current.status !== 'rejected';
  const formOpen = !current || current.status === 'rejected' || showForm;

  return (
    <RouteScreen title={copy.title} description={copy.subtitle}>
      {loading && !error ? <PremiumEmptyState icon={Calendar} title={copy.loading} description={copy.loadingBody} loading /> : null}
      {error ? <PremiumErrorState title={copy.error} description={error.message || copy.errorBody} onRetry={() => { if (context.isError) void context.refetch(); else void agreement.refetch(); }} /> : null}
      {!loading && !error && context.data ? (
        <>
          <View style={[styles.propertyCard, { backgroundColor: palette.brandSoft }]}>
            <Calendar color={palette.brandIcon} size={23} />
            <Text numberOfLines={2} style={[styles.propertyTitle, { color: palette.text }]}>{context.data.propertyTitle}</Text>
          </View>

          {current ? (
            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.eyebrow, { color: palette.textSecondary }]}>{copy.proposal}</Text>
              <View style={styles.pillRow}>
                <StatusPill {...proposalState(current, context.data.isOwner, copy)} />
              </View>
              <View style={styles.detail}>
                <Text style={[styles.detailLabel, { color: palette.textSecondary }]}>{copy.date}</Text>
                <Text style={[styles.detailValue, { color: palette.text }]}>{current.meetingAt ? dateFormat.format(current.meetingAt) : copy.noDate}</Text>
              </View>
              <View style={styles.detail}>
                <Text style={[styles.detailLabel, { color: palette.textSecondary }]}>{current.status === 'fully_confirmed' ? copy.agreedPrice : copy.proposedPrice}</Text>
                <Text style={[styles.detailValue, { color: palette.text }]}>{priceFormat.format(current.agreedPrice)} {current.currency}</Text>
              </View>
              {current.note ? <View style={[styles.note, { backgroundColor: palette.subtle }]}><Text style={[styles.detailLabel, { color: palette.textSecondary }]}>{copy.note}</Text><Text style={[styles.noteText, { color: palette.text }]}>{current.note}</Text></View> : null}
              <View style={[styles.confirmations, { borderTopColor: palette.border }]}>
                <Text style={[styles.confirmation, { color: current.clientConfirmed ? palette.brandText : palette.textSecondary }]}>{copy.client}: {current.clientConfirmed ? copy.accepted : copy.awaiting}</Text>
                <Text style={[styles.confirmation, { color: current.ownerConfirmed ? palette.brandText : palette.textSecondary }]}>{copy.owner}: {current.ownerConfirmed ? copy.accepted : copy.awaiting}</Text>
              </View>
              {current.status === 'fully_confirmed' ? <Text style={[styles.help, { color: palette.textSecondary }]}>{copy.confirmedBody}</Text> : null}
              {current.status === 'fully_confirmed' && context.data.isOwner ? <PremiumButton label={copy.openContract} onPress={() => router.push('/owner/requests')} /> : null}
              {pending ? (
                <View style={styles.actions}>
                  {!selfConfirmed ? <PremiumButton label={copy.accept} icon={CheckCircle2} disabled={busy} loading={respond.isPending && respond.variables === 'accepted'} onPress={() => respond.mutate('accepted')} style={styles.action} /> : null}
                  <PremiumButton label={selfConfirmed ? copy.cancel : copy.decline} variant="secondary" disabled={busy} onPress={() => respond.mutate('rejected')} style={styles.action} />
                </View>
              ) : null}
              {pending && !showForm ? <PremiumButton label={copy.change} variant="ghost" disabled={busy} onPress={() => setShowForm(true)} /> : null}
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>{copy.noProposal}</Text>
              <Text style={[styles.help, { color: palette.textSecondary }]}>{copy.noProposalBody}</Text>
            </View>
          )}

          {formOpen && current?.status !== 'fully_confirmed' ? (
            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>{copy.formTitle}</Text>
              <Text style={[styles.detailLabel, { color: palette.textSecondary }]}>{copy.day} · {copy.twoWeeks}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
                {days.map((option, index) => (
                  <ChoiceChip key={option.toISOString()} label={dayFormat.format(option)} selected={selectedDay === index} onPress={() => { setSelectedDay(index); setSelectedHour(null); }} palette={palette} />
                ))}
              </ScrollView>
              <Text style={[styles.detailLabel, { color: palette.textSecondary }]}>{copy.time}</Text>
              <View style={styles.hourRow}>
                {day ? VISIT_HOURS.map((hour) => (
                  <ChoiceChip key={hour} label={`${String(hour).padStart(2, '0')}:00`} selected={selectedHour === hour} disabled={!isSlotAvailable(buildVisitSlot(day, hour), now)} onPress={() => setSelectedHour(hour)} palette={palette} />
                )) : null}
              </View>
              <FormField label={copy.priceInput} placeholder={`${copy.pricePlaceholder}: ${priceFormat.format(basePrice)}`} value={priceText} onChangeText={setPriceText} keyboardType="numeric" />
              {!Number.isFinite(enteredPrice) || enteredPrice <= 0 ? <Text style={[styles.help, { color: palette.errorText }]}>{copy.invalidPrice}</Text> : null}
              <FormField label={copy.noteInput} placeholder={copy.notePlaceholder} value={note} onChangeText={setNote} maxLength={500} multiline />
              <PremiumButton label={propose.isPending ? copy.sending : slot ? copy.send : copy.chooseTime} icon={Calendar} disabled={!canSend || busy} loading={propose.isPending} onPress={() => propose.mutate()} />
            </View>
          ) : null}
          {mutationError ? <Text accessibilityRole="alert" style={[styles.help, { color: palette.errorText }]}>{copy.mutationError.replace('{message}', mutationError.message)}</Text> : null}
          <PremiumButton label={copy.backToChat} variant="ghost" onPress={() => router.back()} />
        </>
      ) : null}
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  propertyCard: { minHeight: 62, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  propertyTitle: { flex: 1, fontSize: 16, lineHeight: 22, fontFamily: fontFamily.bold },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  cardTitle: { fontSize: 18, lineHeight: 24, fontFamily: fontFamily.bold },
  eyebrow: { fontSize: 11, lineHeight: 15, fontFamily: fontFamily.bold, letterSpacing: 0.8, textTransform: 'uppercase' },
  pillRow: { flexDirection: 'row' },
  detail: { gap: 2 },
  detailLabel: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily.semibold },
  detailValue: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.bold, textTransform: 'capitalize' },
  note: { borderRadius: radius.md, padding: spacing.md, gap: 4 },
  noteText: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.regular },
  confirmations: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, gap: 5 },
  confirmation: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.semibold },
  help: { fontSize: 14, lineHeight: 21, fontFamily: fontFamily.regular },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1 },
  dayRow: { gap: spacing.sm, paddingVertical: 2 },
  hourRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 44, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 13, fontFamily: fontFamily.semibold, textTransform: 'capitalize' },
  disabled: { opacity: 0.4 },
});
