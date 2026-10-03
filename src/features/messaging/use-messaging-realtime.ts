import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export const conversationKeys = { all: ['conversations'] as const, list: (userId: string) => ['conversations', userId] as const, messages: (id: string) => ['messages', id] as const, chatId: (route: string) => ['chat-id', route] as const };

const realtimeSessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let realtimeSubscriptionId = 0;

function uniqueChannelTopic(topic: string) {
  realtimeSubscriptionId += 1;
  return `${topic}:${realtimeSessionId}:${realtimeSubscriptionId}`;
}

// La bandeja no es una tabla: se recalcula con list_my_chats() cuando llega o
// cambia (leído) un mensaje dirigido a este perfil.
function subscribeToConversationSummaries(profileId: string, onChange: () => void) {
  const channel = supabase
    .channel(uniqueChannelTopic(`conversation-summary:${profileId}`))
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${profileId}`,
      },
      onChange,
    )
    .subscribe();

  return () => {
    void channel.unsubscribe();
    void supabase.removeChannel(channel);
  };
}

function subscribeToActiveConversation(conversationId: string, userId: string | undefined, onChange: () => void) {
  const channel = supabase
    .channel(uniqueChannelTopic(`conversation:${conversationId}`))
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${conversationId}`,
      },
      onChange,
    )
    .on('presence', { event: 'sync' }, () => undefined)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED' && userId) {
        void channel.track({ user_id: userId, online_at: new Date().toISOString() });
      }
    });

  return () => {
    void channel.unsubscribe();
    void supabase.removeChannel(channel);
  };
}

/**
 * `userId` es la clave de caché de la bandeja (id de Clerk); `profileId` es el
 * uuid de public.users, que es lo que guarda messages.recipient_id.
 */
export function useConversationSummaryRealtime(userId?: string, profileId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !profileId || !isSupabaseConfigured) return;

    return subscribeToConversationSummaries(
      profileId,
      () => void queryClient.invalidateQueries({ queryKey: conversationKeys.list(userId) }),
    );
  }, [profileId, queryClient, userId]);
}

export function useActiveConversationRealtime(conversationId?: string, userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId || !isSupabaseConfigured) return;

    return subscribeToActiveConversation(
      conversationId,
      userId,
      () => void queryClient.invalidateQueries({ queryKey: conversationKeys.messages(conversationId) }),
    );
  }, [conversationId, queryClient, userId]);
}
