import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { UserAvatar } from '@/components/user-avatar';
import { Building2, Home, Search, ShieldCheck, UsersRound } from '@/components/ui/icons';
import { HeroBadge, PremiumEmptyState, PremiumErrorState, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius } from '@/constants/theme';
import { fetchAdminUsers } from '@/features/admin/admin.api';
import { adminCopy, roleLabel, statusLabel } from '@/features/admin/admin-copy';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import type { UserRole } from '@/types';

type RoleFilter = 'all' | UserRole;
const usersCopy = defineCopy({
  es: { all: 'Todos', client: 'Clientes', owner: 'Propietarios', admin: 'Administradores', superadmin: 'Superadmins', title: 'Gestión de usuarios', subtitle: 'Consulta las cuentas y responsabilidades asignadas en CasaSeg.', search: 'Buscar usuarios', searchPlaceholder: 'Buscar por nombre o correo', loadingTitle: 'Cargando usuarios', loadingBody: 'Estamos verificando el directorio administrativo.', errorTitle: 'No pudimos cargar los usuarios', emptyTitle: 'Sin coincidencias', emptyBody: 'Prueba otro término o selecciona un rol diferente.' },
  fr: { all: 'Tous', client: 'Clients', owner: 'Propriétaires', admin: 'Administrateurs', superadmin: 'Super-admins', title: 'Gestion des utilisateurs', subtitle: 'Consultez les comptes et responsabilités attribués sur CasaSeg.', search: 'Rechercher des utilisateurs', searchPlaceholder: 'Rechercher par nom ou e-mail', loadingTitle: 'Chargement des utilisateurs', loadingBody: 'Nous vérifions l’annuaire administratif.', errorTitle: 'Impossible de charger les utilisateurs', emptyTitle: 'Aucun résultat', emptyBody: 'Essayez un autre terme ou choisissez un autre rôle.' },
  en: { all: 'All', client: 'Clients', owner: 'Owners', admin: 'Administrators', superadmin: 'Superadmins', title: 'User management', subtitle: 'Review the accounts and responsibilities assigned in CasaSeg.', search: 'Search users', searchPlaceholder: 'Search by name or email', loadingTitle: 'Loading users', loadingBody: 'We are verifying the admin directory.', errorTitle: 'We could not load the users', emptyTitle: 'No matches', emptyBody: 'Try another term or pick a different role.' },
});
const roleFilters: RoleFilter[] = ['all', 'client', 'owner', 'admin', 'superadmin'];

function rolePresentation(role: UserRole) {
  if (role === 'owner') return { tone: colors.primary, icon: Building2 };
  if (role === 'admin' || role === 'superadmin') return { tone: colors.brand, icon: ShieldCheck };
  return { tone: colors.success, icon: Home };
}

export default function AdminUsers() {
  const { palette } = useAppTheme();
  const { locale } = useI18n();
  const copy = useCopy(usersCopy);
  const shared = useCopy(adminCopy);
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: fetchAdminUsers });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (users.data ?? []).filter((user) => (roleFilter === 'all' || user.role === roleFilter) && (!query || `${user.name} ${user.email}`.toLowerCase().includes(query)));
  }, [roleFilter, search, users.data]);

  return (
    <RouteScreen
      title={copy.title}
      description={copy.subtitle}
      headerContent={users.data ? <HeroBadge label={interpolate(shared.visibleCount, { count: filteredUsers.length })} icon={UsersRound} /> : undefined}
    >
      <View style={[styles.search, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Search color={palette.textSecondary} size={21} />
        <TextInput accessibilityLabel={copy.search} value={search} onChangeText={setSearch} placeholder={copy.searchPlaceholder} placeholderTextColor={palette.muted} style={[styles.searchInput, { color: palette.text }]} />
      </View>
      <View style={styles.filters}>
        {roleFilters.map((filter) => {
          const selected = filter === roleFilter;
          return <Pressable key={filter} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setRoleFilter(filter)} style={[styles.filter, { backgroundColor: selected ? colors.brand : palette.surface, borderColor: selected ? colors.brand : palette.border }]}><Text style={[styles.filterText, { color: selected ? 'white' : palette.textSecondary }]}>{copy[filter]}</Text></Pressable>;
        })}
      </View>

      {users.isLoading ? <PremiumEmptyState icon={UsersRound} title={copy.loadingTitle} description={copy.loadingBody} loading /> : null}
      {users.isError ? <PremiumErrorState title={copy.errorTitle} description={shared.retryBody} onRetry={() => void users.refetch()} /> : null}
      {!users.isLoading && !users.isError && !filteredUsers.length ? <PremiumEmptyState icon={Search} title={copy.emptyTitle} description={copy.emptyBody} /> : null}

      <View style={styles.list}>
        {filteredUsers.map((user) => {
          const role = rolePresentation(user.role);
          const active = user.status !== 'restricted' && user.status !== 'suspended';
          return (
            <View key={user.id} style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <UserAvatar name={user.name} uri={user.avatar} size={50} />
              <View style={styles.copy}>
                <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>{user.name}</Text>
                <Text selectable numberOfLines={1} style={[styles.email, { color: palette.textSecondary }]}>{user.email}</Text>
                <View style={styles.badges}><StatusPill label={roleLabel(user.role, locale)} tone={role.tone} icon={role.icon} /><StatusPill label={statusLabel(user.status, locale)} tone={active ? colors.success : colors.error} /></View>
              </View>
            </View>
          );
        })}
      </View>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  search: { minHeight: 56, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, borderCurve: 'continuous', paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  searchInput: { fontFamily: fontFamily.regular, flex: 1, minHeight: 52, fontSize: 15 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { minHeight: 44, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 12, fontFamily: fontFamily.extrabold },
  list: { gap: 10 },
  row: { minHeight: 94, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  copy: { flex: 1, minWidth: 0, gap: 5 },
  name: { fontSize: 15, fontFamily: fontFamily.bold },
  email: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
