import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bell, CheckCircle2, Trash2, X } from '@/components/ui/icons';
import { colors, fontFamily, radius } from '@/constants/theme';
import { notificationRoute } from '@/features/notifications/notification-route';
import { deleteNotification, fetchNotifications, markNotificationRead, markNotificationsRead, type AppNotification } from '@/features/notifications/notifications.api';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useNotifications } from '@/providers/notification-context';
import { useAuth } from '@/providers/auth-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatDate } from '@/utils/formatters';

const copy = defineCopy({
  es: { empty: 'No tienes notificaciones por ahora.', error: 'No pudimos cargar las notificaciones.', retry: 'Reintentar', close: 'Cerrar notificaciones', remove: 'Eliminar notificación', deleteError: 'No se pudo eliminar la notificación. Inténtalo de nuevo.' },
  fr: { empty: 'Aucune notification pour le moment.', error: 'Impossible de charger les notifications.', retry: 'Réessayer', close: 'Fermer les notifications', remove: 'Supprimer la notification', deleteError: 'Impossible de supprimer la notification. Réessayez.' },
  en: { empty: 'No notifications yet.', error: 'We could not load your notifications.', retry: 'Try again', close: 'Close notifications', remove: 'Delete notification', deleteError: 'Could not delete the notification. Try again.' },
});

type NotificationDropdownProps = {
  userId: string;
  visible: boolean;
  onClose: () => void;
  anchorRight: number;
};

export function NotificationDropdown({ userId, visible, onClose, anchorRight }: NotificationDropdownProps) {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const { role } = useAuth();
  const { t } = useI18n();
  const labels = useCopy(copy);
  const { markAllRead } = useNotifications();
  const client = useQueryClient();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const queryKey = ['notifications', userId] as const;
  const notifications = useQuery({ queryKey: [...queryKey, role], queryFn: () => fetchNotifications(userId, role), enabled: visible });
  const markAll = useMutation({
    mutationFn: () => markNotificationsRead(userId, role),
    onSuccess: () => {
      markAllRead();
      client.setQueryData<AppNotification[]>(queryKey, (items) => items?.map((item) => ({ ...item, read: true })));
    },
  });
  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (_, id) => {
      client.setQueryData<AppNotification[]>(queryKey, (items) => items?.map((item) => item.id === id ? { ...item, read: true } : item));
    },
  });
  const removeOne = useMutation({
    mutationFn: deleteNotification,
    onSuccess: (_, id) => {
      client.setQueryData<AppNotification[]>(queryKey, (items) => items?.filter((item) => item.id !== id));
    },
    onError: () => setDeleteError(labels.deleteError),
  });
  const items = notifications.data ?? [];
  const hasUnread = items.some((item) => !item.read);
  const top = insets.top + 68;

  const openNotification = (notification: AppNotification) => {
    if (!notification.read) markOne.mutate(notification.id);
    const route = notificationRoute(notification);
    if (!route) return;
    onClose();
    router.push(route as Href);
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel={labels.close} accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border, right: anchorRight, top, width: Math.min(360, width - 32), maxHeight: Math.max(160, height - top - insets.bottom - 12) }]}>
          <View style={[styles.heading, { borderBottomColor: palette.border }]}>
            <View style={styles.titleRow}>
              <Bell color={palette.brandIcon} size={20} />
              <Text style={[styles.title, { color: palette.text }]}>{t('notifications')}</Text>
            </View>
            <Pressable accessibilityLabel={labels.close} accessibilityRole="button" hitSlop={8} onPress={onClose} style={styles.closeButton}>
              <X color={palette.textSecondary} size={20} />
            </Pressable>
          </View>
          {hasUnread ? <Pressable accessibilityRole="button" accessibilityLabel={t('markRead')} disabled={markAll.isPending} onPress={() => markAll.mutate()} style={[styles.markAll, { borderBottomColor: palette.border }]}>
            <CheckCircle2 color={palette.brandIcon} size={16} />
            <Text style={[styles.markAllText, { color: palette.brandText }]}>{t('markRead')}</Text>
          </Pressable> : null}
          {deleteError ? <Text accessibilityRole="alert" style={[styles.deleteError, { color: palette.text }]}>{deleteError}</Text> : null}
          {notifications.isPending ? <View style={styles.state}><ActivityIndicator color={palette.brandIcon} /></View>
            : notifications.isError ? <View style={styles.state}>
              <Text style={[styles.stateText, { color: palette.textSecondary }]}>{labels.error}</Text>
              <Pressable accessibilityRole="button" onPress={() => void notifications.refetch()}><Text style={[styles.retry, { color: palette.brandText }]}>{labels.retry}</Text></Pressable>
            </View>
              : items.length === 0 ? <View style={styles.state}><Text style={[styles.stateText, { color: palette.textSecondary }]}>{labels.empty}</Text></View>
                : <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} style={styles.scroll}>
                  {items.map((notification) => <View
                    key={notification.id}
                    style={[styles.item, { backgroundColor: !notification.read ? palette.subtle : palette.surface }]}
                  >
                    <Pressable accessibilityRole="button" onPress={() => openNotification(notification)} style={({ pressed }) => [styles.itemMain, pressed && styles.pressed]}>
                      <View style={[styles.dot, { backgroundColor: notification.read ? 'transparent' : colors.brand }]} />
                      <View style={styles.itemCopy}>
                        <Text numberOfLines={2} style={[styles.itemTitle, { color: palette.text }]}>{notification.title}</Text>
                        <Text numberOfLines={3} style={[styles.body, { color: palette.textSecondary }]}>{notification.body}</Text>
                        {notification.actorName ? <Text style={[styles.date, { color: palette.textSecondary }]}>Realizado por {notification.actorName} · {notification.actorRole ?? 'sistema'}</Text> : null}
                        <Text style={[styles.date, { color: palette.textSecondary }]}>{formatDate(notification.createdAt)}</Text>
                      </View>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`${labels.remove}: ${notification.title}`}
                      accessibilityRole="button"
                      disabled={removeOne.isPending}
                      hitSlop={4}
                      onPress={() => { setDeleteError(null); removeOne.mutate(notification.id); }}
                      style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                    >
                      <Trash2 color={palette.textSecondary} size={17} />
                    </Pressable>
                  </View>)}
                </ScrollView>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  panel: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, overflow: 'hidden', boxShadow: '0 12px 32px rgba(15,23,42,0.2)', elevation: 12 },
  heading: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { fontFamily: fontFamily.bold, fontSize: 16 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  markAll: { minHeight: 42, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  markAllText: { fontFamily: fontFamily.semibold, fontSize: 13 },
  state: { minHeight: 128, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  stateText: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  retry: { fontFamily: fontFamily.semibold, fontSize: 14 },
  scroll: { flexShrink: 1 },
  list: { padding: 8, gap: 4 },
  item: { minHeight: 80, borderRadius: radius.md, flexDirection: 'row', alignItems: 'flex-start' },
  itemMain: { flex: 1, minHeight: 80, padding: 11, flexDirection: 'row', gap: 8 },
  deleteButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  deleteError: { paddingHorizontal: 16, paddingVertical: 9, fontFamily: fontFamily.regular, fontSize: 13 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  itemCopy: { flex: 1, gap: 4 },
  itemTitle: { fontFamily: fontFamily.bold, fontSize: 14 },
  body: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  date: { fontFamily: fontFamily.regular, fontSize: 11 },
  pressed: { opacity: 0.72 },
});
