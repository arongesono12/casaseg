-- Run through the Management API. All test votes and audit entries roll back.
begin;
create temporary table rating_test_results (test text, passed boolean);
do $$
declare
  target uuid;
  client_id uuid;
  blocked record;
  first_vote uuid;
  second_vote uuid;
  blocked_ok boolean;
  score numeric;
  votes integer;
begin
  select p.id, u.id into target, client_id from public.properties p
    cross join public.users u
    where p.status = 'active' and u.status = 'active' and u.role = 'client'
      and private.user_role_for_rls(u.id) = 'client' and p.owner_id is distinct from u.id
    limit 1;
  if target is null then raise exception 'Need an active property and client for rollback test'; end if;

  perform set_config('request.jwt.claims', '{}', true);
  blocked_ok := false;
  begin perform public.submit_property_rating(target, 5, null);
  exception when insufficient_privilege then blocked_ok := true; end;
  if not blocked_ok then raise exception 'Anonymous vote was allowed'; end if;
  insert into rating_test_results values ('anonymous denied', true);

  perform set_config('request.jwt.claims', jsonb_build_object('external_id',client_id,'role','authenticated')::text, true);
  first_vote := public.submit_property_rating(target, 4, 'Rollback verification');
  second_vote := public.submit_property_rating(target, 2, 'Updated rollback verification');
  if first_vote <> second_vote or (select count(*) from public.reviews where property_id=target and user_id=client_id) <> 1 then
    raise exception 'Repeat voting created duplicates';
  end if;
  select rating, review_count into score, votes from public.properties where id=target;
  if score <> 2 or votes <> 1 then raise exception 'Aggregate mismatch: % / %', score, votes; end if;
  insert into rating_test_results values ('client vote + update + aggregate', true);

  foreach votes in array array[0,6] loop
    blocked_ok := false;
    begin perform public.submit_property_rating(target, votes, null);
    exception when check_violation or invalid_parameter_value then blocked_ok := true; end;
    if not blocked_ok then raise exception 'Invalid rating allowed'; end if;
  end loop;
  insert into rating_test_results values ('invalid scores denied', true);

  for blocked in select id, private.user_role_for_rls(id) as role from public.users
    where private.user_role_for_rls(id) in ('owner','admin','superadmin') loop
    perform set_config('request.jwt.claims', jsonb_build_object('external_id',blocked.id,'role','authenticated')::text, true);
    blocked_ok := false;
    begin perform public.submit_property_rating(target, 5, null);
    exception when insufficient_privilege then blocked_ok := true; end;
    if not blocked_ok then raise exception '% vote allowed',blocked.role; end if;
  end loop;
  insert into rating_test_results values ('existing owners and administrators denied', true);

  -- Even a privileged direct property update cannot forge a rating.
  update public.properties set rating=5, review_count=900 where id=target;
  select rating, review_count into score, votes from public.properties where id=target;
  if score<>2 or votes<>1 then raise exception 'Direct aggregate forgery succeeded'; end if;
  insert into rating_test_results values ('direct aggregate forgery prevented', true);

  if has_table_privilege('authenticated','public.reviews','INSERT')
    or has_table_privilege('authenticated','public.reviews','UPDATE')
    or has_function_privilege('anon','public.submit_property_rating(uuid,integer,text)','EXECUTE') then
    raise exception 'Unexpected write privileges';
  end if;
  insert into rating_test_results values ('RPC-only writes and anonymous privilege restriction', true);
end $$;
select * from rating_test_results;
rollback;
