import { Platform } from 'react-native';

import {
  buildLeaseContractHtml,
  DEFAULT_LEASE_TERMS,
  LEASE_CONTRACT_COLUMNS,
  mapLeaseContract,
  normalizeSignerName,
  type LeaseContract,
  type LeaseContractRow,
  type LeaseContractTerms,
} from '@/features/contracts/lease-contract.model';
import { loadPrint } from '@/lib/optional-native-modules';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type { LeaseContract, LeaseContractStatus } from '@/features/contracts/lease-contract.model';

export const contractKeys = { all: ['lease-contracts'] as const };

/** Identifica el cliente en la firma, igual que la web guarda navigator.userAgent. */
const MOBILE_USER_AGENT = `CasaSeg Expo (${Platform.OS} ${String(Platform.Version)})`;
/** Mismo nivel de garantía que registra la web para una sesión iniciada. */
const ASSURANCE_LEVEL = 'authenticated_session';

/** Contratos donde el perfil es arrendador o arrendatario; RLS filtra el resto. */
export async function fetchContracts(): Promise<LeaseContract[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('lease_contracts')
    .select(LEASE_CONTRACT_COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as unknown as LeaseContractRow[]).map(mapLeaseContract);
}

/**
 * Firma la parte que corresponde al llamante. sign_lease_contract decide en el
 * servidor si es arrendador o arrendatario, guarda la firma, pasa el contrato a
 * partially_signed/signed y escribe el evento de auditoría.
 */
export async function signContract(contractId: string, signerName: string | undefined): Promise<LeaseContract> {
  if (!isSupabaseConfigured) throw new Error('La firma requiere conexión con el servidor de CasaSeg.');
  const { data, error } = await supabase.rpc('sign_lease_contract', {
    p_contract_id: contractId,
    p_signer_name: normalizeSignerName(signerName),
    p_user_agent: MOBILE_USER_AGENT,
    p_assurance_level: ASSURANCE_LEVEL,
  });
  if (error) throw error;
  return mapLeaseContract(data as LeaseContractRow);
}

/**
 * Abre el documento para imprimir o guardar como PDF, como el botón de la web,
 * y deja constancia en contract_audit_events. El registro de auditoría no debe
 * impedir ver el contrato: si falla, se informa al llamante después de abrirlo.
 */
export async function openContractDocument(contract: LeaseContract, actorId: string | undefined): Promise<void> {
  const Print = await loadPrint();
  await Print.printAsync({ html: buildLeaseContractHtml(contract) });
  if (!isSupabaseConfigured || !actorId) return;
  const { error } = await supabase.from('contract_audit_events').insert({
    contract_id: contract.id,
    actor_id: actorId,
    event_type: 'downloaded',
    metadata: { client: MOBILE_USER_AGENT },
  });
  if (error) throw error;
}

export type LeaseTemplate = {
  id: string;
  propertyId: string;
  title: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
  terms: LeaseContractTerms;
};

type LeaseTemplateRow = { id: string; property_id: string; title: string | null; version: number | null; status: LeaseTemplate['status']; terms: Partial<LeaseContractTerms> | null };

function mapTemplate(row: LeaseTemplateRow): LeaseTemplate {
  return {
    id: String(row.id),
    propertyId: String(row.property_id),
    title: row.title?.trim() || 'Contrato de arrendamiento',
    version: Number(row.version) || 1,
    status: row.status,
    terms: { ...DEFAULT_LEASE_TERMS, ...(row.terms ?? {}) },
  };
}

/** Plantilla contractual de una vivienda (una por propiedad). */
export async function fetchLeaseTemplate(propertyId: string): Promise<LeaseTemplate | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('lease_contract_templates')
    .select('id,property_id,title,version,status,terms')
    .eq('property_id', propertyId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapTemplate(data as LeaseTemplateRow) : null;
}

/**
 * Devuelve la plantilla activa de la vivienda y, si no hay ninguna, activa una
 * con los términos por defecto (los mismos DEFAULT_LEASE_TERMS de la web).
 */
export async function ensureActiveLeaseTemplate(propertyId: string, ownerId: string): Promise<LeaseTemplate> {
  const current = await fetchLeaseTemplate(propertyId);
  if (current?.status === 'active') return current;
  return saveLeaseTemplate({ propertyId, ownerId, title: current?.title ?? 'Contrato de arrendamiento', terms: current?.terms ?? DEFAULT_LEASE_TERMS, activate: true });
}

/**
 * Genera el contrato de un acuerdo confirmado por ambas partes. El servidor
 * construye el snapshot (incluidos nombre y email del arrendatario, que la RLS
 * no deja leer desde la app), calcula el hash y avisa al arrendatario. Repetir
 * la llamada devuelve el mismo contrato.
 */
export async function generateLeaseContract(agreementId: string): Promise<LeaseContract> {
  if (!isSupabaseConfigured) throw new Error('Los contratos requieren conexión con el servidor de CasaSeg.');
  const { data, error } = await supabase.rpc('generate_lease_contract', { p_agreement_id: agreementId });
  if (error) throw error;
  return mapLeaseContract(data as LeaseContractRow);
}

/**
 * Guarda la plantilla incrementando la versión, igual que saveLeaseTemplate en
 * la web. Los contratos ya generados no cambian: guardan su propio snapshot.
 */
export async function saveLeaseTemplate(input: { propertyId: string; ownerId: string; title: string; terms: LeaseContractTerms; activate: boolean }): Promise<LeaseTemplate> {
  if (!isSupabaseConfigured) throw new Error('Las plantillas requieren conexión con el servidor de CasaSeg.');
  const existing = await fetchLeaseTemplate(input.propertyId);
  const { data, error } = await supabase
    .from('lease_contract_templates')
    .upsert({
      property_id: input.propertyId,
      owner_id: input.ownerId,
      title: input.title.trim() || 'Contrato de arrendamiento',
      terms: input.terms,
      status: input.activate ? 'active' : 'draft',
      version: existing ? existing.version + 1 : 1,
    }, { onConflict: 'property_id' })
    .select('id,property_id,title,version,status,terms')
    .single();
  if (error) throw error;
  return mapTemplate(data as LeaseTemplateRow);
}
