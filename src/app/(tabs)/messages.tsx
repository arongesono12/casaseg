import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useRef } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeroStatusBar, useHeroScroll } from '@/components/hero-status-bar';
import { StatusBarScrim } from '@/components/status-bar-scrim';
import { ArrowRight, Building2, Lock, MessagesSquare, Sparkles, Trash2 } from '@/components/ui/icons';
import { UserAvatar } from '@/components/user-avatar';
import { PremiumButton, PremiumEmptyState, PremiumErrorState, StatusPill } from '@/components/ui/premium';
import { colors, fontFamily, radius, type AppPalette } from '@/constants/theme';
import { fetchConversations, type Conversation } from '@/features/messaging/messaging.api';
import { useDeleteChat } from '@/features/messaging/use-delete-chat';
import { conversationKeys } from '@/features/messaging/use-messaging-realtime';
import { pressRipple, rippleClip, usesRipple } from '@/lib/press-feedback';
import { useAuth } from '@/providers/auth-context';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatDate, formatTime } from '@/utils/formatters';

function formatConversationTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toDateString() === new Date().toDateString() ? formatTime(date, locale) : formatDate(date, locale);
}

const inboxCopy = defineCopy({
  es: { recent: 'Recientes' },
  fr: { recent: 'Récentes' },
  en: { recent: 'Recent' },
});

function InboxEmpty({ title, description, actionLabel, onAction, palette }: { title: string; description: string; actionLabel: string; onAction: () => void; palette: AppPalette }) {
  return (
    <View style={[styles.empty, { borderColor: palette.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: palette.brandSoft }]}><MessagesSquare color={palette.brandIcon} size={28} /></View>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: palette.textSecondary }]}>{description}</Text>
      <PremiumButton label={actionLabel} onPress={onAction} trailingIcon={ArrowRight} style={styles.emptyButton} />
    </View>
  );
}

const ConversationRow = memo(function ConversationRow({ conversation, palette, onDelete }: { conversation: Conversation; palette: AppPalette; onDelete: (conversation: Conversation) => void }) {
  const { locale, t } = useI18n();
  const swipeRef = useRef<SwipeableMethods>(null);
  const requestDelete = () => {
    swipeRef.current?.close();
    onDelete(conversation);
  };
  const openConversation = () => router.push({ pathname: '/chat/[conversationId]', params: { conversationId: conversation.id, title: conversation.title } });
  const unread = conversation.unreadCount > 0;
  const time = formatConversationTime(conversation.updatedAt, locale);
  const partnerId = conversation.partnerId;
  return (
    // Deslizar a la izquierda (como en WhatsApp) o mantener pulsado: "Eliminar chat".
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable accessibilityRole="button" accessibilityLabel={t('deleteChat')} onPress={requestDelete} style={({ pressed }) => [styles.deleteAction, pressed && styles.pressed]}>
          <Trash2 color={colors.onBrand} size={22} />
          <Text style={styles.deleteActionText}>{t('deleteChat')}</Text>
        </Pressable>
      )}
    >
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('openConversationWith', { title: conversation.title })}
      accessibilityHint={t('deleteChatHint')}
      accessibilityActions={[{ name: 'delete', label: t('deleteChat') }]}
      onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'delete') requestDelete(); }}
      android_ripple={pressRipple}
      delayLongPress={350}
      onLongPress={requestDelete}
      onPress={openConversation}
      style={({ pressed }) => [styles.row, rippleClip, { borderColor: palette.border, backgroundColor: pressed && !usesRipple ? palette.subtle : 'transparent' }, pressed && !usesRipple && styles.pressed]}
    >
      <UserAvatar
        name={conversation.title}
        uri={conversation.avatar}
        size={48}
        onPress={partnerId ? () => router.push({ pathname: '/users/[id]', params: { id: partnerId } }) : undefined}
      />
      <View style={styles.copy}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>{conversation.title}</Text>
          {time ? <Text style={[styles.time, { color: unread ? palette.brandText : palette.muted }]}>{time}</Text> : null}
        </View>
        {conversation.propertyTitle ? (
          <View style={styles.propertyRow}>
            <Building2 color={palette.muted} size={13} />
            <Text numberOfLines={1} style={[styles.property, { color: palette.textSecondary }]}>{conversation.propertyTitle}</Text>
          </View>
        ) : null}
        <View style={styles.previewRow}>
          <Text numberOfLines={1} style={[styles.preview, { color: unread ? palette.text : palette.textSecondary }, unread && styles.previewUnread]}>{conversation.lastMessage || t('firstMessage')}</Text>
          {unread ? <StatusPill label={String(conversation.unreadCount)} tone={colors.brand} /> : null}
        </View>
      </View>
    </Pressable>
    </ReanimatedSwipeable>
  );
});

export default function MessagesScreen() {
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { pastHero, onHeroLayout, onScroll } = useHeroScroll();
  const { t } = useI18n();
  const copy = useCopy(inboxCopy);
  const conversations = useQuery({ queryKey: conversationKeys.list(user?.id ?? 'guest'), queryFn: fetchConversations, enabled: Boolean(user) });
  const { requestDelete, isError: deleteFailed } = useDeleteChat();
  const unreadTotal = useMemo(() => (conversations.data ?? []).reduce((total, item) => total + item.unreadCount, 0), [conversations.data]);
  const renderConversation = useCallback<ListRenderItem<Conversation>>(
    ({ item }) => <ConversationRow conversation={item} palette={palette} onDelete={(conversation) => void requestDelete(conversation.id, conversation.title)} />,
    [palette, requestDelete],
  );

  const listHeader = (
    <View style={[styles.header, { paddingTop: insets.top + 20 }]} onLayout={onHeroLayout}>
      <View style={styles.eyebrow}><Lock color={palette.brandIcon} size={13} /><Text style={[styles.eyebrowText, { color: palette.brandText }]}>{t('messagesEyebrow')}</Text></View>
      <View style={styles.titleLine}>
        <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{t('messages')}</Text>
        {unreadTotal > 0 ? <View style={[styles.count, { backgroundColor: palette.brandSoft }]}><Text style={[styles.countText, { color: palette.brandText }]}>{unreadTotal}</Text></View> : null}
      </View>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{t('messagesSubtitle')}</Text>
      <View style={styles.sectionLine}><Text style={[styles.sectionLabel, { color: palette.muted }]}>{copy.recent}</Text><View style={[styles.sectionRule, { backgroundColor: palette.border }]} /></View>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: palette.background }]}>
        <HeroStatusBar pastHero={false} />
        <ScrollView contentContainerStyle={[styles.guestScroll, Platform.OS === 'android' && styles.androidScrollEnd]} showsVerticalScrollIndicator={false}>
          <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
            <View style={styles.eyebrow}><Lock color={palette.brandIcon} size={13} /><Text style={[styles.eyebrowText, { color: palette.brandText }]}>{t('messagesEyebrow')}</Text></View>
            <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{t('messages')}</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{t('messagesSubtitle')}</Text>
          </View>
          <View style={styles.guestContent}>
            <InboxEmpty title={t('messagesGuestTitle')} description={t('messagesGuestBody')} actionLabel={t('signIn')} onAction={() => router.push('/(auth)/login')} palette={palette} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: palette.background }]}>
      <HeroStatusBar pastHero={pastHero} />
      <FlatList
        data={conversations.isLoading || conversations.isError ? [] : conversations.data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, Platform.OS === 'android' && styles.androidScrollEnd]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={renderConversation}
        ListHeaderComponent={<>{listHeader}{deleteFailed ? <Text accessibilityRole="alert" style={[styles.deleteError, { color: palette.errorText }]}>{t('deleteChatError')}</Text> : null}</>}
        ListEmptyComponent={conversations.isLoading
          ? <PremiumEmptyState icon={Sparkles} title={t('messagesLoadingTitle')} description={t('messagesLoadingBody')} loading />
          : conversations.isError
            ? <PremiumErrorState title={t('messagesErrorTitle')} description={t('connectionError')} onRetry={() => void conversations.refetch()} />
            : <InboxEmpty title={t('noConversations')} description={t('conversationHint')} actionLabel={t('exploreProperties')} onAction={() => router.push('/(tabs)/explore')} palette={palette} />}
        showsVerticalScrollIndicator={false}
      />
      {pastHero && <StatusBarScrim />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 130 },
  guestScroll: { flexGrow: 1, paddingBottom: 100 },
  // NativeTabs ya reserva el área segura de la barra inferior en Android.
  androidScrollEnd: { paddingBottom: 24 },
  guestContent: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12 },
  header: { paddingBottom: 4, gap: 8 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrowText: { fontSize: 10, lineHeight: 15, fontFamily: fontFamily.bold, letterSpacing: 1.1 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 31, lineHeight: 38, fontFamily: fontFamily.extrabold, letterSpacing: -0.8 },
  count: { minWidth: 25, height: 25, borderRadius: 13, paddingHorizontal: 7, justifyContent: 'center', alignItems: 'center' },
  countText: { fontSize: 12, fontFamily: fontFamily.bold },
  subtitle: { maxWidth: 520, fontSize: 14, lineHeight: 21, fontFamily: fontFamily.regular },
  sectionLine: { marginTop: 22, marginBottom: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionLabel: { fontSize: 11, lineHeight: 16, fontFamily: fontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionRule: { flex: 1, height: StyleSheet.hairlineWidth },
  row: { minHeight: 78, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
  copy: { flex: 1, minWidth: 0, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 16, fontFamily: fontFamily.bold },
  time: { fontSize: 12, fontFamily: fontFamily.semibold, fontVariant: ['tabular-nums'] },
  propertyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  property: { flex: 1, fontSize: 12, fontFamily: fontFamily.semibold },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { fontFamily: fontFamily.regular, flex: 1, fontSize: 13, lineHeight: 18 },
  previewUnread: { fontFamily: fontFamily.bold },
  deleteAction: { width: 104, marginLeft: 10, borderRadius: radius.pill, borderCurve: 'continuous', backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', gap: 4 },
  deleteActionText: { color: colors.onBrand, fontSize: 12, fontFamily: fontFamily.bold, textAlign: 'center' },
  deleteError: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.medium, paddingBottom: 12 },
  empty: { marginTop: 20, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 28, alignItems: 'flex-start' },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { maxWidth: 420, fontSize: 23, lineHeight: 29, fontFamily: fontFamily.bold, letterSpacing: -0.4 },
  emptyBody: { maxWidth: 420, marginTop: 8, fontSize: 14, lineHeight: 21, fontFamily: fontFamily.regular },
  emptyButton: { marginTop: 24, width: '100%', maxWidth: 320 },
});
