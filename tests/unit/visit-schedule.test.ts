import { describe, expect, test } from 'bun:test';

import {
  buildVisitDays,
  buildVisitSlot,
  canTransition,
  dayHasAvailableSlots,
  isSlotAvailable,
  isVisitRequestStatus,
  VISIT_HOURS,
} from '../../src/features/visits/visit-schedule';

// Hora local: los tests no dependen de la zona horaria de la máquina.
const NOW = new Date(2026, 9, 1, 15, 30);

describe('agenda de visitas', () => {
  test('ofrece catorce días empezando hoy a medianoche', () => {
    const days = buildVisitDays(NOW);

    expect(days.length).toBe(14);
    expect(days[0]).toEqual(new Date(2026, 9, 1));
    expect(days[13]).toEqual(new Date(2026, 9, 14));
  });

  test('cruza el fin de mes sin saltarse días', () => {
    const days = buildVisitDays(new Date(2026, 9, 30, 10), 3);

    expect(days.map((day) => day.getDate())).toEqual([30, 31, 1]);
  });

  test('construye la hora local del día elegido', () => {
    expect(buildVisitSlot(new Date(2026, 9, 2), 17)).toEqual(new Date(2026, 9, 2, 17));
  });

  test('exige dos horas de antelación', () => {
    expect(isSlotAvailable(new Date(2026, 9, 1, 17), NOW)).toBe(false);
    expect(isSlotAvailable(new Date(2026, 9, 1, 18), NOW)).toBe(true);
  });

  test('descarta hoy cuando ya no quedan horas libres', () => {
    const lastHour = Math.max(...VISIT_HOURS);
    const lateNow = new Date(2026, 9, 1, lastHour - 1);

    expect(dayHasAvailableSlots(new Date(2026, 9, 1), lateNow)).toBe(false);
    expect(dayHasAvailableSlots(new Date(2026, 9, 2), lateNow)).toBe(true);
  });
});

describe('estados de una solicitud de visita', () => {
  test('el propietario acepta o rechaza lo pendiente', () => {
    expect(canTransition('owner', 'pending', 'accepted')).toBe(true);
    expect(canTransition('owner', 'pending', 'rejected')).toBe(true);
    expect(canTransition('owner', 'accepted', 'cancelled')).toBe(true);
  });

  test('quien solicita solo puede cancelar', () => {
    expect(canTransition('requester', 'pending', 'cancelled')).toBe(true);
    expect(canTransition('requester', 'accepted', 'cancelled')).toBe(true);
    expect(canTransition('requester', 'pending', 'accepted')).toBe(false);
    expect(canTransition('requester', 'pending', 'rejected')).toBe(false);
  });

  test('los estados finales no cambian', () => {
    for (const status of ['rejected', 'cancelled'] as const) {
      expect(canTransition('owner', status, 'accepted')).toBe(false);
      expect(canTransition('requester', status, 'cancelled')).toBe(false);
    }
  });

  test('reconoce solo los estados de la tabla', () => {
    expect(isVisitRequestStatus('pending')).toBe(true);
    expect(isVisitRequestStatus('confirmed')).toBe(false);
    expect(isVisitRequestStatus(undefined)).toBe(false);
  });
});
