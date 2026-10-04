import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { deleteChatForMe, type Conversation } from '@/features/messaging/messaging.api';
import { conversationKeys } from '@/features/messaging/use-messaging-realtime';
import { confirmDestructive } from '@/lib/confirm';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';

/**
 * "Eliminar chat" (solo para el usuario actual). Pide confirmación, lo quita de
 * la bandeja al instante y lo restaura si el servidor falla.
 */
export function useDeleteChat() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const listKey = conversationKeys.list(user?.id ?? 'guest');

  const mutation = useMutation({
    mutationFn: (chatId: string) => deleteChatForMe(chatId),
    onMutate: async (chatId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Conversation[]>(listKey);
      queryClient.setQueryData<Conversation[]>(listKey, (current = []) => current.filter((conversation) => conversation.id !== chatId));
      return { previous };
    },
    onSuccess: (_data, chatId) => {
      haptics.success();
      queryClient.removeQueries({ queryKey: conversationKeys.messages(chatId) });
    },
    onError: (_error, _chatId, context) => {
      haptics.error();
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  /** Devuelve true si el usuario confirmó y se lanzó la eliminación. */
  const { mutate } = mutation;
  const requestDelete = useCallback(async (chatId: string, partnerName: string) => {
    haptics.selection();
    const confirmed = await confirmDestructive({
      title: t('deleteChatTitle'),
      message: t('deleteChatBody', { name: partnerName }),
      confirmLabel: t('deleteChat'),
      cancelLabel: t('cancel'),
    });
    if (!confirmed) return false;
    mutate(chatId);
    return true;
  }, [mutate, t]);

  return { requestDelete, isPending: mutation.isPending, isError: mutation.isError };
}
