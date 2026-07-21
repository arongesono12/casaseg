import { corsHeaders, InputError, jsonResponse, readJsonObject } from '../_shared/http.ts';
import { parseCreatePropertyInput } from '../_shared/property-input.ts';
import { requireOwner } from '../_shared/supabase.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Método no permitido.' }, 405);

  try {
    const { supabase, user } = await requireOwner(request);
    const input = parseCreatePropertyInput(await readJsonObject(request));

    if (input.imagePaths.some((path) => !path.startsWith(`${user.id}/`))) {
      return jsonResponse({ error: 'Las imágenes no pertenecen al usuario autenticado.' }, 403);
    }

    const imageUrls = input.imagePaths.map((path) => (
      supabase.storage.from('property-images').getPublicUrl(path).data.publicUrl
    ));

    const { data, error } = await supabase
      .from('properties')
      .insert({
        id: crypto.randomUUID(),
        owner_id: user.id,
        title: input.title,
        description: input.description,
        price: input.price,
        location: input.location,
        city: input.location,
        country_code: 'GQ',
        image_urls: imageUrls,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        area: 0,
        is_occupied: false,
        features: input.amenities,
        status: 'pending',
        rating: 0,
        review_count: 0,
        category: 'Apartamentos',
        price_type: input.priceType,
        rental_category: input.priceType === 'per_night' ? 'short_term' : 'long_term',
        tourist_license_status: 'not_required',
        cancellation_policy: 'standard',
        service_fee_amount: 0,
        cleaning_fee_amount: 0,
        tax_amount: 0,
        security_deposit_amount: 0,
      })
      .select('id')
      .single();

    if (error) throw error;
    return jsonResponse({ id: data.id }, 201);
  } catch (error) {
    if (error instanceof InputError) return jsonResponse({ error: error.message }, error.status);
    if (error instanceof Error && error.message === 'AUTH_REQUIRED') return jsonResponse({ error: 'Sesión no válida.' }, 401);
    if (error instanceof Error && error.message === 'OWNER_REQUIRED') return jsonResponse({ error: 'Se requiere un perfil de propietario verificado.' }, 403);
    console.error(error);
    return jsonResponse({ error: 'No se pudo crear la propiedad.' }, 500);
  }
});
