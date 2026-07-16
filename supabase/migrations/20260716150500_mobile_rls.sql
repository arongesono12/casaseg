-- CasaSeg mobile authorization boundary.
-- The client omits user_id/sender_id; PostgreSQL derives them from the JWT.

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'user_settings',
    'device_tokens',
    'notifications',
    'conversation_participants',
    'conversation_summaries',
    'messages'
  ]
  loop
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target_table
        and c.relkind in ('r', 'p')
    ) then
      execute format('alter table public.%I enable row level security', target_table);
      execute format('alter table public.%I force row level security', target_table);
    end if;
  end loop;
end
$$;

-- Preserve compatibility with the existing two-argument read-receipt RPC while
-- preventing the mobile client from choosing another user's identifier.
do $$
declare
  conversation_id_type text;
  function_return_type text;
  legacy_signature text;
begin
  select
    format_type(procedure.proargtypes[0], null),
    format_type(procedure.prorettype, null),
    procedure.oid::regprocedure::text
  into conversation_id_type, function_return_type, legacy_signature
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'mark_conversation_read'
    and procedure.pronargs = 2
    and procedure.proargnames[2] = 'p_user_id'
  limit 1;

  if legacy_signature is not null then
    execute format(
      'create or replace function public.mark_conversation_read(p_conversation_id %s) returns %s language sql security definer set search_path = public as $wrapper$ select public.mark_conversation_read(p_conversation_id, auth.uid()) $wrapper$',
      conversation_id_type,
      function_return_type
    );
    execute format('revoke execute on function %s from public, anon, authenticated', legacy_signature);
    execute format('grant execute on function public.mark_conversation_read(%s) to authenticated', conversation_id_type);
  end if;
end
$$;

do $$
begin
  if to_regclass('public.user_settings') is not null then
    alter table public.user_settings alter column user_id set default auth.uid();
    drop policy if exists user_settings_select_own on public.user_settings;
    drop policy if exists user_settings_insert_own on public.user_settings;
    drop policy if exists user_settings_update_own on public.user_settings;
    create policy user_settings_select_own on public.user_settings for select to authenticated using (user_id = auth.uid());
    create policy user_settings_insert_own on public.user_settings for insert to authenticated with check (user_id = auth.uid());
    create policy user_settings_update_own on public.user_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;

  if to_regclass('public.device_tokens') is not null then
    alter table public.device_tokens alter column user_id set default auth.uid();
    drop policy if exists device_tokens_select_own on public.device_tokens;
    drop policy if exists device_tokens_insert_own on public.device_tokens;
    drop policy if exists device_tokens_update_own on public.device_tokens;
    drop policy if exists device_tokens_delete_own on public.device_tokens;
    create policy device_tokens_select_own on public.device_tokens for select to authenticated using (user_id = auth.uid());
    create policy device_tokens_insert_own on public.device_tokens for insert to authenticated with check (user_id = auth.uid());
    create policy device_tokens_update_own on public.device_tokens for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy device_tokens_delete_own on public.device_tokens for delete to authenticated using (user_id = auth.uid());
  end if;

  if to_regclass('public.notifications') is not null then
    drop policy if exists notifications_select_own on public.notifications;
    drop policy if exists notifications_update_own on public.notifications;
    create policy notifications_select_own on public.notifications for select to authenticated using (user_id = auth.uid());
    create policy notifications_update_own on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;

  if to_regclass('public.conversation_participants') is not null then
    drop policy if exists conversation_participants_select_own on public.conversation_participants;
    create policy conversation_participants_select_own on public.conversation_participants for select to authenticated using (user_id = auth.uid());
  end if;

  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'conversation_summaries' and c.relkind in ('r', 'p')
  ) then
    drop policy if exists conversation_summaries_select_own on public.conversation_summaries;
    create policy conversation_summaries_select_own on public.conversation_summaries for select to authenticated using (user_id = auth.uid());
  end if;

  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'conversation_summaries' and c.relkind = 'v'
  ) then
    alter view public.conversation_summaries set (security_invoker = true);
  end if;

  if to_regclass('public.messages') is not null and to_regclass('public.conversation_participants') is not null then
    alter table public.messages alter column sender_id set default auth.uid();
    drop policy if exists messages_select_participant on public.messages;
    drop policy if exists messages_insert_participant on public.messages;
    create policy messages_select_participant on public.messages
      for select to authenticated
      using (exists (
        select 1 from public.conversation_participants participant
        where participant.conversation_id = messages.conversation_id
          and participant.user_id = auth.uid()
      ));
    create policy messages_insert_participant on public.messages
      for insert to authenticated
      with check (
        sender_id = auth.uid()
        and exists (
          select 1 from public.conversation_participants participant
          where participant.conversation_id = messages.conversation_id
            and participant.user_id = auth.uid()
        )
      );
  end if;
end
$$;
