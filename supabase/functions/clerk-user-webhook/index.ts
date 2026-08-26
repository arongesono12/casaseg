import { createClient } from 'npm:@supabase/supabase-js@2.110.0';
import { Webhook } from 'npm:svix@1.42.0';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';

/**
 * Provisiona en Supabase los usuarios que nacen en Clerk.
 *
 * Los usuarios migrados ya traen `external_id` (el uuid original de Supabase),
 * así que `public.app_uid()` los resuelve. Los que se registran desde AuthView
 * no tienen ninguno: sin este webhook no existirían en `public.users` y todas
 * sus consultas quedarían bloqueadas por RLS.
 *
 * El flujo cierra el círculo: creamos la fila con un uuid nuevo y lo
 * escribimos de vuelta en Clerk como `external_id`, que es exactamente lo que
 * el token de sesión publica como claim.
 *
 * Eventos: user.created, user.updated, user.deleted
 *
 * Despliegue (sin verificación de JWT: quien firma es Clerk, no Supabase):
 *   supabase functions deploy clerk-user-webhook --no-verify-jwt
 *
 * Secretos:
 *   supabase secrets set CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
 *   supabase secrets set CLERK_SECRET_KEY=sk_...
 */

const CLERK_API = 'https://api.clerk.com/v1';

type ClerkEmail = { id: string; email_address: string };

type ClerkUserData = {
  id: string;
  external_id: string | null;
  primary_email_address_id: string | null;
  email_addresses: ClerkEmail[];
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  has_image: boolean;
  public_metadata: Record<string, unknown> | null;
  unsafe_metadata: Record<string, unknown> | null;
};

type ClerkEvent = { type: string; data: ClerkUserData };

function servicio() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) throw new Error('SERVER_CONFIG');

  // El service role ignora RLS: es imprescindible aquí, porque el usuario
  // todavía no tiene identidad resoluble por app_uid() cuando lo creamos.
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function correoPrincipal(data: ClerkUserData) {
  const principal = data.email_addresses.find((email) => email.id === data.primary_email_address_id);
  return (principal ?? data.email_addresses[0])?.email_address?.toLowerCase() ?? null;
}

function nombreVisible(data: ClerkUserData, correo: string | null) {
  const compuesto = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
  return compuesto || correo?.split('@')[0] || 'Usuario';
}

function avatar(data: ClerkUserData) {
  const migrado = data.public_metadata?.avatar;
  if (typeof migrado === 'string' && migrado.trim()) return migrado;
  return data.has_image && data.image_url ? data.image_url : null;
}

/**
 * Publica el uuid recién creado como `external_id` del usuario de Clerk. Sin
 * este paso el token de sesión no llevaría el claim y app_uid() devolvería null.
 */
async function fijarExternalId(clerkUserId: string, externalId: string) {
  const secreto = Deno.env.get('CLERK_SECRET_KEY');
  if (!secreto) throw new Error('SERVER_CONFIG');

  const respuesta = await fetch(`${CLERK_API}/users/${clerkUserId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${secreto}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ external_id: externalId }),
  });

  if (!respuesta.ok) {
    throw new Error(`Clerk rechazó el external_id (${respuesta.status}): ${await respuesta.text()}`);
  }
}

async function alCrear(data: ClerkUserData) {
  const supabase = servicio();
  const correo = correoPrincipal(data);

  // Reentrada: Clerk reintenta los webhooks fallidos, y la migración ya dejó
  // external_id puesto en las cuentas antiguas.
  if (data.external_id) {
    const { data: existente } = await supabase
      .from('users').select('id').eq('id', data.external_id).maybeSingle();
    if (existente) return { estado: 'ya_existia', id: data.external_id };
  }

  // Un registro con el mismo correo que una cuenta migrada debe reutilizar la
  // fila existente en vez de duplicar la identidad.
  if (correo) {
    const { data: porCorreo } = await supabase
      .from('users').select('id').eq('email', correo).maybeSingle();

    if (porCorreo?.id) {
      await fijarExternalId(data.id, String(porCorreo.id));
      return { estado: 'vinculado_por_correo', id: String(porCorreo.id) };
    }
  }

  // unsafe_metadata lo escribe el propio cliente durante el registro, así que
  // solo puede expresar una intención: jamás otorgar el rol. Si pidió ser
  // propietario, se abre la solicitud para que un administrador la revise.
  const pidioPropietario = data.unsafe_metadata?.requestedRole === 'owner';

  const nuevoId = crypto.randomUUID();
  const { error } = await supabase.from('users').insert({
    id: nuevoId,
    email: correo,
    name: nombreVisible(data, correo),
    role: 'client',
    status: 'active',
    email_verified: true,
    avatar: avatar(data),
    owner_request_status: pidioPropietario ? 'pending' : null,
  });
  if (error) throw error;

  try {
    await fijarExternalId(data.id, nuevoId);
  } catch (causa) {
    // Sin external_id la fila es inalcanzable para el usuario: revertimos para
    // que el reintento de Clerk parta de cero en vez de dejar un huérfano.
    await supabase.from('users').delete().eq('id', nuevoId);
    throw causa;
  }

  return { estado: 'creado', id: nuevoId };
}

async function alActualizar(data: ClerkUserData) {
  if (!data.external_id) return alCrear(data);

  const supabase = servicio();
  const correo = correoPrincipal(data);

  const { error } = await supabase.from('users').update({
    email: correo,
    name: nombreVisible(data, correo),
    avatar: avatar(data),
    updated_at: new Date().toISOString(),
  }).eq('id', data.external_id);
  if (error) throw error;

  return { estado: 'actualizado', id: data.external_id };
}

async function alEliminar(data: ClerkUserData) {
  if (!data.external_id) return { estado: 'sin_external_id' };

  const supabase = servicio();
  // Marcamos en vez de borrar: hay propiedades, mensajes y visitas colgando de
  // este id, y un delete en cascada destruiría el historial.
  const { error } = await supabase.from('users').update({
    status: 'deleted',
    updated_at: new Date().toISOString(),
  }).eq('id', data.external_id);
  if (error) throw error;

  return { estado: 'marcado_eliminado', id: data.external_id };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Método no permitido.' }, 405);

  const secretoFirma = Deno.env.get('CLERK_WEBHOOK_SIGNING_SECRET');
  if (!secretoFirma) return jsonResponse({ error: 'Falta CLERK_WEBHOOK_SIGNING_SECRET.' }, 500);

  const cuerpo = await request.text();

  let evento: ClerkEvent;
  try {
    // Svix valida firma y marca de tiempo: sin esto cualquiera podría crear
    // usuarios en la base de datos con un POST.
    evento = new Webhook(secretoFirma).verify(cuerpo, {
      'svix-id': request.headers.get('svix-id') ?? '',
      'svix-timestamp': request.headers.get('svix-timestamp') ?? '',
      'svix-signature': request.headers.get('svix-signature') ?? '',
    }) as ClerkEvent;
  } catch {
    return jsonResponse({ error: 'Firma no válida.' }, 401);
  }

  try {
    switch (evento.type) {
      case 'user.created': return jsonResponse(await alCrear(evento.data));
      case 'user.updated': return jsonResponse(await alActualizar(evento.data));
      case 'user.deleted': return jsonResponse(await alEliminar(evento.data));
      default: return jsonResponse({ estado: 'ignorado', tipo: evento.type });
    }
  } catch (causa) {
    console.error(`clerk-user-webhook (${evento.type}):`, causa);
    // Un 500 hace que Svix reintente con retroceso exponencial.
    return jsonResponse({ error: causa instanceof Error ? causa.message : 'Error interno.' }, 500);
  }
});
