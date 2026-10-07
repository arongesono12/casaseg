import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { Check, Crown, ShieldCheck, Sparkles } from '@/components/ui/icons';
import { PremiumButton, PremiumEmptyState, PremiumErrorState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, heroGradient, radius, withAlpha } from '@/constants/theme';
import { useProfileId } from '@/features/auth/use-profile-id';
import { fetchOwnerEntitlements, fetchOwnerPlans, ownerPlanKeys } from '@/features/owner/owner-plan.api';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatXaf } from '@/utils/formatters';

// Planes y cupo reales de public.owner_plans y get_owner_entitlements, los mismos
// que muestra la web. La web no permite que un propietario cambie de plan por
// su cuenta (owner_upgrade_requests solo admite clientes), así que el cambio se
// pide a soporte.

const subscriptionCopy = defineCopy({
  es: { current: 'Tu plan actual', noPlan: 'Sin plan activo', usage: '{used} de {max} propiedades publicadas', canPublish: 'Puedes publicar', limitReached: 'Límite alcanzado', plansTitle: 'Planes disponibles', perMonth: '{price} al mes', properties: 'Hasta {count} propiedades', changeNote: 'Para cambiar de plan, escribe a soporte: revisaremos tu cuenta y aplicaremos el nuevo cupo.', contact: 'Contactar con soporte', loading: 'Cargando planes', error: 'No pudimos cargar los planes', errorBody: 'Comprueba la conexión y vuelve a intentarlo.' },
  fr: { current: 'Votre formule actuelle', noPlan: 'Aucune formule active', usage: '{used} sur {max} logements publiés', canPublish: 'Vous pouvez publier', limitReached: 'Limite atteinte', plansTitle: 'Formules disponibles', perMonth: '{price} par mois', properties: 'Jusqu’à {count} logements', changeNote: 'Pour changer de formule, écrivez au support : nous examinerons votre compte et appliquerons la nouvelle limite.', contact: 'Contacter le support', loading: 'Chargement des formules', error: 'Impossible de charger les formules', errorBody: 'Vérifiez la connexion et réessayez.' },
  en: { current: 'Your current plan', noPlan: 'No active plan', usage: '{used} of {max} properties published', canPublish: 'You can publish', limitReached: 'Limit reached', plansTitle: 'Available plans', perMonth: '{price} per month', properties: 'Up to {count} properties', changeNote: 'To change plan, contact support: we will review your account and apply the new limit.', contact: 'Contact support', loading: 'Loading plans', error: 'We could not load the plans', errorBody: 'Check your connection and try again.' },
});

export default function Subscription() {
  const { palette } = useAppTheme();
  const { t, locale } = useI18n();
  const copy = useCopy(subscriptionCopy);
  const profileId = useProfileId();
  const plans = useQuery({ queryKey: ownerPlanKeys.plans, queryFn: fetchOwnerPlans });
  const entitlements = useQuery({ queryKey: ownerPlanKeys.entitlements(profileId ?? 'none'), queryFn: fetchOwnerEntitlements, enabled: Boolean(profileId) });
  const current = entitlements.data;
  const currentPlan = plans.data?.find((plan) => plan.type === current?.planType);

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

      <SectionTitle title={copy.plansTitle} />
      {plans.isLoading ? <PremiumEmptyState icon={Crown} title={copy.loading} description="" loading /> : null}
      {plans.isError ? <PremiumErrorState title={copy.error} description={copy.errorBody} onRetry={() => void plans.refetch()} /> : null}
      <View style={styles.benefits}>
        {plans.data?.map((plan) => (
          <View key={plan.id} style={[styles.benefit, { backgroundColor: palette.surface, borderColor: plan.type === current?.planType ? colors.brand : palette.border }]}>
            <View style={styles.benefitCopy}>
              <Text style={[styles.benefitTitle, { color: palette.text }]}>{plan.name}</Text>
              <Text style={[styles.benefitDescription, { color: palette.textSecondary }]}>{interpolate(copy.perMonth, { price: formatXaf(plan.priceMonthly, undefined, locale) })} · {interpolate(copy.properties, { count: plan.maxProperties })}</Text>
              {plan.features.map((feature) => (
                <View key={feature} style={styles.feature}><Check color={colors.success} size={16} /><Text style={[styles.benefitDescription, { color: palette.textSecondary }]}>{feature}</Text></View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.guarantee, { backgroundColor: `${colors.success}0D`, borderColor: `${colors.success}25` }]}>
        <ShieldCheck color={colors.success} size={23} />
        <Text style={[styles.guaranteeText, { color: palette.textSecondary }]}>{copy.changeNote}</Text>
      </View>
      <PremiumButton variant="secondary" label={copy.contact} onPress={() => router.push('/legal/help' as Href)} />
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
  benefit: { borderWidth: 1, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  benefitCopy: { flex: 1, gap: 5 },
  benefitTitle: { fontSize: 15, fontFamily: fontFamily.bold },
  benefitDescription: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17, flexShrink: 1 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guarantee: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  guaranteeText: { fontFamily: fontFamily.regular, flex: 1, fontSize: 12, lineHeight: 18 },
});
