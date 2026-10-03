import { readJsonObject, RuleError, serveJson } from '../_shared/http.ts';
import { requireUser } from '../_shared/supabase.ts';
import { futureIsoDate, optionalText, uuid } from '../_shared/validate.ts';

Deno.serve(serveJson(async (request) => {
  const { supabase, user } = await requireUser(request);
  const body = await readJsonObject(request);

  const propertyId = uuid(body.property_id, 'Identificador de propiedad');
  const proposedAt = futureIsoDate(body.proposed_at, 'Fecha propuesta', 90);
  const note = optionalText(body.note, 'Nota', 500);

  // La propiedad debe existir y estar publicada. Sin esta comprobación se
  // pueden agendar visitas a borradores o a viviendas retiradas.
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id, owner_id, status')
    .eq('id', propertyId)
    .maybeSingle();

  if (propertyError) throw propertyError;
  if (!property) throw new RuleError('La propiedad no existe o no está disponible.', 404);
  // El catálogo publica con status 'active' (ver property.queries.ts).
  if (property.status !== 'active') {
    throw new RuleError('Esta vivienda todavía no acepta visitas.', 409);
  }
  if (property.owner_id === user.id) {
    throw new RuleError('No puedes solicitar una visita a tu propia vivienda.', 409);
  }

  // Una segunda solicitud pendiente para la misma vivienda es casi siempre un
  // doble toque; se devuelve la que ya existe en vez de duplicarla.
  const { data: existing, error: existingError } = await supabase
    .from('visit_requests')
    .select('id')
    .eq('property_id', propertyId)
    .eq('requester_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return { id: existing.id, duplicated: true };

  const { data, error } = await supabase
    .from('visit_requests')
    .insert({
      property_id: propertyId,
      requester_id: user.id,
      owner_id: property.owner_id,
      proposed_at: proposedAt,
      note,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) throw error;
  return { id: data.id, duplicated: false };
}, 'No se pudo registrar la solicitud de visita.'));
