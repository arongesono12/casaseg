-- Permite retirar del buzón solo las notificaciones del usuario autenticado.
-- app_uid() resuelve el UUID del perfil desde el token de Clerk.
do $$
begin
  if to_regclass('public.notifications') is not null then
    drop policy if exists notifications_delete_own on public.notifications;
    create policy notifications_delete_own on public.notifications
      for delete to authenticated
      using (user_id = (select public.app_uid()));
    grant delete on public.notifications to authenticated;
  end if;
end $$;
