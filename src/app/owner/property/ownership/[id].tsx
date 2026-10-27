import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppErrorScreen } from '@/components/app-error-screen';
import { RouteScreen } from '@/components/route-screen';
import { AlertCircle, Building2, FileText, ShieldCheck } from '@/components/ui/icons';
import { PremiumButton, PremiumEmptyState, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius, touchTarget, withAlpha } from '@/constants/theme';
import { useProfileId } from '@/features/auth/use-profile-id';
import { parseDisplayDate } from '@/features/owner/identity-documents';
import {
  latestVerificationByProperty,
  OWNERSHIP_ROUTE_DOCUMENTS,
  OWNERSHIP_ROUTE_ORDER,
  ownershipDocumentDateError,
  ownershipStatusSummary,
} from '@/features/owner/property-ownership';
import {
  fetchOwnPropertyOwnershipVerifications,
  ownershipKeys,
  submitPropertyOwnershipVerification,
  type PickedOwnershipFile,
} from '@/features/owner/property-ownership.api';
import { ownershipCopy, ownershipToneColor, ownershipToneIcon } from '@/features/owner/property-ownership-copy';
import { propertyKeys } from '@/features/properties/api/property.keys';
import { useProperty } from '@/features/properties/hooks/use-properties';
import { loadDocumentPicker } from '@/lib/optional-native-modules';
import { defineCopy, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import type { Property, PropertyOwnershipDocumentKind, PropertyOwnershipRoute, PropertyOwnershipVerification } from '@/types';

const screenCopy = defineCopy({
  es: { title: 'Verificar la propiedad', route: '¿Cómo acreditas la propiedad?', documents: 'Documentos', pick: 'Elegir archivo', replace: 'Cambiar archivo', issuedOn: 'Fecha de expedición (DD/MM/AAAA)', formats: 'JPG, PNG, WebP o PDF de 10 MB como máximo.', missingFile: 'Adjunta todos los documentos de esta vía.', submit: 'Enviar documentos', sent: 'Documentos enviados. Te avisaremos cuando los revisemos.', reviewNotes: 'Motivo del rechazo', loading: 'Cargando la vivienda' },
  fr: { title: 'Vérifier la propriété', route: 'Comment prouvez-vous la propriété ?', documents: 'Documents', pick: 'Choisir un fichier', replace: 'Changer de fichier', issuedOn: 'Date de délivrance (JJ/MM/AAAA)', formats: 'JPG, PNG, WebP ou PDF de 10 Mo maximum.', missingFile: 'Joignez tous les documents de cette voie.', submit: 'Envoyer les documents', sent: 'Documents envoyés. Nous vous préviendrons après vérification.', reviewNotes: 'Motif du refus', loading: 'Chargement du logement' },
  en: { title: 'Verify ownership', route: 'How do you prove ownership?', documents: 'Documents', pick: 'Choose file', replace: 'Change file', issuedOn: 'Issue date (DD/MM/YYYY)', formats: 'JPG, PNG, WebP or PDF, up to 10 MB.', missingFile: 'Attach every document for this route.', submit: 'Send documents', sent: 'Documents sent. We will let you know once they are reviewed.', reviewNotes: 'Rejection reason', loading: 'Loading the home' },
});

export default function PropertyOwnershipScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const property = useProperty(id);
  const copy = useCopy(screenCopy);
  if (!id || (property.isSuccess && !property.data)) return <AppErrorScreen kind="property" />;
  if (property.isError) return <AppErrorScreen kind="network" onRetry={() => void property.refetch()} />;
  if (!property.data) return <RouteScreen title={copy.title} description={copy.loading}><PremiumEmptyState icon={Building2} title={copy.loading} description="" loading /></RouteScreen>;
  return <OwnershipForm property={property.data} />;
}

function OwnershipForm({ property }: { property: Property }) {
  const { palette } = useAppTheme();
  const copy = useCopy(screenCopy);
  const labels = useCopy(ownershipCopy);
  const client = useQueryClient();
  const profileId = useProfileId();
  const verifications = useQuery({
    queryKey: ownershipKeys.own(profileId ?? 'none'),
    queryFn: () => fetchOwnPropertyOwnershipVerifications(profileId!),
    enabled: Boolean(profileId),
  });
  const latest = latestVerificationByProperty(verifications.data ?? []).get(property.id);
  const summary = ownershipStatusSummary(property, latest);
  const [route, setRoute] = useState<PropertyOwnershipRoute>('registry');
  const [files, setFiles] = useState<Partial<Record<PropertyOwnershipDocumentKind, PickedOwnershipFile>>>({});
  const [issuedOn, setIssuedOn] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const kinds = OWNERSHIP_ROUTE_DOCUMENTS[route];

  const submit = useMutation({
    mutationFn: () => submitPropertyOwnershipVerification({
      userId: profileId!,
      propertyId: property.id,
      route,
      documents: kinds.map((kind) => ({ kind, file: files[kind]!, issuedOn: kind === 'registry_certificate' ? parseDisplayDate(issuedOn) : undefined })),
    }),
    onSuccess: async () => {
      setFiles({});
      setIssuedOn('');
      await Promise.all([client.invalidateQueries({ queryKey: ['property-ownership'] }), client.invalidateQueries({ queryKey: propertyKeys.all })]);
    },
  });

  const pick = async (kind: PropertyOwnershipDocumentKind) => {
    setFormError(null);
    try {
      const DocumentPicker = await loadDocumentPicker();
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      setFiles((current) => ({ ...current, [kind]: { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? undefined, size: asset.size ?? undefined } }));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : copy.missingFile);
    }
  };

  const send = () => {
    if (!profileId || kinds.some((kind) => !files[kind])) return setFormError(copy.missingFile);
    const dateError = kinds.includes('registry_certificate') ? ownershipDocumentDateError('registry_certificate', parseDisplayDate(issuedOn)) : null;
    if (dateError) return setFormError(dateError);
    setFormError(null);
    submit.mutate();
  };

  const tone = ownershipToneColor[summary.tone];
  return (
    <RouteScreen title={copy.title} description={property.title}>
      <View style={[styles.status, { backgroundColor: withAlpha(tone, 0.08), borderColor: withAlpha(tone, 0.28) }]}>
        <StatusPill label={labels[`status_${summary.key}`]} tone={tone} icon={ownershipToneIcon[summary.tone]} />
        <Text style={[styles.body, { color: palette.textSecondary }]}>{labels[`status_${summary.key}_detail`]}</Text>
        {latest?.status === 'rejected' ? <RejectionDetails verification={latest} /> : null}
      </View>

      {submit.isSuccess ? <Text accessibilityRole="alert" style={[styles.body, { color: colors.success }]}>{copy.sent}</Text> : null}

      {summary.canSubmit && !submit.isSuccess ? (
        <View style={styles.group}>
          <Text style={[styles.label, { color: palette.text }]}>{copy.route}</Text>
          {OWNERSHIP_ROUTE_ORDER.map((item) => {
            const selected = item === route;
            return (
              <Pressable key={item} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => { setRoute(item); setFormError(null); }} style={[styles.option, { borderColor: selected ? colors.brand : palette.border, backgroundColor: selected ? withAlpha(colors.brand, 0.1) : palette.surface }]}>
                <Text style={[styles.optionTitle, { color: palette.text }]}>{labels[`route_${item}`]}</Text>
                <Text style={[styles.hint, { color: palette.textSecondary }]}>{labels[`route_${item}_detail`]}</Text>
              </Pressable>
            );
          })}

          <Text style={[styles.label, { color: palette.text }]}>{copy.documents}</Text>
          {kinds.map((kind) => (
            <View key={kind} style={[styles.document, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.documentHeader}>
                <FileText color={files[kind] ? colors.success : palette.muted} size={20} />
                <View style={styles.documentCopy}>
                  <Text style={[styles.optionTitle, { color: palette.text }]}>{labels[`doc_${kind}`]}</Text>
                  <Text style={[styles.hint, { color: palette.textSecondary }]}>{files[kind]?.name ?? labels[`doc_${kind}_hint`]}</Text>
                </View>
              </View>
              {kind === 'registry_certificate' ? <TextInput accessibilityLabel={copy.issuedOn} placeholder={copy.issuedOn} placeholderTextColor={palette.muted} value={issuedOn} onChangeText={setIssuedOn} keyboardType="numbers-and-punctuation" style={[styles.input, { borderColor: palette.border, color: palette.text }]} /> : null}
              <PremiumButton variant="secondary" size="md" label={files[kind] ? copy.replace : copy.pick} onPress={() => void pick(kind)} disabled={submit.isPending} />
            </View>
          ))}
          <Text style={[styles.hint, { color: palette.textSecondary }]}>{copy.formats}</Text>
          {formError || submit.error ? (
            <View accessibilityRole="alert" style={styles.errorRow}>
              <AlertCircle color={colors.error} size={18} />
              <Text style={[styles.body, styles.errorText, { color: palette.errorText }]}>{formError ?? submit.error?.message}</Text>
            </View>
          ) : null}
          <PremiumButton label={copy.submit} icon={ShieldCheck} loading={submit.isPending} onPress={send} />
        </View>
      ) : null}
    </RouteScreen>
  );
}

function RejectionDetails({ verification }: { verification: PropertyOwnershipVerification }) {
  const { palette } = useAppTheme();
  const copy = useCopy(screenCopy);
  const labels = useCopy(ownershipCopy);
  const invalid = verification.documents.filter((document) => document.reviewResult === 'invalid');
  return (
    <View style={styles.rejection}>
      {verification.reviewNotes ? <Text selectable style={[styles.body, { color: palette.text }]}>{`${copy.reviewNotes}: ${verification.reviewNotes}`}</Text> : null}
      {invalid.map((document) => (
        <Text key={document.id} selectable style={[styles.hint, { color: palette.text }]}>{`• ${labels[`doc_${document.kind}`]}${document.reviewNote ? `: ${document.reviewNote}` : ''}`}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  status: { borderWidth: 1, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, gap: 10, alignItems: 'flex-start' },
  rejection: { gap: 6, alignSelf: 'stretch' },
  group: { gap: 12 },
  label: { fontSize: 15, fontFamily: fontFamily.extrabold },
  body: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.regular },
  hint: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily.regular },
  option: { minHeight: touchTarget, borderWidth: 1, borderRadius: radius.md, padding: 12, gap: 4 },
  optionTitle: { fontSize: 14, lineHeight: 19, fontFamily: fontFamily.bold },
  document: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: 12, gap: 10 },
  documentHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  documentCopy: { flex: 1, minWidth: 0, gap: 3 },
  input: { minHeight: touchTarget, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, fontSize: 15, fontFamily: fontFamily.regular },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  errorText: { flex: 1 },
});
