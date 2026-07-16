import { createContext, useContext } from 'react';

export type NotificationContextValue = {
  unreadCount: number;
  messageUnreadCount: number;
  pushToken?: string;
  requestPushPermission: () => Promise<void>;
  markAllRead: () => void;
  incrementUnread: () => void;
};

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationProvider');
  return context;
}
