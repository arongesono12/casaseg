import type { UserRole } from '@/types';

export const isOwnerRole = (role?: UserRole) =>
  role === 'owner' || role === 'admin' || role === 'superadmin';

export const isWebAdminRole = (role?: UserRole) => role === 'admin' || role === 'superadmin';

// These guards improve navigation UX only. Authorization must still be enforced
// by Supabase Row Level Security policies and server-side role checks.
