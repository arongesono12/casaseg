-- Repair the canonical CasaSeg superadmin identity. The Auth user existed
-- without a public profile or protected role, so the client could only treat
-- the session as an unassigned account.
do $$
declare
  target_user auth.users%rowtype;
  existing_profile public.users%rowtype;
  target_name text;
  foreign_key record;
begin
  select *
  into target_user
  from auth.users
  where lower(email) = 'arongesono@outlook.es'
  limit 1;

  if not found then
    raise exception 'Superadmin identity arongesono@outlook.es was not found';
  end if;

  target_name := coalesce(
    nullif(trim(target_user.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(target_user.raw_user_meta_data ->> 'full_name'), ''),
    split_part(target_user.email, '@', 1)
  );

  select *
  into existing_profile
  from public.users
  where lower(email) = lower(target_user.email)
  limit 1;

  if found and existing_profile.id <> target_user.id then
    -- Preserve every profile field while freeing the unique email for the
    -- canonical Auth UUID. Both parent rows coexist while references move.
    update public.users
    set email = null
    where id = existing_profile.id;

    insert into public.users
    select (
      jsonb_populate_record(
        null::public.users,
        to_jsonb(existing_profile) || jsonb_build_object(
          'id', target_user.id,
          'name', coalesce(nullif(existing_profile.name, ''), target_name),
          'email', target_user.email,
          'role', 'superadmin',
          'email_verified', target_user.email_confirmed_at is not null,
          'status', 'active',
          'updated_at', now()
        )
      )
    ).*;

    -- A role trigger may provision administrators immediately for the new
    -- profile. Prefer the existing administrative record and its history.
    if exists (
      select 1 from public.administrators where user_id = existing_profile.id
    ) then
      delete from public.administrators where user_id = target_user.id;
    end if;

    -- Move every single-column foreign key that targets public.users. This
    -- keeps administrative history attached to the canonical identity.
    for foreign_key in
      select con.conrelid::regclass as relation_name, att.attname as column_name
      from pg_constraint con
      cross join lateral unnest(con.conkey) with ordinality as key(attnum, ord)
      join pg_attribute att
        on att.attrelid = con.conrelid
       and att.attnum = key.attnum
      where con.contype = 'f'
        and con.confrelid = 'public.users'::regclass
        and array_length(con.conkey, 1) = 1
    loop
      execute format(
        'update %s set %I = $1 where %I = $2',
        foreign_key.relation_name,
        foreign_key.column_name,
        foreign_key.column_name
      ) using target_user.id, existing_profile.id;
    end loop;

    delete from public.users where id = existing_profile.id;
  elsif found then
    update public.users
    set name = coalesce(nullif(name, ''), target_name),
        email = target_user.email,
        role = 'superadmin',
        email_verified = target_user.email_confirmed_at is not null,
        status = 'active',
        updated_at = now()
    where id = target_user.id;
  else
    insert into public.users (id, name, email, role, email_verified, status, updated_at)
    values (
      target_user.id,
      target_name,
      target_user.email,
      'superadmin',
      target_user.email_confirmed_at is not null,
      'active',
      now()
    );
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'superadmin'),
      updated_at = now()
  where id = target_user.id;
end
$$;
