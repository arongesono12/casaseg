import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { AlertCircle, CheckCircle2, ExternalLink, ShieldCheck, XCircle } from '@/components/ui/icons';
import { HeroBadge, PremiumButton, PremiumEmptyState, PremiumErrorState, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius, touchTarget, withAlpha } from '@/constants/theme';
import { formatDisplayDate } from '@/features/owner/identity-documents';
import { ownershipReviewDecisionError, type OwnershipChecklistResult, type OwnershipReviewDecision } from '@/features/owner/property-ownership';
import { fetchPropertyOwnershipReviewQueue, openOwnershipDocument, ownershipKeys, reviewPropertyOwnershipVerification } from '@/features/owner/property-ownership.api';
import { ownershipCopy } from '@/features/owner/property-ownership-copy';
import { useAuth } from '@/providers/auth-context';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import type { PropertyOwnershipVerification } from '@/types';
import { formatDate } from '@/utils/formatters';

type QueueStatus = PropertyOwnershipVerification['status'];
const NOTES_MAX_LENGTH = 1000;

const reviewCopy = defineCopy({
  es: { title: 'Verificación de propiedad', subtitle: 'Comprueba documento a documento que cada vivienda pertenece a quien la publica.', pending: 'Pendientes', approved: 'Aprobadas', rejected: 'Rechazadas', count: '{count} solicitudes', superadminOnly: 'Solo el superadministrador revisa la propiedad de las viviendas.', loadingTitle: 'Cargando solicitudes', loadingBody: 'Estamos consultando la cola de verificación.', errorTitle: 'No pudimos cargar la cola', errorBody: 'Comprueba la conexión y vuelve a intentarlo.', emptyTitle: 'No hay solicitudes en este estado', emptyBody: 'Las nuevas solicitudes aparecerán aquí.', owner: 'Propietario: {name}', sentOn: 'Enviada el {date}', issuedOn: 'Expedido el {date}', view: 'Ver documento', valid: 'Válido', invalid: 'No válido', noteFor: 'Nota sobre {label}', notes: 'Notas para el propietario', approve: 'Aprobar y publicar', reject: 'Rechazar', review: 'Revisar documentos', approvedOn: 'Aprobada el {date}', rejectedOn: 'Rechazada el {date}' },
  fr: { title: 'Vérification de propriété', subtitle: 'Vérifiez document par document que chaque logement appartient à celui qui le publie.', pending: 'En attente', approved: 'Approuvées', rejected: 'Refusées', count: '{count} demandes', superadminOnly: 'Seul le super-administrateur vérifie la propriété des logements.', loadingTitle: 'Chargement des demandes', loadingBody: 'Nous consultons la file de vérification.', errorTitle: 'Impossible de charger la file', errorBody: 'Vérifiez la connexion et réessayez.', emptyTitle: 'Aucune demande dans ce statut', emptyBody: 'Les nouvelles demandes apparaîtront ici.', owner: 'Propriétaire : {name}', sentOn: 'Envoyée le {date}', issuedOn: 'Délivré le {date}', view: 'Voir le document', valid: 'Valide', invalid: 'Non valide', noteFor: 'Note sur {label}', notes: 'Notes pour le propriétaire', approve: 'Approuver et publier', reject: 'Refuser', review: 'Examiner les documents', approvedOn: 'Approuvée le {date}', rejectedOn: 'Refusée le {date}' },
  en: { title: 'Ownership verification', subtitle: 'Check document by document that each home belongs to whoever lists it.', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', count: '{count} requests', superadminOnly: 'Only the super administrator reviews home ownership.', loadingTitle: 'Loading requests', loadingBody: 'We are fetching the verification queue.', errorTitle: 'We could not load the queue', errorBody: 'Check your connection and try again.', emptyTitle: 'No requests with this status', emptyBody: 'New requests will appear here.', owner: 'Owner: {name}', sentOn: 'Sent on {date}', issuedOn: 'Issued on {date}', view: 'View document', valid: 'Valid', invalid: 'Not valid', noteFor: 'Note on {label}', notes: 'Notes for the owner', approve: 'Approve and publish', reject: 'Reject', review: 'Review documents', approvedOn: 'Approved on {date}', rejectedOn: 'Rejected on {date}' },
});
const filters: QueueStatus[] = ['pending', 'approved', 'rejected'];

export default function AdminOwnershipReviews() {
  const { role } = useAuth();
  const { palette } = useAppTheme();
  const copy = useCopy(reviewCopy);
  const [status, setStatus] = useState<QueueStatus>('pending');
  const isSuperadmin = role === 'superadmin';
  const queue = useQuery({ queryKey: ownershipKeys.queue(status), queryFn: () => fetchPropertyOwnershipReviewQueue(status), enabled: isSuperadmin });

  return (
    <RouteScreen title={copy.title} description={copy.subtitle} headerContent={queue.data ? <HeroBadge label={interpolate(copy.count, { count: queue.data.length })} icon={ShieldCheck} /> : undefined}>
      {!isSuperadmin ? <PremiumEmptyState icon={ShieldCheck} title={copy.title} description={copy.superadminOnly} /> : null}
      {isSuperadmin ? (
        <View style={styles.filters}>
          {filters.map((item) => {
            const selected = item === status;
            return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setStatus(item)} style={[styles.filter, { backgroundColor: selected ? colors.brand : palette.surface, borderColor: selected ? colors.brand : palette.border }]}><Text style={[styles.filterText, { color: selected ? 'white' : palette.textSecondary }]}>{copy[item]}</Text></Pressable>;
          })}
        </View>
      ) : null}
      {queue.isLoading ? <PremiumEmptyState icon={ShieldCheck} title={copy.loadingTitle} description={copy.loadingBody} loading /> : null}
      {queue.isError ? <PremiumErrorState title={copy.errorTitle} description={queue.error.message || copy.errorBody} onRetry={() => void queue.refetch()} /> : null}
      {queue.data && !queue.data.length ? <PremiumEmptyState icon={ShieldCheck} title={copy.emptyTitle} description={copy.emptyBody} /> : null}
      <View style={styles.list}>
        {queue.data?.map((verification) => <VerificationCard key={verification.id} verification={verification} />)}
      </View>
    </RouteScreen>
  );
}

function VerificationCard({ verification }: { verification: PropertyOwnershipVerification }) {
  const { palette } = useAppTheme();
  const { locale } = useI18n();
  const copy = useCopy(reviewCopy);
  const labels = useCopy(ownershipCopy);
  const client = useQueryClient();
  const resolved = verification.status !== 'pending';
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Record<string, OwnershipChecklistResult | undefined>>(() => Object.fromEntries(verification.documents.map((document) => [document.id, document.reviewResult === 'pending' ? undefined : document.reviewResult])));
  const [notesByDocument, setNotesByDocument] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);

  const review = useMutation({
    mutationFn: (decision: OwnershipReviewDecision) => reviewPropertyOwnershipVerification({
      verificationId: verification.id,
      decision,
      checklist: verification.documents.map((document) => ({ documentId: document.id, result: results[document.id]!, note: notesByDocument[document.id]?.trim() || undefined })),
      notes,
    }),
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['property-ownership'] }), client.invalidateQueries({ queryKey: ['admin'] })]),
  });
  const decide = (decision: OwnershipReviewDecision) => {
    const error = ownershipReviewDecisionError(decision, verification.documents.map((document) => results[document.id]), notes);
    setFormError(error);
    if (!error) review.mutate(decision);
  };
  const view = async (path: string) => {
    setViewError(null);
    try { await openOwnershipDocument(path); } catch (error) { setViewError(error instanceof Error ? error.message : copy.errorBody); }
  };
  const allValid = verification.documents.length > 0 && verification.documents.every((document) => results[document.id] === 'valid');
  const resolvedLabel = verification.reviewedAt ? interpolate(verification.status === 'approved' ? copy.approvedOn : copy.rejectedOn, { date: formatDate(verification.reviewedAt, locale) }) : null;

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.title, { color: palette.text }]}>{verification.propertyTitle ?? verification.propertyId}</Text>
      {verification.propertyLocation ? <Text style={[styles.meta, { color: palette.textSecondary }]}>{verification.propertyLocation}</Text> : null}
      <Text style={[styles.meta, { color: palette.textSecondary }]}>{interpolate(copy.owner, { name: verification.ownerName ?? verification.ownerEmail ?? verification.ownerId })}</Text>
      <View style={styles.badges}>
        <StatusPill label={labels[`route_${verification.route}`]} tone={colors.brand} />
        <StatusPill label={resolvedLabel ?? interpolate(copy.sentOn, { date: formatDate(verification.createdAt, locale) })} tone={verification.status === 'approved' ? colors.success : verification.status === 'rejected' ? colors.error : colors.warning} />
      </View>
      {!open ? <PremiumButton variant="secondary" size="md" label={copy.review} onPress={() => setOpen(true)} /> : (
        <View style={styles.checklist}>
          {verification.documents.map((document) => {
            const label = labels[`doc_${document.kind}`];
            return (
              <View key={document.id} style={[styles.document, { borderColor: palette.border }]}>
                <Text style={[styles.docTitle, { color: palette.text }]}>{label}</Text>
                {document.issuedOn ? <Text style={[styles.meta, { color: palette.textSecondary }]}>{interpolate(copy.issuedOn, { date: formatDisplayDate(document.issuedOn) })}</Text> : null}
                <PremiumButton variant="ghost" size="sm" icon={ExternalLink} label={copy.view} onPress={() => void view(document.storagePath)} />
                <View accessibilityRole="radiogroup" style={styles.choices}>
                  {(['valid', 'invalid'] as const).map((result) => {
                    const selected = results[document.id] === result;
                    const tone = result === 'valid' ? colors.success : colors.error;
                    return (
                      <Pressable key={result} accessibilityRole="radio" accessibilityLabel={result === 'valid' ? copy.valid : copy.invalid} accessibilityState={{ selected, disabled: resolved }} disabled={resolved || review.isPending} onPress={() => { setResults((current) => ({ ...current, [document.id]: result })); setFormError(null); }} style={[styles.choice, { borderColor: selected ? tone : palette.border, backgroundColor: selected ? withAlpha(tone, 0.12) : palette.surface }]}>
                        {result === 'valid' ? <CheckCircle2 color={tone} size={16} /> : <XCircle color={tone} size={16} />}
                        <Text style={[styles.choiceText, { color: palette.text }]}>{result === 'valid' ? copy.valid : copy.invalid}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {resolved ? (document.reviewNote ? <Text selectable style={[styles.meta, { color: palette.text }]}>{document.reviewNote}</Text> : null) : (
                  <TextInput accessibilityLabel={interpolate(copy.noteFor, { label })} placeholder={interpolate(copy.noteFor, { label })} placeholderTextColor={palette.muted} value={notesByDocument[document.id] ?? ''} onChangeText={(value) => setNotesByDocument((current) => ({ ...current, [document.id]: value }))} maxLength={NOTES_MAX_LENGTH} style={[styles.input, { borderColor: palette.border, color: palette.text }]} />
                )}
              </View>
            );
          })}
          {resolved ? (verification.reviewNotes ? <Text selectable style={[styles.meta, { color: palette.text }]}>{verification.reviewNotes}</Text> : null) : (
            <>
              <TextInput accessibilityLabel={copy.notes} placeholder={copy.notes} placeholderTextColor={palette.muted} value={notes} onChangeText={(value) => { setNotes(value); setFormError(null); }} multiline maxLength={NOTES_MAX_LENGTH} style={[styles.input, styles.notes, { borderColor: palette.border, color: palette.text }]} />
              <View style={styles.actions}>
                <PremiumButton label={copy.approve} icon={CheckCircle2} loading={review.isPending && review.variables === 'approved'} disabled={!allValid || review.isPending} onPress={() => decide('approved')} style={styles.action} />
                <PremiumButton variant="danger" label={copy.reject} icon={XCircle} loading={review.isPending && review.variables === 'rejected'} disabled={review.isPending} onPress={() => decide('rejected')} style={styles.action} />
              </View>
            </>
          )}
          {formError || review.error || viewError ? (
            <View accessibilityRole="alert" style={styles.errorRow}>
              <AlertCircle color={colors.error} size={18} />
              <Text style={[styles.meta, styles.errorText, { color: palette.errorText }]}>{formError ?? review.error?.message ?? viewError}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { minHeight: 44, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 12, fontFamily: fontFamily.extrabold },
  list: { gap: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 14, gap: 8, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  title: { fontSize: 16, lineHeight: 21, fontFamily: fontFamily.bold },
  meta: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily.regular },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  checklist: { gap: 10 },
  document: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: 12, gap: 8 },
  docTitle: { fontSize: 14, lineHeight: 19, fontFamily: fontFamily.bold },
  choices: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, minHeight: touchTarget, borderWidth: 1, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  choiceText: { fontSize: 13, fontFamily: fontFamily.bold },
  input: { minHeight: touchTarget, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: fontFamily.regular },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flex: 1, minWidth: 150 },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  errorText: { flex: 1 },
});
