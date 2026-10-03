import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { ArrowRight, Building2, Calendar, ChartLine, CreditCard, Crown, FileText, Plus, Sparkles } from '@/components/ui/icons';
import { MetricCard, SectionTitle, StatusPill } from '@/components/ui/premium';
import { actionGradient, type AppPalette, colors, radius, withAlpha } from '@/constants/theme';
import { fetchPaymentOrders } from '@/features/payments/payments.api';
import { useProfileId } from '@/features/auth/use-profile-id';
import { fetchOwnerVisitRequests, visitRequestKeys } from '@/features/properties/api/visit-requests';
import { useOwnerProperties } from '@/features/owner/use-owner-properties';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const ownerHomeCopy = defineCopy({
  es: { propertiesDetail: 'Edita, publica y controla el estado de tus anuncios.', requestsDetail: 'Revisa y responde solicitudes de visita.', paymentsDetail: 'Consulta operaciones y cobros confirmados.', contractsDetail: 'Gestiona documentos, versiones y firmas.', subscriptionDetail: 'Mejora la visibilidad y tus herramientas.', professional: 'Profesional', properties: 'Propiedades', pendingVisits: 'Visitas pendientes', completedPayments: 'Pagos completados', newListing: 'NUEVA PUBLICACIÓN', createDetail: 'Crea un anuncio atractivo con fotos, características y precio.', hubTitle: 'Centro de gestión' },
  fr: { propertiesDetail: 'Modifiez, publiez et suivez le statut de vos annonces.', requestsDetail: 'Consultez les demandes de visite et répondez-y.', paymentsDetail: 'Consultez les opérations et encaissements confirmés.', contractsDetail: 'Gérez documents, versions et signatures.', subscriptionDetail: 'Améliorez votre visibilité et vos outils.', professional: 'Professionnel', properties: 'Logements', pendingVisits: 'Visites en attente', completedPayments: 'Paiements terminés', newListing: 'NOUVELLE ANNONCE', createDetail: 'Créez une annonce attrayante avec photos, caractéristiques et prix.', hubTitle: 'Centre de gestion' },
  en: { propertiesDetail: 'Edit, publish and track the status of your listings.', requestsDetail: 'Review and answer visit requests.', paymentsDetail: 'See transactions and confirmed payouts.', contractsDetail: 'Manage documents, versions and signatures.', subscriptionDetail: 'Boost your visibility and tools.', professional: 'Professional', properties: 'Properties', pendingVisits: 'Pending visits', completedPayments: 'Completed payments', newListing: 'NEW LISTING', createDetail: 'Create an attractive listing with photos, features and price.', hubTitle: 'Management hub' },
});

type DashboardAction = {
  label: string;
  description: string;
  href: Href;
  icon: ReactNode;
  tone: string;
  badge?: string;
};

export default function OwnerHome() {
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const copy = useCopy(ownerHomeCopy);
  const properties = useOwnerProperties();
  // visit_requests.owner_id guarda el uuid de public.users, no el id de Clerk.
  const profileId = useProfileId();
  const requests = useQuery({ queryKey: visitRequestKeys.owner(profileId ?? 'pending'), queryFn: () => fetchOwnerVisitRequests(profileId!), enabled: Boolean(profileId) });
  const payments = useQuery({ queryKey: ['payment-orders'], queryFn: fetchPaymentOrders });
  const pendingRequests = (requests.data ?? []).filter((request) => request.status === 'pending').length;
  const completedPayments = (payments.data ?? []).filter((payment) => payment.status === 'completed').length;

  const actions: DashboardAction[] = [
    { label: t('myProperties'), description: copy.propertiesDetail, href: '/owner/properties', icon: <Building2 color={palette.brandIcon} size={22} />, tone: colors.brand },
    { label: t('requests'), description: copy.requestsDetail, href: '/owner/requests' as Href, icon: <Calendar color={palette.brandIcon} size={22} />, tone: colors.primary },
    { label: t('payments'), description: copy.paymentsDetail, href: '/owner/payments', icon: <CreditCard color="#D97706" size={22} />, tone: '#D97706' },
    { label: t('contracts'), description: copy.contractsDetail, href: '/owner/contracts', icon: <FileText color={colors.success} size={22} />, tone: colors.success },
    { label: t('subscription'), description: copy.subscriptionDetail, href: '/owner/subscription', icon: <Crown color={palette.brandIcon} size={22} />, tone: colors.primary, badge: copy.professional },
  ];

  return (
    <RouteScreen title={t('ownerPanel')} description={t('ownerPanelSubtitle')}>
      <View style={styles.metrics}>
        <MetricCard label={copy.properties} value={properties.isPending ? '—' : properties.data?.length ?? 0} icon={Building2} />
        <MetricCard label={copy.pendingVisits} value={requests.isLoading ? '—' : pendingRequests} icon={Calendar} tone={colors.primary} />
        <MetricCard label={copy.completedPayments} value={payments.isLoading ? '—' : completedPayments} icon={ChartLine} tone={colors.success} />
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/owner/property/create')} style={({ pressed }) => [styles.createCard, pressed && styles.pressed]}>
        <LinearGradient colors={actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.createGradient}>
          <View style={styles.createIcon}><Plus color="white" size={25} /></View>
          <View style={styles.createCopy}>
            <View style={styles.createEyebrow}><Sparkles color={colors.onBrandMuted} size={14} /><Text style={styles.createEyebrowText}>{copy.newListing}</Text></View>
            <Text style={styles.createTitle}>{t('createProperty')}</Text>
            <Text style={styles.createDescription}>{copy.createDetail}</Text>
          </View>
          <ArrowRight color="white" size={23} />
        </LinearGradient>
      </Pressable>

      <SectionTitle title={copy.hubTitle} />
      <View style={styles.grid}>
        {actions.map((action) => <DashboardCard key={String(action.href)} action={action} palette={palette} />)}
      </View>
    </RouteScreen>
  );
}

function DashboardCard({ action, palette }: { action: DashboardAction; palette: AppPalette }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={() => router.push(action.href)} style={({ pressed }) => [styles.item, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}>
      <View style={[styles.itemIcon, { backgroundColor: `${action.tone}14` }]}>{action.icon}</View>
      <View style={styles.itemCopy}>
        <View style={styles.itemTitleRow}>
          <Text style={[styles.label, { color: palette.text }]}>{action.label}</Text>
          {action.badge ? <StatusPill label={action.badge} tone={action.tone} /> : null}
        </View>
        <Text style={[styles.itemDescription, { color: palette.textSecondary }]}>{action.description}</Text>
      </View>
      <ArrowRight color={palette.muted} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  createCard: { borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', boxShadow: `0 14px 30px ${withAlpha(colors.brand, 0.20)}` },
  createGradient: { minHeight: 132, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  createIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  createCopy: { flex: 1, gap: 5 },
  createEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  createEyebrowText: { color: colors.onBrandMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.9 },
  createTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
  createDescription: { color: colors.onBrandMuted, fontSize: 12, lineHeight: 17 },
  grid: { gap: 10 },
  item: { minHeight: 92, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  itemIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1, minWidth: 0, gap: 5 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  label: { fontSize: 16, fontWeight: '700' },
  itemDescription: { fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
});
