import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

import { OWNER_DOCUMENT_BUCKET, MAX_OWNER_DOCUMENT_BYTES } from '@/features/owner/owner-upgrade.api';
import type { OwnershipChecklistResult, OwnershipReviewDecision } from '@/features/owner/property-ownership';
import { readLocalFile } from '@/lib/read-local-file';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  PropertyOwnershipDocument,
  PropertyOwnershipDocumentKind,
  PropertyOwnershipRoute,
  PropertyOwnershipVerification,
} from '@/types';

/**
 * Verificación de la propiedad por vivienda, igual que
 * src/services/supabase/propertyOwnershipService.ts de la web. Los documentos
 * se suben al bucket privado `documents` y la base de datos comprueba la vía,
 * las rutas y las fechas (migración 20261029120000_property_ownership_verification).
 */

export const ownershipKeys = {
  own: (ownerId: string) => ['property-ownership', 'own', ownerId] as const,
  queue: (status: string) => ['property-ownership', 'queue', status] as const,
};

export type PickedOwnershipFile = { uri: string; name: string; mimeType?: string; size?: number };

export type OwnershipDocumentUpload = {
  kind: PropertyOwnershipDocumentKind;
  file: PickedOwnershipFile;
  /** YYYY-MM-DD; obligatoria para el certificado registral. */
  issuedOn?: string;
};

type Row = Record<string, unknown>;

const SIGNED_URL_SECONDS = 120;

// Firma de cada formato: el servidor solo acepta estas extensiones.
const FILE_SIGNATURES: { ext: string; mime: string; matches: (head: Uint8Array) => boolean }[] = [
  { ext: 'pdf', mime: 'application/pdf', matches: (h) => h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46 },
  { ext: 'jpg', mime: 'image/jpeg', matches: (h) => h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff },
  { ext: 'png', mime: 'image/png', matches: (h) => h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47 },
  { ext: 'webp', mime: 'image/webp', matches: (h) => h[0] === 0x52 && h[1] === 0x49 && h[2] === 0x46 && h[3] === 0x46 && h[8] === 0x57 && h[9] === 0x45 && h[10] === 0x42 && h[11] === 0x50 },
];

/** Detecta el formato por su contenido, no por el nombre. */
export function detectOwnershipFileType(bytes: ArrayBuffer): { ext: string; mime: string } | null {
  if (bytes.byteLength <= 0 || bytes.byteLength > MAX_OWNER_DOCUMENT_BYTES) return null;
  const head = new Uint8Array(bytes.slice(0, 12));
  const match = FILE_SIGNATURES.find((signature) => signature.matches(head));
  return match ? { ext: match.ext, mime: match.mime } : null;
}

async function uploadOwnershipDocument(userId: string, propertyId: string, file: PickedOwnershipFile): Promise<string> {
  const bytes = await readLocalFile(file.uri);
  if (bytes.byteLength > MAX_OWNER_DOCUMENT_BYTES) throw new Error(`"${file.name}" pesa más de 10 MB.`);
  const type = detectOwnershipFileType(bytes);
  if (!type) throw new Error(`"${file.name}" no es un JPG, PNG, WebP o PDF válido.`);
  const path = `${userId}/property-ownership/${propertyId}/${Crypto.randomUUID()}.${type.ext}`;
  const { error } = await supabase.storage.from(OWNER_DOCUMENT_BUCKET).upload(path, bytes, { contentType: type.mime, upsert: false });
  if (error) throw error;
  return path;
}

function mapDocument(row: Row): PropertyOwnershipDocument {
  return {
    id: String(row.id),
    kind: (row.kind ?? 'public_deed') as PropertyOwnershipDocumentKind,
    storagePath: String(row.storage_path ?? row.storagePath ?? ''),
    issuedOn: (row.issued_on ?? row.issuedOn ?? null) as string | null,
    reviewResult: (row.review_result ?? row.reviewResult ?? 'pending') as PropertyOwnershipDocument['reviewResult'],
    reviewNote: (row.review_note ?? row.reviewNote ?? null) as string | null,
  };
}

const optional = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

/** Acepta filas de la tabla (snake_case) y de la cola de revisión (camelCase). */
export function mapPropertyOwnershipVerification(row: Row): PropertyOwnershipVerification {
  const documents = (row.property_ownership_documents ?? row.documents ?? []) as Row[];
  return {
    id: String(row.id),
    propertyId: String(row.property_id ?? row.propertyId ?? ''),
    ownerId: String(row.owner_id ?? row.ownerId ?? ''),
    route: (row.route ?? 'registry') as PropertyOwnershipRoute,
    status: (row.status ?? 'pending') as PropertyOwnershipVerification['status'],
    reviewNotes: (row.review_notes ?? row.reviewNotes ?? null) as string | null,
    reviewedAt: (row.reviewed_at ?? row.reviewedAt ?? null) as string | null,
    createdAt: String(row.created_at ?? row.createdAt ?? ''),
    documents: Array.isArray(documents) ? documents.map(mapDocument) : [],
    propertyTitle: optional(row.propertyTitle),
    propertyLocation: optional(row.propertyLocation),
    propertyStatus: optional(row.propertyStatus),
    ownerName: optional(row.ownerName),
    ownerEmail: optional(row.ownerEmail),
  };
}

/**
 * Sube los documentos y crea la verificación. Si algo falla, borra los
 * archivos subidos: ninguna verificación los referencia.
 */
export async function submitPropertyOwnershipVerification(params: {
  userId: string;
  propertyId: string;
  route: PropertyOwnershipRoute;
  documents: OwnershipDocumentUpload[];
}): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('La verificación requiere conexión con el servidor de CasasEG.');
  const uploadedPaths: string[] = [];
  try {
    const payload = [];
    for (const document of params.documents) {
      const path = await uploadOwnershipDocument(params.userId, params.propertyId, document.file);
      uploadedPaths.push(path);
      payload.push({ kind: document.kind, path, issuedOn: document.issuedOn || null });
    }
    const { data, error } = await supabase.rpc('submit_property_ownership_verification', {
      p_property_id: params.propertyId,
      p_route: params.route,
      p_documents: payload,
    });
    if (error) throw error;
    return String(data);
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from(OWNER_DOCUMENT_BUCKET).remove(uploadedPaths);
    throw error;
  }
}

export async function fetchOwnPropertyOwnershipVerifications(ownerId: string): Promise<PropertyOwnershipVerification[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('property_ownership_verifications')
    .select('*, property_ownership_documents(*)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(mapPropertyOwnershipVerification);
}

/** Cola del superadmin; el servidor rechaza a cualquier otro rol. */
export async function fetchPropertyOwnershipReviewQueue(status: PropertyOwnershipVerification['status'] | null = 'pending'): Promise<PropertyOwnershipVerification[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('list_property_ownership_verifications', { p_status: status });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(mapPropertyOwnershipVerification);
}

export type OwnershipChecklistItem = { documentId: string; result: OwnershipChecklistResult; note?: string };

export async function reviewPropertyOwnershipVerification(params: {
  verificationId: string;
  decision: OwnershipReviewDecision;
  checklist: OwnershipChecklistItem[];
  notes?: string;
}): Promise<PropertyOwnershipVerification> {
  if (!isSupabaseConfigured) throw new Error('La revisión requiere conexión con el servidor de CasasEG.');
  const { data, error } = await supabase.rpc('review_property_ownership_verification', {
    p_verification_id: params.verificationId,
    p_decision: params.decision,
    p_documents: params.checklist,
    p_notes: params.notes?.trim() || null,
  });
  if (error) throw error;
  return mapPropertyOwnershipVerification(data as Row);
}

/** Abre un documento privado con un enlace firmado de corta duración. */
export async function openOwnershipDocument(storagePath: string): Promise<void> {
  const { data, error } = await supabase.storage.from(OWNER_DOCUMENT_BUCKET).createSignedUrl(storagePath, SIGNED_URL_SECONDS);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('No se pudo abrir el documento.');
  await WebBrowser.openBrowserAsync(data.signedUrl);
}
