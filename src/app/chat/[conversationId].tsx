import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdaptiveKeyboardView } from '@/components/adaptive-keyboard-view';
import { ArrowLeft, Send, UserRound } from '@/components/ui/icons';
import { UserAvatar } from '@/components/user-avatar';
import { actionGradient, colors, radius, type AppPalette } from '@/constants/theme';
import { useProfileId } from '@/features/auth/use-profile-id';
import { fetchMessages, markConversationRead, propertyIdFromChatRoute, resolveChatId, sendMessage, type ChatMessage, type Conversation } from '@/features/messaging/messaging.api';
import { conversationKeys, useActiveConversationRealtime } from '@/features/messaging/use-messaging-realtime';
import { haptics } from '@/lib/haptics';
import { iconRipple, onBrandRipple } from '@/lib/press-feedback';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import type { TranslationKey } from '@/providers/i18n-provider';
import { useAppTheme } from '@/providers/theme-context';
import { formatTime } from '@/utils/formatters';

const statusLabelKeys: Record<ChatMessage['status'], TranslationKey> = { sent: 'messageSent', delivered: 'messageDelivered', read: 'messageRead' };

const MessageBubble = memo(function MessageBubble({ message, own, palette }: { message: ChatMessage; own: boolean; palette: AppPalette }) {
  const { locale, t } = useI18n();
  const time = formatTime(message.createdAt, locale);
  // El estado de entrega solo tiene sentido en los mensajes propios.
  const meta = own ? [time, t(statusLabelKeys[message.status])].filter(Boolean).join(' · ') : time;
  return <View style={[styles.bubble, own ? styles.ownBubble : styles.otherBubble, own ? styles.ownBackground : { backgroundColor: palette.surface }]}><Text selectable style={[styles.messageText, { color: own ? 'white' : palette.text }]}>{message.content}</Text>{meta ? <Text style={[styles.status, { color: own ? 'rgba(255,255,255,.75)' : palette.muted }]}>{meta}</Text> : null}</View>;
});

export default function ChatScreen() {
  const { conversationId: route, title: titleParam } = useLocalSearchParams<{ conversationId: string; title?: string }>();
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  // messages.sender_id guarda el uuid de public.users, no el id de Clerk.
  const profileId = useProfileId();
  const selfId = profileId ?? user?.id;
  const propertyId = propertyIdFromChatRoute(route);
  const chatIdQuery = useQuery({ queryKey: conversationKeys.chatId(route), queryFn: () => resolveChatId(route), enabled: Boolean(user) });
  const chatId = chatIdQuery.data ?? null;
  useActiveConversationRealtime(chatId ?? undefined, selfId);
  const messages = useQuery({ queryKey: conversationKeys.messages(chatId ?? route), queryFn: () => fetchMessages(chatId), enabled: chatIdQuery.isSuccess });
  // La bandeja pasa el nombre al navegar; si se entra desde otro sitio, se busca en la caché de la bandeja.
  const cachedConversation = user && chatId ? queryClient.getQueryData<Conversation[]>(conversationKeys.list(user.id))?.find((item) => item.id === chatId) : undefined;
  const contactName = titleParam || cachedConversation?.title || 'CasaSeg';

  useEffect(() => {
    if (!user || !chatId || propertyIdFromChatRoute(chatId)) return;
    void markConversationRead(chatId)
      .then(() => queryClient.invalidateQueries({ queryKey: conversationKeys.list(user.id) }))
      .catch(() => undefined);
  }, [chatId, queryClient, user]);

  const send = useMutation({
    mutationFn: (text: string) => sendMessage({ chatId, propertyId }, text, selfId),
    onSuccess: (message) => {
      haptics.success();
      queryClient.setQueryData<ChatMessage[]>(conversationKeys.messages(message.conversationId), (current = []) => [message, ...current]);
      // El primer mensaje desde una vivienda crea el chat: a partir de aquí se usa su id real.
      if (!chatId) queryClient.setQueryData(conversationKeys.chatId(route), message.conversationId);
      if (user) void queryClient.invalidateQueries({ queryKey: conversationKeys.list(user.id) });
      setContent('');
    },
    onError: () => haptics.error(),
  });
  const renderMessage = useCallback<ListRenderItem<ChatMessage>>(
    ({ item }) => <MessageBubble message={item} own={item.senderId === selfId} palette={palette} />,
    [palette, selfId],
  );

  return <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}><AdaptiveKeyboardView style={styles.safe}>
    <View style={[styles.header, { borderColor: palette.border, backgroundColor: palette.surface }]}><Pressable accessibilityLabel={t('back')} accessibilityRole="button" android_ripple={iconRipple(48)} onPress={() => router.back()} style={styles.headerButton}><ArrowLeft color={palette.text} size={23} /></Pressable><View style={styles.contact}>{cachedConversation?.avatar ? <UserAvatar name={contactName} uri={cachedConversation.avatar} size={40} /> : <View style={styles.avatar}><UserRound color="white" size={21} /></View>}<View style={styles.contactCopy}><Text numberOfLines={1} style={[styles.contactName, { color: palette.text }]}>{contactName}</Text><Text numberOfLines={1} style={styles.presence}>{cachedConversation?.propertyTitle ?? t('secureConversation')}</Text></View></View></View>
    <FlatList data={messages.data ?? []} inverted keyExtractor={(item) => item.id} contentContainerStyle={styles.messages} renderItem={renderMessage} ListEmptyComponent={<Text style={[styles.empty, { color: palette.textSecondary }]}>{t('firstMessage')}</Text>} />
    {send.isError ? <Text accessibilityRole="alert" style={[styles.sendError, { color: palette.errorText }]}>{t('messageSendError')}</Text> : null}
    <View style={[styles.composer, { backgroundColor: palette.surface, borderColor: palette.border }]}><TextInput accessibilityLabel={t('writeMessage')} value={content} onChangeText={setContent} multiline placeholder={t('writeMessage')} placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text, backgroundColor: palette.subtle }]} /><Pressable accessibilityLabel={t('sendMessage')} accessibilityRole="button" accessibilityState={{ disabled: !content.trim() || send.isPending, busy: send.isPending }} android_ripple={onBrandRipple} disabled={!content.trim() || send.isPending} onPress={() => send.mutate(content.trim())} style={[styles.send, !content.trim() && styles.sendDisabled]}><LinearGradient colors={actionGradient} style={styles.sendGradient}><Send color="white" size={21} /></LinearGradient></Pressable></View>
  </AdaptiveKeyboardView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, header: { minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }, headerButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, contact: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }, contactCopy: { flex: 1, minWidth: 0 }, contactName: { fontSize: 15, fontWeight: '800' }, presence: { color: colors.success, fontSize: 12, fontWeight: '700', marginTop: 2 }, messages: { padding: 16, gap: 8 }, bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginVertical: 4 }, ownBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 5 }, otherBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 5 }, ownBackground: { backgroundColor: colors.brand }, messageText: { fontSize: 15, lineHeight: 21 }, status: { fontSize: 11, marginTop: 4, alignSelf: 'flex-end' }, empty: { textAlign: 'center', padding: 30, fontSize: 14 }, composer: { borderTopWidth: StyleSheet.hairlineWidth, padding: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: radius.lg, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16 }, send: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' }, sendGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' }, sendDisabled: { opacity: .45 }, sendError: { color: colors.error, fontSize: 13, paddingHorizontal: 16, paddingBottom: 6 } });
