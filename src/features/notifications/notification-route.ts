/**
 * Destino al pulsar una notificación. Además de chats y viviendas (metadata),
 * entiende el `link` web que guardan las Edge Functions, como los avisos de
 * pago (`/profile?tab=payments`, `/owner?tab=payments`). Sin expo-router, para
 * poder probarlo; quien navega lo convierte en `Href`.
 */

export type NotificationRoute = { pathname: string; params?: Record<string, string> };

type RoutableNotification = { conversationId?: string; propertyId?: string; link?: string };

/** Rutas web de la bandeja de notificaciones y su pantalla equivalente en la app. */
const WEB_LINK_ROUTES: Record<string, NotificationRoute> = {
  '/profile?tab=payments': { pathname: '/(tabs)/profile', params: { tab: 'payments' } },
  '/owner?tab=payments': { pathname: '/owner/payments' },
  '/owner?tab=transactions': { pathname: '/owner/payments' },
};

export function notificationRoute(notification: RoutableNotification): NotificationRoute | null {
  if (notification.conversationId) return { pathname: '/chat/[conversationId]', params: { conversationId: notification.conversationId } };
  if (notification.propertyId) return { pathname: '/property/[id]', params: { id: notification.propertyId } };
  const link = notification.link?.trim();
  return link ? WEB_LINK_ROUTES[link] ?? null : null;
}
