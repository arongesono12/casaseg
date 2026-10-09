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
 * El flujo cierra el círculo: creamos auth.users con la Admin API, reutilizamos
 * su uuid en public.users y lo publicamos en Clerk como external_id.
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

type ClerkEmail = { id: string; email_address: string; verification?: { status?: string } | null };

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
  const verificado = principal?.verification?.status === 'verified'
    ? principal
    : data.email_addresses.find((email) => email.verification?.status === 'verified');
  return verificado?.email_address?.trim().toLowerCase() ?? null;
}

function nombreDeClerk(data: ClerkUserData) {
  return [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
}

function nombreVisible(data: ClerkUserData, correo: string | null) {
  return nombreDeClerk(data) || correo?.split('@')[0] || 'Usuario';
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

/**
 * Los eventos de prueba del panel de Clerk y las repeticiones de usuarios ya
 * borrados traen un id inexistente. Comprobarlo antes de crear nada evita
 * altas fantasma (con sus avisos y auditoría) y que Svix reintente sin fin.
 */
async function existeEnClerk(clerkUserId: string) {
  const secreto = Deno.env.get('CLERK_SECRET_KEY');
  if (!secreto) throw new Error('SERVER_CONFIG');

  const respuesta = await fetch(`${CLERK_API}/users/${clerkUserId}`, {
    headers: { Authorization: `Bearer ${secreto}` },
  });
  if (respuesta.status === 404) return false;
  if (!respuesta.ok) {
    throw new Error(`Clerk no respondió al comprobar el usuario (${respuesta.status}).`);
  }
  return true;
}

async function alCrear(data: ClerkUserData) {
  const supabase = servicio();
  const correo = correoPrincipal(data);

  if (!(await existeEnClerk(data.id))) return { estado: 'usuario_clerk_inexistente' };

  // Reentrada: Clerk reintenta los webhooks fallidos, y la migración ya dejó
  // external_id puesto en las cuentas antiguas.
  if (data.external_id) {
    const { data: existente } = await supabase
      .from('users').select('id').eq('id', data.external_id).maybeSingle();
    if (existente) return { estado: 'ya_existia', id: data.external_id };
  }

  // Un correo sin verificar nunca puede reclamar un perfil existente ni crear
  // una identidad web confirmada. user.updated volverá a intentarlo al verificarlo.
  if (!correo) return { estado: 'pendiente_verificacion' };

  // Un registro con el mismo correo que una cuenta migrada debe reutilizar la
  // fila existente en vez de duplicar la identidad.
  const { data: porCorreo, error: buscarError } = await supabase
    .from('users').select('id').eq('email', correo).maybeSingle();
  if (buscarError) throw buscarError;

  if (porCorreo?.id) {
    await fijarExternalId(data.id, String(porCorreo.id));
    return { estado: 'vinculado_por_correo', id: String(porCorreo.id) };
  }

  // unsafe_metadata lo escribe el propio cliente durante el registro, así que
  // solo puede expresar una intención: jamás otorgar el rol. Si pidió ser
  // propietario, se abre la solicitud para que un administrador la revise.
  const pidioPropietario = data.unsafe_metadata?.requestedRole === 'owner';

  const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
    email: correo,
    email_confirm: true,
    user_metadata: { full_name: nombreVisible(data, correo), avatar_url: avatar(data) },
  });
  if (authError || !authResult.user) throw authError ?? new Error('No se pudo crear auth.users.');
  const nuevoId = authResult.user.id;

  try {
    // El trigger de alta suele crear estas filas. El respaldo conserva el mismo
    // UUID incluso si una instalación aún no tiene el trigger actualizado.
    const { data: perfil, error: perfilError } = await supabase.from('users').select('id').eq('id', nuevoId).maybeSingle();
    if (perfilError) throw perfilError;
    if (!perfil) {
      const { error: insertError } = await supabase.from('users').insert({ id: nuevoId, email: correo, name: nombreVisible(data, correo), role: 'client', status: 'active', email_verified: true, avatar: avatar(data) });
      if (insertError) throw insertError;
    }
    // El trigger solo marca verificado el email de Google; aquí Clerk ya lo
    // verificó (correoPrincipal exige `verified`). Sin esto el ascenso a
    // propietario fallaría con "El email del usuario no está verificado".
    const { error: verifiedError } = await supabase.from('users').update({
      email_verified: true,
      ...(pidioPropietario ? { owner_request_status: 'pending' } : {}),
    }).eq('id', nuevoId);
    if (verifiedError) throw verifiedError;
    const { data: settings, error: settingsError } = await supabase.from('user_settings').select('user_id').eq('user_id', nuevoId).maybeSingle();
    if (settingsError) throw settingsError;
    if (!settings) {
      const { error: insertSettingsError } = await supabase.from('user_settings').insert({ user_id: nuevoId });
      if (insertSettingsError) throw insertSettingsError;
    }
    await fijarExternalId(data.id, nuevoId);
  } catch (causa) {
    // La identidad fue creada por este intento. public.users ya no cuelga de
    // auth.users (clerk_owns_identity), así que se borra explícitamente: si
    // quedara, el reintento de Clerk la vincularía por correo sin auth.users.
    await supabase.from('user_settings').delete().eq('user_id', nuevoId);
    await supabase.from('users').delete().eq('id', nuevoId);
    await supabase.auth.admin.deleteUser(nuevoId);
    throw causa;
  }

  return { estado: 'creado', id: nuevoId };
}

async function alActualizar(data: ClerkUserData) {
  if (!data.external_id) return alCrear(data);

  const supabase = servicio();
  const correo = correoPrincipal(data);

  // Solo se sincroniza el nombre si Clerk lo tiene: el respaldo (prefijo del
  // correo) borraría el nombre que el usuario puso en la web.
  const nombre = nombreDeClerk(data);
  const { error } = await supabase.from('users').update({
    ...(correo ? { email: correo, email_verified: true } : {}),
    ...(nombre ? { name: nombre } : {}),
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
