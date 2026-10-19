import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { Check, Clock, CreditCard, Crown, ShieldCheck, Sparkles } from '@/components/ui/icons';
import { PremiumButton, PremiumEmptyState, PremiumErrorState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, heroGradient, radius, touchTarget, withAlpha } from '@/constants/theme';
import { useProfileId } from '@/features/auth/use-profile-id';
import {
  cancelOwnerPlanChangeCheckout,
  captureOwnerPlanChangePaypalOrder,
  createOwnerPlanChangeCheckout,
  createOwnerPlanChangeRequest,
  confirmOwnerPlanChangeFondosEg,
  fetchPendingOwnerPlanChange,
  ownerPlanChangeKeys,
  type OwnerPlanChangeProvider,
  type OwnerPlanChangeRequest,
} from '@/features/owner/owner-plan-change.api';
import { fetchOwnerEntitlements, fetchOwnerPlans, ownerPlanKeys } from '@/features/owner/owner-plan.api';
import { useAuth } from '@/providers/auth-context';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatXaf } from '@/utils/formatters';

const subscriptionCopy = defineCopy({
  es: { current: 'Tu plan actual', noPlan: 'Sin plan activo', usage: '{used} de {max} viviendas publicadas', canPublish: 'Puedes publicar', limitReached: 'Límite alcanzado', plansTitle: 'Amplía tu capacidad', monthly: 'Mensual', yearly: 'Anual', properties: 'Hasta {count} viviendas', perMonth: '{price} al mes', perYear: '{price} al año', payment: 'Método de pago', fondoseg: 'FondosEG', stripe: 'Tarjeta bancaria', paypal: 'PayPal', terms: 'Acepto las condiciones de suscripción y el importe indicado para el plan seleccionado.', readTerms: 'Leer condiciones', selectPlan: 'Elige un plan para continuar', pay: 'Pagar {price}', noMethods: 'Los pagos en línea no están habilitados todavía.', pendingTitle: 'Cambio de plan pendiente', pendingBody: 'El plan se actualizará cuando el proveedor confirme el pago. Puedes continuar con el pago o cancelar este intento.', resume: 'Continuar pago', cancel: 'Cancelar intento', changeNote: 'El nuevo cupo se activa al confirmarse el pago en el servidor.', loading: 'Cargando planes', error: 'No pudimos cargar los planes', errorBody: 'Comprueba la conexión y vuelve a intentarlo.', noUpgrade: 'Ya tienes el plan con mayor capacidad disponible.', noCurrent: 'No encontramos un plan activo para tu cuenta. Contacta con soporte para revisar tu suscripción.' },
  fr: { current: 'Votre formule actuelle', noPlan: 'Aucune formule active', usage: '{used} sur {max} logements publiés', canPublish: 'Publication possible', limitReached: 'Limite atteinte', plansTitle: 'Augmentez votre capacité', monthly: 'Mensuel', yearly: 'Annuel', properties: 'Jusqu’à {count} logements', perMonth: '{price} par mois', perYear: '{price} par an', payment: 'Moyen de paiement', fondoseg: 'FondosEG', stripe: 'Carte bancaire', paypal: 'PayPal', terms: 'J’accepte les conditions d’abonnement et le montant indiqué pour la formule choisie.', readTerms: 'Lire les conditions', selectPlan: 'Choisissez une formule pour continuer', pay: 'Payer {price}', noMethods: 'Les paiements en ligne ne sont pas encore activés.', pendingTitle: 'Changement de formule en attente', pendingBody: 'La formule sera mise à jour après confirmation du paiement. Vous pouvez reprendre le paiement ou annuler cette tentative.', resume: 'Reprendre le paiement', cancel: 'Annuler la tentative', changeNote: 'La nouvelle capacité sera activée après confirmation du paiement par le serveur.', loading: 'Chargement des formules', error: 'Impossible de charger les formules', errorBody: 'Vérifiez la connexion et réessayez.', noUpgrade: 'Vous avez déjà la formule offrant la plus grande capacité.', noCurrent: 'Aucune formule active trouvée. Contactez le support pour vérifier votre abonnement.' },
  en: { current: 'Your current plan', noPlan: 'No active plan', usage: '{used} of {max} properties published', canPublish: 'You can publish', limitReached: 'Limit reached', plansTitle: 'Increase your capacity', monthly: 'Monthly', yearly: 'Yearly', properties: 'Up to {count} properties', perMonth: '{price} per month', perYear: '{price} per year', payment: 'Payment method', fondoseg: 'FondosEG', stripe: 'Bank card', paypal: 'PayPal', terms: 'I accept the subscription terms and the displayed price for the selected plan.', readTerms: 'Read the terms', selectPlan: 'Choose a plan to continue', pay: 'Pay {price}', noMethods: 'Online payments are not enabled yet.', pendingTitle: 'Plan change pending', pendingBody: 'Your plan will update after the provider confirms payment. You can continue checkout or cancel this attempt.', resume: 'Continue payment', cancel: 'Cancel attempt', changeNote: 'The new capacity becomes active after the server confirms payment.', loading: 'Loading plans', error: 'We could not load plans', errorBody: 'Check your connection and try again.', noUpgrade: 'You already have the plan with the highest capacity.', noCurrent: 'No active plan was found. Contact support to review your subscription.' },
});

// These public flags only control which payment choices are shown. The Edge
// Functions remain responsible for validating and creating every checkout.
const stripeEnabled = process.env.EXPO_PUBLIC_STRIPE_PAYMENTS_ENABLED !== 'false';
const paypalEnabled = process.env.EXPO_PUBLIC_PAYPAL_PAYMENTS_ENABLED === 'true';

export default function Subscription() {
  const { palette } = useAppTheme();
  const { t, locale } = useI18n();
  const copy = useCopy(subscriptionCopy);
  const { user } = useAuth();
  const profileId = useProfileId();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [provider, setProvider] = useState<OwnerPlanChangeProvider | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const plans = useQuery({ queryKey: ownerPlanKeys.plans, queryFn: fetchOwnerPlans });
  const entitlements = useQuery({ queryKey: ownerPlanKeys.entitlements(profileId ?? 'none'), queryFn: fetchOwnerEntitlements, enabled: Boolean(profileId) });
  const pending = useQuery({ queryKey: ownerPlanChangeKeys.pending(profileId ?? 'none'), queryFn: () => fetchPendingOwnerPlanChange(profileId!), enabled: Boolean(profileId) });
  const current = entitlements.data;
  const currentPlan = plans.data?.find((plan) => plan.type === current?.planType);
  const upgradePlans = plans.data?.filter((plan) => plan.maxProperties > (currentPlan?.maxProperties ?? 0)) ?? [];
  const selectedPlan = upgradePlans.find((plan) => plan.id === selectedPlanId) ?? null;
  const providers: OwnerPlanChangeProvider[] = [
    'fondoseg',
    ...(stripeEnabled ? ['stripe' as const] : []),
    ...(paypalEnabled ? ['paypal' as const] : []),
  ];

  const refreshSubscription = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ownerPlanKeys.entitlements(profileId ?? 'none') }),
      queryClient.invalidateQueries({ queryKey: ownerPlanChangeKeys.pending(profileId ?? 'none') }),
    ]);
  };

  const openCheckout = async (checkoutProvider: OwnerPlanChangeProvider, requestId: string) => {
    const checkout = await createOwnerPlanChangeCheckout(checkoutProvider, requestId);
    await WebBrowser.openBrowserAsync(checkout.checkoutUrl);
    if (checkoutProvider === 'fondoseg') {
      await confirmOwnerPlanChangeFondosEg(requestId).catch(() => undefined);
    } else if (checkoutProvider === 'paypal' && checkout.orderId) {
      await captureOwnerPlanChangePaypalOrder(requestId, checkout.orderId).catch(() => undefined);
    }
    await refreshSubscription();
  };

  const startChange = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!user || !profileId || !currentPlan || !selectedPlan || !provider || !acceptedTerms) throw new Error('Completa la selección del plan, el método de pago y las condiciones.');
      const requestId = await createOwnerPlanChangeRequest({
        user: { id: profileId, name: user.name, email: user.email },
        currentPlanType: currentPlan.type,
        planType: selectedPlan.type,
        isYearly,
        provider,
      });
      try {
        await openCheckout(provider, requestId);
        return requestId;
      } catch (error) {
        await cancelOwnerPlanChangeCheckout(provider, requestId).catch(() => undefined);
        throw error;
      }
    },
    onSettled: refreshSubscription,
  });

  const resumeChange = useMutation({
    retry: false,
    mutationFn: async (request: OwnerPlanChangeRequest) => openCheckout(request.paymentMethod, request.id),
    onSettled: refreshSubscription,
  });
  const cancelChange = useMutation({
    retry: false,
    mutationFn: (request: OwnerPlanChangeRequest) => cancelOwnerPlanChangeCheckout(request.paymentMethod, request.id),
    onSettled: refreshSubscription,
  });

  const option = (selected: boolean, label: string, onPress: () => void, detail?: string) => (
    <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.option, { borderColor: selected ? colors.brand : palette.border, backgroundColor: selected ? withAlpha(colors.brand, 0.1) : palette.surface }]}>
      <Text style={[styles.optionLabel, { color: palette.text }]}>{label}</Text>
      {detail ? <Text style={[styles.optionDetail, { color: palette.textSecondary }]}>{detail}</Text> : null}
    </Pressable>
  );

  const pendingRequest = pending.data;
  const errorMessage = startChange.error?.message ?? resumeChange.error?.message ?? cancelChange.error?.message;

  return (
    <RouteScreen title={t('subscription')} description={t('subscriptionSubtitle')}>
      <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.plan}>
        <View style={styles.planTop}>
          <View style={styles.crown}><Crown color="#FDE68A" fill="#FDE68A" size={28} /></View>
          {current ? <StatusPill label={current.canPublish ? copy.canPublish : copy.limitReached} tone="#FDE68A" icon={Sparkles} /> : null}
        </View>
        <View style={styles.planCopy}>
          <Text style={styles.eyebrow}>{copy.current}</Text>
          <Text style={styles.name}>{currentPlan?.name ?? copy.noPlan}</Text>
          {current ? <Text style={styles.planDescription}>{interpolate(copy.usage, { used: current.usedProperties, max: current.maxProperties })}</Text> : null}
        </View>
      </LinearGradient>

      {pending.isLoading ? <PremiumEmptyState icon={Clock} title={copy.loading} description="" loading /> : null}
      {pendingRequest ? (
        <View style={[styles.pendingCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <StatusPill label={copy.pendingTitle} tone={colors.warning} icon={Clock} />
          <Text style={[styles.pendingBody, { color: palette.textSecondary }]}>{copy.pendingBody}</Text>
          {pendingRequest.paymentStatus !== 'completed' ? (
            <>
              <PremiumButton label={copy.resume} icon={CreditCard} loading={resumeChange.isPending} disabled={resumeChange.isPending || cancelChange.isPending} onPress={() => resumeChange.mutate(pendingRequest)} />
              <PremiumButton variant="secondary" label={copy.cancel} loading={cancelChange.isPending} disabled={cancelChange.isPending || resumeChange.isPending} onPress={() => cancelChange.mutate(pendingRequest)} />
            </>
          ) : null}
        </View>
      ) : null}

      <SectionTitle title={copy.plansTitle} />
      {plans.isLoading ? <PremiumEmptyState icon={Crown} title={copy.loading} description="" loading /> : null}
      {plans.isError ? <PremiumErrorState title={copy.error} description={copy.errorBody} onRetry={() => void plans.refetch()} /> : null}
      {!currentPlan && !plans.isLoading && !plans.isError ? <Text style={[styles.noteText, { color: palette.textSecondary }]}>{copy.noCurrent}</Text> : null}
      {currentPlan && upgradePlans.length === 0 && !pendingRequest ? <Text style={[styles.noteText, { color: palette.textSecondary }]}>{copy.noUpgrade}</Text> : null}

      {currentPlan && upgradePlans.length > 0 && !pendingRequest ? (
        <>
          <View style={styles.row}>
            {option(!isYearly, copy.monthly, () => setIsYearly(false))}
            {option(isYearly, copy.yearly, () => setIsYearly(true))}
          </View>
          <View style={styles.benefits}>
            {upgradePlans.map((plan) => option(
              selectedPlan?.id === plan.id,
              plan.name,
              () => setSelectedPlanId(plan.id),
              `${interpolate(copy.properties, { count: plan.maxProperties })} · ${interpolate(isYearly ? copy.perYear : copy.perMonth, { price: formatXaf(isYearly ? plan.priceYearly : plan.priceMonthly, undefined, locale) })}`,
            ))}
          </View>
          <SectionTitle title={copy.payment} />
          <View style={styles.row}>
            {providers.map((method) => option(provider === method, method === 'fondoseg' ? copy.fondoseg : method === 'stripe' ? copy.stripe : copy.paypal, () => setProvider(method)))}
          </View>
          {providers.length === 0 ? <Text style={[styles.noteText, { color: palette.textSecondary }]}>{copy.noMethods}</Text> : null}
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acceptedTerms }} onPress={() => setAcceptedTerms((value) => !value)} style={styles.consent}>
            {acceptedTerms ? <Check color={colors.success} size={20} /> : <View style={[styles.checkbox, { borderColor: palette.border }]} />}
            <Text style={[styles.noteText, styles.flex, { color: palette.textSecondary }]}>{copy.terms}</Text>
          </Pressable>
          <PremiumButton variant="secondary" label={copy.readTerms} onPress={() => router.push('/legal/terms' as Href)} />
          <PremiumButton
            label={selectedPlan ? interpolate(copy.pay, { price: formatXaf(isYearly ? selectedPlan.priceYearly : selectedPlan.priceMonthly, undefined, locale) }) : copy.selectPlan}
            icon={CreditCard}
            loading={startChange.isPending}
            disabled={!selectedPlan || !provider || !acceptedTerms || providers.length === 0 || startChange.isPending || !profileId}
            onPress={() => startChange.mutate()}
          />
        </>
      ) : null}

      {errorMessage ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{errorMessage}</Text> : null}
      <View style={[styles.guarantee, { backgroundColor: `${colors.success}0D`, borderColor: `${colors.success}25` }]}>
        <ShieldCheck color={colors.success} size={23} />
        <Text style={[styles.guaranteeText, { color: palette.textSecondary }]}>{copy.changeNote}</Text>
      </View>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  plan: { minHeight: 200, borderRadius: radius.hero, borderCurve: 'continuous', padding: 22, justifyContent: 'space-between', overflow: 'hidden', boxShadow: `0 18px 38px ${withAlpha(colors.brand, 0.22)}` },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  crown: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  planCopy: { gap: 6 },
  eyebrow: { color: colors.onBrandMuted, fontSize: 12, fontFamily: fontFamily.bold, letterSpacing: 0.4 },
  name: { color: 'white', fontSize: 28, lineHeight: 34, fontFamily: fontFamily.extrabold, letterSpacing: -0.6 },
  planDescription: { fontFamily: fontFamily.regular, color: colors.onBrandMuted, fontSize: 15, lineHeight: 22 },
  benefits: { gap: 10 },
  option: { minHeight: touchTarget, borderWidth: 1, borderRadius: radius.xl, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center', gap: 3, flexGrow: 1, flexBasis: 145 },
  optionLabel: { fontSize: 14, fontFamily: fontFamily.bold },
  optionDetail: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily.regular },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pendingCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 14, gap: 10 },
  pendingBody: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  noteText: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  consent: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 20, height: 20, borderWidth: 1.5, borderRadius: 6 },
  flex: { flex: 1 },
  error: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  guarantee: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  guaranteeText: { fontFamily: fontFamily.regular, flex: 1, fontSize: 12, lineHeight: 18 },
});




