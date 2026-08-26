import { createClient } from 'npm:@supabase/supabase-js@2.110.0';

export function createUserClient(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('AUTH_REQUIRED');

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) throw new Error('SERVER_CONFIG');

  return createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireOwner(request: Request) {
  const supabase = createUserClient(request);

  // Clerk emite el token, así que GoTrue no lo reconoce y auth.getUser() ya no
  // sirve para identificar al llamante. current_profile() resuelve la identidad
  // desde el mismo claim que usan las políticas RLS.
  const { data, error: profileError } = await supabase.rpc('current_profile');
  if (profileError) throw profileError;

  // `returns table(...)` entrega un array; cero filas significa que el token no
  // resolvió ninguna identidad.
  const profile = (Array.isArray(data) ? data[0] : data) as
    | { id: string; role: string; status: string }
    | undefined;

  if (!profile) throw new Error('AUTH_REQUIRED');
  if (profile.status !== 'active') throw new Error('AUTH_REQUIRED');

  if (!['owner', 'admin', 'superadmin'].includes(profile.role)) {
    throw new Error('OWNER_REQUIRED');
  }

  // Se conserva la forma `user.id` para no tocar a quienes ya consumen esto.
  return { supabase, user: { id: profile.id }, role: profile.role };
}
