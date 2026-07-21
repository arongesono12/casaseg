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
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('AUTH_REQUIRED');

  const { data: profile, error: roleError } = await supabase
    .from('users')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (roleError) throw roleError;
  const role = String(profile?.role ?? '');
  if (!['owner', 'admin', 'superadmin'].includes(role)) {
    throw new Error('OWNER_REQUIRED');
  }

  return { supabase, user: authData.user, role };
}
