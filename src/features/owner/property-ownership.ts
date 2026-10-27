import { toIsoDate } from '@/features/owner/identity-documents';
import type {
  Property,
  PropertyOwnershipDocumentKind,
  PropertyOwnershipRoute,
  PropertyOwnershipVerification,
} from '@/types';

/**
 * Vías documentales para acreditar la propiedad de una vivienda. Misma regla
 * que la web (src/utils/propertyOwnership.ts) y el servidor
 * (private.property_ownership_required_documents).
 */
export const OWNERSHIP_ROUTE_DOCUMENTS: Record<PropertyOwnershipRoute, readonly PropertyOwnershipDocumentKind[]> = {
  registry: ['registry_certificate', 'public_deed'],
  notarial: ['public_deed'],
  developer: ['award_contract', 'settlement_certificate', 'handover_record'],
};

export const OWNERSHIP_ROUTE_ORDER: readonly PropertyOwnershipRoute[] = ['registry', 'notarial', 'developer'];

export const REGISTRY_CERTIFICATE_MAX_AGE_MONTHS = 3;

/** Fecha de expedición: obligatoria y reciente solo para el certificado registral. */
export function ownershipDocumentDateError(kind: PropertyOwnershipDocumentKind, issuedOn: string, today: Date = new Date()): string | null {
  const todayIso = toIsoDate(today);
  if (!issuedOn) return kind === 'registry_certificate' ? 'Indica la fecha de expedición del certificado (DD/MM/AAAA).' : null;
  if (issuedOn > todayIso) return 'La fecha de expedición no puede ser futura.';
  if (kind === 'registry_certificate') {
    const oldest = new Date(today);
    oldest.setMonth(oldest.getMonth() - REGISTRY_CERTIFICATE_MAX_AGE_MONTHS);
    if (issuedOn < toIsoDate(oldest)) return `El certificado debe tener menos de ${REGISTRY_CERTIFICATE_MAX_AGE_MONTHS} meses. Pide uno nuevo en el Registro.`;
  }
  return null;
}

export type OwnershipSummaryKey = 'approved' | 'pendingUnpublished' | 'pending' | 'rejected' | 'missing' | 'exempt';
export type OwnershipTone = 'success' | 'warning' | 'danger' | 'neutral';

export type OwnershipStatusSummary = {
  key: OwnershipSummaryKey;
  tone: OwnershipTone;
  /** El propietario puede enviar (o reenviar) documentos. */
  canSubmit: boolean;
};

/**
 * Estado que ve el propietario. La revisión más reciente manda: una vivienda
 * exenta con documentos en revisión o rechazados lo muestra igualmente.
 */
export function ownershipStatusSummary(
  property: Pick<Property, 'status' | 'ownershipVerificationStatus'>,
  latest?: PropertyOwnershipVerification | null,
): OwnershipStatusSummary {
  const status = property.ownershipVerificationStatus ?? 'exempt';
  if (status === 'approved') return { key: 'approved', tone: 'success', canSubmit: false };
  if (latest?.status === 'pending' || status === 'pending') {
    return { key: property.status === 'pending' ? 'pendingUnpublished' : 'pending', tone: 'warning', canSubmit: false };
  }
  if (latest?.status === 'rejected' || status === 'rejected') return { key: 'rejected', tone: 'danger', canSubmit: true };
  if (status === 'missing') return { key: 'missing', tone: 'warning', canSubmit: true };
  return { key: 'exempt', tone: 'neutral', canSubmit: true };
}

/** La revisión más reciente de cada vivienda. */
export function latestVerificationByProperty(verifications: PropertyOwnershipVerification[]): Map<string, PropertyOwnershipVerification> {
  const latest = new Map<string, PropertyOwnershipVerification>();
  for (const verification of verifications) {
    const current = latest.get(verification.propertyId);
    if (!current || verification.createdAt > current.createdAt) latest.set(verification.propertyId, verification);
  }
  return latest;
}

export type OwnershipReviewDecision = 'approved' | 'rejected';
export type OwnershipChecklistResult = 'valid' | 'invalid';

/**
 * Misma regla que public.review_property_ownership_verification: todos los
 * documentos marcados, aprobar solo con todos válidos y rechazar con un motivo.
 */
export function ownershipReviewDecisionError(decision: OwnershipReviewDecision, results: (OwnershipChecklistResult | undefined)[], notes = ''): string | null {
  if (results.length === 0) return 'La solicitud no tiene documentos.';
  if (results.some((result) => !result)) return 'Marca cada documento como válido o no válido.';
  const hasInvalid = results.includes('invalid');
  if (decision === 'approved' && hasInvalid) return 'Para aprobar, todos los documentos deben ser válidos.';
  if (decision === 'rejected' && !hasInvalid && !notes.trim()) return 'Para rechazar, marca algún documento como no válido o explica el motivo.';
  return null;
}
