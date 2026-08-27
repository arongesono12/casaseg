import { readJsonObject, RuleError, serveJson } from '../_shared/http.ts';
import { parseUpdatePropertyInput } from '../_shared/property-input.ts';
import { requireOwner } from '../_shared/supabase.ts';

Deno.serve(serveJson(async (request) => {
  const { supabase } = await requireOwner(request);
  const input = parseUpdatePropertyInput(await readJsonObject(request));

  const { data, error } = await supabase
    .from('properties')
    .update({ title: input.title, description: input.description, price: input.price })
    .eq('id', input.propertyId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new RuleError('Propiedad no encontrada o sin permisos.', 404);
  return { id: data.id };
}, 'No se pudo actualizar la propiedad.'));
