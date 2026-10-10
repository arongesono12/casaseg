-- A profile card is public only when the owner opted in and is an active
-- listing owner, or when the signed-in viewer shares a chat with that user.
-- Keep public.users RLS strict; expose only display fields through this RPC.
create or replace function public.get_visible_user_profile(p_user_id uuid)
returns table (
  id uuid,
  name text,
  avatar text,
  cover_picture text,
  about text,
  social_links jsonb,
  role text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  with viewer as (select public.app_uid() as id)
  select
    profile.id,
    coalesce(nullif(trim(profile.name), ''), 'Usuario de CasaSeg'),
    nullif(trim(profile.avatar), ''),
    nullif(trim(profile.cover_picture), ''),
    nullif(trim(profile.about), ''),
    coalesce(profile.social_links, '{}'::jsonb),
    profile.role::text,
    profile.created_at::timestamptz
  from public.users as profile
  cross join viewer
  where profile.id = p_user_id
    and profile.status = 'active'
    and (
      profile.id = viewer.id
      or coalesce((
        select settings.profile_visibility
        from public.user_settings as settings
        where settings.user_id = profile.id
      ), 'public') = 'public'
    )
    and (
      profile.id = viewer.id
      or exists (
        select 1 from public.properties as listing
        where listing.owner_id = profile.id and listing.status = 'active'
      )
      or (
        viewer.id is not null
        and exists (
          select 1 from public.chats as chat
          where (chat.client_id = viewer.id and chat.owner_id = profile.id)
             or (chat.owner_id = viewer.id and chat.client_id = profile.id)
        )
      )
    );
$$;

revoke all on function public.get_visible_user_profile(uuid) from public, anon, authenticated;
grant execute on function public.get_visible_user_profile(uuid) to anon, authenticated;

comment on function public.get_visible_user_profile(uuid) is
  'Public display fields and user supplied social links. Honors profile_visibility and permits active listing owners or chat peers; never returns private email or phone.';

notify pgrst, 'reload schema';
