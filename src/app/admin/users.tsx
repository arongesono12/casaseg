import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { UserAvatar } from '@/components/user-avatar';
import { Building2, Home, Search, ShieldCheck, UsersRound } from '@/components/ui/icons';
import { PremiumEmptyState, PremiumErrorState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, radius } from '@/constants/theme';
import { fetchAdminUsers } from '@/features/admin/admin.api';
import { useAppTheme } from '@/providers/theme-context';
import type { UserRole } from '@/types';

type RoleFilter = 'all' | UserRole;
const roleFilters: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'client', label: 'Clientes' },
  { value: 'owner', label: 'Propietarios' },
  { value: 'admin', label: 'Administradores' },
  { value: 'superadmin', label: 'Superadmins' },
];

function rolePresentation(role: UserRole) {
  if (role === 'owner') return { label: 'Propietario', tone: '#7C3AED', icon: Building2 };
  if (role === 'admin' || role === 'superadmin') return { label: role === 'superadmin' ? 'Superadmin' : 'Administrador', tone: colors.brand, icon: ShieldCheck };
  return { label: 'Cliente', tone: colors.success, icon: Home };
}

export default function AdminUsers() {
  const { palette } = useAppTheme();
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: fetchAdminUsers });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (users.data ?? []).filter((user) => (roleFilter === 'all' || user.role === roleFilter) && (!query || `${user.name} ${user.email}`.toLowerCase().includes(query)));
  }, [roleFilter, search, users.data]);

  return (
    <RouteScreen title="Gestión de usuarios" description="Consulta las cuentas y responsabilidades asignadas en CasaSeg.">
      <View style={[styles.search, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Search color={palette.textSecondary} size={21} />
        <TextInput accessibilityLabel="Buscar usuarios" value={search} onChangeText={setSearch} placeholder="Buscar por nombre o correo" placeholderTextColor={palette.muted} style={[styles.searchInput, { color: palette.text }]} />
      </View>
      <View style={styles.filters}>
        {roleFilters.map((filter) => {
          const selected = filter.value === roleFilter;
          return <Pressable key={filter.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setRoleFilter(filter.value)} style={[styles.filter, { backgroundColor: selected ? colors.brand : palette.surface, borderColor: selected ? colors.brand : palette.border }]}><Text style={[styles.filterText, { color: selected ? 'white' : palette.textSecondary }]}>{filter.label}</Text></Pressable>;
        })}
      </View>
      <SectionTitle title="Directorio" detail="Los roles solo pueden modificarse mediante operaciones administrativas verificadas." action={users.data ? <StatusPill label={`${filteredUsers.length} visibles`} tone={colors.brand} icon={UsersRound} /> : undefined} />

      {users.isLoading ? <PremiumEmptyState icon={UsersRound} title="Cargando usuarios" description="Estamos verificando el directorio administrativo." loading /> : null}
      {users.isError ? <PremiumErrorState title="No pudimos cargar los usuarios" description="Comprueba la conexión y vuelve a intentarlo." onRetry={() => void users.refetch()} /> : null}
      {!users.isLoading && !users.isError && !filteredUsers.length ? <PremiumEmptyState icon={Search} title="Sin coincidencias" description="Prueba otro término o selecciona un rol diferente." /> : null}

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
                <View style={styles.badges}><StatusPill label={role.label} tone={role.tone} icon={role.icon} /><StatusPill label={active ? 'Activo' : user.status} tone={active ? colors.success : colors.error} /></View>
              </View>
            </View>
          );
        })}
      </View>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  search: { minHeight: 56, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  searchInput: { flex: 1, minHeight: 52, fontSize: 15 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { minHeight: 40, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 12, fontWeight: '800' },
  list: { gap: 10 },
  row: { minHeight: 94, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  copy: { flex: 1, minWidth: 0, gap: 5 },
  name: { fontSize: 15, fontWeight: '900' },
  email: { fontSize: 12, lineHeight: 17 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
