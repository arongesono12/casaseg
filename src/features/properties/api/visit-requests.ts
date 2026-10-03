import { FunctionsHttpError } from '@supabase/supabase-js';

import { isVisitRequestStatus, type VisitRequestStatus } from '@/features/visits/visit-schedule';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type VisitRequest = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  proposedAt: string;
  status: VisitRequestStatus;
  note: string;
};

export const visitRequestKeys = {
  all: ['visit-requests'] as const,
  owner: (profileId: string) => ['visit-requests', 'owner', profileId] as const,
  mine: (profileId: string) => ['visit-requests', 'mine', profileId] as const,
};

const VISIT_REQUEST_COLUMNS = 'id,property_id,proposed_at,status,note,properties(title)';

type VisitRequestRow = {
  id: unknown;
  property_id: unknown;
  proposed_at: unknown;
  status: unknown;
  note: unknown;
  properties: { title?: unknown } | { title?: unknown }[] | null;
};

function mapVisitRequest(row: VisitRequestRow): VisitRequest {
  const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;

  return {
    id: String(row.id),
    propertyId: String(row.property_id),
    propertyTitle: typeof property?.title === 'string' && property.title ? property.title : 'Propiedad',
    proposedAt: String(row.proposed_at),
    status: isVisitRequestStatus(row.status) ? row.status : 'pending',
    note: typeof row.note === 'string' ? row.note : '',
  };
}

function requireBackend() {
  // Sin servidor no hay a quién enviar la solicitud: fingir el envío dejaba al
  // usuario creyendo que el propietario la había recibido.
  if (!isSupabaseConfigured) throw new Error('Las visitas necesitan conexión con el servidor de CasaSeg.');
}

/** El mensaje de una edge function viene en el cuerpo; el SDK solo da "non-2xx". */
async function functionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body: unknown = await error.context.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error;
    } catch {
      // Cuerpo no JSON: se usa el mensaje genérico de abajo.
    }
  }
  return 'No se pudo enviar la solicitud. Inténtalo de nuevo.';
}

export async function createVisitRequest(propertyId: string, proposedAt: Date, note: string): Promise<{ duplicated: boolean }> {
  requireBackend();
  const { data, error } = await supabase.functions.invoke<{ id: string; duplicated: boolean }>('create-visit-request', {
    body: { property_id: propertyId, proposed_at: proposedAt.toISOString(), note: note.trim() },
  });
  if (error) throw new Error(await functionErrorMessage(error));
  return { duplicated: Boolean(data?.duplicated) };
}

/** Solicitudes recibidas por el propietario (RLS también devolvería las que él mismo envió). */
export async function fetchOwnerVisitRequests(profileId: string): Promise<VisitRequest[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('visit_requests')
    .select(VISIT_REQUEST_COLUMNS)
    .eq('owner_id', profileId)
    .order('proposed_at', { ascending: true });
  if (error) throw error;
  return (data as VisitRequestRow[]).map(mapVisitRequest);
}

/** Solicitudes enviadas por el usuario actual. */
export async function fetchMyVisitRequests(profileId: string): Promise<VisitRequest[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('visit_requests')
    .select(VISIT_REQUEST_COLUMNS)
    .eq('requester_id', profileId)
    .order('proposed_at', { ascending: true });
  if (error) throw error;
  return (data as VisitRequestRow[]).map(mapVisitRequest);
}

/** La base de datos rechaza las transiciones no permitidas (ver visit-schedule.ts). */
export async function updateVisitRequestStatus(id: string, status: VisitRequestStatus): Promise<void> {
  requireBackend();
  const { error } = await supabase.from('visit_requests').update({ status }).eq('id', id);
  if (error) throw error;
}
