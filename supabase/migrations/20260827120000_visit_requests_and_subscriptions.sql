-- Respaldo de datos para las edge functions de visitas, contratos y suscripciones.
--
-- Contexto: el código de la app consulta `public.visit_requests`, pero las
-- políticas escritas en 20260721183000 se aplican sobre `public.visits`. Son
-- nombres distintos y hasta ahora nadie los había conciliado, así que las
-- solicitudes de visita circulaban sin las políticas pensadas para ellas.
--
-- Esta migración es idempotente y defensiva a propósito: el esquema real vive
-- en el proyecto remoto y no está volcado al repositorio, así que cada bloque
-- comprueba lo que hay antes de tocarlo en vez de dar por hecho un estado.
-- Cuando `supabase db pull` traiga el esquema completo, esto seguirá siendo
-- válido y podrá simplificarse.

-- 1. Solicitudes de visita --------------------------------------------------

do $$
begin
  if to_regclass('public.visit_requests') is null then
    create table public.visit_requests (
      id uuid primary key default gen_random_uuid(),
      property_id uuid not null references public.properties(id) on delete cascade,
      requester_id uuid not null references public.users(id) on delete cascade,
      owner_id uuid not null references public.users(id) on delete cascade,
      proposed_at timestamptz not null,
      note text not null default '',
      status text not null default 'pending'
        check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'completed')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    -- Una sola solicitud pendiente por persona y vivienda. El índice es lo que
    -- realmente impide el duplicado: la comprobación previa de la edge function
    -- pierde contra dos peticiones simultáneas.
    create unique index visit_requests_one_pending
      on public.visit_requests (property_id, requester_id)
      where status = 'pending';

    create index visit_requests_owner_recent
      on public.visit_requests (owner_id, proposed_at desc);

    raise notice 'Creada public.visit_requests.';
  else
    raise notice 'public.visit_requests ya existe: no se toca su definición.';
  end if;

  if to_regclass('public.visits') is not null then
    raise warning 'Existen public.visits y public.visit_requests a la vez. Revisa cuál está en uso y retira la otra: mantener las dos deja permisos duplicados.';
  end if;
end;
$$;

-- 2. Órdenes de suscripción -------------------------------------------------

do $$
begin
  if to_regclass('public.subscription_orders') is null then
    create table public.subscription_orders (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references public.users(id) on delete cascade,
      plan text not null check (plan in ('basic', 'professional')),
      amount numeric(12, 2) not null default 0,
      currency text not null default 'XAF',
      status text not null default 'pending'
        check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
      checkout_url text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index subscription_orders_user_recent
      on public.subscription_orders (user_id, created_at desc);

    raise notice 'Creada public.subscription_orders.';
  end if;
end;
$$;

-- 3. Columnas que la firma de contrato necesita -----------------------------

do $$
begin
  if to_regclass('public.lease_contracts') is not null then
    -- Ruta del PDF dentro del bucket privado; sin ella no se puede firmar una
    -- URL de descarga.
    alter table public.lease_contracts add column if not exists document_path text;
    -- Quién firmó, para que la firma sea atribuible.
    alter table public.lease_contracts add column if not exists signed_by uuid;
  else
    raise warning 'public.lease_contracts no existe: las funciones de contratos fallarán hasta que se cree.';
  end if;
end;
$$;

-- 4. Políticas RLS ----------------------------------------------------------
--
-- app_uid() y no auth.uid(): con Clerk emitiendo el token, auth.uid() no
-- resuelve (ver 20260825120000_clerk_third_party_auth.sql).

do $$
begin
  if to_regclass('public.visit_requests') is not null then
    alter table public.visit_requests enable row level security;

    revoke all on table public.visit_requests from public, anon;
    grant select, insert, update on table public.visit_requests to authenticated;
    grant all on table public.visit_requests to service_role;

    drop policy if exists visit_requests_select_involved on public.visit_requests;
    create policy visit_requests_select_involved
      on public.visit_requests for select to authenticated
      using (requester_id = public.app_uid() or owner_id = public.app_uid());

    -- Solo se puede solicitar en nombre propio; el owner_id lo fija la edge
    -- function a partir de la propiedad, no el cliente.
    drop policy if exists visit_requests_insert_own on public.visit_requests;
    create policy visit_requests_insert_own
      on public.visit_requests for insert to authenticated
      with check (requester_id = public.app_uid());

    -- El propietario responde; quien solicita solo puede cancelar la suya.
    drop policy if exists visit_requests_update_involved on public.visit_requests;
    create policy visit_requests_update_involved
      on public.visit_requests for update to authenticated
      using (owner_id = public.app_uid() or requester_id = public.app_uid())
      with check (owner_id = public.app_uid() or requester_id = public.app_uid());
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.subscription_orders') is not null then
    alter table public.subscription_orders enable row level security;

    revoke all on table public.subscription_orders from public, anon;
    grant select on table public.subscription_orders to authenticated;
    grant all on table public.subscription_orders to service_role;

    drop policy if exists subscription_orders_select_own on public.subscription_orders;
    create policy subscription_orders_select_own
      on public.subscription_orders for select to authenticated
      using (user_id = public.app_uid());

    drop policy if exists subscription_orders_insert_own on public.subscription_orders;
    create policy subscription_orders_insert_own
      on public.subscription_orders for insert to authenticated
      with check (user_id = public.app_uid());

    -- El estado solo lo cambia el proveedor de cobro vía service_role: un
    -- usuario que pudiera marcarse la orden como `completed` tendría el plan
    -- de pago gratis.
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.favorites') is not null then
    alter table public.favorites enable row level security;

    revoke all on table public.favorites from public, anon;
    grant select, insert, delete on table public.favorites to authenticated;
    grant all on table public.favorites to service_role;

    drop policy if exists favorites_select_own on public.favorites;
    create policy favorites_select_own
      on public.favorites for select to authenticated
      using (user_id = public.app_uid());

    drop policy if exists favorites_insert_own on public.favorites;
    create policy favorites_insert_own
      on public.favorites for insert to authenticated
      with check (user_id = public.app_uid());

    drop policy if exists favorites_delete_own on public.favorites;
    create policy favorites_delete_own
      on public.favorites for delete to authenticated
      using (user_id = public.app_uid());
  else
    raise warning 'public.favorites no existe: la pantalla de guardados quedará vacía.';
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.lease_contracts') is not null then
    alter table public.lease_contracts enable row level security;

    revoke all on table public.lease_contracts from public, anon;
    grant select, update on table public.lease_contracts to authenticated;
    grant all on table public.lease_contracts to service_role;

    -- Un contrato lo ven sus dos partes. Se usan los nombres de columna que
    -- existan: el esquema remoto no está volcado y varía entre entornos.
    drop policy if exists lease_contracts_select_parties on public.lease_contracts;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'lease_contracts' and column_name = 'tenant_id'
    ) then
      create policy lease_contracts_select_parties
        on public.lease_contracts for select to authenticated
        using (
          tenant_id = public.app_uid()
          or exists (
            select 1 from public.properties p
            where p.id = lease_contracts.property_id and p.owner_id = public.app_uid()
          )
        );
    else
      raise warning 'public.lease_contracts no tiene columna tenant_id: revisa la política de lectura a mano.';
    end if;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.rental_payment_orders') is not null then
    alter table public.rental_payment_orders enable row level security;

    revoke all on table public.rental_payment_orders from public, anon;
    grant select on table public.rental_payment_orders to authenticated;
    grant all on table public.rental_payment_orders to service_role;

    -- Solo lectura para el usuario: las órdenes las crea
    -- private.create_rental_payment_order, y el estado lo mueve el proveedor.
    drop policy if exists rental_payment_orders_select_own on public.rental_payment_orders;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'rental_payment_orders' and column_name = 'payer_id'
    ) then
      create policy rental_payment_orders_select_own
        on public.rental_payment_orders for select to authenticated
        using (payer_id = public.app_uid());
    else
      raise warning 'public.rental_payment_orders no tiene columna payer_id: revisa la política de lectura a mano.';
    end if;
  end if;
end;
$$;

-- 5. Bucket privado de contratos --------------------------------------------

insert into storage.buckets (id, name, public)
values ('contracts-private', 'contracts-private', false)
on conflict (id) do nothing;

-- Nadie lee el bucket directamente: create-contract-signed-url firma una URL
-- temporal tras comprobar por RLS que el contrato es del llamante. Sin política
-- de select, un cliente con el token no puede listar contratos ajenos.
drop policy if exists contracts_private_no_direct_access on storage.objects;
create policy contracts_private_no_direct_access
  on storage.objects for select to authenticated
  using (bucket_id = 'contracts-private' and false);
