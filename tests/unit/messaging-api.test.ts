import { beforeEach, describe, expect, mock, test } from 'bun:test';

type RpcCall = { fn: string; args?: Record<string, unknown> };
const rpcCalls: RpcCall[] = [];
const rpcResults: Record<string, { data: unknown; error: unknown }> = {};

mock.module('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return rpcResults[fn] ?? { data: null, error: null };
    },
  },
}));

const { deleteChatForMe, fetchConversations, fetchMessages, propertyIdFromChatRoute, resolveChatId, sendMessage } = await import('../../src/features/messaging/messaging.api');

describe('messaging api', () => {
  beforeEach(() => {
    rpcCalls.length = 0;
    for (const key of Object.keys(rpcResults)) delete rpcResults[key];
  });

  test('extracts the property id only from property chat routes', () => {
    expect(propertyIdFromChatRoute('property-abc')).toBe('abc');
    expect(propertyIdFromChatRoute('5f0c3c2e-0000-4000-8000-000000000000')).toBeUndefined();
  });

  test('keeps a real chat id as-is without querying', async () => {
    expect(await resolveChatId('chat-uuid')).toBe('chat-uuid');
  });

  test('maps list_my_chats rows to conversations', async () => {
    rpcResults.list_my_chats = {
      data: [{ chat_id: 'c1', property_id: 'p1', property_title: 'Piso', property_image: null, partner_name: '  ', partner_avatar: 'https://x/a.png', is_owner: true, last_message: 'Hola', last_message_at: '2026-10-01T10:00:00Z', unread_count: 2 }],
      error: null,
    };
    const [conversation] = await fetchConversations();
    const { id, title, lastMessage, unreadCount, propertyTitle, avatar, isOwner } = conversation;
    expect({ id, title, lastMessage, unreadCount, propertyTitle, avatar, isOwner }).toEqual({ id: 'c1', title: 'CasaSeg', lastMessage: 'Hola', unreadCount: 2, propertyTitle: 'Piso', avatar: 'https://x/a.png', isOwner: true });
  });

  test('opens a chat by property when there is no chat yet', async () => {
    rpcResults.send_chat_message = { data: [{ message_id: 'm1', chat_id: 'c9', sender_id: 'u1', content: 'Hola', created_at: '2026-10-01T10:00:00Z' }], error: null };
    const message = await sendMessage({ chatId: null, propertyId: 'p1' }, 'Hola');
    expect(rpcCalls[0]).toEqual({ fn: 'send_chat_message', args: { p_content: 'Hola', p_chat_id: null, p_property_id: 'p1' } });
    expect(message.conversationId).toBe('c9');
  });

  test('sends to the existing chat and ignores the property', async () => {
    rpcResults.send_chat_message = { data: [{ message_id: 'm2', chat_id: 'c1', sender_id: 'u1', content: 'Ok', created_at: '2026-10-01T10:00:00Z' }], error: null };
    await sendMessage({ chatId: 'c1', propertyId: 'p1' }, 'Ok');
    expect(rpcCalls[0]?.args).toEqual({ p_content: 'Ok', p_chat_id: 'c1', p_property_id: null });
  });

  test('loads messages through list_chat_messages so deleted history stays hidden', async () => {
    rpcResults.list_chat_messages = { data: [{ id: 'm1', chat_id: 'c1', sender_id: 'u2', content: 'Hola', created_at: '2026-10-01T10:00:00Z', is_read: true, delivered_at: null }], error: null };
    const [message] = await fetchMessages('c1');
    expect(rpcCalls[0]).toEqual({ fn: 'list_chat_messages', args: { p_chat_id: 'c1', p_limit: 50 } });
    expect(message.status).toBe('read');
  });

  test('deletes a chat only for the current user', async () => {
    await deleteChatForMe('c1');
    expect(rpcCalls[0]).toEqual({ fn: 'delete_chat_for_me', args: { p_chat_id: 'c1' } });
  });

  test('surfaces RPC errors', async () => {
    rpcResults.list_my_chats = { data: null, error: new Error('boom') };
    const failure = await fetchConversations().then(() => undefined, (error: unknown) => error);
    expect(failure instanceof Error ? failure.message : failure).toBe('boom');
  });
});
