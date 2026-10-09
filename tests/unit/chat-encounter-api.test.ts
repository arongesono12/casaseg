import { beforeEach, describe, expect, mock, test } from 'bun:test';

type TableName = 'chats' | 'properties' | 'agreements';
const rows: Record<TableName, unknown> = { chats: null, properties: null, agreements: null };
const filters: { table: TableName; values: Record<string, unknown> }[] = [];
const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];

mock.module('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: TableName) => {
      const call = { table, values: {} as Record<string, unknown> };
      filters.push(call);
      return {
        select() { return this; },
        eq(column: string, value: unknown) { call.values[column] = value; return this; },
        async maybeSingle() { return { data: rows[table], error: null }; },
      };
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return { data: null, error: null };
    },
  },
}));

const { fetchChatEncounter, fetchEncounterContext, proposeChatEncounter } = await import('../../src/features/visits/chat-encounter.api');

describe('acuerdo de encuentro desde el chat', () => {
  beforeEach(() => {
    rows.chats = { property_id: 'p1', client_id: 'client', owner_id: 'owner' };
    rows.properties = { id: 'p1', title: 'Casa Azul', price: 250000, owner_id: 'owner' };
    rows.agreements = null;
    filters.length = 0;
    rpcCalls.length = 0;
  });

  test('obtiene las dos partes del chat y rechaza a un tercero', async () => {
    const owner = await fetchEncounterContext('chat-1', 'owner');
    expect([owner.propertyId, owner.clientId, owner.ownerId, owner.isOwner]).toEqual(['p1', 'client', 'owner', true]);
    expect(filters[0]).toEqual({ table: 'chats', values: { id: 'chat-1' } });
    const failure = await fetchEncounterContext('chat-1', 'stranger').then(() => undefined, (error: Error) => error);
    expect(failure?.message).toBe('Este chat no está disponible.');
  });

  test('permite proponer antes del primer mensaje desde una vivienda', async () => {
    const client = await fetchEncounterContext('property-p1', 'client');
    expect([client.propertyId, client.clientId, client.ownerId, client.isOwner]).toEqual(['p1', 'client', 'owner', false]);
    expect(filters[0]).toEqual({ table: 'properties', values: { id: 'p1' } });
  });

  test('la propuesta del propietario identifica al cliente del chat', async () => {
    const owner = await fetchEncounterContext('chat-1', 'owner');
    const slot = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    slot.setHours(17, 0, 0, 0);
    await proposeChatEncounter(owner, slot, '  En la entrada  ', 230000);
    expect(rpcCalls[0]?.name).toBe('propose_meeting_agreement');
    const args = rpcCalls[0]?.args;
    expect([args?.p_property_id, args?.p_client_id, args?.p_notes, args?.p_agreed_price, args?.p_meeting_time]).toEqual(['p1', 'client', 'En la entrada', 230000, '17:00']);
  });

  test('lee precio, fecha y confirmaciones del acuerdo de esta pareja', async () => {
    const client = await fetchEncounterContext('chat-1', 'client');
    rows.agreements = { id: 'a1', status: 'owner_confirmed', meeting_date: '2026-10-12', meeting_time: '17:00:00', notes: 'Hola', agreed_price: 225000, currency: 'FCFA', client_confirmed: false, owner_confirmed: true };
    const agreement = await fetchChatEncounter(client);
    expect([agreement?.id, agreement?.status, agreement?.agreedPrice, agreement?.clientConfirmed, agreement?.ownerConfirmed]).toEqual(['a1', 'owner_confirmed', 225000, false, true]);
    expect(agreement?.meetingAt).toEqual(new Date(2026, 9, 12, 17));
    expect(filters.at(-1)?.values).toEqual({ property_id: 'p1', client_id: 'client', owner_id: 'owner' });
  });
});
