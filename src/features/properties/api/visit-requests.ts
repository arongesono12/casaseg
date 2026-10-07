import {
  fromMeetingDateTime,
  toMeetingDateTime,
  visitStatusFromAgreement,
  type AgreementStatus,
  type VisitRequestStatus,
} from '@/features/visits/visit-schedule';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Las visitas se guardan en public.agreements, el acuerdo de reunión que usa la
// web (agreementService). Un acuerdo confirmado por las dos partes es el que
// habilita generar el contrato de arrendamiento, así que el mismo registro
// sirve para la visita y para el resto del alquiler en ambas apps.

export type VisitRequest = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  proposedAt: string;
  status: VisitRequestStatus;
  note: string;
  clientId: string;
  ownerId: string;
};

export const visitRequestKeys = {
  all: ['visit-requests'] as const,
  owner: (profileId: string) => ['visit-requests', 'owner', profileId] as const,
  mine: (profileId: string) => ['visit-requests', 'mine', profileId] as const,
};

const AGREEMENT_COLUMNS = 'id,property_id,client_id,owner_id,meeting_date,meeting_time,notes,status,client_confirmed,owner_confirmed,client_confirmed_at,owner_confirmed_at,updated_at,properties(title)';

export type AgreementRow = {
  id: unknown;
  property_id: unknown;
  client_id: unknown;
  owner_id: unknown;
  meeting_date: unknown;
  meeting_time: unknown;
  notes: unknown;
  status: unknown;
  client_confirmed?: unknown;
  owner_confirmed?: unknown;
  client_confirmed_at?: unknown;
  owner_confirmed_at?: unknown;
  updated_at?: unknown;
  properties?: { title?: unknown } | { title?: unknown }[] | null;
};

export function mapAgreementToVisit(row: AgreementRow): VisitRequest {
  const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
  const meeting = fromMeetingDateTime(row.meeting_date, row.meeting_time);

  return {
    id: String(row.id),
    propertyId: String(row.property_id),
    propertyTitle: typeof property?.title === 'string' && property.title ? property.title : 'Propiedad',
    proposedAt: (meeting ?? new Date(String(row.updated_at ?? Date.now()))).toISOString(),
    status: visitStatusFromAgreement(row.status),
    note: typeof row.notes === 'string' ? row.notes : '',
    clientId: String(row.client_id),
    ownerId: String(row.owner_id),
  };
}

function requireBackend() {
  // Sin servidor no hay a quién enviar la solicitud: fingir el envío dejaba al
  // usuario creyendo que el propietario la había recibido.
  if (!isSupabaseConfigured) throw new Error('Las visitas necesitan conexión con el servidor de CasaSeg.');
}

async function currentProfileId(): Promise<string> {
  const { data, error } = await supabase.rpc('current_profile');
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { id?: unknown } | undefined;
  if (typeof row?.id !== 'string') throw new Error('Inicia sesión para solicitar una visita.');
  return row.id;
}

/**
 * Propone una visita como hace upsertMeetingAgreement en la web: un acuerdo por
 * vivienda, cliente y propietario, propuesto por el cliente (client_confirmed).
 * Si ya hay una propuesta esperando respuesta no se sobrescribe; si ya está
 * confirmada no se reabre, porque puede tener un contrato asociado.
 */
export async function createVisitRequest(propertyId: string, proposedAt: Date, note: string): Promise<{ duplicated: boolean }> {
  requireBackend();
  const clientId = await currentProfileId();

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id,owner_id,status,price')
    .eq('id', propertyId)
    .maybeSingle();
  if (propertyError) throw propertyError;
  if (!property || property.status !== 'active') throw new Error('Esta vivienda todavía no acepta visitas.');
  if (property.owner_id === clientId) throw new Error('No puedes solicitar una visita a tu propia vivienda.');
  if (proposedAt.getTime() <= Date.now()) throw new Error('Elige una fecha futura para la visita.');

  const ownerId = String(property.owner_id);
  const { data: existing, error: existingError } = await supabase
    .from('agreements')
    .select('id,status')
    .eq('property_id', propertyId)
    .eq('client_id', clientId)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (existingError) throw existingError;
  const existingStatus = existing?.status as AgreementStatus | undefined;
  if (existingStatus === 'fully_confirmed') throw new Error('Ya tienes una visita confirmada para esta vivienda.');
  // Una propuesta que espera respuesta no se reemplaza: casi siempre es un doble toque.
  if (existingStatus === 'client_confirmed' || existingStatus === 'pending') return { duplicated: true };

  // propose_meeting_agreement valida en servidor la vivienda, la fecha y las
  // partes, y avisa al propietario; es el mismo RPC que usa la web.
  const { meetingDate, meetingTime } = toMeetingDateTime(proposedAt);
  const { error } = await supabase.rpc('propose_meeting_agreement', {
    p_property_id: propertyId,
    p_meeting_date: meetingDate,
    p_meeting_time: meetingTime,
    p_notes: note.trim() || null,
  });
  if (error) throw error;
  return { duplicated: false };
}

/** Solicitudes recibidas por el propietario. */
export async function fetchOwnerVisitRequests(profileId: string): Promise<VisitRequest[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('agreements')
    .select(AGREEMENT_COLUMNS)
    .eq('owner_id', profileId)
    .order('meeting_date', { ascending: true });
  if (error) throw error;
  return (data as unknown as AgreementRow[]).map(mapAgreementToVisit);
}

/** Solicitudes enviadas por el usuario actual. */
export async function fetchMyVisitRequests(profileId: string): Promise<VisitRequest[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('agreements')
    .select(AGREEMENT_COLUMNS)
    .eq('client_id', profileId)
    .order('meeting_date', { ascending: true });
  if (error) throw error;
  return (data as unknown as AgreementRow[]).map(mapAgreementToVisit);
}

/** RPC que aplica cada intención; cancelar y rechazar guardan `rejected`, como la web. */
export function agreementRpcFor(status: VisitRequestStatus): 'confirm_meeting_agreement' | 'reject_meeting_agreement' {
  if (status === 'accepted') return 'confirm_meeting_agreement';
  if (status === 'rejected' || status === 'cancelled') return 'reject_meeting_agreement';
  throw new Error('Cambio de estado no admitido.');
}

/**
 * Confirma o rechaza en el servidor, que comprueba que quien actúa es parte del
 * acuerdo y calcula el estado. Las transiciones que ofrece la interfaz están en
 * visit-schedule.ts.
 */
export async function updateVisitRequestStatus(id: string, status: VisitRequestStatus): Promise<void> {
  requireBackend();
  const { error } = await supabase.rpc(agreementRpcFor(status), { p_agreement_id: id });
  if (error) throw error;
}
