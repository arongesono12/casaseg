import { isExpoGo } from '@/lib/execution-environment';
import { router } from 'expo-router';
import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { registerPushDevice } from '@/features/notifications/push-notifications';
import { useQuery } from '@tanstack/react-query';
import { fetchConversations } from '@/features/messaging/messaging.api';
import { conversationKeys, useConversationSummaryRealtime } from '@/features/messaging/use-messaging-realtime';
import { useProfileId } from '@/features/auth/use-profile-id';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { NotificationContext } from '@/providers/notification-context';

function canLoadNativeNotifications() {
  return Platform.OS !== 'web' && !isExpoGo;
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushToken, setPushToken] = useState<string>();
  const conversations = useQuery({
    queryKey: conversationKeys.list(user?.id ?? 'anonymous'),
    queryFn: fetchConversations,
    enabled: isAuthenticated && Boolean(user),
  });
  const profileId = useProfileId();
  useConversationSummaryRealtime(user?.id, profileId);
  const messageUnreadCount = isAuthenticated
    ? (conversations.data ?? []).reduce((total, conversation) => total + conversation.unreadCount, 0)
    : 0;

  // Al cerrar sesión se descarta el estado de la cuenta anterior. Se ajusta
  // durante el render (patrón recomendado por React) en lugar de en un efecto,
  // que pintaba primero el contador viejo y luego forzaba un segundo render.
  const [wasAuthenticated, setWasAuthenticated] = useState(isAuthenticated);
  if (wasAuthenticated !== isAuthenticated) {
    setWasAuthenticated(isAuthenticated);
    if (!isAuthenticated) {
      setUnreadCount(0);
      setPushToken(undefined);
    }
  }
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
  const requestPushPermission = useCallback(async () => {
    try {
      setPushToken(await registerPushDevice());
    } catch (error) {
      Alert.alert(
        t('pushEnableFailed'),
        error instanceof Error ? error.message : t('pushEnableRetry'),
      );
    }
  }, [t]);
  const value = useMemo(() => ({ unreadCount, messageUnreadCount, pushToken, requestPushPermission, markAllRead: () => setUnreadCount(0), incrementUnread: () => { if (isAuthenticated) setUnreadCount((count) => count + 1); } }), [isAuthenticated, messageUnreadCount, pushToken, requestPushPermission, unreadCount]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
