import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeroStatusBar, useHeroScroll } from '@/components/hero-status-bar';
import { StatusBarScrim } from '@/components/status-bar-scrim';
import { Building2, ChevronRight, Lock, MessageCircle, MessagesSquare, Sparkles } from '@/components/ui/icons';
import { UserAvatar } from '@/components/user-avatar';
import { HeroBadge, PremiumEmptyState, PremiumErrorState, PremiumHero, StatusPill } from '@/components/ui/premium';
import { type AppPalette, colors, radius } from '@/constants/theme';
import { fetchConversations, type Conversation } from '@/features/messaging/messaging.api';
import { conversationKeys } from '@/features/messaging/use-messaging-realtime';
import { pressRipple, rippleClip, usesRipple } from '@/lib/press-feedback';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatDate, formatTime } from '@/utils/formatters';

function formatConversationTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toDateString() === new Date().toDateString() ? formatTime(date, locale) : formatDate(date, locale);
}

const ConversationRow = memo(function ConversationRow({ conversation, palette }: { conversation: Conversation; palette: AppPalette }) {
  const { locale, t } = useI18n();
  const openConversation = () => router.push({ pathname: '/chat/[conversationId]', params: { conversationId: conversation.id, title: conversation.title } });
  const unread = conversation.unreadCount > 0;
  const time = formatConversationTime(conversation.updatedAt, locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('openConversationWith', { title: conversation.title })}
      android_ripple={pressRipple}
      onPress={openConversation}
      style={({ pressed }) => [styles.row, rippleClip, { backgroundColor: palette.surface, borderColor: unread ? `${colors.brand}35` : palette.border }, pressed && !usesRipple && styles.pressed]}
    >
      <UserAvatar name={conversation.title} uri={conversation.avatar} size={52} />
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
      <ChevronRight color={palette.muted} size={21} />
    </Pressable>
  );
});

function ListSeparator() {
  return <View style={styles.separator} />;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { pastHero, onHeroLayout, onScroll } = useHeroScroll();
  const { t } = useI18n();
  const conversations = useQuery({ queryKey: conversationKeys.list(user?.id ?? 'guest'), queryFn: fetchConversations, enabled: Boolean(user) });
  const unreadTotal = useMemo(() => (conversations.data ?? []).reduce((total, item) => total + item.unreadCount, 0), [conversations.data]);
  const renderConversation = useCallback<ListRenderItem<Conversation>>(
    ({ item }) => <ConversationRow conversation={item} palette={palette} />,
    [palette],
  );

  const listHeader = (
    <View style={styles.header} onLayout={onHeroLayout}>
      <PremiumHero
        title={t('messages')}
        description={t('messagesSubtitle')}
        eyebrow={t('messagesEyebrow')}
        icon={Lock}
        bleed={{ topInset: insets.top }}
        accessory={unreadTotal > 0 ? <HeroBadge label={t('unreadCount', { count: String(unreadTotal) })} icon={MessageCircle} /> : undefined}
      />
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: palette.background }]}>
        <HeroStatusBar pastHero={false} />
        <ScrollView contentContainerStyle={styles.guestScroll} showsVerticalScrollIndicator={false}>
          <PremiumHero title={t('messages')} description={t('messagesSubtitle')} eyebrow={t('messagesEyebrow')} icon={Lock} bleed={{ topInset: insets.top }} />
          <View style={styles.guestContent}>
            <PremiumEmptyState icon={MessageCircle} title={t('messagesGuestTitle')} description={t('messagesGuestBody')} actionLabel={t('signIn')} onAction={() => router.push('/(auth)/login')} />
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
        contentContainerStyle={styles.list}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={renderConversation}
        ItemSeparatorComponent={ListSeparator}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={conversations.isLoading
          ? <PremiumEmptyState icon={Sparkles} title={t('messagesLoadingTitle')} description={t('messagesLoadingBody')} loading />
          : conversations.isError
            ? <PremiumErrorState title={t('messagesErrorTitle')} description={t('connectionError')} onRetry={() => void conversations.refetch()} />
            : <PremiumEmptyState icon={MessagesSquare} title={t('noConversations')} description={t('conversationHint')} actionLabel={t('exploreProperties')} onAction={() => router.push('/(tabs)/explore')} />}
        showsVerticalScrollIndicator={false}
      />
      {pastHero && <StatusBarScrim />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 130 },
  guestScroll: { flexGrow: 1, paddingBottom: 100 },
  guestContent: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingTop: 20, gap: 20 },
  // A sangre: anula el padding lateral de la lista para ocupar todo el ancho.
  header: { marginHorizontal: -16, paddingBottom: 18 },
  row: { minHeight: 88, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: '700' },
  time: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  propertyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  property: { flex: 1, fontSize: 12, fontWeight: '600' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { flex: 1, fontSize: 13, lineHeight: 18 },
  previewUnread: { fontWeight: '700' },
  separator: { height: 10 },
});
