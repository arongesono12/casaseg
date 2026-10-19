-- Allow a superadmin to grant an owner plan quota without recording a payment.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS owner_assigned_plan_type text;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_owner_assigned_plan_type_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_owner_assigned_plan_type_check
  CHECK (owner_assigned_plan_type IS NULL OR owner_assigned_plan_type IN ('normal', 'advanced', 'premium'));

CREATE INDEX IF NOT EXISTS idx_users_owner_assigned_plan_type
  ON public.users (owner_assigned_plan_type)
  WHERE owner_assigned_plan_type IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_owner_admin_plan_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.owner_assigned_plan_type IS DISTINCT FROM OLD.owner_assigned_plan_type THEN
    IF current_setting('app.owner_plan_assignment_internal', true) IS DISTINCT FROM '1'
       AND auth.role() IS DISTINCT FROM 'service_role'
       AND public.user_role_for_rls(auth.uid()) IS DISTINCT FROM 'superadmin' THEN
      RAISE EXCEPTION 'Solo el superadmin puede asignar el cupo de viviendas'
        USING errcode = '42501';
    END IF;
    IF NEW.owner_assigned_plan_type IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.owner_plans
      WHERE type = NEW.owner_assigned_plan_type AND is_active = true
    ) THEN
      RAISE EXCEPTION 'El plan de propietario no está disponible';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_owner_admin_plan_assignment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_owner_admin_plan_assignment ON public.users;
CREATE TRIGGER guard_owner_admin_plan_assignment
  BEFORE UPDATE OF owner_assigned_plan_type ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_owner_admin_plan_assignment();

-- Role, classification and quota changes are reported by admin-users with an
-- authenticated actor; suppress the generic service-role duplicate.
DROP TRIGGER IF EXISTS notify_superadmins_of_record_change_update ON public.users;
CREATE TRIGGER notify_superadmins_of_record_change_update
  AFTER UPDATE ON public.users
  FOR EACH ROW
  WHEN (
    auth.uid() IS NOT NULL
    OR (
      OLD.role IS NOT DISTINCT FROM NEW.role
      AND OLD.owner_type IS NOT DISTINCT FROM NEW.owner_type
      AND OLD.status IS NOT DISTINCT FROM NEW.status
      AND OLD.owner_assigned_plan_type IS NOT DISTINCT FROM NEW.owner_assigned_plan_type
    )
  )
  EXECUTE FUNCTION public.notify_superadmins_of_record_change();

CREATE OR REPLACE FUNCTION public.get_owner_entitlements(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  role text,
  plan_type text,
  subscription_status text,
  max_properties integer,
  used_properties integer,
  remaining_properties integer,
  can_publish boolean,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_target_id uuid := COALESCE(p_user_id, auth.uid());
  v_actor_role text;
  v_target_role text;
  v_plan_type text;
  v_subscription_status text;
  v_max_properties integer;
  v_used_properties integer := 0;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '42501';
  END IF;

  SELECT u.role INTO v_actor_role FROM public.users u WHERE u.id = v_actor_id;
  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Actor user profile not found' USING errcode = '42501';
  END IF;
  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Target user is required' USING errcode = '22023';
  END IF;
  IF v_target_id <> v_actor_id AND v_actor_role NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Not allowed to inspect another user''s entitlements' USING errcode = '42501';
  END IF;

  SELECT u.role INTO v_target_role FROM public.users u WHERE u.id = v_target_id;
  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user not found' USING errcode = 'P0002';
  END IF;
  SELECT count(*)::integer INTO v_used_properties
  FROM public.properties p WHERE p.owner_id = v_target_id;

  IF v_target_role IN ('admin', 'superadmin') THEN
    RETURN QUERY SELECT v_target_id, v_target_role, NULL::text, 'active'::text,
      2147483647, v_used_properties, GREATEST(0, 2147483647 - v_used_properties), true, NULL::text;
    RETURN;
  END IF;
  IF v_target_role <> 'owner' THEN
    RETURN QUERY SELECT v_target_id, v_target_role, NULL::text, 'inactive'::text,
      0, v_used_properties, 0, false, 'user_is_not_owner'::text;
    RETURN;
  END IF;

  -- A plan explicitly granted by the superadmin defines the quota until a
  -- paid owner plan is confirmed. It is not represented as a payment.
  SELECT plan.type, 'admin_assigned'::text, plan.max_properties
  INTO v_plan_type, v_subscription_status, v_max_properties
  FROM public.users u
  JOIN public.owner_plans plan ON plan.type = u.owner_assigned_plan_type AND plan.is_active = true
  WHERE u.id = v_target_id;

  IF v_max_properties IS NULL THEN
    SELECT subscription.plan_type, subscription.status, plan.max_properties
    INTO v_plan_type, v_subscription_status, v_max_properties
    FROM public.owner_subscriptions subscription
    JOIN public.owner_plans plan ON plan.id = subscription.plan_id
    WHERE subscription.user_id = v_target_id
      AND subscription.status = 'active'
      AND subscription.end_date > now()
    ORDER BY subscription.created_at DESC
    LIMIT 1;
  END IF;

  IF v_max_properties IS NULL THEN
    v_max_properties := 3;
    RETURN QUERY SELECT v_target_id, v_target_role, 'free_tier'::text, 'active'::text,
      v_max_properties, v_used_properties, GREATEST(v_max_properties - v_used_properties, 0),
      v_used_properties < v_max_properties,
      CASE WHEN v_used_properties < v_max_properties THEN NULL ELSE 'free_limit_reached'::text END;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_target_id, v_target_role, v_plan_type, COALESCE(v_subscription_status, 'inactive'),
    v_max_properties, v_used_properties, GREATEST(v_max_properties - v_used_properties, 0),
    v_used_properties < v_max_properties,
    CASE WHEN v_used_properties < v_max_properties THEN NULL ELSE 'property_limit_reached'::text END;
END;
$$;

REVOKE ALL ON FUNCTION public.get_owner_entitlements(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_entitlements(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_owner_plan_capabilities(p_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'planType', plan.type, 'planName', plan.name,
    'subscriptionStatus', 'admin_assigned', 'subscriptionEndsAt', NULL,
    'maxProperties', plan.max_properties,
    'searchPriority', COALESCE((plan.capabilities ->> 'searchPriority')::integer, 0),
    'featuredQuota', COALESCE((plan.capabilities ->> 'featuredQuota')::integer, 0),
    'featuredUsed', (SELECT count(*)::integer FROM public.properties property
      WHERE property.owner_id = p_owner_id AND property.is_featured = true),
    'analyticsLevel', COALESCE(plan.capabilities ->> 'analyticsLevel', 'basic'),
    'supportLevel', COALESCE(plan.capabilities ->> 'supportLevel', 'email'),
    'verificationLevel', COALESCE(plan.capabilities ->> 'verificationLevel', 'standard'),
    'messagingUnlimited', COALESCE((plan.capabilities ->> 'messagingUnlimited')::boolean, false),
    'apiAccess', COALESCE((plan.capabilities ->> 'apiAccess')::boolean, false),
    'marketingIncluded', COALESCE((plan.capabilities ->> 'marketingIncluded')::boolean, false)
  ) INTO result
  FROM public.users owner_user
  JOIN public.owner_plans plan ON plan.type = owner_user.owner_assigned_plan_type AND plan.is_active = true
  WHERE owner_user.id = p_owner_id;

  IF result IS NOT NULL THEN RETURN result; END IF;

  SELECT jsonb_build_object(
    'planType', subscription.plan_type, 'planName', plan.name,
    'subscriptionStatus', subscription.status, 'subscriptionEndsAt', subscription.end_date,
    'maxProperties', plan.max_properties,
    'searchPriority', COALESCE((plan.capabilities ->> 'searchPriority')::integer, 0),
    'featuredQuota', COALESCE((plan.capabilities ->> 'featuredQuota')::integer, 0),
    'featuredUsed', (SELECT count(*)::integer FROM public.properties property
      WHERE property.owner_id = p_owner_id AND property.is_featured = true),
    'analyticsLevel', COALESCE(plan.capabilities ->> 'analyticsLevel', 'basic'),
    'supportLevel', COALESCE(plan.capabilities ->> 'supportLevel', 'email'),
    'verificationLevel', COALESCE(plan.capabilities ->> 'verificationLevel', 'standard'),
    'messagingUnlimited', COALESCE((plan.capabilities ->> 'messagingUnlimited')::boolean, false),
    'apiAccess', COALESCE((plan.capabilities ->> 'apiAccess')::boolean, false),
    'marketingIncluded', COALESCE((plan.capabilities ->> 'marketingIncluded')::boolean, false)
  ) INTO result
  FROM public.owner_subscriptions subscription
  JOIN public.owner_plans plan ON plan.id = subscription.plan_id
  WHERE subscription.user_id = p_owner_id
    AND subscription.status = 'active'
    AND subscription.end_date > now()
  ORDER BY subscription.created_at DESC
  LIMIT 1;

  RETURN COALESCE(result, jsonb_build_object(
    'planType', 'free_tier', 'planName', 'Sin plan activo', 'subscriptionStatus', 'inactive',
    'maxProperties', 3, 'searchPriority', 0, 'featuredQuota', 0, 'featuredUsed', 0,
    'analyticsLevel', 'basic', 'supportLevel', 'email', 'verificationLevel', 'standard',
    'messagingUnlimited', false, 'apiAccess', false, 'marketingIncluded', false
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_owner_plan_capabilities(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_owner_admin_plan_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.owner_assigned_plan_type IS DISTINCT FROM OLD.owner_assigned_plan_type THEN
    PERFORM public.sync_owner_plan_property_benefits(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_owner_admin_plan_assignment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sync_owner_admin_plan_assignment ON public.users;
CREATE TRIGGER sync_owner_admin_plan_assignment
  AFTER UPDATE OF owner_assigned_plan_type ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_owner_admin_plan_assignment();

CREATE OR REPLACE FUNCTION public.admin_update_platform_user(
  p_user_id uuid,
  p_role text,
  p_status text,
  p_owner_type text,
  p_owner_plan_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_role text := public.user_role_for_rls(auth.uid());
  v_previous_role text;
  v_result jsonb;
BEGIN
  IF v_actor_role IS DISTINCT FROM 'superadmin' AND p_owner_plan_type IS NOT NULL THEN
    RAISE EXCEPTION 'Solo el superadmin puede asignar el cupo de viviendas';
  END IF;
  IF p_owner_plan_type IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.owner_plans WHERE type = p_owner_plan_type AND is_active = true
  ) THEN
    RAISE EXCEPTION 'El plan de propietario no está disponible';
  END IF;
  SELECT role INTO v_previous_role FROM public.users WHERE id = p_user_id;
  IF p_role = 'owner' AND v_previous_role IS DISTINCT FROM 'owner'
     AND v_actor_role = 'superadmin' AND p_owner_plan_type IS NULL THEN
    RAISE EXCEPTION 'Selecciona el plan que define el cupo de viviendas del propietario';
  END IF;

  v_result := public.admin_update_platform_user(p_user_id, p_role, p_status, p_owner_type);
  IF COALESCE(p_role, v_result->>'role') = 'owner' THEN
    UPDATE public.users
    SET owner_assigned_plan_type = COALESCE(p_owner_plan_type, owner_assigned_plan_type), updated_at = now()
    WHERE id = p_user_id;
    v_result := v_result || jsonb_build_object(
      'ownerAssignedPlanType', COALESCE(p_owner_plan_type, (SELECT owner_assigned_plan_type FROM public.users WHERE id = p_user_id))
    );
  ELSIF p_role IS NOT NULL THEN
    UPDATE public.users SET owner_assigned_plan_type = NULL, updated_at = now() WHERE id = p_user_id;
  END IF;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_platform_user(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_platform_user(uuid, text, text, text, text) TO authenticated;

-- Reuse the existing payment reconciliation; the chosen admin plan is removed
-- only after a real owner-upgrade or plan-change payment is confirmed.
CREATE OR REPLACE FUNCTION public.clear_admin_owner_plan_after_paid_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.payment_status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    PERFORM set_config('app.owner_plan_assignment_internal', '1', true);
    UPDATE public.users SET owner_assigned_plan_type = NULL, updated_at = now()
    WHERE id = NEW.user_id AND owner_assigned_plan_type IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_admin_owner_plan_after_paid_request() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS clear_admin_owner_plan_after_paid_request ON public.owner_upgrade_requests;
CREATE TRIGGER clear_admin_owner_plan_after_paid_request
  AFTER INSERT ON public.owner_upgrade_requests
  FOR EACH ROW EXECUTE FUNCTION public.clear_admin_owner_plan_after_paid_request();
DROP TRIGGER IF EXISTS clear_admin_owner_plan_after_paid_request_update ON public.owner_upgrade_requests;
CREATE TRIGGER clear_admin_owner_plan_after_paid_request_update
  AFTER UPDATE OF payment_status ON public.owner_upgrade_requests
  FOR EACH ROW EXECUTE FUNCTION public.clear_admin_owner_plan_after_paid_request();

-- Plan-change checkout must also work for owners who received their initial
-- quota from administration and therefore have no paid subscription row yet.
CREATE OR REPLACE FUNCTION private.apply_paid_owner_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan public.owner_plans%rowtype;
  v_subscription_id uuid;
  v_amount numeric;
  v_end_date timestamptz;
BEGIN
  IF NEW.payment_metadata ->> 'requestType' IS DISTINCT FROM 'plan_change'
     OR OLD.payment_status IS NOT DISTINCT FROM NEW.payment_status THEN
    RETURN NEW;
  END IF;
  IF NEW.payment_status = 'failed' THEN
    NEW.status := 'cancelled';
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  IF NEW.payment_status <> 'completed' THEN RETURN NEW; END IF;

  SELECT * INTO v_plan FROM public.owner_plans WHERE type = NEW.plan_type AND is_active = true;
  IF v_plan.id IS NULL THEN RAISE EXCEPTION 'El plan pagado ya no está disponible'; END IF;
  v_amount := CASE WHEN NEW.is_yearly THEN v_plan.price_yearly ELSE v_plan.price_monthly END;
  v_end_date := CASE WHEN NEW.is_yearly THEN now() + interval '1 year' ELSE now() + interval '1 month' END;

  SELECT id INTO v_subscription_id
  FROM public.owner_subscriptions
  WHERE user_id = NEW.user_id AND status = 'active' AND end_date > now()
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF v_subscription_id IS NULL THEN
    INSERT INTO public.owner_subscriptions (
      user_id, plan_id, plan_type, status, payment_method, payment_status,
      amount, currency, start_date, end_date, is_yearly, auto_renew,
      payment_reference, terms_accepted, terms_accepted_at
    ) VALUES (
      NEW.user_id, v_plan.id, v_plan.type, 'active', NEW.payment_method, 'completed',
      v_amount, v_plan.currency, now(), v_end_date, NEW.is_yearly, false,
      NEW.payment_reference, true, now()
    ) RETURNING id INTO v_subscription_id;
  ELSE
    UPDATE public.owner_subscriptions
    SET plan_id = v_plan.id, plan_type = v_plan.type,
        amount = v_amount, currency = v_plan.currency,
        payment_method = NEW.payment_method, payment_status = 'completed',
        payment_reference = NEW.payment_reference, start_date = now(), end_date = v_end_date,
        is_yearly = NEW.is_yearly, updated_at = now()
    WHERE id = v_subscription_id;
  END IF;

  NEW.status := 'approved';
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.apply_paid_owner_plan_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_owner_upgrade_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  v_expected_prefix text;
  v_current_max integer;
  v_target_max integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0));
  END IF;

  NEW.full_name := btrim(coalesce(NEW.full_name, ''));
  NEW.phone_number := regexp_replace(coalesce(NEW.phone_number, ''), '\D', '', 'g');
  NEW.residence_location := btrim(coalesce(NEW.residence_location, ''));
  NEW.nationality := btrim(coalesce(NEW.nationality, ''));
  NEW.document_number := nullif(btrim(coalesce(NEW.document_number, '')), '');
  NEW.property_title_document_url := btrim(coalesce(NEW.property_title_document_url, ''));
  NEW.identity_document_front_path := nullif(btrim(coalesce(NEW.identity_document_front_path, '')), '');
  NEW.identity_document_back_path := nullif(btrim(coalesce(NEW.identity_document_back_path, '')), '');

  IF NEW.payment_metadata ->> 'requestType' = 'plan_change' THEN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.user_id AND role = 'owner') THEN
      RAISE EXCEPTION 'Solo un propietario puede cambiar su plan';
    END IF;
    IF NEW.payment_method NOT IN ('stripe', 'paypal') THEN
      RAISE EXCEPTION 'Este método de pago no está habilitado para cambios de plan';
    END IF;

    SELECT COALESCE(
      (SELECT plan.max_properties
       FROM public.users owner_user
       JOIN public.owner_plans plan ON plan.type = owner_user.owner_assigned_plan_type AND plan.is_active = true
       WHERE owner_user.id = NEW.user_id),
      (SELECT plan.max_properties
       FROM public.owner_subscriptions subscription
       JOIN public.owner_plans plan ON plan.id = subscription.plan_id
       WHERE subscription.user_id = NEW.user_id AND subscription.status = 'active'
         AND subscription.end_date > now()
       ORDER BY subscription.created_at DESC LIMIT 1)
    ) INTO v_current_max;

    SELECT max_properties INTO v_target_max
    FROM public.owner_plans WHERE type = NEW.plan_type AND is_active = true;
    IF v_current_max IS NULL OR v_target_max IS NULL OR v_target_max <= v_current_max THEN
      RAISE EXCEPTION 'Selecciona un plan activo con más capacidad que tu plan actual';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.user_terms_acceptance
      WHERE user_id = NEW.user_id AND terms_version = 'v1.0'
        AND terms_accepted = true AND privacy_accepted = true AND subscription_terms_accepted = true
    ) THEN
      RAISE EXCEPTION 'Debes aceptar las condiciones antes de cambiar de plan';
    END IF;
    IF TG_OP = 'INSERT' AND EXISTS (
      SELECT 1 FROM public.owner_upgrade_requests
      WHERE user_id = NEW.user_id AND status = 'pending'
        AND payment_metadata ->> 'requestType' = 'plan_change'
    ) THEN
      RAISE EXCEPTION 'Ya tienes un cambio de plan pendiente';
    END IF;
    NEW.full_name := coalesce(nullif(NEW.full_name, ''), 'Propietario');
    RETURN NEW;
  END IF;

  IF char_length(NEW.full_name) NOT BETWEEN 3 AND 120 THEN RAISE EXCEPTION 'El nombre completo no es valido'; END IF;
  IF char_length(NEW.residence_location) NOT BETWEEN 3 AND 160 THEN RAISE EXCEPTION 'El lugar de residencia no es valido'; END IF;
  IF char_length(NEW.nationality) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'La nacionalidad no es valida'; END IF;
  IF char_length(NEW.phone_number) NOT BETWEEN 8 AND 15 THEN RAISE EXCEPTION 'El numero de telefono no es valido'; END IF;
  IF NEW.document_number IS NOT NULL AND (char_length(NEW.document_number) NOT BETWEEN 3 AND 80 OR NEW.document_number !~ '^[A-Za-z0-9._/-]+$') THEN
    RAISE EXCEPTION 'El numero de documento no es valido';
  END IF;
  IF NEW.document_type NOT IN ('dni', 'passport') THEN RAISE EXCEPTION 'El tipo de documento no es valido'; END IF;
  IF NEW.identity_document_front_path IS NULL AND NEW.document_number IS NULL THEN RAISE EXCEPTION 'Adjunta la imagen de tu documento de identidad'; END IF;
  IF NEW.identity_document_front_path IS NOT NULL THEN
    PERFORM private.assert_owner_identity_document(NEW.user_id, NEW.identity_document_front_path);
    IF NEW.document_type = 'dni' AND NEW.identity_document_back_path IS NULL THEN RAISE EXCEPTION 'Adjunta la cara trasera del DIP'; END IF;
  END IF;
  IF NEW.identity_document_back_path IS NOT NULL THEN
    IF NEW.document_type <> 'dni' THEN RAISE EXCEPTION 'Para el pasaporte solo se adjunta la pagina de datos'; END IF;
    PERFORM private.assert_owner_identity_document(NEW.user_id, NEW.identity_document_back_path);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.user_id AND role = 'client') THEN
    RAISE EXCEPTION 'Solo un cliente puede solicitar convertirse en propietario';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.owner_plans WHERE type = NEW.plan_type AND is_active = true) THEN
    RAISE EXCEPTION 'El plan seleccionado no es valido';
  END IF;
  IF NEW.payment_method NOT IN ('stripe', 'paypal', 'muni_dinero', 'bank_transfer', 'ecobank') THEN
    RAISE EXCEPTION 'El metodo de pago no es valido';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_terms_acceptance
    WHERE user_id = NEW.user_id AND terms_version = 'v1.0'
      AND terms_accepted = true AND privacy_accepted = true AND subscription_terms_accepted = true
  ) THEN RAISE EXCEPTION 'Debe aceptar los terminos antes de enviar la solicitud'; END IF;
  IF TG_OP = 'INSERT' AND EXISTS (
    SELECT 1 FROM public.owner_upgrade_requests
    WHERE user_id = NEW.user_id AND status IN ('pending', 'approved_pending_verification')
  ) THEN RAISE EXCEPTION 'Ya existe una solicitud de propietario pendiente'; END IF;

  v_expected_prefix := NEW.user_id::text || '/property-titles/';
  IF NEW.property_title_document_url NOT LIKE v_expected_prefix || '%'
     OR lower(storage.extension(NEW.property_title_document_url)) <> 'pdf'
     OR NEW.property_title_document_url LIKE '%..%' THEN
    RAISE EXCEPTION 'La ruta del titulo de propiedad no es valida';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'documents'
    AND name = NEW.property_title_document_url AND lower(storage.extension(name)) = 'pdf') THEN
    RAISE EXCEPTION 'El titulo de propiedad no existe en Storage';
  END IF;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
