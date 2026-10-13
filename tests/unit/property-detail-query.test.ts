import { describe, expect, mock, test } from 'bun:test';

let result: { data: null; error: null | { code: string; message: string } } = { data: null, error: null };

mock.module('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: () => ({
      select() { return this; },
      eq() { return this; },
      abortSignal() { return this; },
      async maybeSingle() { return result; },
    }),
  },
}));

const { fetchProperty } = await import('../../src/features/properties/api/property.queries');

describe('consulta de una vivienda', () => {
  test('un enlace inexistente devuelve ausencia de vivienda, no error de conexión', async () => {
    result = { data: null, error: null };
    expect(await fetchProperty('missing-id')).toBeNull();
  });

  test('un identificador inválido se trata como vivienda inexistente', async () => {
    result = { data: null, error: { code: '22P02', message: 'invalid uuid' } };
    expect(await fetchProperty('invalid-id')).toBeNull();
  });

  test('un fallo real del servidor sigue ofreciendo reintentar', async () => {
    result = { data: null, error: { code: 'XX000', message: 'database unavailable' } };
    await expect(fetchProperty('valid-id')).rejects.toMatchObject({ code: 'XX000' });
  });
});
