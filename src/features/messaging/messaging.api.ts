import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Conversation = {
  id: string;
  title: string;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
  propertyId?: string;
  propertyTitle?: string;
  propertyImage?: string;
  avatar?: string;
  isOwner: boolean;
};
export type ChatMessage = { id: string; conversationId: string; senderId: string; content: string; createdAt: string; status: 'sent' | 'delivered' | 'read' };

/** Prefijo de la ruta de chat cuando se abre desde una vivienda sin chat previo. */
export const PROPERTY_CHAT_PREFIX = 'property-';

const demoConversations: Conversation[] = [{ id: 'demo-conversation', title: 'Equipo CasaSeg', lastMessage: '¿En qué podemos ayudarte?', unreadCount: 0, updatedAt: new Date().toISOString(), propertyId: 'malabo-modern-1', isOwner: false }];
const demoMessages: ChatMessage[] = [{ id: 'demo-1', conversationId: 'demo-conversation', senderId: 'support', content: 'Hola, somos el equipo CasaSeg. ¿En qué podemos ayudarte?', createdAt: new Date().toISOString(), status: 'read' }];

type ChatSummaryRow = {
  chat_id: string;
  property_id: string | null;
  property_title: string | null;
  property_image: string | null;
  partner_name: string | null;
  partner_avatar: string | null;
  is_owner: boolean | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | null;
};

type MessageRow = { id: string; chat_id: string; sender_id: string; content: string | null; created_at: string; is_read: boolean | null; delivered_at: string | null };

export function propertyIdFromChatRoute(conversationId: string) {
  return conversationId.startsWith(PROPERTY_CHAT_PREFIX) ? conversationId.slice(PROPERTY_CHAT_PREFIX.length) : undefined;
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: String(row.id),
    conversationId: String(row.chat_id),
    senderId: String(row.sender_id),
    content: String(row.content ?? ''),
    createdAt: String(row.created_at),
    status: row.is_read ? 'read' : row.delivered_at ? 'delivered' : 'sent',
  };
}

export async function fetchConversations(): Promise<Conversation[]> {
  if (!isSupabaseConfigured) return demoConversations;
  const { data, error } = await supabase.rpc('list_my_chats');
  if (error) throw error;
  return ((data ?? []) as ChatSummaryRow[]).map((row) => ({
    id: String(row.chat_id),
    title: row.partner_name?.trim() || 'CasaSeg',
    lastMessage: row.last_message ?? '',
    unreadCount: Number(row.unread_count ?? 0),
    updatedAt: String(row.last_message_at ?? ''),
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.property_title ?? undefined,
    propertyImage: row.property_image ?? undefined,
    avatar: row.partner_avatar ?? undefined,
    isOwner: Boolean(row.is_owner),
  }));
}

/**
 * Traduce la ruta del chat al id real de `chats`. Desde el detalle de una
 * vivienda se llega con `property-<id>`: si el cliente ya escribió antes, se
 * reutiliza ese chat; si no, devuelve null y el primer envío lo crea.
 */
export async function resolveChatId(conversationId: string): Promise<string | null> {
  const propertyId = propertyIdFromChatRoute(conversationId);
  if (!propertyId || !isSupabaseConfigured) return conversationId;
  const { data, error } = await supabase.from('chats').select('id').eq('property_id', propertyId).limit(1).maybeSingle();
  if (error) throw error;
  return data ? String(data.id) : null;
}

export async function fetchMessages(chatId: string | null): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured) return demoMessages;
  if (!chatId) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('id, chat_id, sender_id, content, created_at, is_read, delivered_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as MessageRow[]).map(mapMessage);
}

/** Envía en un chat existente o, sin chat todavía, abre uno con el propietario de la vivienda. */
export async function sendMessage(target: { chatId: string | null; propertyId?: string }, content: string, demoSenderId = 'local-user'): Promise<ChatMessage> {
  if (!isSupabaseConfigured) return { id: `local-${Date.now()}`, conversationId: target.chatId ?? 'demo-conversation', senderId: demoSenderId, content, createdAt: new Date().toISOString(), status: 'sent' };
  const { data, error } = await supabase.rpc('send_chat_message', {
    p_content: content,
    p_chat_id: target.chatId,
    p_property_id: target.chatId ? null : target.propertyId ?? null,
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { message_id: string; chat_id: string; sender_id: string; content: string; created_at: string } | undefined;
  if (!row) throw new Error('send_chat_message no devolvió el mensaje');
  return { id: String(row.message_id), conversationId: String(row.chat_id), senderId: String(row.sender_id), content: String(row.content), createdAt: String(row.created_at), status: 'sent' };
}

export async function markConversationRead(chatId: string) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.rpc('mark_chat_read', { p_chat_id: chatId });
  if (error) throw error;
}
