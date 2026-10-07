// Reglas de agenda y de estado de las solicitudes de visita. Sin dependencias de
// React ni de Supabase para poder probarlas solas.
//
// Una visita es un acuerdo de reunión de public.agreements, el mismo que crea la
// web: el cliente propone (client_confirmed), el propietario confirma
// (fully_confirmed, requisito para generar el contrato) o cualquiera de los dos
// lo rechaza (rejected). `cancelled` es la intención de quien se retira; en la
// tabla se guarda como `rejected`, igual que en la web.

export type VisitRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type AgreementStatus = 'pending' | 'client_confirmed' | 'owner_confirmed' | 'fully_confirmed' | 'rejected';
export type VisitActor = 'owner' | 'requester';

/** Días que se ofrecen en el selector, contando hoy. */
export const VISIT_DAYS_AHEAD = 14;
/** Horas de inicio de visita, en hora local del dispositivo. */
export const VISIT_HOURS = [9, 10, 11, 12, 13, 16, 17, 18] as const;
/** Antelación mínima: nadie puede presentarse a una visita pedida hace cinco minutos. */
export const VISIT_MIN_LEAD_MINUTES = 120;

const MS_PER_MINUTE = 60_000;

/** Medianoche local de hoy y de los días siguientes. */
export function buildVisitDays(now: Date, count: number = VISIT_DAYS_AHEAD): Date[] {
  return Array.from({ length: count }, (_, offset) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
}

export function buildVisitSlot(day: Date, hour: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);
}

export function isSlotAvailable(slot: Date, now: Date, minLeadMinutes: number = VISIT_MIN_LEAD_MINUTES): boolean {
  return slot.getTime() - now.getTime() >= minLeadMinutes * MS_PER_MINUTE;
}

/** Un día solo se ofrece si le queda al menos una hora libre. */
export function dayHasAvailableSlots(day: Date, now: Date): boolean {
  return VISIT_HOURS.some((hour) => isSlotAvailable(buildVisitSlot(day, hour), now));
}

const transitions: Record<VisitActor, Partial<Record<VisitRequestStatus, readonly VisitRequestStatus[]>>> = {
  // El propietario responde a lo pendiente y puede anular lo que ya aceptó.
  owner: {
    pending: ['accepted', 'rejected'],
    accepted: ['cancelled'],
  },
  // Quien solicita solo puede retirarse antes de que ocurra la visita.
  requester: {
    pending: ['cancelled'],
    accepted: ['cancelled'],
  },
};

export function canTransition(actor: VisitActor, from: VisitRequestStatus, to: VisitRequestStatus): boolean {
  return transitions[actor][from]?.includes(to) ?? false;
}

export function isVisitRequestStatus(value: unknown): value is VisitRequestStatus {
  return value === 'pending' || value === 'accepted' || value === 'rejected' || value === 'cancelled';
}

/** Estado visible de un acuerdo: confirmado solo cuando lo han aceptado las dos partes. */
export function visitStatusFromAgreement(status: unknown): VisitRequestStatus {
  if (status === 'fully_confirmed') return 'accepted';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

/**
 * agreements guarda fecha (date) y hora (time) sin zona, en hora local, como la
 * web. Se convierte con la hora local del dispositivo en los dos sentidos.
 */
export function toMeetingDateTime(slot: Date): { meetingDate: string; meetingTime: string } {
  return {
    meetingDate: `${slot.getFullYear()}-${pad(slot.getMonth() + 1)}-${pad(slot.getDate())}`,
    meetingTime: `${pad(slot.getHours())}:${pad(slot.getMinutes())}`,
  };
}

export function fromMeetingDateTime(meetingDate: unknown, meetingTime: unknown): Date | null {
  if (typeof meetingDate !== 'string') return null;
  const [year, month, day] = meetingDate.split('-').map(Number);
  if (!year || !month || !day) return null;
  const [hours = 0, minutes = 0] = typeof meetingTime === 'string' ? meetingTime.split(':').map(Number) : [];
  return new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
}
