import { defineCopy, type Locale } from '@/providers/i18n-context';
import type { UserRole } from '@/types';

// Textos compartidos por las pantallas de administración: roles y estados que
// llegan de la base de datos como identificadores ('owner', 'active', 'draft'…).
export const adminCopy = defineCopy({
  es: { client: 'Cliente', owner: 'Propietario', admin: 'Administrador', superadmin: 'Superadmin', active: 'Activo', restricted: 'Restringido', suspended: 'Suspendido', draft: 'Borrador', published: 'Publicada', pending: 'Pendiente', review: 'En revisión', under_review: 'En revisión', rejected: 'Rechazada', archived: 'Archivada', verified: 'Verificada', visibleCount: '{count} visibles', retryBody: 'Comprueba la conexión y vuelve a intentarlo.' },
  fr: { client: 'Client', owner: 'Propriétaire', admin: 'Administrateur', superadmin: 'Super-admin', active: 'Actif', restricted: 'Restreint', suspended: 'Suspendu', draft: 'Brouillon', published: 'Publiée', pending: 'En attente', review: 'En vérification', under_review: 'En vérification', rejected: 'Refusée', archived: 'Archivée', verified: 'Vérifiée', visibleCount: '{count} visibles', retryBody: 'Vérifiez la connexion et réessayez.' },
  en: { client: 'Client', owner: 'Owner', admin: 'Administrator', superadmin: 'Superadmin', active: 'Active', restricted: 'Restricted', suspended: 'Suspended', draft: 'Draft', published: 'Published', pending: 'Pending', review: 'Under review', under_review: 'Under review', rejected: 'Rejected', archived: 'Archived', verified: 'Verified', visibleCount: '{count} visible', retryBody: 'Check your connection and try again.' },
});

export function roleLabel(role: UserRole, locale: Locale): string {
  return adminCopy[locale][role];
}

/** Estado legible; un estado nuevo que aún no tiene traducción se muestra tal cual. */
export function statusLabel(status: string, locale: Locale): string {
  const labels = adminCopy[locale] as Record<string, string>;
  return labels[status.toLowerCase()] ?? status;
}
