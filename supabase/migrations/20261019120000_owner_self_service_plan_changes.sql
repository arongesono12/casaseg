-- Allow existing owners to pay for a higher-capacity plan from their dashboard.
-- The existing owner-upgrade checkout/webhooks remain the payment authority;
-- successful webhook reconciliation applies the subscription change atomically.

create or replace function public.validate_owner_upgrade_request()
returns trigger
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_expected_prefix text;
  v_current_max integer;
  v_target_max integer;
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  end if;

  new.full_name := btrim(coalesce(new.full_name, ''));
  new.phone_number := regexp_replace(coalesce(new.phone_number, ''), '\D', '', 'g');
  new.residence_location := btrim(coalesce(new.residence_location, ''));
  new.nationality := btrim(coalesce(new.nationality, ''));
  new.document_number := nullif(btrim(coalesce(new.document_number, '')), '');
  new.property_title_document_url := btrim(coalesce(new.property_title_document_url, ''));
  new.identity_document_front_path := nullif(btrim(coalesce(new.identity_document_front_path, '')), '');
  new.identity_document_back_path := nullif(btrim(coalesce(new.identity_document_back_path, '')), '');

  if new.payment_metadata ->> 'requestType' = 'plan_change' then
    if not exists (
      select 1 from public.users where id = new.user_id and role = 'owner'
    ) then
      raise exception 'Solo un propietario puede cambiar su plan';
    end if;
    if new.payment_method not in ('stripe', 'paypal') then
      raise exception 'Este método de pago no está habilitado para cambios de plan';
    end if;

    select plan.max_properties
    into v_current_max
    from public.owner_subscriptions subscription
    join public.owner_plans plan on plan.id = subscription.plan_id
    where subscription.user_id = new.user_id
      and subscription.status = 'active'
      and subscription.end_date > now()
    order by subscription.created_at desc
    limit 1;

    select max_properties into v_target_max
    from public.owner_plans
    where type = new.plan_type and is_active = true;

    if v_current_max is null or v_target_max is null or v_target_max <= v_current_max then
      raise exception 'Selecciona un plan activo con más capacidad que tu plan actual';
    end if;
    if not exists (
      select 1 from public.user_terms_acceptance
      where user_id = new.user_id
        and terms_version = 'v1.0'
        and terms_accepted = true
        and privacy_accepted = true
        and subscription_terms_accepted = true
    ) then
      raise exception 'Debes aceptar las condiciones antes de cambiar de plan';
    end if;
    if tg_op = 'INSERT' and exists (
      select 1 from public.owner_upgrade_requests
      where user_id = new.user_id
        and status = 'pending'
        and payment_metadata ->> 'requestType' = 'plan_change'
    ) then
      raise exception 'Ya tienes un cambio de plan pendiente';
    end if;

    new.full_name := coalesce(nullif(new.full_name, ''), 'Propietario');
    return new;
  end if;

  if char_length(new.full_name) not between 3 and 120 then
    raise exception 'El nombre completo no es valido';
  end if;
  if char_length(new.residence_location) not between 3 and 160 then
    raise exception 'El lugar de residencia no es valido';
  end if;
  if char_length(new.nationality) not between 2 and 80 then
    raise exception 'La nacionalidad no es valida';
  end if;
  if char_length(new.phone_number) not between 8 and 15 then
    raise exception 'El numero de telefono no es valido';
  end if;
  if new.document_number is not null and (
    char_length(new.document_number) not between 3 and 80
    or new.document_number !~ '^[A-Za-z0-9._/-]+$'
  ) then
    raise exception 'El numero de documento no es valido';
  end if;
  if new.document_type not in ('dni', 'passport') then
    raise exception 'El tipo de documento no es valido';
  end if;
  if new.identity_document_front_path is null and new.document_number is null then
    raise exception 'Adjunta la imagen de tu documento de identidad';
  end if;
  if new.identity_document_front_path is not null then
    perform private.assert_owner_identity_document(new.user_id, new.identity_document_front_path);
    if new.document_type = 'dni' and new.identity_document_back_path is null then
      raise exception 'Adjunta la cara trasera del DIP';
    end if;
  end if;
  if new.identity_document_back_path is not null then
    if new.document_type <> 'dni' then
      raise exception 'Para el pasaporte solo se adjunta la pagina de datos';
    end if;
    perform private.assert_owner_identity_document(new.user_id, new.identity_document_back_path);
  end if;
  if not exists (select 1 from public.users where id = new.user_id and role = 'client') then
    raise exception 'Solo un cliente puede solicitar convertirse en propietario';
  end if;
  if not exists (select 1 from public.owner_plans where type = new.plan_type and is_active = true) then
    raise exception 'El plan seleccionado no es valido';
  end if;
  if new.payment_method not in ('stripe', 'paypal', 'muni_dinero', 'bank_transfer', 'ecobank') then
    raise exception 'El metodo de pago no es valido';
  end if;
  if not exists (
    select 1 from public.user_terms_acceptance
    where user_id = new.user_id and terms_version = 'v1.0'
      and terms_accepted = true and privacy_accepted = true and subscription_terms_accepted = true
  ) then
    raise exception 'Debe aceptar los terminos antes de enviar la solicitud';
  end if;
  if tg_op = 'INSERT' and exists (
    select 1 from public.owner_upgrade_requests
    where user_id = new.user_id and status in ('pending', 'approved_pending_verification')
  ) then
    raise exception 'Ya existe una solicitud de propietario pendiente';
  end if;

  v_expected_prefix := new.user_id::text || '/property-titles/';
  if new.property_title_document_url not like v_expected_prefix || '%'
     or lower(storage.extension(new.property_title_document_url)) <> 'pdf'
     or new.property_title_document_url like '%..%' then
    raise exception 'La ruta del titulo de propiedad no es valida';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'documents' and name = new.property_title_document_url
      and lower(storage.extension(name)) = 'pdf'
  ) then
    raise exception 'El titulo de propiedad no existe en Storage';
  end if;
  return new;
end;
$$;

create or replace function private.apply_paid_owner_plan_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan public.owner_plans%rowtype;
  v_subscription_id uuid;
begin
  if new.payment_metadata ->> 'requestType' is distinct from 'plan_change'
     or old.payment_status is not distinct from new.payment_status then
    return new;
  end if;

  if new.payment_status = 'failed' then
    new.status := 'cancelled';
    new.updated_at := now();
    return new;
  end if;
  if new.payment_status <> 'completed' then
    return new;
  end if;

  select * into v_plan
  from public.owner_plans
  where type = new.plan_type and is_active = true;
  if v_plan.id is null then
    raise exception 'El plan pagado ya no está disponible';
  end if;

  select id into v_subscription_id
  from public.owner_subscriptions
  where user_id = new.user_id and status = 'active' and end_date > now()
  order by created_at desc
  limit 1
  for update;
  if v_subscription_id is null then
    raise exception 'No se encontró una suscripción activa para aplicar el cambio';
  end if;

  update public.owner_subscriptions
  set plan_id = v_plan.id,
      plan_type = v_plan.type,
      amount = case when new.is_yearly then v_plan.price_yearly else v_plan.price_monthly end,
      currency = v_plan.currency,
      payment_method = new.payment_method,
      payment_status = 'completed',
      payment_reference = new.payment_reference,
      start_date = now(),
      end_date = case when new.is_yearly then now() + interval '1 year' else now() + interval '1 month' end,
      is_yearly = new.is_yearly,
      updated_at = now()
  where id = v_subscription_id;

  new.status := 'approved';
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.apply_paid_owner_plan_change() from public, anon, authenticated;
drop trigger if exists apply_paid_owner_plan_change on public.owner_upgrade_requests;
create trigger apply_paid_owner_plan_change
  before update of payment_status on public.owner_upgrade_requests
  for each row execute function private.apply_paid_owner_plan_change();
