import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Conversation = { id: string; title: string; lastMessage: string; unreadCount: number; updatedAt: string; propertyId?: string };
export type ChatMessage = { id: string; conversationId: string; senderId: string; content: string; createdAt: string; status: 'sent' | 'delivered' | 'read' };

const demoConversations: Conversation[] = [{ id: 'demo-conversation', title: 'Equipo CasaSeg', lastMessage: '¿En qué podemos ayudarte?', unreadCount: 0, updatedAt: new Date().toISOString(), propertyId: 'malabo-modern-1' }];
const demoMessages: ChatMessage[] = [{ id: 'demo-1', conversationId: 'demo-conversation', senderId: 'support', content: 'Hola, somos el equipo CasaSeg. ¿En qué podemos ayudarte?', createdAt: new Date().toISOString(), status: 'read' }];

export async function fetchConversations(userId: string) {
  if (!isSupabaseConfigured) return demoConversations;
  const { data, error } = await supabase.from('conversation_summaries').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return data.map((row) => ({ id: String(row.conversation_id), title: String(row.title ?? 'Conversación'), lastMessage: String(row.last_message ?? ''), unreadCount: Number(row.unread_count ?? 0), updatedAt: String(row.updated_at), propertyId: row.property_id ? String(row.property_id) : undefined }));
}

export async function fetchMessages(conversationId: string) {
  if (!isSupabaseConfigured) return demoMessages.filter((message) => message.conversationId === conversationId || conversationId.startsWith('property-'));
  const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data.map((row) => ({ id: String(row.id), conversationId: String(row.conversation_id), senderId: String(row.sender_id), content: String(row.content), createdAt: String(row.created_at), status: (row.status ?? 'sent') as ChatMessage['status'] }));
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  if (!isSupabaseConfigured) return { id: `local-${Date.now()}`, conversationId, senderId, content, createdAt: new Date().toISOString(), status: 'sent' } satisfies ChatMessage;
  const { data, error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: senderId, content }).select().single();
  if (error) throw error;
  return { id: String(data.id), conversationId: String(data.conversation_id), senderId: String(data.sender_id), content: String(data.content), createdAt: String(data.created_at), status: (data.status ?? 'sent') as ChatMessage['status'] };
}

export async function markConversationRead(conversationId: string, userId: string) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId, p_user_id: userId });
  if (error) throw error;
}
