begin;

alter table public.properties
  add column if not exists owner_name text,
  add column if not exists owner_avatar text;

update public.properties as property
set
  owner_name = coalesce(nullif(profile.name, ''), 'Propietario verificado'),
  owner_avatar = nullif(profile.avatar, '')
from public.users as profile
where profile.id = property.owner_id
  and (
    property.owner_name is distinct from coalesce(nullif(profile.name, ''), 'Propietario verificado')
    or property.owner_avatar is distinct from nullif(profile.avatar, '')
  );

create or replace function private.set_property_owner_public_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  profile_avatar text;
begin
  select profile.name, profile.avatar
  into profile_name, profile_avatar
  from public.users as profile
  where profile.id = new.owner_id;

  new.owner_name := coalesce(nullif(profile_name, ''), nullif(new.owner_name, ''), 'Propietario verificado');
  new.owner_avatar := nullif(profile_avatar, '');
  return new;
end
$$;

create or replace function private.sync_owner_public_profile_to_properties()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.properties
  set
    owner_name = coalesce(nullif(new.name, ''), 'Propietario verificado'),
    owner_avatar = nullif(new.avatar, '')
  where owner_id = new.id
    and (
      owner_name is distinct from coalesce(nullif(new.name, ''), 'Propietario verificado')
      or owner_avatar is distinct from nullif(new.avatar, '')
    );
  return new;
end
$$;

revoke all on function private.set_property_owner_public_profile() from public, anon, authenticated;
revoke all on function private.sync_owner_public_profile_to_properties() from public, anon, authenticated;
grant execute on function private.set_property_owner_public_profile() to service_role;
grant execute on function private.sync_owner_public_profile_to_properties() to service_role;

drop trigger if exists properties_set_owner_public_profile on public.properties;
create trigger properties_set_owner_public_profile
before insert or update of owner_id on public.properties
for each row execute function private.set_property_owner_public_profile();

drop trigger if exists users_sync_owner_public_profile on public.users;
create trigger users_sync_owner_public_profile
after update of name, avatar on public.users
for each row
when (old.name is distinct from new.name or old.avatar is distinct from new.avatar)
execute function private.sync_owner_public_profile_to_properties();

comment on column public.properties.owner_name is
  'Public owner display name copied from users; contains no contact details.';
comment on column public.properties.owner_avatar is
  'Public owner avatar URL copied from users for property cards and details.';

notify pgrst, 'reload schema';

insert into supabase_migrations.schema_migrations (version, statements, name)
values (
  '20260721213000',
  array['Applied through the Supabase Management API'],
  'property_owner_public_profile'
)
on conflict (version) do nothing;

commit;
