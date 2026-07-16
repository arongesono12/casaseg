import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell } from '@/components/ui/icons';
import { colors, radius, type AppPalette } from '@/constants/theme';
import { fetchNotifications, markNotificationsRead, type AppNotification } from '@/features/notifications/notifications.api';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useNotifications } from '@/providers/notification-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatDate } from '@/utils/formatters';

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
  const key = useMemo(() => ['notifications', user?.id ?? 'guest'] as const, [user?.id]);
  const notifications = useQuery({ queryKey: key, queryFn: fetchNotifications, enabled: Boolean(user) });
  const read = useMutation({ mutationFn: markNotificationsRead, onSuccess: () => { markAllRead(); void client.invalidateQueries({ queryKey: key }); } });
  const renderNotification = useCallback<ListRenderItem<AppNotification>>(
    ({ item }) => <NotificationRow notification={item} palette={palette} />,
    [palette],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={styles.header}><Text style={[styles.title, { color: palette.text }]}>{t('notifications')}</Text><Pressable onPress={() => read.mutate()}><Text style={styles.action}>{t('markRead')}</Text></Pressable></View>
      <Pressable onPress={() => void requestPushPermission()} style={[styles.push, { backgroundColor: palette.surface }]}><Bell color={colors.brand} size={22} /><Text style={[styles.pushText, { color: palette.text }]}>{pushToken ? t('pushEnabled') : t('enablePush')}</Text></Pressable>
      <FlatList data={notifications.data ?? []} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={renderNotification} ItemSeparatorComponent={NotificationSeparator} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 }, header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { fontSize: 27, fontWeight: '900' }, action: { color: colors.brandDark, fontWeight: '800' }, push: { marginHorizontal: 16, minHeight: 54, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, pushText: { fontWeight: '800' }, list: { padding: 16 }, separator: { height: 8 }, item: { minHeight: 88, borderRadius: radius.lg, padding: 14, flexDirection: 'row', gap: 10 }, dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.error, marginTop: 6 }, dotRead: { opacity: 0 }, copy: { flex: 1, gap: 4 }, itemTitle: { fontSize: 15, fontWeight: '900' }, body: { fontSize: 14, lineHeight: 20 }, date: { fontSize: 12 } });
