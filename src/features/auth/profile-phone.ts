/** Conserva el formato legible elegido por la persona, sin espacios sobrantes. */
export function normalizeProfilePhone(value: string): string | null {
  return value.trim().replace(/\s+/g, ' ') || null;
}

/** Acepta números locales o internacionales sin asumir un prefijo de país. */
export function isValidProfilePhone(value: string): boolean {
  const phone = normalizeProfilePhone(value);
  if (!phone) return true;
  if (!/^\+?[\d\s().-]+$/.test(phone)) return false;
  const digitCount = phone.replace(/\D/g, '').length;
  return digitCount >= 7 && digitCount <= 15;
}
