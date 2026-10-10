-- The browser must not choose, read or verify its own email code.
begin;

revoke all on public.user_otp from public, anon, authenticated;
revoke all on function public.upsert_user_otp(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.consume_user_otp(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_user_email_verified(uuid) from public, anon, authenticated;

alter table public.user_otp
  add column if not exists server_issued boolean not null default false,
  add column if not exists attempts integer not null default 0;

create table if not exists private.otp_send_limits (
  user_id uuid primary key references public.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  send_count integer not null default 0
);
revoke all on private.otp_send_limits from public, anon, authenticated;

-- Called only by the authenticated Edge Function with its service-role client.
create or replace function public.issue_email_otp(p_user_id uuid, p_otp text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit private.otp_send_limits%rowtype;
  v_last_sent timestamptz;
begin
  if p_otp !~ '^[0-9]{6}$' then
    raise exception 'Invalid OTP' using errcode = '22023';
  end if;

  insert into private.otp_send_limits (user_id)
  values (p_user_id) on conflict (user_id) do nothing;
  select * into v_limit from private.otp_send_limits
  where user_id = p_user_id for update;

  if v_limit.window_start < now() - interval '1 hour' then
    update private.otp_send_limits
       set window_start = now(), send_count = 0
     where user_id = p_user_id;
    v_limit.send_count := 0;
  end if;
  if v_limit.send_count >= 5 then return false; end if;

  select created_at into v_last_sent from public.user_otp
   where user_id = p_user_id for update;
  if v_last_sent > now() - interval '60 seconds' then return false; end if;

  update private.otp_send_limits set send_count = send_count + 1
   where user_id = p_user_id;
  insert into public.user_otp
    (user_id, otp, expires_at, created_at, updated_at, server_issued, attempts)
  values (p_user_id, p_otp, now() + interval '10 minutes', now(), now(), true, 0)
  on conflict (user_id) do update set
    otp = excluded.otp,
    expires_at = excluded.expires_at,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    server_issued = true,
    attempts = 0;
  return true;
end;
$$;
revoke all on function public.issue_email_otp(uuid, text) from public, anon, authenticated;
grant execute on function public.issue_email_otp(uuid, text) to service_role;

-- One transaction consumes the code and marks the authenticated user verified.
create or replace function public.verify_email_otp(p_otp text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.app_uid();
  v_code public.user_otp%rowtype;
begin
  if v_user_id is null or p_otp !~ '^[0-9]{6}$' then return false; end if;
  select * into v_code from public.user_otp
   where user_id = v_user_id for update;
  if not found or not v_code.server_issued or v_code.expires_at <= now() then
    return false;
  end if;
  if v_code.attempts >= 5 then return false; end if;
  if v_code.otp <> p_otp then
    update public.user_otp set attempts = attempts + 1
     where user_id = v_user_id;
    return false;
  end if;
  delete from public.user_otp where user_id = v_user_id;
  update public.users set email_verified = true, verification_token = null
   where id = v_user_id;
  return found;
end;
$$;
revoke all on function public.verify_email_otp(text) from public, anon;
grant execute on function public.verify_email_otp(text) to authenticated;

-- Existing Supabase Auth users can synchronize a provider-confirmed address.
-- Clerk users are verified by the signed Clerk webhook instead.
create or replace function public.sync_confirmed_email_verification()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.app_uid();
begin
  if v_user_id is null then return false; end if;
  if not exists (
    select 1 from auth.users a join public.users u on u.id = a.id
    where a.id = v_user_id
      and a.email_confirmed_at is not null
      and lower(a.email) = lower(u.email)
  ) then return false; end if;
  update public.users set email_verified = true where id = v_user_id;
  return found;
end;
$$;
revoke all on function public.sync_confirmed_email_verification() from public, anon;
grant execute on function public.sync_confirmed_email_verification() to authenticated;

create or replace function private.guard_owner_property_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon')
     or private.is_admin_or_superadmin(public.app_uid()) then
    return new;
  end if;
  if (tg_op = 'INSERT' and new.status = 'active')
     or (tg_op = 'UPDATE' and new.status = 'active'
         and old.status is distinct from 'active') then
    raise exception 'La publicación requiere el flujo autorizado'
      using errcode = '42501';
  end if;
  if (tg_op = 'INSERT' and new.assigned_admin_id is not null)
     or (tg_op = 'UPDATE' and (
       new.assigned_admin_id is distinct from old.assigned_admin_id
       or new.search_priority is distinct from old.search_priority
       or new.owner_plan_type is distinct from old.owner_plan_type
       or new.owner_verification_level is distinct from old.owner_verification_level
     )) then
    raise exception 'Los campos de administración y plan son de solo servidor'
      using errcode = '42501';
  end if;
  if (tg_op = 'INSERT' and
      (new.tourist_license_status = 'verified'
       or new.tourist_license_verified_at is not null))
     or (tg_op = 'UPDATE' and
      (new.tourist_license_status is distinct from old.tourist_license_status
       and new.tourist_license_status = 'verified'
       or new.tourist_license_verified_at is distinct from old.tourist_license_verified_at)) then
    raise exception 'La verificación de licencia requiere administración'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_owner_property_publication on public.properties;
create trigger guard_owner_property_publication
before insert or update on public.properties
for each row execute function private.guard_owner_property_publication();

alter table public.messages
  add constraint messages_content_safe_length
  check (content is not null and char_length(btrim(content)) between 1 and 4000)
  not valid;
alter table public.messages validate constraint messages_content_safe_length;

commit;
