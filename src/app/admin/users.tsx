import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { UserAvatar } from '@/components/user-avatar';
import { Building2, Home, Search, ShieldCheck, UsersRound } from '@/components/ui/icons';
import { HeroBadge, PremiumButton, PremiumEmptyState, PremiumErrorState, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius } from '@/constants/theme';
import { fetchAdminUsersPage, updateAdminUserRole } from '@/features/admin/admin.api';
import { fetchOwnerPlans, type OwnerPlanType } from '@/features/owner/owner-plan.api';
import { adminCopy, roleLabel, statusLabel } from '@/features/admin/admin-copy';
import { defineCopy, interpolate, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { useAuth } from '@/providers/auth-context';
import type { UserRole } from '@/types';

type RoleFilter = 'all' | UserRole;
const usersCopy = defineCopy({
  es: { all: 'Todos', client: 'Clientes', owner: 'Propietarios', admin: 'Administradores', superadmin: 'Superadmins', title: 'Gestión de usuarios', subtitle: 'Consulta las cuentas y responsabilidades asignadas en CasasEG.', search: 'Buscar usuarios', searchPlaceholder: 'Buscar por nombre o correo', loadingTitle: 'Cargando usuarios', loadingBody: 'Estamos verificando el directorio administrativo.', errorTitle: 'No pudimos cargar los usuarios', emptyTitle: 'Sin coincidencias', emptyBody: 'Prueba otro término o selecciona un rol diferente.', ownerType: 'Tipo de propietario', individual: 'Particular', agency: 'Agencia inmobiliaria', ownerPlan: 'Plan y cupo de viviendas', ownerPlanNote: 'El cupo se concede desde administración, sin registrar un pago. Una compra confirmada lo sustituirá por el plan pagado.', plansLoading: 'Cargando planes activos…', plansUnavailable: 'No se pudieron cargar los planes activos.', changeRole: 'Cambiar rol', saveRole: 'Guardar rol', savingRole: 'Guardando…', roleSaveFailed: 'No se pudo actualizar el rol.' },
  fr: { all: 'Tous', client: 'Clients', owner: 'Propriétaires', admin: 'Administrateurs', superadmin: 'Super-admins', title: 'Gestion des utilisateurs', subtitle: 'Consultez les comptes et responsabilités attribués sur CasasEG.', search: 'Rechercher des utilisateurs', searchPlaceholder: 'Rechercher par nom ou e-mail', loadingTitle: 'Chargement des utilisateurs', loadingBody: 'Nous vérifions l’annuaire administratif.', errorTitle: 'Impossible de charger les utilisateurs', emptyTitle: 'Aucun résultat', emptyBody: 'Essayez un autre terme ou choisissez un autre rôle.', ownerType: 'Type de propriétaire', individual: 'Particulier', agency: 'Agence immobilière', ownerPlan: 'Formule et capacité de logements', ownerPlanNote: 'La capacité est accordée par l’administration, sans enregistrer de paiement. Un achat confirmé la remplacera par la formule payée.', plansLoading: 'Chargement des formules actives…', plansUnavailable: 'Impossible de charger les formules actives.', changeRole: 'Changer le rôle', saveRole: 'Enregistrer le rôle', savingRole: 'Enregistrement…', roleSaveFailed: 'Impossible de mettre à jour le rôle.' },
  en: { all: 'All', client: 'Clients', owner: 'Owners', admin: 'Administrators', superadmin: 'Superadmins', title: 'User management', subtitle: 'Review the accounts and responsibilities assigned in CasasEG.', search: 'Search users', searchPlaceholder: 'Search by name or email', loadingTitle: 'Loading users', loadingBody: 'We are verifying the admin directory.', errorTitle: 'We could not load the users', emptyTitle: 'No matches', emptyBody: 'Try another term or pick a different role.', ownerType: 'Owner type', individual: 'Individual', agency: 'Real estate agency', ownerPlan: 'Plan and housing limit', ownerPlanNote: 'Administration grants this capacity without recording a payment. A confirmed purchase replaces it with the paid plan.', plansLoading: 'Loading active plans…', plansUnavailable: 'Could not load active plans.', changeRole: 'Change role', saveRole: 'Save role', savingRole: 'Saving…', roleSaveFailed: 'Could not update the role.' },
});
const roleFilters: RoleFilter[] = ['all', 'client', 'owner', 'admin', 'superadmin'];

function rolePresentation(role: UserRole) {
  if (role === 'owner') return { tone: colors.primary, icon: Building2 };
  if (role === 'admin' || role === 'superadmin') return { tone: colors.brand, icon: ShieldCheck };
  return { tone: colors.success, icon: Home };
}

export default function AdminUsers() {
  const { role: currentRole } = useAuth();
  const { palette } = useAppTheme();
  const { locale } = useI18n();
  const copy = useCopy(usersCopy);
  const shared = useCopy(adminCopy);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<UserRole>('client');
  const [draftOwnerType, setDraftOwnerType] = useState<'individual' | 'agency'>('individual');
  const [draftOwnerPlanType, setDraftOwnerPlanType] = useState<OwnerPlanType>('normal');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350); return () => clearTimeout(timer); }, [search]);
  const users = useInfiniteQuery({
    queryKey: ['admin', 'users-page', debouncedSearch, roleFilter],
    queryFn: ({ pageParam }) => fetchAdminUsersPage({ page: pageParam, search: debouncedSearch, role: roleFilter }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => pages.reduce((sum, page) => sum + page.items.length, 0) < last.total ? pages.length : undefined,
  });
  const filteredUsers = useMemo(() => users.data?.pages.flatMap((page) => page.items) ?? [], [users.data]);
  const total = users.data?.pages[0]?.total ?? 0;
  const ownerPlans = useQuery({ queryKey: ['owner-plans'], queryFn: fetchOwnerPlans, staleTime: 5 * 60 * 1000 });
  useEffect(() => {
    if (editingUserId && ownerPlans.data?.length && !ownerPlans.data.some((plan) => plan.type === draftOwnerPlanType)) {
      setDraftOwnerPlanType(ownerPlans.data[0].type);
    }
  }, [draftOwnerPlanType, editingUserId, ownerPlans.data]);

  return (
    <RouteScreen
      title={copy.title}
      description={copy.subtitle}
      headerContent={users.data ? <HeroBadge label={interpolate(shared.visibleCount, { count: total })} icon={UsersRound} /> : undefined}
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
              <UserAvatar name={user.name} uri={user.avatar} size={50} onPress={() => router.push({ pathname: '/users/[id]', params: { id: user.id } })} />
              <View style={styles.copy}>
                <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>{user.name}</Text>
                <Text selectable numberOfLines={1} style={[styles.email, { color: palette.textSecondary }]}>{user.email}</Text>
                <View style={styles.badges}><StatusPill label={roleLabel(user.role, locale)} tone={role.tone} icon={role.icon} /><StatusPill label={statusLabel(user.status, locale)} tone={active ? colors.success : colors.error} /></View>
                {user.role === 'owner' && user.ownerType ? <Text style={[styles.email, { color: palette.textSecondary }]}>{user.ownerType === 'agency' ? copy.agency : copy.individual}</Text> : null}
                {user.role === 'owner' && user.ownerAssignedPlanType ? <Text style={[styles.email, { color: palette.textSecondary }]}>{ownerPlans.data?.find((plan) => plan.type === user.ownerAssignedPlanType)?.name ?? user.ownerAssignedPlanType} · {ownerPlans.data?.find((plan) => plan.type === user.ownerAssignedPlanType)?.maxProperties ?? '—'} {locale === 'fr' ? 'logements' : locale === 'en' ? 'homes' : 'viviendas'}</Text> : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => { setEditingUserId(editingUserId === user.id ? null : user.id); setDraftRole(user.role); setDraftOwnerType(user.ownerType ?? 'individual'); setDraftOwnerPlanType(user.ownerAssignedPlanType ?? ownerPlans.data?.[0]?.type ?? 'normal'); setEditError(null); }}
                  style={[styles.editButton, { borderColor: palette.border }]}
                >
                  <Text style={[styles.email, { color: palette.brandIcon }]}>{copy.changeRole}</Text>
                </Pressable>
                {editingUserId === user.id ? (
                  <View style={styles.editor}>
                    <View style={styles.badges}>
                      {(currentRole === 'superadmin' ? ['client', 'owner', 'admin', 'superadmin'] : ['client', 'owner']).map((nextRole) => (
                        <Pressable key={nextRole} accessibilityRole="button" accessibilityState={{ selected: draftRole === nextRole }} onPress={() => setDraftRole(nextRole as UserRole)} style={[styles.filter, { borderColor: draftRole === nextRole ? colors.brand : palette.border, backgroundColor: palette.surface }]}>
                          <Text style={[styles.email, { color: draftRole === nextRole ? colors.brand : palette.textSecondary }]}>{roleLabel(nextRole as UserRole, locale)}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {currentRole === 'superadmin' && draftRole === 'owner' ? <View style={styles.editor}>
                      <Text style={[styles.email, { color: palette.textSecondary }]}>{copy.ownerType}</Text>
                      <View style={styles.badges}>{[
                        ['individual', copy.individual], ['agency', copy.agency],
                      ].map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: draftOwnerType === value }} onPress={() => setDraftOwnerType(value as 'individual' | 'agency')} style={[styles.filter, { borderColor: draftOwnerType === value ? colors.brand : palette.border }]}><Text style={[styles.email, { color: palette.textSecondary }]}>{label}</Text></Pressable>)}</View>
                    </View> : null}
                    {currentRole === 'superadmin' && draftRole === 'owner' && (user.role !== 'owner' || Boolean(user.ownerAssignedPlanType)) ? <View style={styles.editor}>
                      <Text style={[styles.email, { color: palette.textSecondary }]}>{copy.ownerPlan}</Text>
                      {ownerPlans.isPending ? <Text style={[styles.email, { color: palette.textSecondary }]}>{copy.plansLoading}</Text> : null}
                      {ownerPlans.isError ? <Text style={[styles.email, { color: palette.errorText }]}>{copy.plansUnavailable}</Text> : null}
                      <View style={styles.badges}>{ownerPlans.data?.map((plan) => {
                        const selected = draftOwnerPlanType === plan.type;
                        const countLabel = locale === 'fr' ? 'logements' : locale === 'en' ? 'homes' : 'viviendas';
                        return <Pressable key={plan.type} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setDraftOwnerPlanType(plan.type)} style={[styles.filter, { borderColor: selected ? colors.brand : palette.border, backgroundColor: selected ? `${colors.brand}14` : palette.surface }]}><Text style={[styles.email, { color: selected ? colors.brand : palette.textSecondary }]}>{plan.name} · {plan.maxProperties} {countLabel}</Text></Pressable>;
                      })}</View>
                      <Text style={[styles.email, { color: palette.textSecondary }]}>{copy.ownerPlanNote}</Text>
                    </View> : null}
                    <PremiumButton label={savingUserId === user.id ? copy.savingRole : copy.saveRole} loading={savingUserId === user.id} disabled={savingUserId !== null || (currentRole === 'superadmin' && draftRole === 'owner' && (user.role !== 'owner' || Boolean(user.ownerAssignedPlanType)) && (!ownerPlans.data?.length || ownerPlans.isError))} onPress={async () => {
                      setSavingUserId(user.id); setEditError(null);
                      try { await updateAdminUserRole(user.id, draftRole, currentRole === 'superadmin' && draftRole === 'owner' ? draftOwnerType : undefined, currentRole === 'superadmin' && draftRole === 'owner' && (user.role !== 'owner' || Boolean(user.ownerAssignedPlanType)) ? draftOwnerPlanType : undefined); await users.refetch(); setEditingUserId(null); }
                      catch (error) { setEditError(error instanceof Error ? error.message : copy.roleSaveFailed); }
                      finally { setSavingUserId(null); }
                    }} />
                    {editError ? <Text accessibilityRole="alert" style={[styles.email, { color: palette.errorText }]}>{editError}</Text> : null}
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      {users.hasNextPage ? <PremiumButton variant="secondary" label={users.isFetchingNextPage ? copy.loadingTitle : `${copy.all} (${filteredUsers.length}/${total})`} loading={users.isFetchingNextPage} onPress={() => void users.fetchNextPage()} /> : null}
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
  editButton: { alignSelf: 'flex-start', borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 10 },
  editor: { marginTop: 8, gap: 9 },
});
