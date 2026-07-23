import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { ChartLine, Check, Crown, ShieldCheck, Sparkles, Zap } from '@/components/ui/icons';
import { PremiumButton, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { openSubscriptionCheckout } from '@/features/payments/subscriptions.api';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const benefits = [
  { icon: Sparkles, title: 'Mayor visibilidad', description: 'Destaca tus anuncios en las búsquedas relevantes.' },
  { icon: ChartLine, title: 'Métricas avanzadas', description: 'Entiende el interés y rendimiento de cada propiedad.' },
  { icon: Zap, title: 'Herramientas prioritarias', description: 'Gestiona publicaciones y solicitudes con mayor agilidad.' },
];

export default function Subscription() {
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const checkout = useMutation({ mutationFn: openSubscriptionCheckout, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }) });

  return (
    <RouteScreen title={t('subscription')} description={t('subscriptionSubtitle')}>
      <LinearGradient colors={['#3B0764', '#6D28D9', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.plan}>
        <View style={styles.planTop}>
          <View style={styles.crown}><Crown color="#FDE68A" fill="#FDE68A" size={28} /></View>
          <StatusPill label="Recomendado" tone="#FDE68A" icon={Sparkles} />
        </View>
        <View style={styles.planCopy}>
          <Text style={styles.name}>{t('proPlan')}</Text>
          <Text style={styles.planDescription}>{t('proPlanDescription')}</Text>
        </View>
        <View style={styles.planTrust}><ShieldCheck color="#C4B5FD" size={17} /><Text style={styles.planTrustText}>Checkout seguro · Cancela cuando quieras</Text></View>
      </LinearGradient>

      <SectionTitle title="Todo lo que incluye" detail="Herramientas pensadas para una gestión profesional." />
      <View style={styles.benefits}>
        {benefits.map(({ icon: Icon, title, description }) => (
          <View key={title} style={[styles.benefit, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.benefitIcon}><Icon color="#7C3AED" size={22} /></View>
            <View style={styles.benefitCopy}><Text style={[styles.benefitTitle, { color: palette.text }]}>{title}</Text><Text style={[styles.benefitDescription, { color: palette.textSecondary }]}>{description}</Text></View>
            <Check color={colors.success} size={20} />
          </View>
        ))}
      </View>

      <View style={[styles.guarantee, { backgroundColor: `${colors.success}0D`, borderColor: `${colors.success}25` }]}>
        <ShieldCheck color={colors.success} size={23} />
        <Text style={[styles.guaranteeText, { color: palette.textSecondary }]}>La mejora del plan solo se activa después de que el proveedor confirma el pago.</Text>
      </View>
      <PremiumButton label={t('upgradePlan')} icon={Crown} loading={checkout.isPending} onPress={() => checkout.mutate('professional')} />
      {checkout.error ? <Text accessibilityRole="alert" style={styles.error}>{checkout.error.message}</Text> : null}
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  plan: { minHeight: 250, borderRadius: radius.hero, borderCurve: 'continuous', padding: 22, justifyContent: 'space-between', overflow: 'hidden', boxShadow: '0 18px 38px rgba(109,40,217,0.22)' },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  crown: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  planCopy: { gap: 9 },
  name: { color: 'white', fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.6 },
  planDescription: { color: '#EDE9FE', fontSize: 15, lineHeight: 22 },
  planTrust: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  planTrustText: { color: '#DDD6FE', fontSize: 12, fontWeight: '700' },
  benefits: { gap: 10 },
  benefit: { minHeight: 88, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  benefitIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(124,58,237,0.10)', alignItems: 'center', justifyContent: 'center' },
  benefitCopy: { flex: 1, gap: 3 },
  benefitTitle: { fontSize: 14, fontWeight: '900' },
  benefitDescription: { fontSize: 12, lineHeight: 17 },
  guarantee: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  guaranteeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  error: { color: colors.error, fontSize: 13, lineHeight: 18 },
});
