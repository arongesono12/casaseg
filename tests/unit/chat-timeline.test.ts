import { describe, expect, test } from 'bun:test';

import { buildChatTimeline, dayLabel } from '@/features/messaging/chat-timeline';
import type { ChatMessage } from '@/features/messaging/messaging.api';

const message = (id: string, senderId: string, createdAt: string): ChatMessage => ({ id, conversationId: 'c', senderId, content: id, createdAt, status: 'sent' });
const isOwn = (m: ChatMessage) => m.senderId === 'me';

describe('buildChatTimeline', () => {
  test('groups consecutive messages from the same sender and marks the first one', () => {
    // Del más nuevo al más antiguo, como la FlatList invertida.
    const items = buildChatTimeline([
      message('3', 'me', '2026-10-04T10:03:00'),
      message('2', 'me', '2026-10-04T10:01:00'),
      message('1', 'other', '2026-10-04T10:00:00'),
    ], isOwn);
    const messages = items.filter((item) => item.type === 'message');
    expect(messages.map((item) => [item.key, item.own, item.firstOfGroup])).toEqual([
      ['3', true, false],
      ['2', true, true],
      ['1', false, true],
    ]);
  });

  test('starts a new group after the time window', () => {
    const items = buildChatTimeline([
      message('2', 'me', '2026-10-04T10:10:00'),
      message('1', 'me', '2026-10-04T10:00:00'),
    ], isOwn);
    expect(items.filter((item) => item.type === 'message').every((item) => item.type === 'message' && item.firstOfGroup)).toBe(true);
  });

  test('places a day separator after the oldest message of each day', () => {
    const items = buildChatTimeline([
      message('2', 'me', '2026-10-04T09:00:00'),
      message('1', 'other', '2026-10-03T22:00:00'),
    ], isOwn);
    expect(items.map((item) => item.type)).toEqual(['message', 'day', 'message', 'day']);
  });
});

describe('dayLabel', () => {
  const now = new Date('2026-10-04T12:00:00');
  const labels = { today: 'Hoy', yesterday: 'Ayer' };

  test('uses today and yesterday', () => {
    expect(dayLabel(new Date('2026-10-04T08:00:00'), now, 'es-ES', labels)).toBe('Hoy');
    expect(dayLabel(new Date('2026-10-03T23:00:00'), now, 'es-ES', labels)).toBe('Ayer');
  });

  test('uses the weekday within the last week and the date otherwise', () => {
    expect(dayLabel(new Date('2026-09-30T10:00:00'), now, 'es-ES', labels)).toBe('Miércoles');
    expect(dayLabel(new Date('2026-08-19T10:00:00'), now, 'es-ES', labels)).toBe('19 de agosto');
  });
});
