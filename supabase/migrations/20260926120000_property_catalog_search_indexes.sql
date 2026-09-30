-- Match the filters and sort orders used by the public property catalog.
-- Older projects may not yet have a place to store map coordinates.
alter table public.properties add column if not exists coordinates jsonb;

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create index if not exists properties_active_price_idx
  on public.properties (price, id)
  where status = 'active';

create index if not exists properties_active_rating_idx
  on public.properties (rating desc, id)
  where status = 'active';

create index if not exists properties_active_category_created_idx
  on public.properties (category, created_at desc, id)
  where status = 'active';

do $$
declare
  trgm_schema text;
begin
  select n.nspname into trgm_schema
  from pg_opclass as o
  join pg_namespace as n on n.oid = o.opcnamespace
  where o.opcname = 'gin_trgm_ops'
  limit 1;
  if trgm_schema is null then
    raise exception 'pg_trgm gin_trgm_ops is required';
  end if;
  execute format('create index if not exists properties_active_location_trgm_idx on public.properties using gin (location %I.gin_trgm_ops) where status = ''active''', trgm_schema);
  execute format('create index if not exists properties_active_title_trgm_idx on public.properties using gin (title %I.gin_trgm_ops) where status = ''active''', trgm_schema);
end;
$$;
