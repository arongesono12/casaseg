import { properties as fallbackProperties } from '@/data/properties';
import { derivePropertyReviewStatus, type AdminPropertyReviewStatus } from '@/features/admin/admin-data';
import { parseUserRole } from '@/lib/access-control';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  ownerRequestStatus?: string;
  avatar?: string;
  createdAt?: string;
};

export type AdminProperty = {
  id: string;
  title: string;
  ownerId: string;
  location: string;
  status: string;
  legalStatus: AdminPropertyReviewStatus;
  imageUrl?: string;
  createdAt?: string;
};

export type AdminOverviewSection = 'users' | 'properties';

const demoUsers: AdminUser[] = [
  { id: 'demo-admin', name: 'Aron Administrador', email: 'admin@casaseg.app', role: 'admin', status: 'active' },
  { id: 'owner-elena', name: 'Elena Propietaria', email: 'owner@casaseg.app', role: 'owner', status: 'active', ownerRequestStatus: 'approved' },
  { id: 'demo-client', name: 'Cliente CasaSeg', email: 'cliente@casaseg.app', role: 'client', status: 'active' },
];

function mapAdminUser(row: Record<string, unknown>): AdminUser {
  return {
    id: String(row.id), name: String(row.name ?? 'Usuario'), email: String(row.email ?? ''),
    role: parseUserRole(row.role) ?? 'client', status: String(row.status ?? 'active'),
    ownerRequestStatus: row.owner_request_status ? String(row.owner_request_status) : undefined,
    avatar: row.avatar ? String(row.avatar) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

export async function fetchAdminUsersPage({ page, pageSize = 30, search = '', role = 'all' }: { page: number; pageSize?: number; search?: string; role?: UserRole | 'all' }): Promise<{ items: AdminUser[]; total: number }> {
  if (!isSupabaseConfigured) return { items: demoUsers, total: demoUsers.length };
  const safeSearch = search.trim().replace(/[%_,()]/g, ' ').slice(0, 80);
  const { data: functionData, error: functionError } = await supabase.functions.invoke('admin-users', {
    body: { action: 'list', page, pageSize, search: safeSearch || null, role: role === 'all' ? null : role },
  });
  if (!functionError && Array.isArray(functionData?.items)) return {
    items: functionData.items.map((row: Record<string, unknown>) => mapAdminUser(row)),
    total: Number(functionData.total ?? 0),
  };
  let query = supabase.from('users').select('id,name,email,role,status,owner_request_status,avatar,created_at', { count: 'exact' }).order('created_at', { ascending: false });
  if (role !== 'all') query = query.eq('role', role);
  if (safeSearch) query = query.or(`name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
  const { data, error, count } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) throw functionError ?? error;
  return { items: (data ?? []).map((row) => mapAdminUser(row)), total: count ?? 0 };
}

export async function fetchAdminUsers() {
  if (!isSupabaseConfigured) return demoUsers;
  const { data, error } = await supabase
    .from('users')
    .select('id,name,email,role,status,owner_request_status,avatar,created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? 'Usuario'),
    email: String(row.email ?? ''),
    role: parseUserRole(row.role) ?? 'client',
    status: String(row.status ?? 'active'),
    ownerRequestStatus: row.owner_request_status ? String(row.owner_request_status) : undefined,
    avatar: row.avatar ? String(row.avatar) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  } satisfies AdminUser));
}

export async function fetchAdminProperties() {
  if (!isSupabaseConfigured) {
    return fallbackProperties.map((property, index) => ({
      id: property.id,
      title: property.title,
      ownerId: property.ownerId,
      location: property.location,
      status: 'active',
      legalStatus: index === 0 ? 'pending' as const : property.legalStatus,
      imageUrl: property.imageUrls[0],
    }));
  }
  const { data, error } = await supabase
    .from('properties')
    .select('id,title,owner_id,location,status,tourist_license_status,image_urls,created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data.map((row) => ({
    id: String(row.id),
    title: String(row.title ?? 'Propiedad'),
    ownerId: String(row.owner_id ?? ''),
    location: String(row.location ?? ''),
    status: String(row.status ?? 'draft'),
    legalStatus: derivePropertyReviewStatus(row.status, row.tourist_license_status),
    imageUrl: Array.isArray(row.image_urls) && row.image_urls[0] ? String(row.image_urls[0]) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  } satisfies AdminProperty));
}

export type ModerationStatus = 'active' | 'suspended' | 'pending';

/**
 * Publica, suspende o devuelve a revisión una vivienda. admin_set_property_status
 * comprueba en el servidor que quien llama es administrador y avisa al
 * propietario; es la misma función que puede usar el panel web.
 */
export async function setAdminPropertyStatus(propertyId: string, status: ModerationStatus): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('La moderación requiere conexión con el servidor de CasaSeg.');
  const { error } = await supabase.rpc('admin_set_property_status', { p_property_id: propertyId, p_status: status });
  if (error) throw error;
}

export async function fetchAdminOverview() {
  const [usersResult, propertiesResult] = await Promise.allSettled([fetchAdminUsers(), fetchAdminProperties()]);
  const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
  const properties = propertiesResult.status === 'fulfilled' ? propertiesResult.value : [];
  const unavailableSections: AdminOverviewSection[] = [];

  if (usersResult.status === 'rejected') unavailableSections.push('users');
  if (propertiesResult.status === 'rejected') unavailableSections.push('properties');

  return {
    users,
    properties,
    unavailableSections,
    metrics: {
      users: users.length,
      owners: users.filter((user) => user.role === 'owner').length,
      properties: properties.length,
      pendingProperties: properties.filter((property) => property.legalStatus === 'pending').length,
      restrictedUsers: users.filter((user) => user.status === 'restricted' || user.status === 'suspended').length,
    },
  };
}
