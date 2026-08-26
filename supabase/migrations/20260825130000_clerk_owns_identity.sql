-- public.users pasa a ser la tabla canónica de identidad.
--
-- Con Clerk como proveedor, las cuentas nuevas no generan fila en auth.users:
-- ese esquema queda congelado con los usuarios migrados. Cualquier clave
-- foránea que siga apuntando a auth.users(id) rechazaría al primer usuario que
-- se registre desde AuthView, incluido el propio insert del webhook
-- clerk-user-webhook.
--
-- Repuntamos esas claves a public.users(id). Los uuid no cambian, así que
-- ninguna fila se mueve: solo cambia a qué tabla apunta la restricción.

do $$
declare
  fk record;
  accion text;
  total int := 0;
begin
  for fk in
    select
      con.conname,
      con.conrelid::regclass::text as tabla,
      att.attname as columna,
      con.confdeltype
    from pg_constraint con
    cross join lateral unnest(con.conkey) with ordinality as clave(attnum, ord)
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = clave.attnum
    join pg_class ref on ref.oid = con.confrelid
    join pg_namespace refns on refns.oid = ref.relnamespace
    where con.contype = 'f'
      and refns.nspname = 'auth'
      and ref.relname = 'users'
      -- Solo claves de una columna: una compuesta hacia auth.users no existe
      -- en este esquema y merecería revisión manual.
      and array_length(con.conkey, 1) = 1
  loop
    accion := case fk.confdeltype
      when 'c' then 'on delete cascade'
      when 'n' then 'on delete set null'
      when 'd' then 'on delete set default'
      when 'r' then 'on delete restrict'
      else 'on delete no action'
    end;

    execute format('alter table %s drop constraint %I', fk.tabla, fk.conname);

    if fk.tabla = 'public.users' then
      -- public.users.id era un espejo de auth.users.id. Ahora es la raíz: no
      -- puede referenciarse a sí misma.
      raise notice 'public.users.% deja de depender de auth.users', fk.columna;
    else
      -- NOT VALID evita el escaneo completo al aplicar. La validación se
      -- intenta justo después, por separado, para poder informar sin abortar.
      execute format(
        'alter table %s add constraint %I foreign key (%I) references public.users(id) %s not valid',
        fk.tabla, fk.conname, fk.columna, accion
      );
    end if;

    total := total + 1;
  end loop;

  raise notice 'Claves foráneas repuntadas desde auth.users: %', total;
end;
$$;

-- Validación separada: si alguna tabla tiene filas huérfanas (un user_id sin
-- perfil en public.users), queremos saber cuál es en vez de perder la migración.

do $$
declare
  con record;
  pendientes int := 0;
begin
  for con in
    select c.conname, c.conrelid::regclass::text as tabla
    from pg_constraint c
    where c.contype = 'f'
      and not c.convalidated
      and c.confrelid = 'public.users'::regclass
  loop
    begin
      execute format('alter table %s validate constraint %I', con.tabla, con.conname);
    exception when others then
      raise warning 'No se pudo validar %.%: % — hay filas sin perfil en public.users.',
        con.tabla, con.conname, sqlerrm;
      pendientes := pendientes + 1;
    end;
  end loop;

  if pendientes = 0 then
    raise notice 'Todas las claves foráneas validadas contra public.users.';
  end if;
end;
$$;

-- El webhook escribe el id explícitamente, pero un default sensato evita que
-- un insert manual desde el panel deje la fila sin identidad.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'id'
  ) then
    execute 'alter table public.users alter column id set default gen_random_uuid()';
  end if;
end;
$$;
