create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android')),
  device_name text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_tokens_user_token_key unique (user_id, expo_push_token)
);

create index if not exists device_tokens_active_user_idx
  on public.device_tokens (user_id)
  where revoked_at is null;

alter table public.device_tokens enable row level security;
alter table public.device_tokens force row level security;

drop policy if exists device_tokens_select_own on public.device_tokens;
drop policy if exists device_tokens_insert_own on public.device_tokens;
drop policy if exists device_tokens_update_own on public.device_tokens;
drop policy if exists device_tokens_delete_own on public.device_tokens;

create policy device_tokens_select_own
  on public.device_tokens
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy device_tokens_insert_own
  on public.device_tokens
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy device_tokens_update_own
  on public.device_tokens
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy device_tokens_delete_own
  on public.device_tokens
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.device_tokens from anon;
grant select, insert, update, delete on table public.device_tokens to authenticated;

notify pgrst, 'reload schema';
