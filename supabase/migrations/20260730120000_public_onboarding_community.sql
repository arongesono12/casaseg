begin;

create or replace function public.get_onboarding_community()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  with public_owner_profiles as (
    select distinct on (property.owner_id)
      property.owner_id as id,
      coalesce(nullif(property.owner_name, ''), 'Propietario verificado') as name,
      nullif(property.owner_avatar, '') as avatar
    from public.properties as property
    where property.status = 'active'
      and property.owner_id is not null
    order by property.owner_id, property.updated_at desc nulls last, property.created_at desc nulls last
  ),
  member_preview as (
    select profile.id, profile.name, profile.avatar
    from public_owner_profiles as profile
    order by profile.name
    limit 4
  )
  select jsonb_build_object(
    'member_count', (
      select count(*)
      from public.users as profile
      where profile.status = 'active'
        and coalesce(profile.email_verified, false)
    ),
    'owner_count', (
      select count(*)
      from public_owner_profiles
    ),
    'property_count', (
      select count(*)
      from public.properties as property
      where property.status = 'active'
    ),
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', preview.id,
          'name', preview.name,
          'avatar', preview.avatar
        )
        order by preview.name
      )
      from member_preview as preview
    ), '[]'::jsonb)
  );
$function$;

revoke all on function public.get_onboarding_community() from public;
grant execute on function public.get_onboarding_community() to anon, authenticated, service_role;

comment on function public.get_onboarding_community() is
  'Returns aggregate community counts and public owner profiles already exposed by active property listings. No contact or authentication data is returned.';

notify pgrst, 'reload schema';

insert into supabase_migrations.schema_migrations (version, statements, name)
values (
  '20260730120000',
  array['Applied through the Supabase Management API'],
  'public_onboarding_community'
)
on conflict (version) do nothing;

commit;
