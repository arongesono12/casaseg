import { isSupabaseConfigured, supabase } from '@/lib/supabase';
export type AppNotification = { id: string; title: string; body: string; read: boolean; createdAt: string; propertyId?: string; conversationId?: string };
type NotificationRow = { id: string; title: string | null; message: string | null; read: boolean | null; created_at: string; metadata: Record<string, unknown> | null };

function metadataId(metadata: NotificationRow['metadata'], key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' && value ? value : undefined;
}

// Columnas reales de public.notifications: message, read y metadata (chatId, propertyId).
export async function fetchNotifications() {
  if (!isSupabaseConfigured) return [{ id: 'demo-notification', title: 'Nueva vivienda disponible', body: 'Hay una propiedad nueva en Malabo.', read: false, createdAt: new Date().toISOString(), propertyId: 'malabo-modern-1' }] as AppNotification[];
  const { data, error } = await supabase.from('notifications').select('id, title, message, read, created_at, metadata').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return (data as NotificationRow[]).map((row) => ({ id: String(row.id), title: String(row.title ?? ''), body: String(row.message ?? ''), read: Boolean(row.read), createdAt: String(row.created_at), propertyId: metadataId(row.metadata, 'propertyId'), conversationId: metadataId(row.metadata, 'chatId') }));
}
export async function markNotificationsRead() { if (!isSupabaseConfigured) return; const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false); if (error) throw error; }
