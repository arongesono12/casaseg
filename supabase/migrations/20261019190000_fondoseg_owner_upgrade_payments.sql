-- Habilita FondosEG para el alta de propietario y cambios de plan.
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
    if new.payment_method not in ('stripe', 'paypal', 'fondoseg') then
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
  if new.payment_method not in ('stripe', 'paypal', 'fondoseg', 'muni_dinero', 'bank_transfer', 'ecobank') then
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

CREATE INDEX IF NOT EXISTS idx_owner_upgrade_fondoseg_payment_status ON public.owner_upgrade_requests (payment_status, created_at DESC) WHERE payment_method = 'fondoseg';
CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_upgrade_fondoseg_provider_reference ON public.owner_upgrade_requests (payment_provider_reference) WHERE payment_method = 'fondoseg' AND payment_provider_reference IS NOT NULL;

-- Una solicitud nueva de propietario pagada con FondosEG no puede aprobarse
-- antes de que el webhook o la confirmación server-side haya conciliado el cobro.
CREATE OR REPLACE FUNCTION private.guard_fondoseg_owner_upgrade_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'pending'
     AND NEW.status = 'approved_pending_verification'
     AND NEW.payment_method = 'fondoseg'
     AND (
       NEW.payment_status IS DISTINCT FROM 'completed'
       OR NEW.payment_completed_at IS NULL
       OR COALESCE(NEW.payment_provider_reference, '') = ''
       OR NEW.payment_metadata ->> 'fondosegStatus' IS DISTINCT FROM 'paid'
     ) THEN
    RAISE EXCEPTION 'El pago con FondosEG debe confirmarse antes de aprobar la solicitud';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_fondoseg_owner_upgrade_approval() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_fondoseg_owner_upgrade_approval ON public.owner_upgrade_requests;
CREATE TRIGGER guard_fondoseg_owner_upgrade_approval
  BEFORE UPDATE OF status ON public.owner_upgrade_requests
  FOR EACH ROW EXECUTE FUNCTION private.guard_fondoseg_owner_upgrade_approval();
