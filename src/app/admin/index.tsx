import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { UserAvatar } from '@/components/user-avatar';
import { AlertCircle, ArrowRight, Building2, Clock, RefreshCw, ShieldCheck, UsersRound } from '@/components/ui/icons';
import { HeroBadge, IconTile, MetricCard, PremiumEmptyState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius } from '@/constants/theme';
import { fetchAdminOverview } from '@/features/admin/admin.api';
import { useAuth } from '@/providers/auth-context';
import { roleLabel, statusLabel } from '@/features/admin/admin-copy';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const dashboardCopy = defineCopy({
  es: { title: 'Panel de administración', subtitle: 'Supervisa usuarios, propiedades y señales que requieren atención.', superadmin: 'Superadministrador', admin: 'Administrador', usersTitle: 'Gestión de usuarios', usersBody: 'Consulta roles, estados y solicitudes de propietario.', propertiesTitle: 'Supervisión de propiedades', propertiesBody: 'Revisa publicaciones pendientes, verificadas o restringidas.', loadingTitle: 'Preparando el panel', loadingBody: 'Estamos validando métricas y responsabilidades administrativas.', partialTitle: 'Datos parcialmente actualizados', partialBody: 'Las herramientas siguen disponibles. Puedes reintentar la sincronización sin salir del panel.', retrySync: 'Reintentar sincronización', users: 'Usuarios', properties: 'Propiedades', pendingReviews: 'Revisiones pendientes', toReviewTitle: 'Publicaciones por revisar', toReviewDetail: 'Propiedades cuya verificación legal sigue pendiente.', upToDateTitle: 'Revisión al día', upToDateBody: 'No hay propiedades pendientes de verificación en este momento.', recentUsers: 'Usuarios recientes', recentUsersDetail: 'Últimas cuentas visibles para tu rol.', viewAll: 'Ver todos' },
  fr: { title: 'Panneau d’administration', subtitle: 'Supervisez utilisateurs, logements et signaux qui demandent votre attention.', superadmin: 'Super-administrateur', admin: 'Administrateur', usersTitle: 'Gestion des utilisateurs', usersBody: 'Consultez rôles, statuts et demandes de propriétaire.', propertiesTitle: 'Supervision des logements', propertiesBody: 'Examinez les annonces en attente, vérifiées ou restreintes.', loadingTitle: 'Préparation du panneau', loadingBody: 'Nous validons les statistiques et les responsabilités administratives.', partialTitle: 'Données partiellement à jour', partialBody: 'Les outils restent disponibles. Vous pouvez relancer la synchronisation sans quitter le panneau.', retrySync: 'Relancer la synchronisation', users: 'Utilisateurs', properties: 'Logements', pendingReviews: 'Vérifications en attente', toReviewTitle: 'Annonces à vérifier', toReviewDetail: 'Logements dont la vérification légale est encore en attente.', upToDateTitle: 'Vérifications à jour', upToDateBody: 'Aucun logement n’attend de vérification pour le moment.', recentUsers: 'Utilisateurs récents', recentUsersDetail: 'Derniers comptes visibles pour votre rôle.', viewAll: 'Tout voir' },
  en: { title: 'Admin dashboard', subtitle: 'Oversee users, properties and signals that need attention.', superadmin: 'Super administrator', admin: 'Administrator', usersTitle: 'User management', usersBody: 'Check roles, statuses and owner requests.', propertiesTitle: 'Property oversight', propertiesBody: 'Review pending, verified or restricted listings.', loadingTitle: 'Preparing the dashboard', loadingBody: 'We are validating metrics and admin responsibilities.', partialTitle: 'Partially updated data', partialBody: 'The tools are still available. You can retry the sync without leaving the dashboard.', retrySync: 'Retry sync', users: 'Users', properties: 'Properties', pendingReviews: 'Pending reviews', toReviewTitle: 'Listings to review', toReviewDetail: 'Properties whose legal verification is still pending.', upToDateTitle: 'Reviews up to date', upToDateBody: 'No properties are waiting for verification right now.', recentUsers: 'Recent users', recentUsersDetail: 'Latest accounts visible to your role.', viewAll: 'View all' },
});

export default function AdminDashboard() {
  const { role } = useAuth();
  const { palette } = useAppTheme();
  const { locale } = useI18n();
  const copy = useCopy(dashboardCopy);
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: fetchAdminOverview });
  const metrics = overview.data?.metrics;
  const unavailableSections = overview.data?.unavailableSections ?? [];
  const usersAvailable = !unavailableSections.includes('users');
  const propertiesAvailable = !unavailableSections.includes('properties');
  const pendingProperties = overview.data?.properties.filter((property) => property.legalStatus === 'pending').slice(0, 3) ?? [];
  const recentUsers = overview.data?.users.slice(0, 3) ?? [];

  return (
    <RouteScreen
      title={copy.title}
      description={copy.subtitle}
      headerContent={<HeroBadge label={role === 'superadmin' ? copy.superadmin : copy.admin} icon={ShieldCheck} />}
    >

      <View style={styles.actions}>
        <AdminAction icon={UsersRound} title={copy.usersTitle} description={copy.usersBody} tone={colors.brand} onPress={() => router.push('/admin/users')} />
        <AdminAction icon={Building2} title={copy.propertiesTitle} description={copy.propertiesBody} tone={colors.primary} onPress={() => router.push('/admin/properties')} />
      </View>

      {overview.isLoading ? <PremiumEmptyState icon={ShieldCheck} title={copy.loadingTitle} description={copy.loadingBody} loading /> : null}
      {overview.isError || unavailableSections.length ? (
        <View style={[styles.syncNotice, { backgroundColor: `${colors.warning}0E`, borderColor: `${colors.warning}2B` }]}>
          <AlertCircle color={colors.warning} size={22} />
          <View style={styles.syncCopy}>
            <Text style={[styles.syncTitle, { color: palette.text }]}>{copy.partialTitle}</Text>
            <Text style={[styles.syncDescription, { color: palette.textSecondary }]}>{copy.partialBody}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.retrySync} onPress={() => void overview.refetch()} style={styles.syncButton}>
            <RefreshCw color={colors.warning} size={19} />
          </Pressable>
        </View>
      ) : null}

      {overview.data ? (
        <>
          <View style={styles.metrics}>
            <MetricCard label={copy.users} value={metrics?.users ?? 0} icon={UsersRound} />
            <MetricCard label={copy.properties} value={metrics?.properties ?? 0} icon={Building2} tone={colors.primary} />
            <MetricCard label={copy.pendingReviews} value={metrics?.pendingProperties ?? 0} icon={AlertCircle} tone={colors.warning} />
          </View>

          {propertiesAvailable ? <SectionTitle title={copy.toReviewTitle} detail={copy.toReviewDetail} /> : null}
          {propertiesAvailable && pendingProperties.length ? (
            <View style={styles.previewList}>
              {pendingProperties.map((property) => (
                <Pressable key={property.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/property/[id]', params: { id: property.id } })} style={({ pressed }) => [styles.previewRow, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}>
                  <IconTile icon={Building2} tone={colors.warning} size={44} />
                  <View style={styles.previewCopy}><Text numberOfLines={1} style={[styles.previewTitle, { color: palette.text }]}>{property.title}</Text><Text numberOfLines={1} style={[styles.previewDetail, { color: palette.textSecondary }]}>{property.location}</Text></View>
                  <StatusPill label={statusLabel('pending', locale)} tone={colors.warning} icon={Clock} />
                </Pressable>
              ))}
            </View>
          ) : propertiesAvailable ? <PremiumEmptyState icon={ShieldCheck} title={copy.upToDateTitle} description={copy.upToDateBody} /> : null}

          {usersAvailable ? <SectionTitle title={copy.recentUsers} detail={copy.recentUsersDetail} action={<Pressable accessibilityRole="button" onPress={() => router.push('/admin/users')}><Text style={[styles.viewAll, { color: palette.brandText }]}>{copy.viewAll}</Text></Pressable>} /> : null}
          {usersAvailable ? <View style={styles.previewList}>
            {recentUsers.map((user) => (
              <View key={user.id} style={[styles.previewRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <UserAvatar name={user.name} uri={user.avatar} size={44} onPress={() => router.push({ pathname: '/users/[id]', params: { id: user.id } })} />
                <View style={styles.previewCopy}><Text numberOfLines={1} style={[styles.previewTitle, { color: palette.text }]}>{user.name}</Text><Text numberOfLines={1} style={[styles.previewDetail, { color: palette.textSecondary }]}>{user.email}</Text></View>
                <StatusPill label={roleLabel(user.role, locale)} tone={user.role === 'owner' ? colors.primary : user.role === 'client' ? colors.success : colors.brand} />
              </View>
            ))}
          </View> : null}
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
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actions: { gap: 10 },
  syncNotice: { minHeight: 76, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  syncCopy: { flex: 1, minWidth: 0, gap: 3 },
  syncTitle: { fontSize: 14, fontFamily: fontFamily.bold },
  syncDescription: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  syncButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.warning}16` },
  action: { minHeight: 94, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  actionCopy: { flex: 1, minWidth: 0, gap: 4 },
  actionTitle: { fontSize: 16, fontFamily: fontFamily.bold },
  actionDescription: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  previewList: { gap: 9 },
  previewRow: { minHeight: 74, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  previewCopy: { flex: 1, minWidth: 0, gap: 3 },
  previewTitle: { fontSize: 14, fontFamily: fontFamily.bold },
  previewDetail: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  viewAll: { color: colors.brand, fontSize: 13, fontFamily: fontFamily.bold, paddingVertical: 8 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
});
