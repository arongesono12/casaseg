-- public.users.phone ya existe y puede actualizarse por el propio usuario.
-- Un número nuevo no puede heredar la verificación del número anterior.
create or replace function private.reset_user_phone_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone := nullif(btrim(new.phone), '');
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
