import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { ChartLine, Check, Crown, ShieldCheck, Sparkles, Zap } from '@/components/ui/icons';
import { PremiumButton, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, heroGradient, radius, withAlpha } from '@/constants/theme';
import { openSubscriptionCheckout } from '@/features/payments/subscriptions.api';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const subscriptionCopy = defineCopy({
  es: { visibilityTitle: 'Mayor visibilidad', visibilityBody: 'Destaca tus anuncios en las búsquedas relevantes.', metricsTitle: 'Métricas avanzadas', metricsBody: 'Entiende el interés y rendimiento de cada propiedad.', toolsTitle: 'Herramientas prioritarias', toolsBody: 'Gestiona publicaciones y solicitudes con mayor agilidad.', recommended: 'Recomendado', includesTitle: 'Todo lo que incluye', guarantee: 'La mejora del plan solo se activa después de que el proveedor confirma el pago.' },
  fr: { visibilityTitle: 'Plus de visibilité', visibilityBody: 'Mettez vos annonces en avant dans les recherches pertinentes.', metricsTitle: 'Statistiques avancées', metricsBody: 'Comprenez l’intérêt et la performance de chaque logement.', toolsTitle: 'Outils prioritaires', toolsBody: 'Gérez annonces et demandes plus rapidement.', recommended: 'Recommandé', includesTitle: 'Tout ce qui est inclus', guarantee: 'L’amélioration du plan n’est activée qu’après confirmation du paiement par le prestataire.' },
  en: { visibilityTitle: 'More visibility', visibilityBody: 'Feature your listings in relevant searches.', metricsTitle: 'Advanced metrics', metricsBody: 'Understand the interest and performance of each property.', toolsTitle: 'Priority tools', toolsBody: 'Manage listings and requests faster.', recommended: 'Recommended', includesTitle: 'Everything included', guarantee: 'The plan upgrade is only activated after the provider confirms the payment.' },
});

export default function Subscription() {
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const copy = useCopy(subscriptionCopy);
  const benefits = [
    { icon: Sparkles, title: copy.visibilityTitle, description: copy.visibilityBody },
    { icon: ChartLine, title: copy.metricsTitle, description: copy.metricsBody },
    { icon: Zap, title: copy.toolsTitle, description: copy.toolsBody },
  ];
  const queryClient = useQueryClient();
  const checkout = useMutation({ mutationFn: openSubscriptionCheckout, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }) });

  return (
    <RouteScreen title={t('subscription')} description={t('subscriptionSubtitle')}>
      <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.plan}>
        <View style={styles.planTop}>
          <View style={styles.crown}><Crown color="#FDE68A" fill="#FDE68A" size={28} /></View>
          <StatusPill label={copy.recommended} tone="#FDE68A" icon={Sparkles} />
        </View>
        <View style={styles.planCopy}>
          <Text style={styles.name}>{t('proPlan')}</Text>
          <Text style={styles.planDescription}>{t('proPlanDescription')}</Text>
        </View>
      </LinearGradient>

      <SectionTitle title={copy.includesTitle} />
      <View style={styles.benefits}>
        {benefits.map(({ icon: Icon, title, description }) => (
          <View key={title} style={[styles.benefit, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.benefitIcon}><Icon color={palette.brandIcon} size={22} /></View>
            <View style={styles.benefitCopy}><Text style={[styles.benefitTitle, { color: palette.text }]}>{title}</Text><Text style={[styles.benefitDescription, { color: palette.textSecondary }]}>{description}</Text></View>
            <Check color={colors.success} size={20} />
          </View>
        ))}
      </View>

      <View style={[styles.guarantee, { backgroundColor: `${colors.success}0D`, borderColor: `${colors.success}25` }]}>
        <ShieldCheck color={colors.success} size={23} />
        <Text style={[styles.guaranteeText, { color: palette.textSecondary }]}>{copy.guarantee}</Text>
      </View>
      <PremiumButton label={t('upgradePlan')} icon={Crown} loading={checkout.isPending} onPress={() => checkout.mutate('professional')} />
      {checkout.error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>{checkout.error.message}</Text> : null}
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  plan: { minHeight: 250, borderRadius: radius.hero, borderCurve: 'continuous', padding: 22, justifyContent: 'space-between', overflow: 'hidden', boxShadow: `0 18px 38px ${withAlpha(colors.brand, 0.22)}` },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  crown: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  planCopy: { gap: 9 },
  name: { color: 'white', fontSize: 28, lineHeight: 34, fontFamily: fontFamily.extrabold, letterSpacing: -0.6 },
  planDescription: { fontFamily: fontFamily.regular, color: colors.onBrandMuted, fontSize: 15, lineHeight: 22 },
  benefits: { gap: 10 },
  benefit: { minHeight: 88, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  benefitIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: withAlpha(colors.primary, 0.10), alignItems: 'center', justifyContent: 'center' },
  benefitCopy: { flex: 1, gap: 3 },
  benefitTitle: { fontSize: 14, fontFamily: fontFamily.bold },
  benefitDescription: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  guarantee: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  guaranteeText: { fontFamily: fontFamily.regular, flex: 1, fontSize: 12, lineHeight: 18 },
  error: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
});
