-- "Eliminar chat" al estilo WhatsApp: se elimina solo para quien lo pide.
--
-- Cada participante guarda el momento en que eliminó el chat. A partir de ahí:
-- - list_my_chats no le muestra el chat hasta que llegue un mensaje nuevo,
--   y solo cuenta como no leídos los mensajes posteriores;
-- - list_chat_messages solo le devuelve mensajes posteriores.
-- El otro participante conserva su historial intacto: no se borra ninguna fila.

alter table public.chats
  add column if not exists client_cleared_at timestamptz,
  add column if not exists owner_cleared_at timestamptz;

comment on column public.chats.client_cleared_at is 'Cuándo eliminó el cliente el chat para sí mismo (oculta los mensajes anteriores).';
comment on column public.chats.owner_cleared_at is 'Cuándo eliminó el propietario el chat para sí mismo (oculta los mensajes anteriores).';

create or replace function public.delete_chat_for_me(p_chat_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_actor uuid := public.app_uid();
  v_chat public.chats%rowtype;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_chat from public.chats c where c.id = p_chat_id and (c.client_id = v_actor or c.owner_id = v_actor);
  if not found then
    raise exception 'Chat not found' using errcode = 'P0002';
  end if;

  if v_chat.owner_id = v_actor then
    update public.chats set owner_cleared_at = now() where id = p_chat_id;
  else
    update public.chats set client_cleared_at = now() where id = p_chat_id;
  end if;

  -- Lo pendiente deja de contar como no leído para quien elimina el chat.
  update public.messages
  set is_read = true,
      read_at = coalesce(read_at, now())
  where chat_id = p_chat_id
    and recipient_id = v_actor
    and coalesce(is_read, false) = false;
end;
$$;

-- Mensajes del chat visibles para el usuario actual (posteriores a su eliminación).
create or replace function public.list_chat_messages(p_chat_id uuid, p_limit integer default 50)
returns table (id uuid, chat_id uuid, sender_id uuid, content text, created_at timestamptz, is_read boolean, delivered_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $$
  with me as (select public.app_uid() as id),
  visible as (
    select c.id,
           case when c.owner_id = me.id then c.owner_cleared_at else c.client_cleared_at end as cleared_at
    from public.chats c
    cross join me
    where c.id = p_chat_id
      and me.id is not null
      and (c.client_id = me.id or c.owner_id = me.id)
  )
  select m.id, m.chat_id, m.sender_id, m.content, m.created_at, m.is_read, m.delivered_at
  from public.messages m
  join visible v on v.id = m.chat_id
  where v.cleared_at is null or m.created_at > v.cleared_at
  order by m.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

-- Bandeja: igual que antes, pero respetando la eliminación de cada participante.
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
  with me as (select public.app_uid() as id),
  mine as (
    select c.*,
           case when c.owner_id = me.id then c.owner_cleared_at else c.client_cleared_at end as my_cleared_at
    from public.chats c
    cross join me
    where me.id is not null
      and (c.client_id = me.id or c.owner_id = me.id)
  )
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
  from mine c
  cross join me
  left join public.properties p on p.id = c.property_id
  left join public.users partner
    on partner.id = case when c.owner_id = me.id then c.client_id else c.owner_id end
  left join lateral (
    select m.content, m.created_at
    from public.messages m
    where m.chat_id = c.id
      and (c.my_cleared_at is null or m.created_at > c.my_cleared_at)
    order by m.created_at desc
    limit 1
  ) last_msg on true
  left join lateral (
    select count(*) as total
    from public.messages m
    where m.chat_id = c.id
      and m.recipient_id = me.id
      and coalesce(m.is_read, false) = false
      and (c.my_cleared_at is null or m.created_at > c.my_cleared_at)
  ) unread on true
  -- Un chat eliminado vuelve a aparecer solo cuando llega un mensaje posterior.
  where c.my_cleared_at is null or last_msg.created_at is not null
  order by coalesce(last_msg.created_at, c.created_at) desc;
$$;

revoke all on function public.delete_chat_for_me(uuid) from public, anon;
revoke all on function public.list_chat_messages(uuid, integer) from public, anon;
grant execute on function public.delete_chat_for_me(uuid) to authenticated;
grant execute on function public.list_chat_messages(uuid, integer) to authenticated;
