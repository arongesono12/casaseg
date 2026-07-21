import { corsHeaders, InputError, jsonResponse, readJsonObject } from '../_shared/http.ts';
import { parseUpdatePropertyInput } from '../_shared/property-input.ts';
import { requireOwner } from '../_shared/supabase.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Método no permitido.' }, 405);

  try {
    const { supabase } = await requireOwner(request);
    const input = parseUpdatePropertyInput(await readJsonObject(request));

    const { data, error } = await supabase
      .from('properties')
      .update({ title: input.title, description: input.description, price: input.price })
      .eq('id', input.propertyId)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) return jsonResponse({ error: 'Propiedad no encontrada o sin permisos.' }, 404);
    return jsonResponse({ id: data.id });
  } catch (error) {
    if (error instanceof InputError) return jsonResponse({ error: error.message }, error.status);
    if (error instanceof Error && error.message === 'AUTH_REQUIRED') return jsonResponse({ error: 'Sesión no válida.' }, 401);
    if (error instanceof Error && error.message === 'OWNER_REQUIRED') return jsonResponse({ error: 'Se requiere un perfil de propietario verificado.' }, 403);
    console.error(error);
    return jsonResponse({ error: 'No se pudo actualizar la propiedad.' }, 500);
  }
});
