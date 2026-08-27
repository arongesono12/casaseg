import type { UserRole } from '@/types';

const userRoles: readonly UserRole[] = ['client', 'owner', 'admin', 'superadmin'];

export const parseUserRole = (value: unknown): UserRole | undefined =>
  typeof value === 'string' && userRoles.includes(value as UserRole) ? (value as UserRole) : undefined;

export const isClientRole = (role?: UserRole) => role === 'client';

export const isOwnerRole = (role?: UserRole) => role === 'owner';

export const isAdminRole = (role?: UserRole) => role === 'admin' || role === 'superadmin';

export const canAccessOwnerPanel = (role?: UserRole) => isOwnerRole(role);

export const canAccessAdminPanel = (role?: UserRole) => isAdminRole(role);

// These guards improve navigation UX only. Authorization must still be enforced
// by Supabase Row Level Security policies and server-side role checks.
