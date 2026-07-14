import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export const conversationKeys = { all: ['conversations'] as const, list: (userId: string) => ['conversations', userId] as const, messages: (id: string) => ['messages', id] as const };

export function useConversationSummaryRealtime(userId?: string) {
  const queryClient = useQueryClient();
  useEffect(() => { if (!userId || !isSupabaseConfigured) return; const channel = supabase.channel(`conversation-summary:${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_summaries', filter: `user_id=eq.${userId}` }, () => void queryClient.invalidateQueries({ queryKey: conversationKeys.list(userId) })).subscribe(); return () => { void supabase.removeChannel(channel); }; }, [queryClient, userId]);
}

export function useActiveConversationRealtime(conversationId?: string, userId?: string) {
  const queryClient = useQueryClient();
  useEffect(() => { if (!conversationId || !isSupabaseConfigured) return; const channel = supabase.channel(`conversation:${conversationId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => void queryClient.invalidateQueries({ queryKey: conversationKeys.messages(conversationId) })).on('presence', { event: 'sync' }, () => undefined).subscribe((status) => { if (status === 'SUBSCRIBED' && userId) void channel.track({ user_id: userId, online_at: new Date().toISOString() }); }); return () => { void supabase.removeChannel(channel); }; }, [conversationId, queryClient, userId]);
}
