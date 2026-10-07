import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

// Cumplimiento y reseñas verificadas compartidos con la web (migraciones 052 y
// 075): aceptaciones versionadas con record_compliance_acceptance y reseñas de
// estancia con create_verified_property_review, que solo admite al
// arrendatario de un contrato firmado y pagado, una vez por contrato.

export type ComplianceAcceptanceType = 'terms' | 'privacy' | 'marketing' | 'payment_charges' | 'cancellation_policy' | 'traveler_reporting';

const MOBILE_USER_AGENT = `CasaSeg Expo (${Platform.OS} ${String(Platform.Version)})`;

/** Deja constancia versionada de lo que el usuario aceptó o rechazó. */
export async function recordComplianceAcceptance(input: { type: ComplianceAcceptanceType; version: string; accepted: boolean; context?: Record<string, unknown> }): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('La aceptación requiere conexión con el servidor de CasaSeg.');
  const { data, error } = await supabase.rpc('record_compliance_acceptance', {
    p_acceptance_type: input.type,
    p_version: input.version,
    p_accepted: input.accepted,
    p_context: input.context ?? {},
    p_user_agent: MOBILE_USER_AGENT,
  });
  if (error) throw error;
  return String(data);
}

export type VerifiedPropertyReview = {
  id: string;
  propertyId: string;
  contractId: string;
  reviewerId: string;
  rating: number;
  comment?: string;
  createdAt: string;
};

type Row = Record<string, unknown>;

function mapReview(row: Row): VerifiedPropertyReview {
  return {
    id: String(row.id),
    propertyId: String(row.property_id),
    contractId: String(row.contract_id),
    reviewerId: String(row.reviewer_id),
    rating: Number(row.rating) || 0,
    comment: typeof row.comment === 'string' && row.comment ? row.comment : undefined,
    createdAt: String(row.created_at ?? ''),
  };
}

const REVIEW_COLUMNS = 'id,property_id,contract_id,reviewer_id,rating,comment,created_at';
const PUBLIC_REVIEW_LIMIT = 20;

export async function createVerifiedPropertyReview(input: { contractId: string; rating: number; comment?: string }): Promise<VerifiedPropertyReview> {
  if (!isSupabaseConfigured) throw new Error('La reseña requiere conexión con el servidor de CasaSeg.');
  const { data, error } = await supabase.rpc('create_verified_property_review', {
    p_contract_id: input.contractId,
    p_rating: input.rating,
    p_comment: input.comment?.trim() || null,
  });
  if (error) throw error;
  return mapReview(data as Row);
}

export async function fetchVerifiedPropertyReviews(propertyId: string): Promise<VerifiedPropertyReview[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('property_reviews')
    .select(REVIEW_COLUMNS)
    .eq('property_id', propertyId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(PUBLIC_REVIEW_LIMIT);
  if (error) throw error;
  return (data as Row[]).map(mapReview);
}

export async function fetchReviewedContractIds(reviewerId: string): Promise<Set<string>> {
  if (!isSupabaseConfigured) return new Set();
  const { data, error } = await supabase.from('property_reviews').select('contract_id').eq('reviewer_id', reviewerId);
  if (error) throw error;
  return new Set((data as { contract_id: string }[]).map((row) => row.contract_id));
}

export type ReviewIneligibilityReason = 'not_authenticated' | 'staff' | 'is_owner' | 'not_tenant' | 'not_signed' | 'payment_pending' | 'already_reviewed';
export type ReviewEligibility = { canReview: boolean; reason: ReviewIneligibilityReason | null };

const STAFF_ROLES: ReadonlySet<UserRole> = new Set(['admin', 'superadmin']);

/**
 * Port de getReviewEligibility (web/src/utils/reviewEligibility.ts). Solo
 * decide si se muestra el botón: la regla vinculante está en el RPC.
 */
export function getReviewEligibility(input: {
  viewer: { id: string; role: UserRole } | null;
  contract: { id: string; status: string; ownerId: string; clientId: string };
  propertyOwnerId?: string;
  paidContractIds: ReadonlySet<string>;
  reviewedContractIds: ReadonlySet<string>;
}): ReviewEligibility {
  const deny = (reason: ReviewIneligibilityReason): ReviewEligibility => ({ canReview: false, reason });
  const { viewer, contract } = input;
  if (!viewer) return deny('not_authenticated');
  if (STAFF_ROLES.has(viewer.role)) return deny('staff');
  if (viewer.id === contract.ownerId || viewer.id === input.propertyOwnerId) return deny('is_owner');
  if (viewer.id !== contract.clientId) return deny('not_tenant');
  if (contract.status !== 'signed') return deny('not_signed');
  if (!input.paidContractIds.has(contract.id)) return deny('payment_pending');
  if (input.reviewedContractIds.has(contract.id)) return deny('already_reviewed');
  return { canReview: true, reason: null };
}
