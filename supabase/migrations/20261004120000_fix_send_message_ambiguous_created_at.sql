-- La mensajería no enviaba nada: cada llamada a send_chat_message fallaba con
--   42702: column reference "created_at" is ambiguous
-- en send_message_transaction, en `insert into public.messages … returning id, created_at`.
-- La función devuelve una tabla con una columna de salida `created_at`, y en
-- PL/pgSQL esa columna es también una variable: Postgres no sabe si
-- `created_at` es la columna de messages o la variable de salida.
--
-- `#variable_conflict use_column` resuelve los nombres sin calificar a la
-- columna. Todas las variables propias de la función empiezan por p_ o v_, así
-- que ninguna otra referencia cambia de significado. El resto del cuerpo es
-- idéntico al desplegado.

create or replace function public.send_message_transaction(p_property_id uuid, p_recipient_id uuid, p_content text)
returns table(message_id uuid, chat_id uuid, property_id uuid, sender_id uuid, recipient_id uuid, owner_id uuid, client_id uuid, content text, created_at timestamp with time zone, notification_created boolean)
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
#variable_conflict use_column
declare
  v_actor_id uuid := public.app_uid();
  v_owner_id uuid;
  v_client_id uuid;
  v_chat_id uuid;
  v_message_id uuid;
  v_created_at timestamptz;
  v_property_title text;
  v_preview text;
  v_notification_created boolean := false;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  p_content := nullif(trim(coalesce(p_content, '')), '');
  if p_property_id is null or p_recipient_id is null or p_content is null then
    raise exception 'Property, recipient and content are required' using errcode = '22023';
  end if;
  if p_recipient_id = v_actor_id or char_length(p_content) > 4000 then
    raise exception 'Invalid message recipient or content' using errcode = '22023';
  end if;

  select p.owner_id, p.title
  into v_owner_id, v_property_title
  from public.properties p
  where p.id = p_property_id;
  if v_owner_id is null then
    raise exception 'Property not found' using errcode = 'P0002';
  end if;

  if v_actor_id = v_owner_id then
    v_client_id := p_recipient_id;
  else
    if p_recipient_id <> v_owner_id then
      raise exception 'Recipient must be the property owner' using errcode = '42501';
    end if;
    v_client_id := v_actor_id;
  end if;

  insert into public.chats (property_id, client_id, owner_id)
  values (p_property_id, v_client_id, v_owner_id)
  on conflict on constraint chats_property_id_client_id_owner_id_key
  do update set owner_id = excluded.owner_id
  returning id into v_chat_id;

  insert into public.messages (chat_id, sender_id, content)
  values (v_chat_id, v_actor_id, p_content)
  returning id, created_at into v_message_id, v_created_at;

  v_preview := case when char_length(p_content) > 140
    then left(p_content, 137) || '...'
    else p_content
  end;

  begin
    insert into public.notifications (user_id, title, message, read, type, created_at, metadata)
    values (
      p_recipient_id,
      'Nuevo mensaje',
      v_preview,
      false,
      'message',
      now(),
      jsonb_build_object(
        'type', 'message',
        'propertyId', p_property_id,
        'propertyTitle', coalesce(v_property_title, 'Propiedad'),
        'chatId', v_chat_id,
        'partnerId', v_actor_id,
        'fromUserId', v_actor_id
      )
    );
    v_notification_created := true;
  exception when others then
    raise warning 'Message % saved without notification: %', v_message_id, sqlerrm;
  end;

  begin
    insert into public.domain_events (event_type, aggregate_type, aggregate_id, actor_user_id, payload)
    values (
      'message_sent',
      'chat',
      v_chat_id,
      v_actor_id,
      jsonb_build_object(
        'messageId', v_message_id,
        'chatId', v_chat_id,
        'propertyId', p_property_id,
        'senderId', v_actor_id,
        'recipientId', p_recipient_id,
        'ownerId', v_owner_id,
        'clientId', v_client_id
      )
    );
  exception when others then
    raise warning 'Message % saved without domain event: %', v_message_id, sqlerrm;
  end;

  return query select
    v_message_id,
    v_chat_id,
    p_property_id,
    v_actor_id,
    p_recipient_id,
    v_owner_id,
    v_client_id,
    p_content,
    v_created_at,
    v_notification_created;
end;
$function$;
