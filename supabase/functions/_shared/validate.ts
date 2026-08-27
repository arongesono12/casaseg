import { InputError } from './http.ts';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function text(value: unknown, field: string, min: number, max: number) {
  if (typeof value !== 'string') throw new InputError(`${field} es obligatorio.`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new InputError(`${field} debe tener entre ${min} y ${max} caracteres.`);
  }
  return normalized;
}

export function optionalText(value: unknown, field: string, max: number) {
  if (value === undefined || value === null || value === '') return '';
  return text(value, field, 0, max);
}

export function number(value: unknown, field: string, min: number, max: number) {
  const normalized = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(normalized) || normalized < min || normalized > max) {
    throw new InputError(`${field} debe ser un número entre ${min} y ${max}.`);
  }
  return normalized;
}

export function stringArray(value: unknown, field: string, maxItems: number, maxLength: number) {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new InputError(`${field} admite un máximo de ${maxItems} elementos.`);
  }
  return value.map((item) => text(item, field, 1, maxLength));
}

export function uuid(value: unknown, field: string) {
  const normalized = text(value, field, 36, 36);
  if (!uuidPattern.test(normalized)) throw new InputError(`${field} no es un identificador válido.`);
  return normalized.toLowerCase();
}

export function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  const normalized = text(value, field, 1, 60);
  if (!(allowed as readonly string[]).includes(normalized)) {
    throw new InputError(`${field} no admite el valor "${normalized}".`);
  }
  return normalized as T;
}

/**
 * Acepta una fecha ISO y exige que caiga en el futuro dentro de una ventana
 * razonable. Una visita propuesta para ayer, o para dentro de tres años, es un
 * error del cliente, no algo que deba llegar a la base de datos.
 */
export function futureIsoDate(value: unknown, field: string, maxDaysAhead: number) {
  const normalized = text(value, field, 4, 40);
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) throw new InputError(`${field} no es una fecha válida.`);

  const now = Date.now();
  if (parsed <= now) throw new InputError(`${field} debe ser una fecha futura.`);
  if (parsed > now + maxDaysAhead * 24 * 60 * 60 * 1000) {
    throw new InputError(`${field} no puede superar los ${maxDaysAhead} días de antelación.`);
  }

  return new Date(parsed).toISOString();
}
