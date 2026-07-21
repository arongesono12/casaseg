begin;

do $$
begin
  if to_regclass('public.properties') is null then
    raise exception 'public.properties must exist before applying the owner properties migration';
  end if;

  if to_regclass('public.users') is null then
    raise exception 'public.users must exist before applying the owner properties migration';
  end if;

  if to_regprocedure('public.user_role_for_rls(uuid)') is null then
    raise exception 'public.user_role_for_rls(uuid) must exist before applying the owner properties migration';
  end if;
end
$$;

alter table public.properties
  add column if not exists updated_at timestamptz;

update public.properties
set updated_at = coalesce(created_at, now())
where updated_at is null;

alter table public.properties
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

create or replace function public.has_property_owner_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.user_role_for_rls((select auth.uid())) in ('owner', 'admin', 'superadmin'),
    false
  );
$$;

revoke all on function public.has_property_owner_role() from public;
grant execute on function public.has_property_owner_role() to authenticated;

alter table public.properties enable row level security;
alter table public.properties force row level security;

-- Replace only public/owner policies. Delegated-admin and superadmin policies
-- already present in CasasEG remain intact.
drop policy if exists "Properties active rows are publicly readable" on public.properties;
drop policy if exists "Owners can select own properties" on public.properties;
drop policy if exists "Owners can insert own properties" on public.properties;
drop policy if exists "Owners can update own properties" on public.properties;
drop policy if exists "Owners can delete own properties" on public.properties;
drop policy if exists properties_read_active on public.properties;
drop policy if exists properties_owner_read_own on public.properties;
drop policy if exists properties_owner_insert_own on public.properties;
drop policy if exists properties_owner_update_own on public.properties;
drop policy if exists properties_owner_delete_own on public.properties;

create policy properties_read_active
on public.properties
for select
to anon, authenticated
using (status = 'active');

create policy properties_owner_read_own
on public.properties
for select
to authenticated
using (
  owner_id = (select auth.uid())
  and (select public.has_property_owner_role())
);

create policy properties_owner_insert_own
on public.properties
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and status in ('draft', 'pending')
  and (select public.has_property_owner_role())
);

create policy properties_owner_update_own
on public.properties
for update
to authenticated
using (
  owner_id = (select auth.uid())
  and (select public.has_property_owner_role())
)
with check (
  owner_id = (select auth.uid())
  and (select public.has_property_owner_role())
);

create policy properties_owner_delete_own
on public.properties
for delete
to authenticated
using (
  owner_id = (select auth.uid())
  and (select public.has_property_owner_role())
);

revoke all on table public.properties from public, anon, authenticated;
grant select on table public.properties to anon;
grant select, insert, update, delete on table public.properties to authenticated;

create index if not exists properties_owner_updated_idx
  on public.properties (owner_id, updated_at desc);

create index if not exists properties_active_created_idx
  on public.properties (created_at desc)
  where status = 'active';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-images',
  'property-images',
  true,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists property_images_public_read on storage.objects;
drop policy if exists property_images_owner_insert on storage.objects;
drop policy if exists property_images_owner_update on storage.objects;
drop policy if exists property_images_owner_delete on storage.objects;

create policy property_images_public_read
on storage.objects
for select
to public
using (bucket_id = 'property-images');

create policy property_images_owner_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'property-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.has_property_owner_role())
);

create policy property_images_owner_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'property-images'
  and owner_id = (select auth.uid()::text)
  and (select public.has_property_owner_role())
)
with check (
  bucket_id = 'property-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.has_property_owner_role())
);

create policy property_images_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'property-images'
  and owner_id = (select auth.uid()::text)
  and (select public.has_property_owner_role())
);

notify pgrst, 'reload schema';

insert into supabase_migrations.schema_migrations (version, statements, name)
values (
  '20260721143000',
  array['Applied through the Supabase Management API'],
  'owner_properties_backend'
)
on conflict (version) do nothing;

commit;
