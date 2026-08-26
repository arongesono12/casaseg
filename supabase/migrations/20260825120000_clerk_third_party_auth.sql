-- Third-Party Auth con Clerk.
--
-- Clerk pasa a emitir el token y Supabase lo valida contra el JWKS de la
-- instancia. El problema: el claim `sub` deja de ser el uuid de Supabase y pasa
-- a ser el id de Clerk (user_xxxx), que no es un uuid. auth.uid() no solo deja
-- de resolver: revienta al intentar el cast.
--
-- La migración de usuarios guardó el uuid original de Supabase en el campo
-- `external_id` de cada usuario de Clerk. Publicándolo como claim del token de
-- sesión, la identidad que ve Postgres sigue siendo exactamente el mismo uuid,
-- así que ni las filas ni las claves foráneas a auth.users necesitan cambiar.
--
-- REQUISITO PREVIO en el panel de Clerk (Sessions > Customize session token):
--   { "external_id": "{{user.external_id}}", "role": "authenticated" }
-- Sin el claim `role` Supabase trata la petición como anónima y ninguna
-- política `to authenticated` llega a evaluarse.

-- 1. Identidad de la aplicación -------------------------------------------

create or replace function public.app_uid()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
  candidato text;
begin
  -- Preferimos external_id: es el uuid original de Supabase.
  candidato := nullif(claims ->> 'external_id', '');

  -- Compatibilidad hacia atrás: una sesión de Supabase todavía viva trae el
  -- uuid directamente en `sub`.
  if candidato is null then
    candidato := nullif(claims ->> 'sub', '');
  end if;

  -- Un `sub` de Clerk no es un uuid. Devolvemos null en vez de dejar que el
  -- cast falle y tumbe toda la consulta.
  if candidato is null
     or candidato !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  then
    return null;
  end if;

  return candidato::uuid;
end;
$$;

comment on function public.app_uid() is
  'Identidad del usuario actual como uuid de Supabase. Lee external_id del token de Clerk y cae a sub para sesiones heredadas de GoTrue. Sustituye a auth.uid() en todas las políticas RLS.';

revoke all on function public.app_uid() from public;
grant execute on function public.app_uid() to authenticated, anon, service_role;

-- 2. Reescritura de las políticas existentes -------------------------------
--
-- Se hace sobre pg_policies en vez de reescribir cada política a mano: así
-- recoge el estado real de la base de datos, incluidas las políticas que
-- migraciones posteriores hayan redefinido.

do $$
declare
  politica record;
  nuevo_qual text;
  nuevo_check text;
  total int := 0;
begin
  for politica in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (qual like '%auth.uid()%' or with_check like '%auth.uid()%')
  loop
    nuevo_qual := replace(politica.qual, 'auth.uid()', 'public.app_uid()');
    nuevo_check := replace(politica.with_check, 'auth.uid()', 'public.app_uid()');

    -- Las políticas de SELECT y DELETE no admiten WITH CHECK, y las de INSERT
    -- no admiten USING: hay que emitir exactamente las cláusulas que existían.
    if politica.qual is not null and politica.with_check is not null then
      execute format(
        'alter policy %I on %I.%I using (%s) with check (%s)',
        politica.policyname, politica.schemaname, politica.tablename, nuevo_qual, nuevo_check
      );
    elsif politica.qual is not null then
      execute format(
        'alter policy %I on %I.%I using (%s)',
        politica.policyname, politica.schemaname, politica.tablename, nuevo_qual
      );
    elsif politica.with_check is not null then
      execute format(
        'alter policy %I on %I.%I with check (%s)',
        politica.policyname, politica.schemaname, politica.tablename, nuevo_check
      );
    end if;

    total := total + 1;
  end loop;

  raise notice 'Políticas reescritas a public.app_uid(): %', total;
end;
$$;

-- 3. Valores por defecto de columna ----------------------------------------

do $$
declare
  columna record;
  total int := 0;
begin
  for columna in
    select table_schema, table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and column_default like '%auth.uid()%'
  loop
    execute format(
      'alter table %I.%I alter column %I set default public.app_uid()',
      columna.table_schema, columna.table_name, columna.column_name
    );
    total := total + 1;
  end loop;

  raise notice 'Valores por defecto reescritos a public.app_uid(): %', total;
end;
$$;

-- 4. Aviso sobre lo que no se puede reescribir automáticamente -------------
--
-- Los cuerpos de función (por ejemplo el envoltorio de mark_conversation_read)
-- se revisan a mano: reescribirlos a ciegas podría alterar su semántica.

do $$
declare
  funcion record;
  restantes int := 0;
begin
  for funcion in
    select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname <> 'app_uid'
      -- pg_get_functiondef solo acepta funciones normales: los agregados y las
      -- funciones de ventana harían fallar la consulta.
      and p.prokind = 'f'
      and pg_get_functiondef(p.oid) like '%auth.uid()%'
  loop
    raise warning 'public.%(%) sigue usando auth.uid(): revísala manualmente.', funcion.proname, funcion.argumentos;
    restantes := restantes + 1;
  end loop;

  if restantes = 0 then
    raise notice 'Ninguna función de public usa ya auth.uid().';
  end if;
end;
$$;
