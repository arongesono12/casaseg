import { properties as fallbackProperties } from '@/data/properties';
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
  legalStatus: 'verified' | 'pending' | 'restricted';
  imageUrl?: string;
  createdAt?: string;
};

const demoUsers: AdminUser[] = [
  { id: 'demo-admin', name: 'Aron Administrador', email: 'admin@casaseg.app', role: 'admin', status: 'active' },
  { id: 'owner-elena', name: 'Elena Propietaria', email: 'owner@casaseg.app', role: 'owner', status: 'active', ownerRequestStatus: 'approved' },
  { id: 'demo-client', name: 'Cliente CasaSeg', email: 'cliente@casaseg.app', role: 'client', status: 'active' },
];

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
    role: (row.role ?? 'client') as UserRole,
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
    .select('id,title,owner_id,location,status,legal_status,image_urls,created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data.map((row) => ({
    id: String(row.id),
    title: String(row.title ?? 'Propiedad'),
    ownerId: String(row.owner_id ?? ''),
    location: String(row.location ?? ''),
    status: String(row.status ?? 'draft'),
    legalStatus: (row.legal_status ?? 'pending') as AdminProperty['legalStatus'],
    imageUrl: Array.isArray(row.image_urls) && row.image_urls[0] ? String(row.image_urls[0]) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  } satisfies AdminProperty));
}

export async function fetchAdminOverview() {
  const [users, properties] = await Promise.all([fetchAdminUsers(), fetchAdminProperties()]);
  return {
    users,
    properties,
    metrics: {
      users: users.length,
      owners: users.filter((user) => user.role === 'owner').length,
      properties: properties.length,
      pendingProperties: properties.filter((property) => property.legalStatus === 'pending').length,
      restrictedUsers: users.filter((user) => user.status === 'restricted' || user.status === 'suspended').length,
    },
  };
}
