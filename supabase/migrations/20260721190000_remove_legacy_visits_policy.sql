begin;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'visits'
      and cmd = 'INSERT'
      and with_check = 'true'
  loop
    execute format('drop policy %I on public.visits', policy_record.policyname);
  end loop;
end
$$;

notify pgrst, 'reload schema';

insert into supabase_migrations.schema_migrations (version, statements, name)
values (
  '20260721190000',
  array['Applied through the Supabase Management API'],
  'remove_legacy_visits_policy'
)
on conflict (version) do nothing;

commit;
