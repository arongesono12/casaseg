import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { UserAvatar } from '@/components/user-avatar';
import { AlertCircle, ArrowRight, Building2, Clock, ShieldCheck, Sparkles, UsersRound } from '@/components/ui/icons';
import { IconTile, MetricCard, PremiumEmptyState, PremiumErrorState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { fetchAdminOverview } from '@/features/admin/admin.api';
import { useAuth } from '@/providers/auth-context';
import { useAppTheme } from '@/providers/theme-context';

export default function AdminDashboard() {
  const { role } = useAuth();
  const { palette } = useAppTheme();
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: fetchAdminOverview });
  const metrics = overview.data?.metrics;
  const pendingProperties = overview.data?.properties.filter((property) => property.legalStatus === 'pending').slice(0, 3) ?? [];
  const recentUsers = overview.data?.users.slice(0, 3) ?? [];

  return (
    <RouteScreen title="Panel de administración" description="Supervisa usuarios, propiedades y señales que requieren atención.">
      <LinearGradient colors={role === 'superadmin' ? ['#3B0764', '#6D28D9'] : ['#172554', '#1D4ED8']} style={styles.roleBanner}>
        <View style={styles.roleIcon}><ShieldCheck color="white" size={28} /></View>
        <View style={styles.roleCopy}>
          <View style={styles.roleEyebrow}><Sparkles color="#DBEAFE" size={14} /><Text style={styles.roleEyebrowText}>ACCESO ADMINISTRATIVO</Text></View>
          <Text style={styles.roleTitle}>{role === 'superadmin' ? 'Superadministrador' : 'Administrador'}</Text>
          <Text style={styles.roleDescription}>Las operaciones visibles dependen de permisos verificados en el servidor.</Text>
        </View>
      </LinearGradient>

      {overview.isLoading ? <PremiumEmptyState icon={ShieldCheck} title="Preparando el panel" description="Estamos validando métricas y responsabilidades administrativas." loading /> : null}
      {overview.isError ? <PremiumErrorState title="No pudimos abrir el panel" description="Tu sesión sigue protegida. Comprueba la conexión y vuelve a intentarlo." onRetry={() => void overview.refetch()} /> : null}

      {overview.data ? (
        <>
          <View style={styles.metrics}>
            <MetricCard label="Usuarios" value={metrics?.users ?? 0} icon={UsersRound} />
            <MetricCard label="Propiedades" value={metrics?.properties ?? 0} icon={Building2} tone="#7C3AED" />
            <MetricCard label="Revisiones pendientes" value={metrics?.pendingProperties ?? 0} icon={AlertCircle} tone={colors.warning} />
          </View>

          <View style={styles.actions}>
            <AdminAction icon={UsersRound} title="Gestión de usuarios" description="Consulta roles, estados y solicitudes de propietario." tone={colors.brand} onPress={() => router.push('/admin/users')} />
            <AdminAction icon={Building2} title="Supervisión de propiedades" description="Revisa publicaciones pendientes, verificadas o restringidas." tone="#7C3AED" onPress={() => router.push('/admin/properties')} />
          </View>

          <SectionTitle title="Publicaciones por revisar" detail="Propiedades cuya verificación legal sigue pendiente." action={pendingProperties.length ? <StatusPill label={`${metrics?.pendingProperties ?? 0} pendientes`} tone={colors.warning} icon={Clock} /> : undefined} />
          {pendingProperties.length ? (
            <View style={styles.previewList}>
              {pendingProperties.map((property) => (
                <Pressable key={property.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/property/[id]', params: { id: property.id } })} style={({ pressed }) => [styles.previewRow, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}>
                  <IconTile icon={Building2} tone={colors.warning} size={44} />
                  <View style={styles.previewCopy}><Text numberOfLines={1} style={[styles.previewTitle, { color: palette.text }]}>{property.title}</Text><Text numberOfLines={1} style={[styles.previewDetail, { color: palette.textSecondary }]}>{property.location}</Text></View>
                  <StatusPill label="Pendiente" tone={colors.warning} icon={Clock} />
                </Pressable>
              ))}
            </View>
          ) : <PremiumEmptyState icon={ShieldCheck} title="Revisión al día" description="No hay propiedades pendientes de verificación en este momento." />}

          <SectionTitle title="Usuarios recientes" detail="Últimas cuentas visibles para tu rol." action={<Pressable onPress={() => router.push('/admin/users')}><Text style={styles.viewAll}>Ver todos</Text></Pressable>} />
          <View style={styles.previewList}>
            {recentUsers.map((user) => (
              <View key={user.id} style={[styles.previewRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <UserAvatar name={user.name} uri={user.avatar} size={44} />
                <View style={styles.previewCopy}><Text numberOfLines={1} style={[styles.previewTitle, { color: palette.text }]}>{user.name}</Text><Text numberOfLines={1} style={[styles.previewDetail, { color: palette.textSecondary }]}>{user.email}</Text></View>
                <StatusPill label={user.role} tone={user.role === 'owner' ? '#7C3AED' : user.role === 'client' ? colors.success : colors.brand} />
              </View>
            ))}
          </View>
        </>
      ) : null}
    </RouteScreen>
  );
}

function AdminAction({ icon: Icon, title, description, tone, onPress }: { icon: typeof UsersRound; title: string; description: string; tone: string; onPress: () => void }) {
  const { palette } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.action, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}>
      <IconTile icon={Icon} tone={tone} size={48} />
      <View style={styles.actionCopy}><Text style={[styles.actionTitle, { color: palette.text }]}>{title}</Text><Text style={[styles.actionDescription, { color: palette.textSecondary }]}>{description}</Text></View>
      <ArrowRight color={palette.muted} size={21} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  roleBanner: { minHeight: 142, borderRadius: radius.xl, borderCurve: 'continuous', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, boxShadow: '0 14px 30px rgba(29,78,216,0.20)' },
  roleIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  roleCopy: { flex: 1, gap: 6 },
  roleEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleEyebrowText: { color: '#DBEAFE', fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  roleTitle: { color: 'white', fontSize: 22, fontWeight: '900' },
  roleDescription: { color: '#DBEAFE', fontSize: 12, lineHeight: 18 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actions: { gap: 10 },
  action: { minHeight: 94, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  actionCopy: { flex: 1, minWidth: 0, gap: 4 },
  actionTitle: { fontSize: 16, fontWeight: '900' },
  actionDescription: { fontSize: 12, lineHeight: 17 },
  previewList: { gap: 9 },
  previewRow: { minHeight: 74, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  previewCopy: { flex: 1, minWidth: 0, gap: 3 },
  previewTitle: { fontSize: 14, fontWeight: '900' },
  previewDetail: { fontSize: 12, lineHeight: 17 },
  viewAll: { color: colors.brand, fontSize: 13, fontWeight: '900', paddingVertical: 8 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
});
