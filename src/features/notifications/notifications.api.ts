import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { appStorage } from '@/lib/local-storage';
import type { UserRole } from '@/types';
export type AppNotification = { id: string; title: string; body: string; read: boolean; createdAt: string; propertyId?: string; conversationId?: string; actorName?: string; actorRole?: string; type?: string; link?: string };
type NotificationRow = { id: string; title: string | null; message: string | null; read: boolean | null; created_at: string; type?: string | null; link?: string | null; metadata: Record<string, unknown> | null };

function metadataId(metadata: NotificationRow['metadata'], key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' && value ? value : undefined;
}

// Columnas reales de public.notifications: message, read, type, link y metadata (chatId, propertyId).
export async function fetchNotifications(userId?: string, role?: UserRole) {
  if (!isSupabaseConfigured) return appStorage.getItem('casaseg.demo-notification-deleted')
    ? [] as AppNotification[]
    : [{ id: 'demo-notification', title: 'Nueva vivienda disponible', body: 'Hay una propiedad nueva en Malabo.', read: false, createdAt: new Date().toISOString(), propertyId: 'malabo-modern-1' }] as AppNotification[];
  const { data, error } = await supabase.from('notifications').select('id, title, message, read, created_at, type, link, metadata').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  const personal = (data as NotificationRow[]).map((row) => ({ id: String(row.id), title: String(row.title ?? ''), body: String(row.message ?? ''), read: Boolean(row.read), createdAt: String(row.created_at), propertyId: metadataId(row.metadata, 'propertyId'), conversationId: metadataId(row.metadata, 'chatId'), actorName: metadataId(row.metadata, 'actor_name'), actorRole: metadataId(row.metadata, 'actor_role'), type: row.type ?? undefined, link: row.link ?? undefined }));
  if (!userId || (role !== 'admin' && role !== 'superadmin')) return personal;
  const { data: adminData, error: adminError } = await supabase.from('admin_notifications').select('id,title,message,read,created_at,metadata').or(`recipient_user_id.eq.${userId},recipient_user_id.is.null`).order('created_at', { ascending: false }).limit(50);
  if (adminError) throw adminError;
  const admin = (adminData ?? []).map((row) => ({ id: `admin:${row.id}`, title: String(row.title ?? ''), body: String(row.message ?? ''), read: Boolean(row.read), createdAt: String(row.created_at), actorName: metadataId(row.metadata as NotificationRow['metadata'], 'actor_name'), actorRole: metadataId(row.metadata as NotificationRow['metadata'], 'actor_role') }));
  return [...personal, ...admin].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 50);
}
export async function markNotificationsRead(userId?: string, role?: UserRole) { if (!isSupabaseConfigured) return; const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false); if (error) throw error; if (userId && (role === 'admin' || role === 'superadmin')) { const { error: adminError } = await supabase.from('admin_notifications').update({ read: true }).or(`recipient_user_id.eq.${userId},recipient_user_id.is.null`).eq('read', false); if (adminError) throw adminError; } }
/** Marca una sola notificación al abrir su destino, como markNotificationRead de la web. */
export async function markNotificationRead(id: string) { if (!isSupabaseConfigured) return; const admin = id.startsWith('admin:'); const table = admin ? 'admin_notifications' : 'notifications'; const { error } = await supabase.from(table).update({ read: true }).eq('id', admin ? id.slice(6) : id); if (error) throw error; }

export async function deleteNotification(id: string) {
  if (!isSupabaseConfigured) {
    if (id === 'demo-notification') appStorage.setItem('casaseg.demo-notification-deleted', '1');
    return;
  }
  const admin = id.startsWith('admin:');
  const table = admin ? 'admin_notifications' : 'notifications';
  const { data, error } = await supabase.from(table).delete().eq('id', admin ? id.slice(6) : id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No se pudo eliminar la notificación.');
}
