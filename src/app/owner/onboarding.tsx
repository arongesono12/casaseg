import { useMutation, useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { CheckCircle2, Clock, FileText } from '@/components/ui/icons';
import { PremiumButton, PremiumEmptyState, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius, touchTarget, withAlpha } from '@/constants/theme';
import { useProfileId } from '@/features/auth/use-profile-id';
import { fetchOwnerPlans, ownerPlanKeys, type OwnerPlanType } from '@/features/owner/owner-plan.api';
import {
  fetchPendingUpgradeRequest,
  ownerUpgradePaymentMethods,
  submitOwnerUpgradeRequest,
  validateOwnerUpgradeInput,
  type OwnerDocumentType,
  type OwnerUpgradeInput,
  type OwnerUpgradePaymentMethod,
  type PickedPdf,
} from '@/features/owner/owner-upgrade.api';
import { useAuth } from '@/providers/auth-context';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatXaf } from '@/utils/formatters';

const onboardingCopy = defineCopy({
  es: { title: 'Hazte propietario', step: 'Paso {current} de {total}', plan: 'Elige tu plan', monthly: 'Mensual', yearly: 'Anual', properties: 'Hasta {count} propiedades', payment: 'Método de pago', paymentNote: 'Administración confirma el pago antes de activar tu cuenta de propietario.', muni_dinero: 'Muni Dinero', bank_transfer: 'Transferencia bancaria', phone: 'Teléfono de contacto', personal: 'Datos personales', fullName: 'Nombre completo', residence: 'Lugar de residencia', nationality: 'Nacionalidad', dni: 'DNI', passport: 'Pasaporte', documentNumber: 'Número de documento', titlePdf: 'Título de propiedad (PDF, máx. 10 MB)', pickPdf: 'Elegir PDF', terms: 'Términos', acceptTerms: 'Acepto los términos, la política de privacidad y las condiciones de suscripción.', readTerms: 'Leer los términos', back: 'Atrás', next: 'Continuar', submit: 'Enviar solicitud', sentTitle: 'Solicitud enviada', sentBody: 'Revisaremos tus datos y el pago. Te avisaremos cuando tu cuenta de propietario esté activa.', pendingTitle: 'Solicitud en revisión', pendingBody: 'Ya tienes una solicitud pendiente. Te avisaremos cuando administración la revise.', loading: 'Cargando planes', ownerOnly: 'Ya tienes una cuenta de propietario.', backToProfile: 'Volver al perfil' },
  fr: { title: 'Devenez propriétaire', step: 'Étape {current} sur {total}', plan: 'Choisissez votre formule', monthly: 'Mensuel', yearly: 'Annuel', properties: 'Jusqu’à {count} logements', payment: 'Moyen de paiement', paymentNote: 'L’administration confirme le paiement avant d’activer votre compte propriétaire.', muni_dinero: 'Muni Dinero', bank_transfer: 'Virement bancaire', phone: 'Téléphone de contact', personal: 'Données personnelles', fullName: 'Nom complet', residence: 'Lieu de résidence', nationality: 'Nationalité', dni: 'Carte d’identité', passport: 'Passeport', documentNumber: 'Numéro du document', titlePdf: 'Titre de propriété (PDF, 10 Mo max.)', pickPdf: 'Choisir un PDF', terms: 'Conditions', acceptTerms: 'J’accepte les conditions, la politique de confidentialité et les conditions d’abonnement.', readTerms: 'Lire les conditions', back: 'Retour', next: 'Continuer', submit: 'Envoyer la demande', sentTitle: 'Demande envoyée', sentBody: 'Nous vérifierons vos données et le paiement. Nous vous préviendrons quand votre compte propriétaire sera actif.', pendingTitle: 'Demande en cours d’examen', pendingBody: 'Vous avez déjà une demande en attente. Nous vous préviendrons après son examen.', loading: 'Chargement des formules', ownerOnly: 'Vous avez déjà un compte propriétaire.', backToProfile: 'Retour au profil' },
  en: { title: 'Become an owner', step: 'Step {current} of {total}', plan: 'Choose your plan', monthly: 'Monthly', yearly: 'Yearly', properties: 'Up to {count} properties', payment: 'Payment method', paymentNote: 'Administration confirms the payment before activating your owner account.', muni_dinero: 'Muni Dinero', bank_transfer: 'Bank transfer', phone: 'Contact phone', personal: 'Personal details', fullName: 'Full name', residence: 'Place of residence', nationality: 'Nationality', dni: 'ID card', passport: 'Passport', documentNumber: 'Document number', titlePdf: 'Property title deed (PDF, max 10 MB)', pickPdf: 'Choose PDF', terms: 'Terms', acceptTerms: 'I accept the terms, the privacy policy and the subscription conditions.', readTerms: 'Read the terms', back: 'Back', next: 'Continue', submit: 'Send request', sentTitle: 'Request sent', sentBody: 'We will review your details and the payment, and let you know when your owner account is active.', pendingTitle: 'Request under review', pendingBody: 'You already have a pending request. We will let you know once it has been reviewed.', loading: 'Loading plans', ownerOnly: 'You already have an owner account.', backToProfile: 'Back to profile' },
});

const steps = ['plan', 'payment', 'personal', 'terms'] as const;
type Step = (typeof steps)[number];

export default function OwnerOnboarding() {
  const { palette } = useAppTheme();
  const { locale } = useI18n();
  const copy = useCopy(onboardingCopy);
  const { user, role } = useAuth();
  const profileId = useProfileId();

  const [step, setStep] = useState<Step>('plan');
  const [planType, setPlanType] = useState<OwnerPlanType | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<OwnerUpgradePaymentMethod>('muni_dinero');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState(user?.name ?? '');
  const [residenceLocation, setResidenceLocation] = useState('');
  const [nationality, setNationality] = useState('');
  const [documentType, setDocumentType] = useState<OwnerDocumentType>('dni');
  const [documentNumber, setDocumentNumber] = useState('');
  const [titlePdf, setTitlePdf] = useState<PickedPdf | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const plans = useQuery({ queryKey: ownerPlanKeys.plans, queryFn: fetchOwnerPlans });
  const pending = useQuery({ queryKey: ['owner-upgrade', 'pending', profileId ?? 'none'], queryFn: () => fetchPendingUpgradeRequest(profileId!), enabled: Boolean(profileId) });
  const input: OwnerUpgradeInput | null = planType ? { planType, isYearly, paymentMethod, phoneNumber, fullName, residenceLocation, nationality, documentType, documentNumber } : null;
  const submit = useMutation({
    mutationFn: () => {
      if (!input || !titlePdf || !profileId || !user) throw new Error(copy.loading);
      return submitOwnerUpgradeRequest({ user: { id: profileId, name: user.name, email: user.email }, input, titlePdf });
    },
  });

  if (role && role !== 'client') return <Finished title={copy.title} body={copy.ownerOnly} action={copy.backToProfile} />;
  if (submit.data) return <Finished title={copy.sentTitle} body={copy.sentBody} action={copy.backToProfile} />;
  if (pending.data) return <Finished title={copy.pendingTitle} body={copy.pendingBody} action={copy.backToProfile} />;

  const index = steps.indexOf(step);
  const field = (value: string, onChange: (next: string) => void, label: string, keyboardType: 'default' | 'phone-pad' = 'default') => (
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={label} placeholderTextColor={palette.muted} keyboardType={keyboardType} style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]} />
  );
  const option = (selected: boolean, label: string, onPress: () => void, detail?: string) => (
    <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.option, { borderColor: selected ? colors.brand : palette.border, backgroundColor: selected ? withAlpha(colors.brand, 0.1) : palette.surface }]}>
      <Text style={[styles.optionLabel, { color: palette.text }]}>{label}</Text>
      {detail ? <Text style={[styles.hint, { color: palette.textSecondary }]}>{detail}</Text> : null}
    </Pressable>
  );

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    setTitlePdf({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? undefined, size: asset.size ?? undefined });
  };

  const next = () => {
    setStepError(null);
    if (step === 'plan' && !planType) return;
    if (step === 'personal' && input) {
      const error = validateOwnerUpgradeInput(input);
      if (error) return setStepError(error);
      if (!titlePdf) return setStepError(copy.titlePdf);
    }
    if (step === 'terms') return submit.mutate();
    setStep(steps[index + 1]);
  };

  return (
    <RouteScreen title={copy.title} description={interpolate(copy.step, { current: index + 1, total: steps.length })}>
      <View style={[styles.progressTrack, { backgroundColor: palette.subtle }]}>
        <View style={[styles.progress, { width: `${((index + 1) / steps.length) * 100}%` }]} />
      </View>

      {step === 'plan' ? (
        <View style={styles.group}>
          <Text style={[styles.label, { color: palette.text }]}>{copy.plan}</Text>
          <View style={styles.row}>{[option(!isYearly, copy.monthly, () => setIsYearly(false)), option(isYearly, copy.yearly, () => setIsYearly(true))]}</View>
          {plans.isLoading ? <PremiumEmptyState icon={Clock} title={copy.loading} description="" loading /> : null}
          {plans.data?.map((plan) => option(planType === plan.type, `${plan.name} · ${formatXaf(isYearly ? plan.priceYearly : plan.priceMonthly, undefined, locale)}`, () => setPlanType(plan.type), interpolate(copy.properties, { count: plan.maxProperties })))}
        </View>
      ) : null}

      {step === 'payment' ? (
        <View style={styles.group}>
          <Text style={[styles.label, { color: palette.text }]}>{copy.payment}</Text>
          {ownerUpgradePaymentMethods.map((method) => option(paymentMethod === method, copy[method], () => setPaymentMethod(method)))}
          {field(phoneNumber, setPhoneNumber, copy.phone, 'phone-pad')}
          <Text style={[styles.hint, { color: palette.textSecondary }]}>{copy.paymentNote}</Text>
        </View>
      ) : null}

      {step === 'personal' ? (
        <View style={styles.group}>
          <Text style={[styles.label, { color: palette.text }]}>{copy.personal}</Text>
          {field(fullName, setFullName, copy.fullName)}
          {field(residenceLocation, setResidenceLocation, copy.residence)}
          {field(nationality, setNationality, copy.nationality)}
          <View style={styles.row}>{[option(documentType === 'dni', copy.dni, () => setDocumentType('dni')), option(documentType === 'passport', copy.passport, () => setDocumentType('passport'))]}</View>
          {field(documentNumber, setDocumentNumber, copy.documentNumber)}
          <Text style={[styles.hint, { color: palette.textSecondary }]}>{copy.titlePdf}</Text>
          <PremiumButton variant="secondary" icon={titlePdf ? CheckCircle2 : FileText} label={titlePdf ? titlePdf.name : copy.pickPdf} onPress={() => void pickPdf()} />
        </View>
      ) : null}

      {step === 'terms' ? (
        <View style={styles.group}>
          <Text style={[styles.label, { color: palette.text }]}>{copy.terms}</Text>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: termsAccepted }} onPress={() => setTermsAccepted((value) => !value)} style={styles.consent}>
            {termsAccepted ? <CheckCircle2 color={colors.success} size={20} /> : <View style={[styles.checkbox, { borderColor: palette.border }]} />}
            <Text style={[styles.hint, styles.flex, { color: palette.textSecondary }]}>{copy.acceptTerms}</Text>
          </Pressable>
          <PremiumButton variant="secondary" label={copy.readTerms} onPress={() => router.push('/legal/terms' as Href)} />
        </View>
      ) : null}

      {stepError || submit.error ? <Text accessibilityRole="alert" style={[styles.hint, { color: palette.errorText }]}>{stepError ?? submit.error?.message}</Text> : null}

      <View style={styles.actions}>
        {index > 0 ? <PremiumButton variant="secondary" label={copy.back} onPress={() => setStep(steps[index - 1])} style={styles.action} /> : null}
        <PremiumButton
          label={step === 'terms' ? copy.submit : copy.next}
          loading={submit.isPending}
          disabled={(step === 'plan' && !planType) || (step === 'terms' && !termsAccepted) || submit.isPending}
          onPress={next}
          style={styles.action}
        />
      </View>
    </RouteScreen>
  );
}

function Finished({ title, body, action }: { title: string; body: string; action: string }) {
  const { palette } = useAppTheme();
  return (
    <RouteScreen title={title} description={body}>
      <View style={[styles.finished, { backgroundColor: palette.surface }]}>
        <StatusPill label={title} tone={colors.brand} icon={Clock} />
        <Text style={[styles.hint, { color: palette.textSecondary }]}>{body}</Text>
      </View>
      <PremiumButton label={action} onPress={() => router.replace('/profile' as Href)} />
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progress: { height: 7, backgroundColor: colors.brand },
  group: { gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { fontSize: 17, fontFamily: fontFamily.bold },
  option: { minHeight: touchTarget, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center', gap: 2 },
  optionLabel: { fontSize: 14, fontFamily: fontFamily.bold },
  input: { fontFamily: fontFamily.regular, minHeight: 52, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 16, fontSize: 16 },
  hint: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  consent: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5 },
  flex: { flex: 1 },
  finished: { borderRadius: radius.lg, padding: 18, gap: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: { flex: 1, minWidth: 140 },
});
