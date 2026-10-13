-- Teléfono del perfil desde Expo y recuperación de contraseña por SMS con Clerk.
--
-- Guardar el número ya era posible (authenticated tiene UPDATE (phone) en
-- public.users y users_update_self_or_admin filtra por app_uid()). Lo que
-- faltaba para que ese número sirva y quede bien guardado:
--
-- 1. Clerk solo envía el SMS de recuperación a números verificados en Clerk, y
--    clerk-user-webhook (service_role) copia esa verificación a public.users.
--    users_reset_phone_verification ponía phone_verified = false en cualquier
--    cambio de phone, también en el del webhook: un número verificado nunca
--    llegaba marcado. Ahora solo revoca la verificación en escrituras de clientes.
-- 2. Clerk y la base de datos compartida con la web exigen E.164. Los clientes
--    deben enviar el prefijo: nunca se inventa (222… sin prefijo sería Mauritania).
-- 3. idx_users_phone_unique contaba números sin verificar: cualquiera podía
--    escribir el número de otra persona y bloquearle añadir el suyo.
--
-- normalize_phone y el índice son idénticos a los de la web
-- (CasasEG-V1.5 20261013111502_profile_phone_identity.sql): aplicar las dos
-- migraciones en cualquier orden deja el mismo resultado.

-- ---------------------------------------------------------------------------
-- Normalización E.164 (misma definición que la web)
-- ---------------------------------------------------------------------------

create or replace function private.normalize_phone(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') = '' then null
    else '+' || regexp_replace(p_phone, '\D', '', 'g')
  end;
$$;

revoke all on function private.normalize_phone(text) from public;
grant execute on function private.normalize_phone(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Unicidad solo para números verificados (misma definición que la web)
-- ---------------------------------------------------------------------------

drop index if exists public.idx_users_phone_unique;

create unique index if not exists idx_users_verified_phone_unique
  on public.users (phone)
  where phone_verified = true and phone is not null;

-- ---------------------------------------------------------------------------
-- Escrituras de phone desde el perfil
-- ---------------------------------------------------------------------------

create or replace function private.reset_user_phone_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- service_role (clerk-user-webhook) y los triggers del servidor escriben
  -- números que el proveedor de identidad ya verificó.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  new.phone := nullif(btrim(new.phone), '');
  if new.phone is not null then
    if left(new.phone, 1) <> '+' then
      raise exception 'Incluye el prefijo internacional del teléfono (por ejemplo +240).'
        using errcode = '22023';
    end if;
    new.phone := private.normalize_phone(new.phone);
    if new.phone !~ '^\+[1-9][0-9]{7,14}$' then
      raise exception 'El número de teléfono no es válido' using errcode = '22023';
    end if;
  end if;

  -- Un número nuevo no hereda la verificación del anterior.
  if new.phone is distinct from old.phone then
    new.phone_verified := false;
  end if;
  return new;
end;
$$;

revoke all on function private.reset_user_phone_verification() from public;

drop trigger if exists users_reset_phone_verification on public.users;
create trigger users_reset_phone_verification
before update of phone on public.users
for each row
execute function private.reset_user_phone_verification();
