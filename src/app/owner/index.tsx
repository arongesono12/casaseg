import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { ArrowRight, Building2, Calendar, ChartLine, CreditCard, Crown, FileText, Plus, ShieldCheck, Sparkles } from '@/components/ui/icons';
import { IconTile, MetricCard, SectionTitle, StatusPill } from '@/components/ui/premium';
import { actionGradient, colors, radius, type AppPalette } from '@/constants/theme';
import { fetchPaymentOrders } from '@/features/payments/payments.api';
import { fetchOwnerProperties } from '@/features/properties/api/property.queries';
import { fetchOwnerVisitRequests } from '@/features/properties/api/visit-requests';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

type DashboardAction = {
  label: string;
  description: string;
  href: Href;
  icon: ReactNode;
  tone: string;
  badge?: string;
};

export default function OwnerHome() {
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const properties = useQuery({ queryKey: ['properties', 'owner', user!.id], queryFn: () => fetchOwnerProperties(user!.id) });
  const requests = useQuery({ queryKey: ['owner', 'visit-requests'], queryFn: fetchOwnerVisitRequests });
  const payments = useQuery({ queryKey: ['payment-orders'], queryFn: fetchPaymentOrders });
  const pendingRequests = (requests.data ?? []).filter((request) => request.status === 'pending').length;
  const completedPayments = (payments.data ?? []).filter((payment) => payment.status === 'completed').length;

  const actions: DashboardAction[] = [
    { label: t('myProperties'), description: 'Edita, publica y controla el estado de tus anuncios.', href: '/owner/properties', icon: <Building2 color={colors.brand} size={22} />, tone: colors.brand, badge: properties.data?.length ? `${properties.data.length} activas` : undefined },
    { label: t('requests'), description: 'Revisa y responde solicitudes de visita.', href: '/owner/requests' as Href, icon: <Calendar color="#7C3AED" size={22} />, tone: '#7C3AED', badge: pendingRequests ? `${pendingRequests} pendientes` : undefined },
    { label: t('payments'), description: 'Consulta operaciones y cobros confirmados.', href: '/owner/payments', icon: <CreditCard color="#D97706" size={22} />, tone: '#D97706' },
    { label: t('contracts'), description: 'Gestiona documentos, versiones y firmas.', href: '/owner/contracts', icon: <FileText color={colors.success} size={22} />, tone: colors.success },
    { label: t('subscription'), description: 'Mejora la visibilidad y tus herramientas.', href: '/owner/subscription', icon: <Crown color="#9333EA" size={22} />, tone: '#9333EA', badge: 'Profesional' },
  ];

  return (
    <RouteScreen title={t('ownerPanel')} description={t('ownerPanelSubtitle')}>
      <View style={styles.metrics}>
        <MetricCard label="Propiedades" value={properties.isLoading ? '—' : properties.data?.length ?? 0} icon={Building2} />
        <MetricCard label="Visitas pendientes" value={requests.isLoading ? '—' : pendingRequests} icon={Calendar} tone="#7C3AED" />
        <MetricCard label="Pagos completados" value={payments.isLoading ? '—' : completedPayments} icon={ChartLine} tone={colors.success} />
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/owner/property/create')} style={({ pressed }) => [styles.createCard, pressed && styles.pressed]}>
        <LinearGradient colors={actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.createGradient}>
          <View style={styles.createIcon}><Plus color="white" size={25} /></View>
          <View style={styles.createCopy}>
            <View style={styles.createEyebrow}><Sparkles color="#DBEAFE" size={14} /><Text style={styles.createEyebrowText}>NUEVA PUBLICACIÓN</Text></View>
            <Text style={styles.createTitle}>{t('createProperty')}</Text>
            <Text style={styles.createDescription}>Crea un anuncio atractivo con fotos, características y precio.</Text>
          </View>
          <ArrowRight color="white" size={23} />
        </LinearGradient>
      </Pressable>

      <View style={styles.securityNote}>
        <IconTile icon={ShieldCheck} tone={colors.success} size={42} />
        <View style={styles.securityCopy}>
          <Text style={[styles.securityTitle, { color: palette.text }]}>Operaciones verificadas</Text>
          <Text style={[styles.securityDescription, { color: palette.textSecondary }]}>Publicaciones, pagos y contratos se validan en el servidor.</Text>
        </View>
      </View>

      <SectionTitle title="Centro de gestión" detail="Todo lo necesario para administrar tus propiedades." />
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
  createCard: { borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', boxShadow: '0 14px 30px rgba(29,78,216,0.20)' },
  createGradient: { minHeight: 132, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  createIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  createCopy: { flex: 1, gap: 5 },
  createEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  createEyebrowText: { color: '#DBEAFE', fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  createTitle: { color: 'white', fontSize: 20, fontWeight: '900' },
  createDescription: { color: '#DBEAFE', fontSize: 12, lineHeight: 17 },
  securityNote: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  securityCopy: { flex: 1, gap: 3 },
  securityTitle: { fontSize: 14, fontWeight: '900' },
  securityDescription: { fontSize: 12, lineHeight: 17 },
  grid: { gap: 10 },
  item: { minHeight: 92, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  itemIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1, minWidth: 0, gap: 5 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  label: { fontSize: 16, fontWeight: '900' },
  itemDescription: { fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
});
