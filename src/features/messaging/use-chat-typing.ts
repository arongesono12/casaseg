import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type TypingPayload = { chatId?: string; userId?: string; isTyping?: boolean };

export function useChatTyping(chatId?: string | null, selfId?: string) {
  const [partnerTyping, setPartnerTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const partnerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!chatId || !selfId || !isSupabaseConfigured) return;
    const channel = supabase.channel(`typing_indicator:${chatId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }: { payload: TypingPayload }) => {
        if (payload.chatId !== chatId || payload.userId === selfId) return;
        setPartnerTyping(payload.isTyping === true);
        if (partnerTimer.current) clearTimeout(partnerTimer.current);
        if (payload.isTyping) partnerTimer.current = setTimeout(() => setPartnerTyping(false), 3000);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      if (partnerTimer.current) clearTimeout(partnerTimer.current);
      channelRef.current = null;
      setPartnerTyping(false);
      void supabase.removeChannel(channel);
    };
  }, [chatId, selfId]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (!chatId || !selfId || !channelRef.current) return;
    void channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { chatId, userId: selfId, isTyping } });
  }, [chatId, selfId]);

  const onDraftChange = useCallback((text: string) => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    if (!text.trim()) { sendTyping(false); return; }
    const now = Date.now();
    if (now - lastSent.current > 800) { lastSent.current = now; sendTyping(true); }
    stopTimer.current = setTimeout(() => sendTyping(false), 1600);
  }, [sendTyping]);

  return { partnerTyping, onDraftChange, stopTyping: () => sendTyping(false) };
}
