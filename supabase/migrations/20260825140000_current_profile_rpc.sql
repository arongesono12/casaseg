-- Identidad del llamante para el código de servidor.
--
-- Las edge functions resolvían al usuario con auth.getUser(), que interroga a
-- GoTrue. Con Clerk emitiendo los tokens, GoTrue no reconoce el JWT y toda
-- llamada autenticada falla. Esta función sustituye a esa comprobación.
--
-- security definer a propósito: se salta RLS, pero el filtro es app_uid(), es
-- decir la identidad ya verificada del propio token. No puede devolver la fila
-- de otro usuario, y evita que un cambio futuro en las políticas de
-- public.users deje a las edge functions sin poder identificar a quien llama.

create or replace function public.current_profile()
returns table (id uuid, role text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.role::text, u.status::text
  from public.users u
  where u.id = public.app_uid()
$$;

comment on function public.current_profile() is
  'Perfil del usuario autenticado (uuid, rol y estado) resuelto desde el token de Clerk vía public.app_uid(). Devuelve cero filas si no hay identidad válida.';

revoke all on function public.current_profile() from public;
grant execute on function public.current_profile() to authenticated;
