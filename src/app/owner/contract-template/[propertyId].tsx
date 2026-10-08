import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { CheckCircle2, FileText } from '@/components/ui/icons';
import { PremiumButton, PremiumEmptyState, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius, touchTarget } from '@/constants/theme';
import { useProfileId } from '@/features/auth/use-profile-id';
import { fetchLeaseTemplate, saveLeaseTemplate, type LeaseTemplate } from '@/features/contracts/contracts.api';
import { DEFAULT_LEASE_TERMS, validLeaseTerms, type LeaseContractTerms } from '@/features/contracts/lease-contract.model';
import { defineCopy, interpolate, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const templateCopy = defineCopy({
  es: { title: 'Plantilla de contrato', subtitle: 'Estos términos se copian en cada contrato nuevo de esta vivienda. Los contratos ya generados no cambian.', loading: 'Cargando plantilla', name: 'Título del contrato', duration: 'Duración (meses)', deposit: 'Fianza (FCFA)', paymentDay: 'Día de pago del mes', notice: 'Preaviso (días)', occupants: 'Ocupantes permitidos', pets: 'Se permiten mascotas', maintenance: 'Conservación y averías', rules: 'Normas de la vivienda', inventory: 'Inventario y estado de entrega', clauses: 'Cláusulas adicionales', save: 'Guardar y activar', saved: 'Plantilla activa · versión {version}', active: 'Activa', draft: 'Borrador', invalid: 'Revisa los números: deben ser enteros positivos y el día de pago entre 1 y 28.', done: 'Volver' },
  fr: { title: 'Modèle de contrat', subtitle: 'Ces conditions sont copiées dans chaque nouveau contrat de ce logement. Les contrats déjà générés ne changent pas.', loading: 'Chargement du modèle', name: 'Titre du contrat', duration: 'Durée (mois)', deposit: 'Caution (FCFA)', paymentDay: 'Jour de paiement du mois', notice: 'Préavis (jours)', occupants: 'Occupants autorisés', pets: 'Animaux autorisés', maintenance: 'Entretien et pannes', rules: 'Règlement du logement', inventory: 'Inventaire et état des lieux', clauses: 'Clauses supplémentaires', save: 'Enregistrer et activer', saved: 'Modèle actif · version {version}', active: 'Actif', draft: 'Brouillon', invalid: 'Vérifiez les nombres : entiers positifs et jour de paiement entre 1 et 28.', done: 'Retour' },
  en: { title: 'Contract template', subtitle: 'These terms are copied into every new contract for this home. Contracts already generated do not change.', loading: 'Loading template', name: 'Contract title', duration: 'Duration (months)', deposit: 'Deposit (FCFA)', paymentDay: 'Payment day of the month', notice: 'Notice period (days)', occupants: 'Occupants allowed', pets: 'Pets allowed', maintenance: 'Upkeep and repairs', rules: 'House rules', inventory: 'Inventory and handover condition', clauses: 'Additional clauses', save: 'Save and activate', saved: 'Active template · version {version}', active: 'Active', draft: 'Draft', invalid: 'Check the numbers: they must be positive integers and the payment day between 1 and 28.', done: 'Back' },
});

type NumericField = 'durationMonths' | 'depositAmount' | 'paymentDay' | 'noticeDays' | 'occupantsAllowed';
type TextField = 'maintenanceTerms' | 'houseRules' | 'inventoryNotes' | 'additionalClauses';

export default function ContractTemplateScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const { palette } = useAppTheme();
  const copy = useCopy(templateCopy);
  const template = useQuery({ queryKey: ['lease-template', propertyId], queryFn: () => fetchLeaseTemplate(propertyId), enabled: Boolean(propertyId) });

  return (
    <RouteScreen title={copy.title} description={copy.subtitle}>
      {template.isPending ? <PremiumEmptyState icon={FileText} title={copy.loading} description="" loading /> : null}
      {template.isError ? <Text accessibilityRole="alert" style={[styles.label, { color: palette.errorText }]}>{template.error.message}</Text> : null}
      {template.isSuccess ? <TemplateForm propertyId={propertyId} initial={template.data} /> : null}
    </RouteScreen>
  );
}

function TemplateForm({ propertyId, initial }: { propertyId: string; initial: LeaseTemplate | null }) {
  const { palette } = useAppTheme();
  const copy = useCopy(templateCopy);
  const queryClient = useQueryClient();
  const profileId = useProfileId();
  const [title, setTitle] = useState(initial?.title ?? 'Contrato de arrendamiento');
  const [terms, setTerms] = useState<LeaseContractTerms>(initial?.terms ?? DEFAULT_LEASE_TERMS);
  const save = useMutation({
    mutationFn: () => {
      if (!profileId) throw new Error(copy.loading);
      if (!validLeaseTerms(terms)) throw new Error(copy.invalid);
      return saveLeaseTemplate({ propertyId, ownerId: profileId, title, terms, activate: true });
    },
    onSuccess: (saved) => queryClient.setQueryData(['lease-template', propertyId], saved),
  });
  const current = save.data ?? initial;

  const setNumber = (field: NumericField) => (value: string) => setTerms((previous) => ({ ...previous, [field]: Number(value.replace(/\D/g, '')) || 0 }));
  const setText = (field: TextField) => (value: string) => setTerms((previous) => ({ ...previous, [field]: value }));
  const inputStyle = [styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }];
  const numberField = (field: NumericField, label: string) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text>
      <TextInput accessibilityLabel={label} value={String(terms[field])} onChangeText={setNumber(field)} keyboardType="number-pad" style={inputStyle} />
    </View>
  );
  const textField = (field: TextField, label: string) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text>
      <TextInput accessibilityLabel={label} value={terms[field]} onChangeText={setText(field)} multiline style={[inputStyle, styles.multiline]} />
    </View>
  );

  return (
    <View style={styles.form}>
      {current ? <StatusPill label={current.status === 'active' ? `${copy.active} · v${current.version}` : copy.draft} tone={current.status === 'active' ? colors.success : colors.muted} icon={current.status === 'active' ? CheckCircle2 : FileText} /> : null}
      <View style={styles.field}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>{copy.name}</Text>
        <TextInput accessibilityLabel={copy.name} value={title} onChangeText={setTitle} style={inputStyle} />
      </View>
      {numberField('durationMonths', copy.duration)}
      {numberField('depositAmount', copy.deposit)}
      {numberField('paymentDay', copy.paymentDay)}
      {numberField('noticeDays', copy.notice)}
      {numberField('occupantsAllowed', copy.occupants)}
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: terms.petsAllowed }} onPress={() => setTerms((previous) => ({ ...previous, petsAllowed: !previous.petsAllowed }))} style={styles.toggle}>
        {terms.petsAllowed ? <CheckCircle2 color={colors.success} size={20} /> : <View style={[styles.checkbox, { borderColor: palette.border }]} />}
        <Text style={[styles.label, { color: palette.text }]}>{copy.pets}</Text>
      </Pressable>
      {textField('maintenanceTerms', copy.maintenance)}
      {textField('houseRules', copy.rules)}
      {textField('inventoryNotes', copy.inventory)}
      {textField('additionalClauses', copy.clauses)}
      <PremiumButton label={copy.save} loading={save.isPending} onPress={() => save.mutate()} />
      {save.isSuccess ? <Text style={[styles.label, { color: palette.textSecondary }]}>{interpolate(copy.saved, { version: save.data.version })}</Text> : null}
      {save.error ? <Text accessibilityRole="alert" style={[styles.label, { color: palette.errorText }]}>{save.error.message}</Text> : null}
      <PremiumButton variant="secondary" label={copy.done} onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  field: { gap: 6 },
  label: { fontFamily: fontFamily.semibold, fontSize: 13, lineHeight: 18 },
  input: { fontFamily: fontFamily.regular, minHeight: touchTarget, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 14, fontSize: 16 },
  multiline: { minHeight: 88, borderRadius: radius.xl, paddingTop: 12, textAlignVertical: 'top' },
  toggle: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5 },
});
