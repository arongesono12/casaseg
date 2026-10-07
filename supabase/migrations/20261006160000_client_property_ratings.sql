begin;

-- Abort instead of altering populated legacy tables or racing new votes.
lock table public.reviews, public.property_reviews in access exclusive mode;
do $$ begin
  if exists (select 1 from public.reviews) or exists (select 1 from public.property_reviews) then
    raise exception 'Expected empty review tables; inspect and preserve new reviews before migrating';
  end if;
end $$;

-- The legacy reviews table is empty and still references profiles/propiedades.
-- Keep contractual, verified reviews in property_reviews; visitors use reviews.
alter table public.reviews drop constraint reviews_user_id_fkey;
alter table public.reviews add constraint reviews_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;
alter table public.reviews add constraint reviews_property_id_fkey
  foreign key (property_id) references public.properties(id) on delete cascade;
alter table public.reviews add constraint reviews_property_user_unique unique (property_id, user_id);

drop policy if exists reviews_admin_all on public.reviews;
drop policy if exists reviews_delete_own on public.reviews;
drop policy if exists reviews_insert_authenticated on public.reviews;
drop policy if exists reviews_update_own on public.reviews;
drop policy if exists reviews_select_all on public.reviews;
alter table public.reviews enable row level security;
create policy reviews_read_active on public.reviews for select to anon, authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.status = 'active'));
revoke all on public.reviews from public, anon, authenticated;
grant select on public.reviews to anon, authenticated;

-- Old notification and aggregation triggers use the retired Spanish tables.
drop trigger if exists on_review_created on public.reviews;
drop trigger if exists update_rating_on_review_delete on public.reviews;
drop trigger if exists update_rating_on_review_insert on public.reviews;
drop trigger if exists update_rating_on_review_update on public.reviews;
drop trigger if exists validate_review_before_insert on public.reviews;

create or replace function private.validate_client_property_review()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := public.app_uid();
  reviewer uuid;
  property_owner uuid;
  property_status text;
begin
  reviewer := case when TG_TABLE_NAME = 'reviews' then (to_jsonb(new)->>'user_id')::uuid
    else (to_jsonb(new)->>'reviewer_id')::uuid end;
  if actor is null or actor is distinct from reviewer
    or private.user_role_for_rls(actor) is distinct from 'client'
    or not exists (select 1 from public.users where id = actor and status = 'active') then
    raise exception 'Only active clients can rate properties' using errcode = '42501';
  end if;
  select owner_id, status into property_owner, property_status
    from public.properties where id = new.property_id for update;
  if not found or property_status is distinct from 'active' or property_owner is not distinct from actor then
    raise exception 'You cannot rate this property' using errcode = '42501';
  end if;
  if TG_OP = 'UPDATE' and (new.property_id is distinct from old.property_id
    or reviewer is distinct from (case when TG_TABLE_NAME = 'reviews' then (to_jsonb(old)->>'user_id')::uuid
      else (to_jsonb(old)->>'reviewer_id')::uuid end)) then
    raise exception 'Review identity cannot be changed' using errcode = '42501';
  end if;
  if new.rating is null or new.rating not between 1 and 5 then
    raise exception 'Rating must be between 1 and 5' using errcode = '22023';
  end if;
  if char_length(coalesce(new.comment, '')) > 2000 then
    raise exception 'Comment is too long' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_client_property_review() from public;
create trigger reviews_validate_client before insert or update on public.reviews
  for each row execute function private.validate_client_property_review();
-- Existing verified-review RPC must satisfy the same client/owner restriction.
create trigger property_reviews_validate_client before insert or update of rating, comment, reviewer_id, property_id
  on public.property_reviews for each row execute function private.validate_client_property_review();

create or replace function private.derive_property_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Aggregate one latest vote per person across general and verified reviews.
  select coalesce(round(avg(r.rating)::numeric, 2), 0), count(*)::integer
    into new.rating, new.review_count
  from (
    select distinct on (reviewer) reviewer, rating from (
      select user_id as reviewer, rating, created_at, id from public.reviews where property_id = new.id
      union all
      select reviewer_id, rating, created_at, id from public.property_reviews
        where property_id = new.id and status = 'published'
    ) votes order by reviewer, created_at desc, id desc
  ) r;
  return new;
end;
$$;
revoke all on function private.derive_property_rating() from public;
create trigger properties_derive_rating before insert or update of rating, review_count on public.properties
  for each row execute function private.derive_property_rating();

create or replace function public.refresh_property_review_stats(p_property_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.properties set rating = 0, review_count = 0 where id = p_property_id;
$$;
revoke all on function public.refresh_property_review_stats(uuid) from public, anon, authenticated;

create or replace function private.refresh_property_rating_after_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP <> 'INSERT' then perform public.refresh_property_review_stats(old.property_id); end if;
  if TG_OP <> 'DELETE' then perform public.refresh_property_review_stats(new.property_id); end if;
  return null;
end;
$$;
revoke all on function private.refresh_property_rating_after_review() from public;
create trigger reviews_refresh_rating after insert or update or delete on public.reviews
  for each row execute function private.refresh_property_rating_after_review();
create trigger property_reviews_refresh_rating after insert or update or delete on public.property_reviews
  for each row execute function private.refresh_property_rating_after_review();

create or replace function public.submit_property_rating(p_property_id uuid, p_rating integer, p_comment text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := public.app_uid(); review_id uuid; property_owner uuid; property_status text;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if private.user_role_for_rls(actor) is distinct from 'client'
    or not exists (select 1 from public.users where id = actor and status = 'active') then
    raise exception 'Only active clients can rate properties' using errcode = '42501';
  end if;
  -- Serialize edits for the same property before the aggregate is recalculated.
  select owner_id, status into property_owner, property_status
    from public.properties where id = p_property_id for update;
  if not found or property_status is distinct from 'active' or property_owner is not distinct from actor then
    raise exception 'You cannot rate this property' using errcode = '42501';
  end if;
  insert into public.reviews (property_id, user_id, rating, comment)
    values (p_property_id, actor, p_rating, nullif(btrim(coalesce(p_comment, '')), ''))
    on conflict (property_id, user_id) do update
      set rating = excluded.rating, comment = excluded.comment, created_at = now()
    returning id into review_id;
  return review_id;
end;
$$;
revoke all on function public.submit_property_rating(uuid, integer, text) from public, anon;
grant execute on function public.submit_property_rating(uuid, integer, text) to authenticated;

-- Existing scores are preserved; each property's next vote recalculates its score.
insert into supabase_migrations.schema_migrations(version, statements, name)
values ('20261006160000', array['Applied through Supabase Management API'], 'client_property_ratings')
on conflict (version) do nothing;
notify pgrst, 'reload schema';
commit;
