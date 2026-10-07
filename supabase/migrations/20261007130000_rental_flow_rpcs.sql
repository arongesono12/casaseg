-- Flujo de alquiler validado en servidor, compartido por la web y la app Expo.
--
-- Hasta ahora cada app escribía directamente en agreements y la web generaba
-- el contrato en el navegador. Las políticas de agreements dejan a cualquiera
-- de las partes cambiar cualquier columna (un cliente podía marcar un acuerdo
-- como fully_confirmed él solo o cambiar el precio), y la política de inserción
-- de lease_contracts compara columnas consigo mismas, así que no ata el
-- contrato a las partes del acuerdo. Expo, además, no puede generar contratos:
-- la RLS de users no deja al propietario leer nombre y email del cliente.
--
-- Estas funciones concentran las reglas. Las políticas antiguas se retiran en
-- 20261007140000, que debe aplicarse cuando ambas apps usen estas funciones.

-- 1. Acuerdos de reunión ----------------------------------------------------

create or replace function public.propose_meeting_agreement(
  p_property_id uuid,
  p_meeting_date date,
  p_meeting_time time,
  p_notes text default null,
  p_client_id uuid default null,
  p_agreed_price numeric default null
)
returns public.agreements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.app_uid();
  v_property public.properties;
  v_client uuid;
  v_proposer text;
  v_price numeric;
  v_existing public.agreements;
  v_row public.agreements;
  v_now timestamptz := now();
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_property from public.properties where id = p_property_id;
  if not found then
    raise exception 'Property not found' using errcode = 'P0002';
  end if;

  if v_actor = v_property.owner_id then
    if p_client_id is null or p_client_id = v_actor then
      raise exception 'A client is required for an owner proposal' using errcode = '22023';
    end if;
    v_client := p_client_id;
    v_proposer := 'owner';
  else
    if v_property.status is distinct from 'active' then
      raise exception 'Property is not accepting visits' using errcode = '22023';
    end if;
    v_client := v_actor;
    v_proposer := 'client';
  end if;

  -- La web permite acordar solo el precio, sin fecha de reunión.
  if p_meeting_date is not null and p_meeting_date < current_date then
    raise exception 'Meeting date must be today or later' using errcode = '22023';
  end if;

  v_price := coalesce(p_agreed_price, v_property.price, 0);
  if v_price < 0 then
    raise exception 'Agreed price cannot be negative' using errcode = '22023';
  end if;

  select * into v_existing
  from public.agreements
  where property_id = p_property_id
    and client_id = v_client
    and owner_id = v_property.owner_id
  for update;

  if found and v_existing.status = 'fully_confirmed' then
    raise exception 'Agreement already confirmed' using errcode = '23505';
  end if;

  insert into public.agreements (
    property_id, client_id, owner_id, agreed_price, original_price, currency,
    meeting_date, meeting_time, notes, start_date, end_date, status,
    client_confirmed, owner_confirmed, client_confirmed_at, owner_confirmed_at, updated_at
  ) values (
    p_property_id, v_client, v_property.owner_id, v_price, coalesce(v_property.price, v_price), 'FCFA',
    p_meeting_date, p_meeting_time, nullif(btrim(coalesce(p_notes, '')), ''), p_meeting_date, p_meeting_date,
    case when v_proposer = 'client' then 'client_confirmed' else 'owner_confirmed' end,
    v_proposer = 'client', v_proposer = 'owner',
    case when v_proposer = 'client' then v_now end,
    case when v_proposer = 'owner' then v_now end,
    v_now
  )
  on conflict (property_id, client_id, owner_id) do update set
    agreed_price = excluded.agreed_price,
    meeting_date = excluded.meeting_date,
    meeting_time = excluded.meeting_time,
    notes = excluded.notes,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    status = excluded.status,
    client_confirmed = excluded.client_confirmed,
    owner_confirmed = excluded.owner_confirmed,
    client_confirmed_at = excluded.client_confirmed_at,
    owner_confirmed_at = excluded.owner_confirmed_at,
    updated_at = excluded.updated_at
  returning * into v_row;

  insert into public.notifications (user_id, title, message, read, type, created_at, metadata)
  values (
    case when v_proposer = 'client' then v_property.owner_id else v_client end,
    'Nueva propuesta de visita',
    'Hay una propuesta de visita para ' || coalesce(v_property.title, 'tu vivienda') || '.',
    false, 'agreement', v_now,
    jsonb_build_object('type', 'agreement', 'agreementId', v_row.id, 'propertyId', p_property_id)
  );

  return v_row;
end;
$$;

create or replace function public.confirm_meeting_agreement(p_agreement_id uuid)
returns public.agreements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.app_uid();
  v_row public.agreements;
  v_is_client boolean;
  v_client_ok boolean;
  v_owner_ok boolean;
  v_now timestamptz := now();
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_row from public.agreements where id = p_agreement_id for update;
  if not found or v_actor not in (v_row.client_id, v_row.owner_id) then
    raise exception 'Agreement not found' using errcode = 'P0002';
  end if;
  if v_row.status = 'rejected' then
    raise exception 'Agreement was rejected; propose a new date' using errcode = '22023';
  end if;
  if v_row.status = 'fully_confirmed' then
    return v_row;
  end if;

  v_is_client := v_actor = v_row.client_id;
  v_client_ok := v_is_client or coalesce(v_row.client_confirmed, false);
  v_owner_ok := (not v_is_client) or coalesce(v_row.owner_confirmed, false);

  update public.agreements set
    client_confirmed = v_client_ok,
    owner_confirmed = v_owner_ok,
    client_confirmed_at = case when v_is_client and not coalesce(client_confirmed, false) then v_now else client_confirmed_at end,
    owner_confirmed_at = case when not v_is_client and not coalesce(owner_confirmed, false) then v_now else owner_confirmed_at end,
    status = case
      when v_client_ok and v_owner_ok then 'fully_confirmed'
      when v_client_ok then 'client_confirmed'
      else 'owner_confirmed'
    end,
    updated_at = v_now
  where id = p_agreement_id
  returning * into v_row;

  insert into public.notifications (user_id, title, message, read, type, created_at, metadata)
  values (
    case when v_is_client then v_row.owner_id else v_row.client_id end,
    case when v_row.status = 'fully_confirmed' then 'Visita confirmada' else 'Propuesta de visita aceptada' end,
    'La otra parte ha confirmado la visita.',
    false, 'agreement', v_now,
    jsonb_build_object('type', 'agreement', 'agreementId', v_row.id, 'propertyId', v_row.property_id)
  );

  return v_row;
end;
$$;

create or replace function public.reject_meeting_agreement(p_agreement_id uuid)
returns public.agreements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.app_uid();
  v_row public.agreements;
  v_now timestamptz := now();
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_row from public.agreements where id = p_agreement_id for update;
  if not found or v_actor not in (v_row.client_id, v_row.owner_id) then
    raise exception 'Agreement not found' using errcode = 'P0002';
  end if;
  -- Un acuerdo con contrato es la base de ese contrato: se cancela el contrato,
  -- no el acuerdo.
  if exists (select 1 from public.lease_contracts c where c.agreement_id = p_agreement_id) then
    raise exception 'Agreement already has a lease contract' using errcode = '22023';
  end if;

  update public.agreements set
    status = 'rejected',
    client_confirmed = false,
    owner_confirmed = false,
    client_confirmed_at = null,
    owner_confirmed_at = null,
    updated_at = v_now
  where id = p_agreement_id
  returning * into v_row;

  insert into public.notifications (user_id, title, message, read, type, created_at, metadata)
  values (
    case when v_actor = v_row.client_id then v_row.owner_id else v_row.client_id end,
    'Visita cancelada',
    'La otra parte ha cancelado o rechazado la visita.',
    false, 'agreement', v_now,
    jsonb_build_object('type', 'agreement', 'agreementId', v_row.id, 'propertyId', v_row.property_id)
  );

  return v_row;
end;
$$;

-- 2. Generación del contrato ------------------------------------------------

create or replace function public.generate_lease_contract(p_agreement_id uuid)
returns public.lease_contracts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.app_uid();
  v_agreement public.agreements;
  v_property public.properties;
  v_owner public.users;
  v_client public.users;
  v_template public.lease_contract_templates;
  v_contract public.lease_contracts;
  v_currency text;
  v_terms jsonb;
  v_snapshot jsonb;
  -- Igual que DEFAULT_LEASE_TERMS en las dos apps.
  v_default_terms constant jsonb := jsonb_build_object(
    'durationMonths', 12,
    'depositAmount', 0,
    'paymentDay', 5,
    'paymentMethod', 'Transferencia o medio acordado entre las partes',
    'utilitiesIncluded', '[]'::jsonb,
    'occupantsAllowed', 1,
    'petsAllowed', false,
    'noticeDays', 30,
    'maintenanceTerms', 'El arrendatario conservara la vivienda en buen estado y comunicara cualquier averia al arrendador.',
    'houseRules', 'La vivienda se destinara exclusivamente a residencia y se respetaran las normas de convivencia.',
    'inventoryNotes', '',
    'additionalClauses', ''
  );
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_agreement from public.agreements where id = p_agreement_id for update;
  if not found then
    raise exception 'Agreement not found' using errcode = 'P0002';
  end if;
  if v_actor <> v_agreement.owner_id and not private.is_admin_or_superadmin(v_actor) then
    raise exception 'Only the owner can generate the contract' using errcode = '42501';
  end if;

  -- Idempotente por acuerdo: repetir la llamada devuelve el mismo contrato.
  select * into v_contract from public.lease_contracts where agreement_id = p_agreement_id;
  if found then
    return v_contract;
  end if;

  if v_agreement.status <> 'fully_confirmed' then
    raise exception 'The agreement must be confirmed by both parties' using errcode = '22023';
  end if;

  select * into v_template
  from public.lease_contract_templates
  where property_id = v_agreement.property_id and status = 'active';
  if not found then
    raise exception 'The property needs an active contract template' using errcode = '22023';
  end if;

  select * into v_property from public.properties where id = v_agreement.property_id;
  select * into v_owner from public.users where id = v_agreement.owner_id;
  select * into v_client from public.users where id = v_agreement.client_id;

  v_currency := coalesce(nullif(v_agreement.currency, ''), 'FCFA');
  v_terms := v_default_terms || coalesce(v_template.terms, '{}'::jsonb);
  v_snapshot := jsonb_build_object(
    'title', v_template.title,
    'property', jsonb_build_object('id', v_property.id, 'title', coalesce(v_property.title, ''), 'location', coalesce(v_property.location, ''), 'price', coalesce(v_property.price, 0), 'currency', v_currency),
    'owner', jsonb_build_object('id', v_owner.id, 'name', coalesce(v_owner.name, ''), 'email', coalesce(v_owner.email, '')),
    'client', jsonb_build_object('id', v_client.id, 'name', coalesce(v_client.name, ''), 'email', coalesce(v_client.email, '')),
    'agreement', jsonb_build_object('id', v_agreement.id, 'agreedPrice', v_agreement.agreed_price, 'currency', v_currency, 'meetingDate', v_agreement.meeting_date, 'meetingTime', v_agreement.meeting_time),
    'terms', v_terms,
    'generatedAt', now()
  );

  insert into public.lease_contracts (
    contract_number, agreement_id, template_id, template_version, property_id,
    owner_id, client_id, snapshot, content_hash, status
  ) values (
    'CEG-' || to_char(now(), 'YYYYMMDD') || '-' || upper(left(v_agreement.property_id::text, 6)) || '-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 6)),
    v_agreement.id, v_template.id, v_template.version, v_agreement.property_id,
    v_agreement.owner_id, v_agreement.client_id, v_snapshot,
    encode(extensions.digest(convert_to(v_snapshot::text, 'UTF8'), 'sha256'), 'hex'),
    'awaiting_signatures'
  )
  returning * into v_contract;

  insert into public.contract_audit_events (contract_id, actor_id, event_type, metadata)
  values (v_contract.id, v_actor, 'created', jsonb_build_object('templateVersion', v_template.version, 'contentHash', v_contract.content_hash));

  insert into public.notifications (user_id, title, message, read, type, created_at, metadata)
  values (
    v_agreement.client_id,
    'Contrato listo para firmar',
    'Tu contrato para ' || coalesce(v_property.title, 'la vivienda') || ' está listo para firmar.',
    false, 'contract', now(),
    jsonb_build_object('type', 'contract', 'contractId', v_contract.id, 'propertyId', v_agreement.property_id)
  );

  return v_contract;
end;
$$;

-- 3. Moderación de publicaciones -------------------------------------------

create or replace function public.admin_set_property_status(p_property_id uuid, p_status text)
returns public.properties
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.app_uid();
  v_row public.properties;
begin
  if v_actor is null or not private.is_admin_or_superadmin(v_actor) then
    raise exception 'Administrator required' using errcode = '42501';
  end if;
  if p_status not in ('active', 'suspended', 'pending') then
    raise exception 'Invalid property status' using errcode = '22023';
  end if;

  update public.properties set status = p_status
  where id = p_property_id
  returning * into v_row;
  if not found then
    raise exception 'Property not found' using errcode = 'P0002';
  end if;

  insert into public.notifications (user_id, title, message, read, type, created_at, metadata)
  values (
    v_row.owner_id,
    case p_status when 'active' then 'Vivienda publicada' when 'suspended' then 'Vivienda suspendida' else 'Vivienda en revisión' end,
    coalesce(v_row.title, 'Tu vivienda') || case p_status when 'active' then ' ya es visible en CasaSeg.' when 'suspended' then ' ha dejado de ser visible.' else ' está en revisión.' end,
    false, 'property', now(),
    jsonb_build_object('type', 'property', 'propertyId', v_row.id, 'status', p_status)
  );

  return v_row;
end;
$$;

revoke all on function public.propose_meeting_agreement(uuid, date, time, text, uuid, numeric) from public, anon;
revoke all on function public.confirm_meeting_agreement(uuid) from public, anon;
revoke all on function public.reject_meeting_agreement(uuid) from public, anon;
revoke all on function public.generate_lease_contract(uuid) from public, anon;
revoke all on function public.admin_set_property_status(uuid, text) from public, anon;
grant execute on function public.propose_meeting_agreement(uuid, date, time, text, uuid, numeric) to authenticated;
grant execute on function public.confirm_meeting_agreement(uuid) to authenticated;
grant execute on function public.reject_meeting_agreement(uuid) to authenticated;
grant execute on function public.generate_lease_contract(uuid) to authenticated;
grant execute on function public.admin_set_property_status(uuid, text) to authenticated;

notify pgrst, 'reload schema';
