import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { PremiumButton, SurfaceCard } from '@/components/ui/premium';
import { fontFamily, radius, touchTarget } from '@/constants/theme';
import { submitTravelerReport } from '@/features/compliance/compliance.api';
import { defineCopy, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

type Traveler = { fullName: string; documentType: string; documentNumber: string; nationality: string; birthDate: string; checkInDate: string };
const emptyTraveler = (): Traveler => ({ fullName: '', documentType: 'dni', documentNumber: '', nationality: '', birthDate: '', checkInDate: '' });
const reportCopy = defineCopy({
  es: { title: 'Parte de viajeros', subtitle: 'Registra los datos exigidos para esta estancia.', traveler: 'Viajero', name: 'Nombre completo', documentType: 'Tipo de documento', dni: 'DNI', passport: 'Pasaporte', documentNumber: 'Número de documento', nationality: 'Nacionalidad', birthDate: 'Nacimiento (AAAA-MM-DD)', checkInDate: 'Entrada (AAAA-MM-DD)', add: 'Añadir viajero', remove: 'Quitar', consent: 'Acepto el envío regulatorio de estos datos.', submit: 'Enviar parte', invalid: 'Completa todos los campos y usa fechas AAAA-MM-DD.', sent: 'Parte registrado. Estado:', queued: 'En cola', submitted: 'Enviado', failed: 'Requiere revisión' },
  fr: { title: 'Déclaration des voyageurs', subtitle: 'Enregistrez les données requises pour ce séjour.', traveler: 'Voyageur', name: 'Nom complet', documentType: 'Type de document', dni: 'Carte d’identité', passport: 'Passeport', documentNumber: 'Numéro du document', nationality: 'Nationalité', birthDate: 'Naissance (AAAA-MM-JJ)', checkInDate: 'Arrivée (AAAA-MM-JJ)', add: 'Ajouter un voyageur', remove: 'Retirer', consent: 'J’accepte la transmission réglementaire de ces données.', submit: 'Envoyer la déclaration', invalid: 'Complétez tous les champs et utilisez des dates AAAA-MM-JJ.', sent: 'Déclaration enregistrée. Statut :', queued: 'En attente', submitted: 'Envoyée', failed: 'À vérifier' },
  en: { title: 'Traveler report', subtitle: 'Record the required details for this stay.', traveler: 'Traveler', name: 'Full name', documentType: 'Document type', dni: 'ID card', passport: 'Passport', documentNumber: 'Document number', nationality: 'Nationality', birthDate: 'Birth date (YYYY-MM-DD)', checkInDate: 'Check-in (YYYY-MM-DD)', add: 'Add traveler', remove: 'Remove', consent: 'I agree to the regulatory submission of these details.', submit: 'Submit report', invalid: 'Complete every field and use YYYY-MM-DD dates.', sent: 'Report recorded. Status:', queued: 'Queued', submitted: 'Submitted', failed: 'Needs review' },
});

export default function TravelerReportScreen() {
  const { contractId } = useLocalSearchParams<{ contractId: string }>();
  const { palette } = useAppTheme();
  const copy = useCopy(reportCopy);
  const [travelers, setTravelers] = useState<Traveler[]>([emptyTraveler()]);
  const [accepted, setAccepted] = useState(false);
  const [validationError, setValidationError] = useState('');
  const send = useMutation({ mutationFn: () => submitTravelerReport({ contractId, travelers }), retry: false });
  const update = (index: number, key: keyof Traveler, value: string) => setTravelers((current) => current.map((row, at) => at === index ? { ...row, [key]: value } : row));
  const submit = () => {
    const valid = travelers.length > 0 && travelers.every((row) => row.fullName.trim().length >= 2 && row.documentNumber.trim() && row.nationality.trim() && /^\d{4}-\d{2}-\d{2}$/.test(row.birthDate) && /^\d{4}-\d{2}-\d{2}$/.test(row.checkInDate));
    if (!valid || !accepted) { setValidationError(copy.invalid); return; }
    setValidationError('');
    send.mutate();
  };
  const field = (index: number, key: keyof Traveler, label: string) => <TextInput accessibilityLabel={`${copy.traveler} ${index + 1}: ${label}`} value={travelers[index][key]} onChangeText={(value) => update(index, key, value)} placeholder={label} placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]} />;
  const status = (send.data as { status?: 'queued' | 'submitted' | 'failed' } | undefined)?.status;
  return (
    <RouteScreen title={copy.title} description={copy.subtitle}>
      {send.isSuccess ? <SurfaceCard style={styles.card}><Text accessibilityRole="alert" style={[styles.body, { color: palette.text }]}>{copy.sent} {copy[status ?? 'queued']}</Text></SurfaceCard> : <>
        {travelers.map((row, index) => <SurfaceCard key={index} style={styles.card}>
          <View style={styles.heading}><Text style={[styles.headingText, { color: palette.text }]}>{copy.traveler} {index + 1}</Text>{travelers.length > 1 ? <PremiumButton variant="secondary" label={copy.remove} onPress={() => setTravelers((current) => current.filter((_, at) => at !== index))} /> : null}</View>
          {field(index, 'fullName', copy.name)}
          <Text style={[styles.body, { color: palette.textSecondary }]}>{copy.documentType}</Text>
          <View style={styles.heading}>{(['dni', 'passport'] as const).map((type) => <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: row.documentType === type }} onPress={() => update(index, 'documentType', type)} style={[styles.documentOption, { borderColor: row.documentType === type ? palette.brand : palette.border, backgroundColor: row.documentType === type ? palette.subtle : palette.surface }]}><Text style={[styles.body, { color: palette.text }]}>{copy[type]}</Text></Pressable>)}</View>
          {field(index, 'documentNumber', copy.documentNumber)}
          {field(index, 'nationality', copy.nationality)}
          {field(index, 'birthDate', copy.birthDate)}
          {field(index, 'checkInDate', copy.checkInDate)}
        </SurfaceCard>)}
        {travelers.length < 20 ? <PremiumButton variant="secondary" label={copy.add} onPress={() => setTravelers((current) => [...current, emptyTraveler()])} /> : null}
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} onPress={() => setAccepted((value) => !value)} style={styles.consent}><View style={[styles.checkbox, { borderColor: palette.border, backgroundColor: accepted ? palette.brand : palette.surface }]} /><Text style={[styles.body, { color: palette.text, flex: 1 }]}>{copy.consent}</Text></Pressable>
        {validationError || send.error ? <Text accessibilityRole="alert" style={[styles.body, { color: palette.errorText }]}>{validationError || send.error?.message}</Text> : null}
        <PremiumButton label={copy.submit} disabled={send.isPending} loading={send.isPending} onPress={submit} />
      </>}
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 11 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  headingText: { fontSize: 16, fontFamily: fontFamily.bold },
  input: { minHeight: touchTarget, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, fontSize: 15, fontFamily: fontFamily.regular },
  body: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  consent: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderRadius: 6 },
  documentOption: { flex: 1, minHeight: touchTarget, borderWidth: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
