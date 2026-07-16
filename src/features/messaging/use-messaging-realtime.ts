import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export const conversationKeys = { all: ['conversations'] as const, list: (userId: string) => ['conversations', userId] as const, messages: (id: string) => ['messages', id] as const };

const realtimeSessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let realtimeSubscriptionId = 0;

function uniqueChannelTopic(topic: string) {
  realtimeSubscriptionId += 1;
  return `${topic}:${realtimeSessionId}:${realtimeSubscriptionId}`;
}

function subscribeToConversationSummaries(userId: string, onChange: () => void) {
  const channel = supabase
    .channel(uniqueChannelTopic(`conversation-summary:${userId}`))
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversation_summaries',
        filter: `user_id=eq.${userId}`,
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
        filter: `conversation_id=eq.${conversationId}`,
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

export function useConversationSummaryRealtime(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;

    return subscribeToConversationSummaries(
      userId,
      () => void queryClient.invalidateQueries({ queryKey: conversationKeys.list(userId) }),
    );
  }, [queryClient, userId]);
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
