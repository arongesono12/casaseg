import type { ChatMessage } from '@/features/messaging/messaging.api';

/** Mensajes seguidos del mismo remitente con menos de este margen se agrupan (sin colita ni separación). */
export const GROUP_WINDOW_MS = 5 * 60 * 1000;

export type TimelineItem =
  | { type: 'message'; key: string; message: ChatMessage; own: boolean; firstOfGroup: boolean }
  | { type: 'day'; key: string; date: Date };

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Convierte los mensajes (del más nuevo al más antiguo, como los pinta la
 * FlatList invertida) en la línea de tiempo del chat: separadores de día y
 * marca de "primer mensaje del grupo" para dibujar la colita.
 *
 * En la lista invertida el elemento siguiente del array se pinta ENCIMA, así
 * que el separador de un día va justo después de su mensaje más antiguo.
 */
export function buildChatTimeline(messages: ChatMessage[], isOwn: (message: ChatMessage) => boolean): TimelineItem[] {
  const items: TimelineItem[] = [];
  messages.forEach((message, index) => {
    const older = messages[index + 1];
    const date = new Date(message.createdAt);
    const olderDate = older ? new Date(older.createdAt) : undefined;
    const own = isOwn(message);
    const continuesDay = Boolean(olderDate && sameDay(date, olderDate));
    const groupedWithOlder = Boolean(
      older
        && continuesDay
        && isOwn(older) === own
        && older.senderId === message.senderId
        && date.getTime() - olderDate!.getTime() < GROUP_WINDOW_MS,
    );
    items.push({ type: 'message', key: message.id, message, own, firstOfGroup: !groupedWithOlder });
    if (!continuesDay) items.push({ type: 'day', key: `day-${date.toDateString()}`, date });
  });
  return items;
}

/** "Hoy", "Ayer", el día de la semana dentro de la última semana, o la fecha completa. */
export function dayLabel(date: Date, now: Date, locale: string, labels: { today: string; yesterday: string }) {
  const startOf = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / (24 * 60 * 60 * 1000));
  if (days === 0) return labels.today;
  if (days === 1) return labels.yesterday;
  const text = days > 1 && days < 7
    ? new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
    : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
