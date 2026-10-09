import { propertyIdFromChatRoute } from '@/features/messaging/messaging.api';
import { fromMeetingDateTime, isSlotAvailable, toMeetingDateTime, type AgreementStatus } from '@/features/visits/visit-schedule';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type EncounterContext = {
  propertyId: string;
  propertyTitle: string;
  propertyPrice: number;
  clientId: string;
  ownerId: string;
  isOwner: boolean;
};

export type ChatEncounter = {
  id: string;
  status: AgreementStatus;
  meetingAt: Date | null;
  note: string;
  agreedPrice: number;
  currency: string;
  clientConfirmed: boolean;
  ownerConfirmed: boolean;
};

export const encounterKeys = {
  context: (route: string, profileId: string) => ['chat-encounter', 'context', route, profileId] as const,
  agreement: (context: EncounterContext) => ['chat-encounter', 'agreement', context.propertyId, context.clientId, context.ownerId] as const,
};

type ChatRow = { property_id: string; client_id: string; owner_id: string };
type PropertyRow = { id: string; title: string | null; price: number | string | null; owner_id: string };
type AgreementRow = {
  id: string;
  status: AgreementStatus;
  meeting_date: string | null;
  meeting_time: string | null;
  notes: string | null;
  agreed_price: number | string | null;
  currency: string | null;
  client_confirmed: boolean | null;
  owner_confirmed: boolean | null;
};

function requireBackend() {
  if (!isSupabaseConfigured) throw new Error('Los encuentros necesitan conexión con el servidor de CasaSeg.');
}

/** Resuelve las partes desde el chat real, nunca desde parámetros editables de la ruta. */
export async function fetchEncounterContext(route: string, profileId: string): Promise<EncounterContext> {
  requireBackend();
  const propertyRouteId = propertyIdFromChatRoute(route);
  let chat: ChatRow | null = null;
  if (!propertyRouteId) {
    const { data, error } = await supabase.from('chats').select('property_id,client_id,owner_id').eq('id', route).maybeSingle();
    if (error) throw error;
    chat = data as ChatRow | null;
    if (!chat || (chat.client_id !== profileId && chat.owner_id !== profileId)) throw new Error('Este chat no está disponible.');
  }

  const { data, error } = await supabase.from('properties')
    .select('id,title,price,owner_id')
    .eq('id', propertyRouteId ?? chat!.property_id)
    .maybeSingle();
  if (error) throw error;
  const property = data as PropertyRow | null;
  if (!property) throw new Error('Esta vivienda no está disponible.');
  if (chat && property.owner_id !== chat.owner_id) throw new Error('Los participantes del chat no coinciden con la vivienda.');
  if (!chat && property.owner_id === profileId) throw new Error('Abre el chat del cliente para proponer un encuentro.');

  return {
    propertyId: property.id,
    propertyTitle: property.title?.trim() || 'Vivienda',
    propertyPrice: Number(property.price ?? 0),
    clientId: chat?.client_id ?? profileId,
    ownerId: chat?.owner_id ?? property.owner_id,
    isOwner: (chat?.owner_id ?? property.owner_id) === profileId,
  };
}

/** Un acuerdo por vivienda y pareja; RLS limita la lectura a los participantes. */
export async function fetchChatEncounter(context: EncounterContext): Promise<ChatEncounter | null> {
  requireBackend();
  const { data, error } = await supabase.from('agreements')
    .select('id,status,meeting_date,meeting_time,notes,agreed_price,currency,client_confirmed,owner_confirmed')
    .eq('property_id', context.propertyId)
    .eq('client_id', context.clientId)
    .eq('owner_id', context.ownerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as AgreementRow;
  return {
    id: row.id,
    status: row.status,
    meetingAt: fromMeetingDateTime(row.meeting_date, row.meeting_time),
    note: row.notes?.trim() || '',
    agreedPrice: Number(row.agreed_price ?? context.propertyPrice),
    currency: row.currency?.trim() || 'FCFA',
    clientConfirmed: Boolean(row.client_confirmed),
    ownerConfirmed: Boolean(row.owner_confirmed),
  };
}

/** El RPC establece la confirmación del proponente y reinicia la de la otra parte. */
export async function proposeChatEncounter(context: EncounterContext, slot: Date, note: string, agreedPrice: number): Promise<void> {
  requireBackend();
  if (!isSlotAvailable(slot, new Date())) throw new Error('Elige una hora con al menos dos horas de antelación.');
  if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) throw new Error('Introduce un precio acordado válido.');
  const { meetingDate, meetingTime } = toMeetingDateTime(slot);
  const { error } = await supabase.rpc('propose_meeting_agreement', {
    p_property_id: context.propertyId,
    p_meeting_date: meetingDate,
    p_meeting_time: meetingTime,
    p_notes: note.trim() || null,
    p_client_id: context.isOwner ? context.clientId : null,
    p_agreed_price: agreedPrice,
  });
  if (error) throw error;
}
