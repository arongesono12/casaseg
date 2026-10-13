import { callingCodeOf } from '@/features/auth/country-calling-codes';

// La base de datos compartida con la web y Clerk solo aceptan E.164: "+", prefijo y 8-15 cifras.
const E164_PHONE = /^\+[1-9]\d{7,14}$/;

/**
 * Deja el número en E.164 ("+240222123456"). Un número sin "+" se queda sin
 * prefijo: inventarlo convertiría "222…" de Malabo en un número de Mauritania.
 */
export function normalizeProfilePhone(value: string): string | null {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

/** Vacío (quitar el número) o un número internacional completo. */
export function isValidProfilePhone(value: string): boolean {
  if (!/^[+\d\s().-]*$/.test(value.trim())) return false;
  const phone = normalizeProfilePhone(value);
  return phone === null || E164_PHONE.test(phone);
}

/** "+240222123456" → "+240 222 123 456". Los números antiguos sin prefijo se muestran tal cual. */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizeProfilePhone(phone);
  const code = normalized ? callingCodeOf(normalized) : null;
  if (!normalized || !code) return phone.trim();
  const national = normalized.slice(code.length).replace(/(\d{3})(?=\d)/g, '$1 ');
  return `${code} ${national}`;
}
