import { describe, expect, test } from 'bun:test';
import { notificationRoute } from '../../src/features/notifications/notification-route';

describe('destino de una notificación', () => {
  test('los avisos de pago abren la pestaña de pagos de cada participante', () => {
    expect(notificationRoute({ link: '/profile?tab=payments' })).toEqual({ pathname: '/(tabs)/profile', params: { tab: 'payments' } });
    expect(notificationRoute({ link: '/owner?tab=payments' })).toEqual({ pathname: '/owner/payments' });
  });

  test('chat y vivienda siguen teniendo prioridad', () => {
    expect(notificationRoute({ conversationId: 'chat-1', link: '/owner?tab=payments' })).toEqual({ pathname: '/chat/[conversationId]', params: { conversationId: 'chat-1' } });
    expect(notificationRoute({ propertyId: 'p-1' })).toEqual({ pathname: '/property/[id]', params: { id: 'p-1' } });
  });

  test('un enlace desconocido no navega', () => {
    expect(notificationRoute({ link: '/admin?tab=x' })).toBe(null);
    expect(notificationRoute({})).toBe(null);
  });
});
