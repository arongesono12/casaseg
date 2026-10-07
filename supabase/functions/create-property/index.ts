import { jsonResponse, readJsonObject, RuleError, serveJson } from '../_shared/http.ts';
import { parseCreatePropertyInput } from '../_shared/property-input.ts';
import { requireOwner } from '../_shared/supabase.ts';

Deno.serve(serveJson(async (request) => {
  const { supabase, user, role } = await requireOwner(request);
  const input = parseCreatePropertyInput(await readJsonObject(request));

  // Mismo cupo que publish_property_if_allowed en la web: solo el rol owner
  // está sujeto al plan; administración publica sin límite.
  if (role === 'owner') {
    const { data: entitlements, error: entitlementsError } = await supabase.rpc('get_owner_entitlements', { p_user_id: null });
    if (entitlementsError) throw entitlementsError;
    const entitlement = (Array.isArray(entitlements) ? entitlements[0] : entitlements) as { can_publish?: boolean; reason?: string } | undefined;
    if (entitlement?.can_publish !== true) {
      throw new RuleError(`Has alcanzado el límite de publicaciones de tu plan${entitlement?.reason ? ` (${entitlement.reason})` : ''}.`, 403);
    }
  }

  if (input.imagePaths.some((path) => !path.startsWith(`${user.id}/`))) {
    throw new RuleError('Las imágenes no pertenecen al usuario autenticado.', 403);
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
      coordinates: input.coordinates,
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
      service_fee_amount: input.fees.serviceFeeAmount,
      cleaning_fee_amount: input.fees.cleaningFeeAmount,
      tax_amount: input.fees.taxAmount,
      security_deposit_amount: input.fees.securityDepositAmount,
    })
    .select('id')
    .single();

  if (error) throw error;
  return jsonResponse({ id: data.id }, 201);
}, 'No se pudo crear la propiedad.'));
