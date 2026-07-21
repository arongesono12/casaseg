begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- Pin every application-owned public function to a predictable path. Keeping
-- public first preserves legacy unqualified references while preventing the
-- caller's role-level search_path from changing resolution.
do $$
declare
  function_record record;
begin
  for function_record in
    select procedure.oid
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prokind = 'f'
      and not coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=public, extensions, pg_temp']
      and not exists (
        select 1
        from pg_depend as dependency
        where dependency.classid = 'pg_proc'::regclass
          and dependency.objid = procedure.oid
          and dependency.deptype = 'e'
      )
  loop
    execute format(
      'alter function %s set search_path to public, extensions, pg_temp',
      function_record.oid::regprocedure
    );
  end loop;
end
$$;

-- Internal RLS helpers and the two authenticated transactional RPCs live in a
-- non-exposed schema. Public SECURITY INVOKER façades preserve existing web,
-- mobile and Edge Function contracts without exposing a definer directly.
do $$
declare
  function_signature text;
  function_oid oid;
begin
  foreach function_signature in array array[
    'get_user_role_for_policy(uuid)',
    'get_user_role()',
    'has_property_owner_role()',
    'is_admin_or_superadmin()',
    'is_admin_or_superadmin(uuid)',
    'is_admin()',
    'is_admin(uuid)',
    'is_superadmin()',
    'is_superadmin(uuid)',
    'user_role_for_rls(uuid)',
    'create_rental_payment_order(uuid,text,text,uuid)',
    'review_bank_transfer_proof(uuid,text,text)'
  ]
  loop
    if to_regprocedure('private.' || function_signature) is null then
      function_oid := to_regprocedure('public.' || function_signature);
      if function_oid is null then
        raise exception 'Required function public.% is missing', function_signature;
      end if;
      execute format('alter function %s set schema private', function_oid::regprocedure);
    end if;
  end loop;
end
$$;

create or replace function public.get_user_role_for_policy(user_id uuid)
returns text language sql stable security invoker set search_path = ''
as $$ select private.get_user_role_for_policy($1) $$;

create or replace function public.get_user_role()
returns text language sql stable security invoker set search_path = ''
as $$ select private.get_user_role() $$;

create or replace function public.has_property_owner_role()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.has_property_owner_role() $$;

create or replace function public.is_admin_or_superadmin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_admin_or_superadmin() $$;

create or replace function public.is_admin_or_superadmin(user_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_admin_or_superadmin($1) $$;

create or replace function public.is_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_admin() $$;

create or replace function public.is_admin(user_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_admin($1) $$;

create or replace function public.is_superadmin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_superadmin() $$;

create or replace function public.is_superadmin(user_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_superadmin($1) $$;

create or replace function public.user_role_for_rls(user_id uuid)
returns text language sql stable security invoker set search_path = ''
as $$ select private.user_role_for_rls($1) $$;

create or replace function public.create_rental_payment_order(
  p_contract_id uuid,
  p_payment_method text default 'fondoseg',
  p_phone_number text default null,
  p_idempotency_key uuid default gen_random_uuid()
)
returns public.rental_payment_orders
language sql
security invoker
set search_path = ''
as $$
  select private.create_rental_payment_order($1, $2, $3, $4)
$$;

create or replace function public.review_bank_transfer_proof(
  p_proof_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.review_bank_transfer_proof($1, $2, $3)
$$;

revoke all on all functions in schema private from public;
grant execute on function
  private.get_user_role_for_policy(uuid),
  private.get_user_role(),
  private.has_property_owner_role(),
  private.is_admin_or_superadmin(),
  private.is_admin_or_superadmin(uuid),
  private.is_admin(),
  private.is_admin(uuid),
  private.is_superadmin(),
  private.is_superadmin(uuid),
  private.user_role_for_rls(uuid)
to anon, authenticated, service_role;

grant execute on function
  private.create_rental_payment_order(uuid,text,text,uuid),
  private.review_bank_transfer_proof(uuid,text,text)
to authenticated, service_role;

revoke all on function
  public.get_user_role_for_policy(uuid),
  public.get_user_role(),
  public.has_property_owner_role(),
  public.is_admin_or_superadmin(),
  public.is_admin_or_superadmin(uuid),
  public.is_admin(),
  public.is_admin(uuid),
  public.is_superadmin(),
  public.is_superadmin(uuid),
  public.user_role_for_rls(uuid),
  public.create_rental_payment_order(uuid,text,text,uuid),
  public.review_bank_transfer_proof(uuid,text,text)
from public, anon;

grant execute on function
  public.get_user_role_for_policy(uuid),
  public.get_user_role(),
  public.has_property_owner_role(),
  public.is_admin_or_superadmin(),
  public.is_admin_or_superadmin(uuid),
  public.is_admin(),
  public.is_admin(uuid),
  public.is_superadmin(),
  public.is_superadmin(uuid),
  public.user_role_for_rls(uuid),
  public.create_rental_payment_order(uuid,text,text,uuid),
  public.review_bank_transfer_proof(uuid,text,text)
to authenticated, service_role;

-- Any remaining public definer is server-only. Triggers retain their OID-based
-- binding and service-role Edge Functions retain explicit EXECUTE permission.
do $$
declare
  function_record record;
begin
  for function_record in
    select procedure.oid
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
  loop
    execute format('revoke all on function %s from public, anon, authenticated', function_record.oid::regprocedure);
    execute format('grant execute on function %s to service_role', function_record.oid::regprocedure);
  end loop;
end
$$;

-- public.users is an identity projection, not an authentication store. Remove
-- legacy password material and expose only the columns needed by the clients.
update public.users set password = null where password is not null;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'users'
  loop
    execute format('drop policy %I on public.users', policy_record.policyname);
  end loop;
end
$$;

alter table public.users enable row level security;
alter table public.users force row level security;

create policy users_select_self_or_admin
on public.users for select to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin_or_superadmin((select auth.uid())))
);

create policy users_update_self_or_admin
on public.users for update to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin_or_superadmin((select auth.uid())))
)
with check (
  id = (select auth.uid())
  or (select private.is_admin_or_superadmin((select auth.uid())))
);

revoke all on table public.users from public, anon, authenticated;
grant select (
  id, name, email, role, avatar, owner_request_status, about, status,
  cover_picture, email_verified, phone, phone_verified, social_links,
  saved_properties, mfa_email_enabled, first_login_welcome_pending,
  welcome_seen_at, created_at, updated_at
) on public.users to authenticated;
grant update (
  name, avatar, about, cover_picture, phone, social_links,
  saved_properties, mfa_email_enabled, first_login_welcome_pending,
  welcome_seen_at
) on public.users to authenticated;
grant all on table public.users to service_role;

drop policy if exists "System can insert email logs" on public.email_logs;
revoke insert on table public.email_logs from anon, authenticated;
grant all on table public.email_logs to service_role;

drop policy if exists site_stats_auth_write on public.site_stats;
revoke insert, update, delete on table public.site_stats from anon, authenticated;
grant select on table public.site_stats to anon, authenticated;
grant all on table public.site_stats to service_role;

drop policy if exists "Permitir inserción pública" on public.visits;
drop policy if exists "Permitir lectura a admins" on public.visits;
revoke all on table public.visits from public, anon, authenticated;
grant select on table public.visits to authenticated;
grant all on table public.visits to service_role;

create policy visits_admin_read
on public.visits for select to authenticated
using ((select private.is_admin_or_superadmin((select auth.uid()))));

drop policy if exists property_images_public_read on storage.objects;
drop policy if exists "Allow authenticated deletes 1lghmvj_1" on storage.objects;
drop policy if exists "Allow authenticated updates 1lghmvj_1" on storage.objects;
drop policy if exists "Allow public read access" on storage.objects;
drop policy if exists "Allow public read access 1lghmvj_0" on storage.objects;
drop policy if exists "Public Access to Property Images" on storage.objects;
drop policy if exists "Public can read property images" on storage.objects;

-- pg_net is non-relocatable after installation, so reinstall it transactionally
-- in the standard extensions schema. Existing net.* API names are preserved.
do $$
begin
  if exists (
    select 1
    from pg_extension as extension
    join pg_namespace as namespace on namespace.oid = extension.extnamespace
    where extension.extname = 'pg_net' and namespace.nspname = 'public'
  ) then
    drop extension pg_net;
    create extension pg_net with schema extensions;
  end if;
end
$$;

notify pgrst, 'reload schema';

insert into supabase_migrations.schema_migrations (version, statements, name)
values (
  '20260721183000',
  array['Applied through the Supabase Management API'],
  'security_advisor_warnings'
)
on conflict (version) do nothing;

commit;
