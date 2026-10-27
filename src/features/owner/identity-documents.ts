/**
 * Documentos de identidad aceptados para ser propietario. Misma regla que la
 * web (src/utils/identityDocuments.ts) y el servidor
 * (public.validate_owner_upgrade_request): DIP, pasaporte o tarjeta de
 * residencia, todos con fecha de caducidad; un documento caducado no se acepta.
 */
export type IdentityDocumentType = 'dni' | 'passport' | 'residence_card';

export const IDENTITY_DOCUMENT_TYPES: readonly IdentityDocumentType[] = ['dni', 'passport', 'residence_card'];

// El servidor rechaza fechas más lejanas: suelen ser un error al escribirlas.
const MAX_VALIDITY_YEARS = 20;

/** Fecha local en formato YYYY-MM-DD. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toIsoDate(new Date(`${value}T00:00:00`)) === value;
}

/**
 * La app no tiene selector de fecha: el usuario escribe DD/MM/AAAA. Devuelve
 * la fecha ISO o '' si el texto no es una fecha del calendario.
 */
export function parseDisplayDate(value: string): string {
  const trimmed = value.trim();
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed);
  const iso = match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : trimmed;
  return isIsoDate(iso) ? iso : '';
}

/** "2031-05-20" → "20/05/2031". */
export function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return year && month && day ? `${day}/${month}/${year}` : iso;
}

/** Vigente hasta el día de caducidad incluido. */
export function isIdentityDocumentExpired(expiresAt: string | null | undefined, today: Date = new Date()): boolean {
  return Boolean(expiresAt) && (expiresAt as string) < toIsoDate(today);
}

export function identityDocumentExpiryError(expiresAt: string, today: Date = new Date()): string | null {
  if (!expiresAt) return 'Indica la fecha de caducidad de tu documento de identidad (DD/MM/AAAA).';
  if (!isIsoDate(expiresAt)) return 'La fecha de caducidad no es válida.';
  if (isIdentityDocumentExpired(expiresAt, today)) return 'Tu documento de identidad ha caducado. Renuévalo antes de enviar la solicitud.';
  const limit = new Date(today);
  limit.setFullYear(limit.getFullYear() + MAX_VALIDITY_YEARS);
  if (expiresAt > toIsoDate(limit)) return 'La fecha de caducidad no es válida.';
  return null;
}
