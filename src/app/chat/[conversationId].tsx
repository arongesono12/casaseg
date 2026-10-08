import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, type ListRenderItem, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdaptiveKeyboardView } from '@/components/adaptive-keyboard-view';
import { AlertCircle, ArrowLeft, CheckDouble, ChevronDown, Clock, Send, Trash2 } from '@/components/ui/icons';
import { UserAvatar } from '@/components/user-avatar';
import { actionGradient, brand, colors, fontFamily, radius, type AppPalette } from '@/constants/theme';
import { useCurrentProfile } from '@/features/auth/use-current-profile';
import { useProfileId } from '@/features/auth/use-profile-id';
import { buildChatTimeline, dayLabel, type TimelineItem } from '@/features/messaging/chat-timeline';
import { fetchConversations, fetchMessages, markConversationRead, propertyIdFromChatRoute, resolveChatId, sendMessage, type ChatMessage } from '@/features/messaging/messaging.api';
import { useDeleteChat } from '@/features/messaging/use-delete-chat';
import { conversationKeys, useActiveConversationRealtime } from '@/features/messaging/use-messaging-realtime';
import { haptics } from '@/lib/haptics';
import { iconRipple, onBrandRipple, pressRipple } from '@/lib/press-feedback';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatTime } from '@/utils/formatters';

/**
 * Colores del chat, al estilo WhatsApp pero con la marca: fondo de "papel" para
 * que las burbujas blancas del otro se separen, y las propias en azul claro
 * (azul profundo en oscuro). Los tonos salen de brand.ts.
 */
function useChatColors() {
  const { palette, resolvedMode } = useAppTheme();
  const dark = resolvedMode === 'dark';
  return {
    wallpaper: dark ? brand.dark.background : brand.neutral[100],
    other: palette.surface,
    otherText: palette.text,
    otherMeta: palette.textSecondary,
    own: dark ? brand.blue[700] : brand.blue[200],
    ownText: dark ? '#FFFFFF' : palette.text,
    ownMeta: dark ? 'rgba(255,255,255,0.72)' : brand.neutral[500],
    // Doble check de "leído": azul legible sobre la burbuja propia.
    read: dark ? brand.blue[300] : brand.blue[500],
    dayPill: dark ? brand.dark.elevated : 'rgba(255,255,255,0.92)',
  };
}

type ChatColors = ReturnType<typeof useChatColors>;

// Espacio invisible al final del texto: reserva el hueco de la hora y los checks
// para que se coloquen en la última línea, como en WhatsApp.
const META_SPACER_OWN = ' '.repeat(11);
const META_SPACER_OTHER = ' '.repeat(7);

function StatusIcon({ status, chat }: { status: ChatMessage['status']; chat: ChatColors }) {
  if (status === 'pending') return <Clock color={chat.ownMeta} size={13} />;
  if (status === 'failed') return <AlertCircle color={colors.error} size={14} />;
  return <CheckDouble color={status === 'read' ? chat.read : chat.ownMeta} size={17} />;
}

const MessageBubble = memo(function MessageBubble({ item, chat, senderName, senderAvatar, onRetry }: { item: Extract<TimelineItem, { type: 'message' }>; chat: ChatColors; senderName: string; senderAvatar?: string; onRetry: (message: ChatMessage) => void }) {
  const { locale, t } = useI18n();
  const { message, own, firstOfGroup } = item;
  const time = formatTime(message.createdAt, locale);
  const failed = message.status === 'failed';
  const statusLabel = own
    ? t(message.status === 'pending' ? 'messagePending' : message.status === 'failed' ? 'messageFailed' : message.status === 'read' ? 'messageRead' : message.status === 'delivered' ? 'messageDelivered' : 'messageSent')
    : '';
  const background = own ? chat.own : chat.other;

  const bubble = (
    <View
      accessible
      accessibilityLabel={[senderName, message.content, time, statusLabel].filter(Boolean).join('. ')}
      style={[
        styles.bubble,
        own ? styles.bubbleOwn : styles.bubbleOther,
        { backgroundColor: background },
        firstOfGroup && (own ? styles.bubbleOwnFirst : styles.bubbleOtherFirst),
      ]}
    >
      {firstOfGroup ? (
        // Colita: un triángulo del mismo color pegado a la esquina superior.
        <View pointerEvents="none" style={[styles.tail, own ? [styles.tailOwn, { borderLeftColor: background }] : [styles.tailOther, { borderRightColor: background }]]} />
      ) : null}
      <Text selectable style={[styles.messageText, { color: own ? chat.ownText : chat.otherText }]}>
        {message.content}
        <Text style={styles.spacer}>{own ? META_SPACER_OWN : META_SPACER_OTHER}</Text>
      </Text>
      <View style={styles.meta}>
        <Text style={[styles.time, { color: own ? chat.ownMeta : chat.otherMeta }]}>{time}</Text>
        {own ? <StatusIcon status={message.status} chat={chat} /> : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.row, own ? styles.rowOwn : styles.rowOther, firstOfGroup && styles.rowFirst]}>
      {!own ? <UserAvatar name={senderName} uri={senderAvatar} size={28} /> : null}
      {failed ? (
        <Pressable accessibilityRole="button" accessibilityHint={t('messageFailed')} onPress={() => onRetry(message)} style={styles.messageBody}>
          {bubble}
          <Text style={[styles.failedText, { color: colors.error }]}>{t('messageFailed')}</Text>
        </Pressable>
      ) : <View style={styles.messageBody}>{bubble}</View>}
      {own ? <UserAvatar name={senderName} uri={senderAvatar} size={28} /> : null}
    </View>
  );
});

function DaySeparator({ date, chat, palette }: { date: Date; chat: ChatColors; palette: AppPalette }) {
  const { locale, t } = useI18n();
  return (
    <View style={styles.dayRow}>
      <View style={[styles.dayPill, { backgroundColor: chat.dayPill }]}>
        <Text style={[styles.dayText, { color: palette.textSecondary }]}>{dayLabel(date, new Date(), locale, { today: t('today'), yesterday: t('yesterday') })}</Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { conversationId: route, title: titleParam } = useLocalSearchParams<{ conversationId: string; title?: string }>();
  const { user } = useAuth();
  const profile = useCurrentProfile();
  const { palette } = useAppTheme();
  const chat = useChatColors();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<TimelineItem>>(null);
  const [content, setContent] = useState('');
  const [showScrollDown, setShowScrollDown] = useState(false);
  // messages.sender_id guarda el uuid de public.users, no el id de Clerk.
  const profileId = useProfileId();
  const selfId = profileId ?? user?.id;
  const propertyId = propertyIdFromChatRoute(route);
  const chatIdQuery = useQuery({ queryKey: conversationKeys.chatId(route), queryFn: () => resolveChatId(route), enabled: Boolean(user) });
  const chatId = chatIdQuery.data ?? null;
  const messagesKey = conversationKeys.messages(chatId ?? route);
  useActiveConversationRealtime(chatId ?? undefined, selfId);
  // refetchInterval: respaldo del tiempo real para los mensajes nuevos y para
  // que el doble check pase a azul cuando el otro lee (is_read).
  const messages = useQuery({ queryKey: messagesKey, queryFn: () => fetchMessages(chatId), enabled: chatIdQuery.isSuccess, refetchInterval: CHAT_REFRESH_MS });
  // La bandeja trae el nombre, la vivienda y el id del interlocutor.
  const conversations = useQuery({ queryKey: conversationKeys.list(user?.id ?? 'guest'), queryFn: fetchConversations, enabled: Boolean(user) });
  const conversation = chatId ? conversations.data?.find((item) => item.id === chatId) : undefined;
  const contactName = conversation?.title || titleParam || 'CasaSeg';
  const ownName = user?.name?.trim() || profile.data?.name || 'CasaSeg';
  const ownAvatar = user?.avatar ?? profile.data?.avatar;
  const partnerId = conversation?.partnerId;
  const { requestDelete } = useDeleteChat();
  const deleteChat = async () => {
    if (chatId && (await requestDelete(chatId, contactName))) router.back();
  };

  // Propio = no lo envió el interlocutor. Con el id del otro no dependemos de
  // que el perfil propio haya cargado (antes, sin él, todo salía como ajeno).
  const isOwn = useCallback((message: ChatMessage) => {
    if (message.status === 'pending' || message.status === 'failed') return true;
    if (partnerId) return message.senderId !== partnerId;
    return Boolean(selfId) && message.senderId === selfId;
  }, [partnerId, selfId]);
  const timeline = useMemo(() => buildChatTimeline(messages.data ?? [], isOwn), [isOwn, messages.data]);

  // Mensajes del otro que aún no constan como leídos. Se marcan al abrir el
  // chat y también los que llegan con el chat abierto: así el remitente ve el
  // doble check azul y el contador de no leídos no los cuenta.
  const unreadIncoming = useMemo(
    () => (messages.data ?? []).filter((message) => !isOwn(message) && message.status !== 'read').length,
    [isOwn, messages.data],
  );

  useEffect(() => {
    if (!user || !chatId || propertyIdFromChatRoute(chatId)) return;
    void markConversationRead(chatId)
      .then(() => queryClient.invalidateQueries({ queryKey: conversationKeys.list(user.id) }))
      .catch(() => undefined);
  }, [chatId, queryClient, unreadIncoming, user]);

  const send = useMutation({
    mutationFn: (text: string) => sendMessage({ chatId, propertyId }, text, selfId),
    // Envío optimista: el mensaje aparece al instante con el reloj y se
    // sustituye por el del servidor (o queda marcado para reintentar).
    onMutate: (text) => {
      const temp: ChatMessage = { id: `temp-${Date.now()}`, conversationId: chatId ?? route, senderId: selfId ?? 'self', content: text, createdAt: new Date().toISOString(), status: 'pending' };
      queryClient.setQueryData<ChatMessage[]>(messagesKey, (current = []) => [temp, ...current]);
      setContent('');
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      return { tempId: temp.id, key: messagesKey };
    },
    onSuccess: (message, _text, context) => {
      haptics.success();
      queryClient.setQueryData<ChatMessage[]>(context.key, (current = []) => current.map((item) => (item.id === context.tempId ? message : item)));
      // El primer mensaje desde una vivienda crea el chat: a partir de aquí se usa su id real.
      if (!chatId) {
        queryClient.setQueryData<ChatMessage[]>(conversationKeys.messages(message.conversationId), (current = []) => [message, ...current.filter((item) => item.id !== message.id)]);
        queryClient.setQueryData(conversationKeys.chatId(route), message.conversationId);
      }
      if (user) void queryClient.invalidateQueries({ queryKey: conversationKeys.list(user.id) });
    },
    onError: (_error, _text, context) => {
      haptics.error();
      if (context) queryClient.setQueryData<ChatMessage[]>(context.key, (current = []) => current.map((item) => (item.id === context.tempId ? { ...item, status: 'failed' } : item)));
    },
  });

  const submit = () => {
    const text = content.trim();
    if (text && !send.isPending) send.mutate(text);
  };

  const retry = useCallback((message: ChatMessage) => {
    queryClient.setQueryData<ChatMessage[]>(messagesKey, (current = []) => current.filter((item) => item.id !== message.id));
    send.mutate(message.content);
  }, [messagesKey, queryClient, send]);

  const renderItem = useCallback<ListRenderItem<TimelineItem>>(
    ({ item }) => (item.type === 'day'
      ? <DaySeparator date={item.date} chat={chat} palette={palette} />
      : <MessageBubble item={item} chat={chat} senderName={item.own ? ownName : contactName} senderAvatar={item.own ? ownAvatar : conversation?.avatar} onRetry={retry} />),
    [chat, contactName, conversation?.avatar, ownAvatar, ownName, palette, retry],
  );

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Lista invertida: el desplazamiento crece al subir hacia mensajes antiguos.
    const away = event.nativeEvent.contentOffset.y > 320;
    if (away !== showScrollDown) setShowScrollDown(away);
  };

  const subtitle = conversation?.propertyTitle ?? t('secureConversation');
  const canSend = Boolean(content.trim());

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={[styles.safe, { backgroundColor: palette.surface }]}>
      <AdaptiveKeyboardView style={styles.safe}>
        <View style={[styles.header, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Pressable accessibilityLabel={t('back')} accessibilityRole="button" android_ripple={iconRipple(48)} onPress={() => router.back()} style={styles.headerButton}>
            <ArrowLeft color={palette.text} size={23} />
          </Pressable>
          <Pressable
            accessibilityRole={conversation?.propertyId ? 'link' : undefined}
            accessibilityHint={conversation?.propertyId ? t('viewPropertyLink') : undefined}
            android_ripple={conversation?.propertyId ? pressRipple : undefined}
            disabled={!conversation?.propertyId}
            onPress={() => conversation?.propertyId && router.push({ pathname: '/property/[id]', params: { id: conversation.propertyId } })}
            style={styles.contact}
          >
            <UserAvatar name={contactName} uri={conversation?.avatar} size={40} />
            <View style={styles.contactCopy}>
              <Text numberOfLines={1} style={[styles.contactName, { color: palette.text }]}>{contactName}</Text>
              <Text numberOfLines={1} style={[styles.contactSubtitle, { color: palette.textSecondary }]}>{subtitle}</Text>
            </View>
          </Pressable>
          {chatId ? (
            <Pressable accessibilityLabel={t('deleteChat')} accessibilityRole="button" android_ripple={iconRipple(48)} hitSlop={4} onPress={() => void deleteChat()} style={styles.headerButton}>
              <Trash2 color={palette.textSecondary} size={21} />
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.flex, { backgroundColor: chat.wallpaper }]}>
          <FlatList
            ref={listRef}
            data={timeline}
            inverted
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            onScroll={onScroll}
            scrollEventThrottle={64}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.messages}
            ListEmptyComponent={messages.isLoading ? null : (
              // Lista invertida: el vacío también se dibuja invertido.
              <View style={[styles.emptyWrap, styles.flipped]}>
                <View style={[styles.dayPill, { backgroundColor: chat.dayPill }]}>
                  <Text style={[styles.emptyText, { color: palette.textSecondary }]}>{t('firstMessage')}</Text>
                </View>
              </View>
            )}
          />
          {showScrollDown ? (
            <Pressable accessibilityLabel={t('scrollToLatest')} accessibilityRole="button" android_ripple={iconRipple(42)} onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} style={[styles.scrollDown, { backgroundColor: palette.surface }]}>
              <ChevronDown color={palette.text} size={22} />
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.composer, { backgroundColor: chat.wallpaper }]}>
          <TextInput
            accessibilityLabel={t('writeMessage')}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={4000}
            placeholder={t('writeMessage')}
            placeholderTextColor={palette.textSecondary}
            style={[styles.input, { color: palette.text, backgroundColor: palette.surface }]}
          />
          <Pressable
            accessibilityLabel={t('sendMessage')}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSend }}
            android_ripple={onBrandRipple}
            disabled={!canSend}
            onPress={submit}
            style={[styles.send, !canSend && styles.sendDisabled]}
          >
            <LinearGradient colors={actionGradient} style={styles.sendGradient}>
              <Send color={colors.onBrand} size={21} />
            </LinearGradient>
          </Pressable>
        </View>
      </AdaptiveKeyboardView>
    </SafeAreaView>
  );
}

const TAIL = 8;
const CHAT_REFRESH_MS = 8_000;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  flipped: { transform: [{ scaleY: -1 }] },
  header: { minHeight: 60, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingRight: 12, paddingLeft: 4, gap: 2 },
  headerButton: { width: 44, height: 48, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  contact: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' },
  contactCopy: { flex: 1, minWidth: 0 },
  contactName: { fontSize: 16, lineHeight: 21, fontFamily: fontFamily.bold },
  contactSubtitle: { fontSize: 13, lineHeight: 17, fontFamily: fontFamily.regular },
  messages: { paddingHorizontal: 12, paddingVertical: 10, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 2 },
  rowFirst: { marginTop: 8 },
  rowOwn: { justifyContent: 'flex-end', paddingLeft: 48 },
  rowOther: { justifyContent: 'flex-start', paddingRight: 48 },
  messageBody: { maxWidth: '100%', flexShrink: 1 },
  bubble: { maxWidth: '100%', borderRadius: 12, paddingLeft: 10, paddingRight: 10, paddingTop: 6, paddingBottom: 7, boxShadow: '0 1px 1px rgba(15,23,42,0.12)' },
  bubbleOwn: { alignSelf: 'flex-end', marginRight: TAIL },
  bubbleOther: { alignSelf: 'flex-start', marginLeft: TAIL },
  bubbleOwnFirst: { borderTopRightRadius: 0 },
  bubbleOtherFirst: { borderTopLeftRadius: 0 },
  tail: { position: 'absolute', top: 0, width: 0, height: 0, borderTopWidth: 0, borderBottomWidth: 10, borderBottomColor: 'transparent' },
  tailOwn: { right: -TAIL, borderLeftWidth: TAIL },
  tailOther: { left: -TAIL, borderRightWidth: TAIL },
  messageText: { fontSize: 15.5, lineHeight: 21, fontFamily: fontFamily.regular },
  spacer: { color: 'transparent', fontSize: 11 },
  meta: { position: 'absolute', right: 8, bottom: 5, flexDirection: 'row', alignItems: 'center', gap: 3 },
  time: { fontSize: 11, lineHeight: 14, fontFamily: fontFamily.regular, fontVariant: ['tabular-nums'] },
  failedText: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.medium, textAlign: 'right', marginTop: 3, marginRight: TAIL },
  dayRow: { alignItems: 'center', marginVertical: 10 },
  dayPill: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, boxShadow: '0 1px 1px rgba(15,23,42,0.08)' },
  dayText: { fontSize: 12.5, lineHeight: 16, fontFamily: fontFamily.medium },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 16, paddingHorizontal: 24 },
  emptyText: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.regular, textAlign: 'center' },
  scrollDown: { position: 'absolute', right: 14, bottom: 12, width: 42, height: 42, borderRadius: 21, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(15,23,42,0.22)' },
  composer: { paddingHorizontal: 8, paddingTop: 6, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  input: { flex: 1, minHeight: 46, maxHeight: 132, borderRadius: radius.xl, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, fontSize: 16, lineHeight: 21, fontFamily: fontFamily.regular, boxShadow: '0 1px 1px rgba(15,23,42,0.10)' },
  send: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden' },
  sendGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.45 },
});
