import Constants from 'expo-constants';
import { router } from 'expo-router';
import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { registerPushDevice } from '@/features/notifications/push-notifications';
import { useQuery } from '@tanstack/react-query';
import { fetchConversations } from '@/features/messaging/messaging.api';
import { conversationKeys, useConversationSummaryRealtime } from '@/features/messaging/use-messaging-realtime';
import { useAuth } from '@/providers/auth-context';
import { NotificationContext } from '@/providers/notification-context';

function canLoadNativeNotifications() {
  return Platform.OS !== 'web' && Constants.appOwnership !== 'expo';
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushToken, setPushToken] = useState<string>();
  const conversations = useQuery({
    queryKey: conversationKeys.list(user?.id ?? 'anonymous'),
    queryFn: fetchConversations,
    enabled: isAuthenticated && Boolean(user),
  });
  useConversationSummaryRealtime(user?.id);
  const messageUnreadCount = isAuthenticated
    ? (conversations.data ?? []).reduce((total, conversation) => total + conversation.unreadCount, 0)
    : 0;

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setPushToken(undefined);
    }
  }, [isAuthenticated]);
  useEffect(() => {
    if (!canLoadNativeNotifications()) return;
    let subscription: { remove: () => void } | undefined;
    let active = true;

    void import('expo-notifications').then((Notifications) => {
      if (!active) return;
      Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }) });
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data ?? {};
        if (typeof data.conversationId === 'string') router.push({ pathname: '/chat/[conversationId]', params: { conversationId: data.conversationId } });
        else if (typeof data.propertyId === 'string') router.push({ pathname: '/property/[id]', params: { id: data.propertyId } });
      });
    });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);
  const requestPushPermission = useCallback(async () => setPushToken(await registerPushDevice()), []);
  const value = useMemo(() => ({ unreadCount, messageUnreadCount, pushToken, requestPushPermission, markAllRead: () => setUnreadCount(0), incrementUnread: () => { if (isAuthenticated) setUnreadCount((count) => count + 1); } }), [isAuthenticated, messageUnreadCount, pushToken, requestPushPermission, unreadCount]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
