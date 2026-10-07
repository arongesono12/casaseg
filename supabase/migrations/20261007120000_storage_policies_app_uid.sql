-- Storage con identidad de Clerk.
--
-- 20260825120000 reescribió a public.app_uid() las políticas del esquema
-- public, pero no las de storage.objects. Con un token de Clerk el `sub` es
-- "user_xxx" y auth.uid() falla al convertirlo a uuid, así que cualquier subida
-- o borrado desde la app móvil (property-images, bank-transfer-receipts,
-- documents, propiedades-images) se rechaza. app_uid() devuelve el uuid de
-- public.users y cae a `sub` para las sesiones de Supabase Auth de la web, así
-- que la web conserva exactamente el mismo comportamiento.

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
    where schemaname = 'storage'
      and (qual like '%auth.uid()%' or with_check like '%auth.uid()%')
  loop
    nuevo_qual := replace(politica.qual, 'auth.uid()', 'public.app_uid()');
    nuevo_check := replace(politica.with_check, 'auth.uid()', 'public.app_uid()');

    if politica.qual is not null and politica.with_check is not null then
      execute format('alter policy %I on %I.%I using (%s) with check (%s)',
        politica.policyname, politica.schemaname, politica.tablename, nuevo_qual, nuevo_check);
    elsif politica.qual is not null then
      execute format('alter policy %I on %I.%I using (%s)',
        politica.policyname, politica.schemaname, politica.tablename, nuevo_qual);
    else
      execute format('alter policy %I on %I.%I with check (%s)',
        politica.policyname, politica.schemaname, politica.tablename, nuevo_check);
    end if;

    total := total + 1;
  end loop;

  raise notice 'Políticas de storage reescritas a public.app_uid(): %', total;
end;
$$;

-- storage.objects.owner_id guarda el `sub` del token que subió el archivo: un
-- uuid para la web, "user_xxx" para Clerk. Compararlo con app_uid() dejaría a
-- los usuarios móviles sin poder sustituir ni borrar sus propias fotos, así que
-- property-images pasa a comprobar la carpeta, que siempre es el uuid del
-- propietario (create-property exige rutas que empiecen por `${user.id}/`).

drop policy if exists property_images_owner_update on storage.objects;
drop policy if exists property_images_owner_delete on storage.objects;

create policy property_images_owner_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'property-images'
  and (storage.foldername(name))[1] = (select public.app_uid())::text
  and (select private.has_property_owner_role())
)
with check (
  bucket_id = 'property-images'
  and (storage.foldername(name))[1] = (select public.app_uid())::text
  and (select private.has_property_owner_role())
);

create policy property_images_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'property-images'
  and (storage.foldername(name))[1] = (select public.app_uid())::text
  and (select private.has_property_owner_role())
);

-- Políticas que quedan comparando owner/owner_id: revisarlas a mano después de
-- aplicar, porque no reconocerán los archivos subidos con Clerk.
do $$
declare
  politica record;
begin
  for politica in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and (coalesce(qual, '') ~ '\mowner(_id)?\M' or coalesce(with_check, '') ~ '\mowner(_id)?\M')
  loop
    raise warning 'storage.objects: la política % compara owner/owner_id; los archivos de Clerk guardan el sub "user_…".', politica.policyname;
  end loop;
end;
$$;
