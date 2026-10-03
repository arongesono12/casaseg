-- Con Clerk, el `sub` del JWT es "user_xxx" y auth.uid() falla al convertirlo
-- a uuid ("invalid input syntax for type uuid"). Cualquier función que lo use
-- (helpers de RLS, triggers de auditoría, RPCs) tumba la consulta entera: por
-- eso el panel de propietario y la mensajería no mostraban nada.
--
-- 1) Se reescriben todas las funciones de public/private que llaman a
--    auth.uid() para que usen public.app_uid(), que lee `external_id` (uuid de
--    public.users) y cae a `sub` para sesiones antiguas de Supabase.
-- 2) RPCs de mensajería sobre el esquema real (chats + messages).

do $$
declare
  fn record;
begin
  for fn in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prokind = 'f'
      and p.prosrc ilike '%auth.uid()%'
  loop
    execute replace(pg_get_functiondef(fn.oid), 'auth.uid()', 'public.app_uid()');
  end loop;
end;
$$;

-- Bandeja: una fila por chat con el otro participante, la propiedad, el
-- último mensaje y los no leídos. SECURITY DEFINER porque la RLS de users solo
-- deja leer el propio perfil y aquí hace falta el nombre del interlocutor.
create or replace function public.list_my_chats()
returns table (
  chat_id uuid,
  property_id uuid,
  property_title text,
  property_image text,
  partner_id uuid,
  partner_name text,
  partner_avatar text,
  is_owner boolean,
  last_message text,
  last_message_at timestamptz,
  unread_count integer
)
language sql
stable
security definer
set search_path to ''
as $$
  with me as (select public.app_uid() as id)
  select
    c.id,
    c.property_id,
    p.title,
    p.image_urls[1],
    partner.id,
    coalesce(nullif(trim(partner.name), ''), 'CasaSeg'),
    partner.avatar,
    c.owner_id = me.id,
    last_msg.content,
    coalesce(last_msg.created_at, c.created_at),
    coalesce(unread.total, 0)::integer
  from public.chats c
  cross join me
  left join public.properties p on p.id = c.property_id
  left join public.users partner
    on partner.id = case when c.owner_id = me.id then c.client_id else c.owner_id end
  left join lateral (
    select m.content, m.created_at
    from public.messages m
    where m.chat_id = c.id
    order by m.created_at desc
    limit 1
  ) last_msg on true
  left join lateral (
    select count(*) as total
    from public.messages m
    where m.chat_id = c.id
      and m.recipient_id = me.id
      and coalesce(m.is_read, false) = false
  ) unread on true
  where me.id is not null
    and (c.client_id = me.id or c.owner_id = me.id)
  order by coalesce(last_msg.created_at, c.created_at) desc;
$$;

create or replace function public.mark_chat_read(p_chat_id uuid)
returns void
language sql
security definer
set search_path to ''
as $$
  update public.messages
  set is_read = true,
      read_at = coalesce(read_at, now())
  where chat_id = p_chat_id
    and recipient_id = public.app_uid()
    and coalesce(is_read, false) = false;
$$;

-- Envía en un chat existente (p_chat_id) o abre el chat con el propietario de
-- una vivienda (p_property_id). Reutiliza send_message_transaction para crear
-- el chat, la notificación y el evento de dominio.
create or replace function public.send_chat_message(
  p_content text,
  p_chat_id uuid default null,
  p_property_id uuid default null
)
returns table (message_id uuid, chat_id uuid, sender_id uuid, content text, created_at timestamptz)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_actor uuid := public.app_uid();
  v_property uuid;
  v_recipient uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_chat_id is not null then
    select c.property_id,
           case when c.owner_id = v_actor then c.client_id else c.owner_id end
    into v_property, v_recipient
    from public.chats c
    where c.id = p_chat_id
      and (c.client_id = v_actor or c.owner_id = v_actor);
    if v_property is null then
      raise exception 'Chat not found' using errcode = 'P0002';
    end if;
  elsif p_property_id is not null then
    select p.id, p.owner_id into v_property, v_recipient
    from public.properties p
    where p.id = p_property_id;
    if v_property is null then
      raise exception 'Property not found' using errcode = 'P0002';
    end if;
  else
    raise exception 'Chat or property required' using errcode = '22023';
  end if;

  return query
  select t.message_id, t.chat_id, t.sender_id, t.content, t.created_at
  from public.send_message_transaction(v_property, v_recipient, p_content) t;
end;
$$;

revoke all on function public.list_my_chats() from public, anon;
revoke all on function public.mark_chat_read(uuid) from public, anon;
revoke all on function public.send_chat_message(text, uuid, uuid) from public, anon;
grant execute on function public.list_my_chats() to authenticated;
grant execute on function public.mark_chat_read(uuid) to authenticated;
grant execute on function public.send_chat_message(text, uuid, uuid) to authenticated;
