import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell } from '@/components/ui/icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '@/constants/theme';
import { fetchNotifications, markNotificationsRead } from '@/features/notifications/notifications.api';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { useNotifications } from '@/providers/notification-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { formatDate } from '@/utils/formatters';

export default function NotificationsScreen() {
  const { user } = useAuth(); const { palette } = useAppTheme(); const { t } = useI18n(); const client = useQueryClient(); const { markAllRead, requestPushPermission, pushToken } = useNotifications(); const key = ['notifications', user!.id];
  const notifications = useQuery({ queryKey: key, queryFn: () => fetchNotifications(user!.id) });
  const read = useMutation({ mutationFn: () => markNotificationsRead(user!.id), onSuccess: () => { markAllRead(); void client.invalidateQueries({ queryKey: key }); } });
  return <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}><View style={styles.header}><Text style={[styles.title, { color: palette.text }]}>{t('notifications')}</Text><Pressable onPress={() => read.mutate()}><Text style={styles.action}>{t('markRead')}</Text></Pressable></View><Pressable onPress={() => void requestPushPermission(user!.id)} style={[styles.push, { backgroundColor: palette.surface }]}><Bell color={colors.brand} size={22} /><Text style={{ color: palette.text, fontWeight: '800' }}>{pushToken ? t('pushEnabled') : t('enablePush')}</Text></Pressable><FlatList data={notifications.data ?? []} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <Pressable onPress={() => item.conversationId ? router.push({ pathname: '/chat/[conversationId]', params: { conversationId: item.conversationId } }) : item.propertyId ? router.push({ pathname: '/property/[id]', params: { id: item.propertyId } }) : undefined} style={[styles.item, { backgroundColor: palette.surface }]}><View style={[styles.dot, { opacity: item.read ? 0 : 1 }]} /><View style={styles.copy}><Text style={[styles.itemTitle, { color: palette.text }]}>{item.title}</Text><Text style={[styles.body, { color: palette.textSecondary }]}>{item.body}</Text><Text style={[styles.date, { color: palette.muted }]}>{formatDate(item.createdAt)}</Text></View></Pressable>} ItemSeparatorComponent={() => <View style={{ height: 8 }} />} /></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1 }, header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { fontSize: 27, fontWeight: '900' }, action: { color: colors.brandDark, fontWeight: '800' }, push: { marginHorizontal: 16, minHeight: 54, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, list: { padding: 16 }, item: { minHeight: 88, borderRadius: radius.lg, padding: 14, flexDirection: 'row', gap: 10 }, dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.error, marginTop: 6 }, copy: { flex: 1, gap: 4 }, itemTitle: { fontSize: 15, fontWeight: '900' }, body: { fontSize: 14, lineHeight: 20 }, date: { fontSize: 12 } });
