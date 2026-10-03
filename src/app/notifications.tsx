import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeroStatusBar, useHeroScroll } from '@/components/hero-status-bar';
import { StatusBarScrim } from '@/components/status-bar-scrim';
import { Bell, CheckCircle2 } from '@/components/ui/icons';
import { HeroBadge, PremiumHero } from '@/components/ui/premium';
import { colors, radius, type AppPalette } from '@/constants/theme';
import { fetchNotifications, markNotificationsRead, type AppNotification } from '@/features/notifications/notifications.api';
import { useAuth } from '@/providers/auth-context';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useNotifications } from '@/providers/notification-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatDate } from '@/utils/formatters';

const notificationsCopy = defineCopy({
  es: { subtitle: 'Mensajes, visitas y novedades de tu cuenta.' },
  fr: { subtitle: 'Messages, visites et nouveautés de votre compte.' },
  en: { subtitle: 'Messages, visits and updates on your account.' },
});

const NotificationRow = memo(function NotificationRow({ notification, palette }: { notification: AppNotification; palette: AppPalette }) {
  const openTarget = () => {
    if (notification.conversationId) router.push({ pathname: '/chat/[conversationId]', params: { conversationId: notification.conversationId } });
    else if (notification.propertyId) router.push({ pathname: '/property/[id]', params: { id: notification.propertyId } });
  };
  return <Pressable onPress={openTarget} style={[styles.item, { backgroundColor: palette.surface }]}><View style={[styles.dot, notification.read && styles.dotRead]} /><View style={styles.copy}><Text style={[styles.itemTitle, { color: palette.text }]}>{notification.title}</Text><Text style={[styles.body, { color: palette.textSecondary }]}>{notification.body}</Text><Text style={[styles.date, { color: palette.muted }]}>{formatDate(notification.createdAt)}</Text></View></Pressable>;
});

function NotificationSeparator() {
  return <View style={styles.separator} />;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const client = useQueryClient();
  const { markAllRead, requestPushPermission, pushToken } = useNotifications();
  const copy = useCopy(notificationsCopy);
  const insets = useSafeAreaInsets();
  const { pastHero, onHeroLayout, onScroll } = useHeroScroll();
  const key = useMemo(() => ['notifications', user?.id ?? 'guest'] as const, [user?.id]);
  const notifications = useQuery({ queryKey: key, queryFn: fetchNotifications, enabled: Boolean(user) });
  const read = useMutation({ mutationFn: markNotificationsRead, onSuccess: () => { markAllRead(); void client.invalidateQueries({ queryKey: key }); } });
  const renderNotification = useCallback<ListRenderItem<AppNotification>>(
    ({ item }) => <NotificationRow notification={item} palette={palette} />,
    [palette],
  );

  const listHeader = (
    <View style={styles.headerBlock}>
      <View onLayout={onHeroLayout}>
        <PremiumHero
          title={t('notifications')}
          description={copy.subtitle}
          icon={Bell}
          bleed={{ topInset: insets.top, onBack: () => router.back(), backLabel: t('back') }}
          accessory={(
            <Pressable accessibilityRole="button" accessibilityLabel={t('markRead')} hitSlop={8} onPress={() => read.mutate()}>
              <HeroBadge label={t('markRead')} icon={CheckCircle2} />
            </Pressable>
          )}
        />
      </View>
      <Pressable onPress={() => void requestPushPermission()} style={[styles.push, { backgroundColor: palette.surface }]}><Bell color={palette.brandIcon} size={22} /><Text style={[styles.pushText, { color: palette.text }]}>{pushToken ? t('pushEnabled') : t('enablePush')}</Text></Pressable>
    </View>
  );

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: palette.background }]}>
      <HeroStatusBar pastHero={pastHero} />
      <FlatList data={notifications.data ?? []} keyExtractor={(item) => item.id} ListHeaderComponent={listHeader} contentContainerStyle={[styles.list, { paddingBottom: 16 + insets.bottom }]} renderItem={renderNotification} ItemSeparatorComponent={NotificationSeparator} onScroll={onScroll} scrollEventThrottle={16} />
      {pastHero && <StatusBarScrim />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 }, headerBlock: { marginHorizontal: -16, marginBottom: 16, gap: 16 }, push: { marginHorizontal: 16, minHeight: 54, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, pushText: { fontWeight: '800' }, list: { paddingHorizontal: 16 }, separator: { height: 8 }, item: { minHeight: 88, borderRadius: radius.lg, padding: 14, flexDirection: 'row', gap: 10 }, dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.error, marginTop: 6 }, dotRead: { opacity: 0 }, copy: { flex: 1, gap: 4 }, itemTitle: { fontSize: 15, fontWeight: '700' }, body: { fontSize: 14, lineHeight: 20 }, date: { fontSize: 12 } });
