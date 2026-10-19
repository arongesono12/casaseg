-- Owner classification, paid activation and consistent actor context.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS owner_type text;

UPDATE public.users
SET owner_type = 'individual'
WHERE role = 'owner' AND owner_type IS NULL;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_owner_type_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_owner_type_check
  CHECK (owner_type IS NULL OR owner_type IN ('individual', 'agency'));

ALTER TABLE public.owner_upgrade_requests
  ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'individual';
ALTER TABLE public.owner_upgrade_requests
  DROP CONSTRAINT IF EXISTS owner_upgrade_requests_owner_type_check;
ALTER TABLE public.owner_upgrade_requests
  ADD CONSTRAINT owner_upgrade_requests_owner_type_check
  CHECK (owner_type IN ('individual', 'agency'));

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS actor_role text;

ALTER TABLE public.admin_notifications
  ADD COLUMN IF NOT EXISTS actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS actor_role text;

-- The admin-users Edge Function emits a richer, actor-aware notice when it
-- performs service-role writes. Avoid a second generic system notice for the
-- same role, owner-type or status change while keeping other user activity.
DROP TRIGGER IF EXISTS notify_superadmins_of_record_change_trigger ON public.users;
CREATE TRIGGER notify_superadmins_of_record_change_insert_delete
  AFTER INSERT OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.notify_superadmins_of_record_change();
CREATE TRIGGER notify_superadmins_of_record_change_update
  AFTER UPDATE ON public.users
  FOR EACH ROW
  WHEN (
    auth.uid() IS NOT NULL
    OR (
      OLD.role IS NOT DISTINCT FROM NEW.role
      AND OLD.owner_type IS NOT DISTINCT FROM NEW.owner_type
      AND OLD.status IS NOT DISTINCT FROM NEW.status
    )
  )
  EXECUTE FUNCTION public.notify_superadmins_of_record_change();

CREATE OR REPLACE FUNCTION public.enrich_notification_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_name text;
  v_actor_role text;
  v_metadata_actor text;
BEGIN
  v_metadata_actor := COALESCE(
    NEW.metadata->>'actor_user_id',
    NEW.metadata->>'actorUserId',
    NEW.metadata->>'reviewed_by',
    NEW.metadata->>'reviewedBy'
  );
  IF v_metadata_actor ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_actor_id := v_metadata_actor::uuid;
  END IF;
  v_actor_id := COALESCE(NEW.actor_user_id, v_actor_id, auth.uid());

  IF v_actor_id IS NOT NULL THEN
    SELECT NULLIF(btrim(name), ''), role
    INTO v_actor_name, v_actor_role
    FROM public.users
    WHERE id = v_actor_id;
  END IF;

  NEW.actor_user_id := COALESCE(NEW.actor_user_id, v_actor_id);
  NEW.actor_name := COALESCE(NEW.actor_name, NEW.metadata->>'actor_name', v_actor_name, 'Sistema');
  NEW.actor_role := COALESCE(NEW.actor_role, NEW.metadata->>'actor_role', v_actor_role, 'sistema');
  NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
    'actor_user_id', NEW.actor_user_id,
    'actor_name', NEW.actor_name,
    'actor_role', NEW.actor_role
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enrich_notification_actor() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enrich_notification_actor ON public.notifications;
CREATE TRIGGER enrich_notification_actor
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.enrich_notification_actor();

DROP TRIGGER IF EXISTS enrich_admin_notification_actor ON public.admin_notifications;
CREATE TRIGGER enrich_admin_notification_actor
  BEFORE INSERT ON public.admin_notifications
  FOR EACH ROW EXECUTE FUNCTION public.enrich_notification_actor();

-- Ecobank can insert the request already paid. Label that event as a confirmed
-- owner activation instead of sending the ordinary pending-review message.
CREATE OR REPLACE FUNCTION public.notify_owner_request_recipients()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_paid boolean := NEW.payment_status = 'completed'
    AND COALESCE(NEW.payment_metadata->>'requestType', '') <> 'plan_change';
BEGIN
  IF NEW.payment_metadata->>'requestType' = 'plan_change' THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.admin_notifications (
    recipient_user_id, title, message, type, metadata
  )
  SELECT
    recipient.id,
    CASE WHEN v_paid THEN 'Alta de propietario confirmada' ELSE 'Nueva solicitud para convertirse en propietario' END,
    CASE WHEN v_paid THEN
      format('%s pagó el plan %s mediante %s y se activó como propietario (%s).',
        COALESCE(NULLIF(trim(NEW.user_name), ''), 'Usuario'),
        COALESCE(NEW.plan_type, 'sin plan'),
        COALESCE(NEW.payment_method, 'método no indicado'),
        CASE WHEN NEW.owner_type = 'agency' THEN 'agencia inmobiliaria' ELSE 'particular' END)
      ELSE
      format('%s (%s) solicitó el plan %s mediante %s.',
        COALESCE(NULLIF(trim(NEW.user_name), ''), 'Usuario'),
        COALESCE(NULLIF(trim(NEW.user_email), ''), 'sin email'),
        COALESCE(NEW.plan_type, 'sin plan'),
        COALESCE(NEW.payment_method, 'método no indicado'))
    END,
    CASE WHEN v_paid THEN 'owner_payment_activated' ELSE 'owner_upgrade_request' END,
    jsonb_build_object(
      'request_id', NEW.id,
      'user_id', NEW.user_id,
      'user_name', NEW.user_name,
      'user_email', NEW.user_email,
      'plan_type', NEW.plan_type,
      'payment_method', NEW.payment_method,
      'payment_reference', NEW.payment_reference,
      'payment_status', NEW.payment_status,
      'status', CASE WHEN v_paid THEN 'approved' ELSE NEW.status END,
      'owner_type', NEW.owner_type,
      'recipient_role', recipient.role,
      'target_roles', jsonb_build_array('admin', 'superadmin'),
      'actor_name', 'Sistema',
      'actor_role', 'sistema'
    )
  FROM public.users AS recipient
  WHERE recipient.role IN ('admin', 'superadmin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Existing audited events gain a readable actor label through actor_user_id;
-- this keeps user names normalized and avoids copying stale names into history.

CREATE OR REPLACE FUNCTION public.activate_owner_after_verified_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan public.owner_plans%ROWTYPE;
  v_user_name text;
  v_owner_type text;
BEGIN
  IF NEW.payment_status IS DISTINCT FROM 'completed'
     OR NEW.payment_metadata->>'requestType' = 'plan_change' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.payment_status IS NOT DISTINCT FROM NEW.payment_status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_plan
  FROM public.owner_plans
  WHERE type = NEW.plan_type AND is_active = true;
  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'El plan pagado ya no está disponible';
  END IF;

  v_owner_type := COALESCE(NEW.owner_type, 'individual');
  SELECT COALESCE(NULLIF(btrim(name), ''), email, 'Propietario')
  INTO v_user_name
  FROM public.users
  WHERE id = NEW.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe el usuario de la solicitud';
  END IF;

  UPDATE public.users
  SET role = 'owner',
      owner_type = v_owner_type,
      owner_request_status = 'approved',
      updated_at = now()
  WHERE id = NEW.user_id
    AND (role IS DISTINCT FROM 'owner' OR owner_type IS DISTINCT FROM v_owner_type);

  UPDATE public.owner_upgrade_requests
  SET status = 'approved',
      owner_type = v_owner_type,
      updated_at = now()
  WHERE id = NEW.id
    AND status IS DISTINCT FROM 'approved';

  INSERT INTO public.owner_subscriptions (
    user_id, plan_id, plan_type, status, payment_method, payment_status,
    amount, currency, start_date, end_date, is_yearly, auto_renew,
    payment_reference, terms_accepted, terms_accepted_at
  )
  SELECT NEW.user_id, v_plan.id, NEW.plan_type, 'active', NEW.payment_method,
    'completed', CASE WHEN NEW.is_yearly THEN v_plan.price_yearly ELSE v_plan.price_monthly END,
    v_plan.currency, now(),
    CASE WHEN NEW.is_yearly THEN now() + interval '1 year' ELSE now() + interval '1 month' END,
    NEW.is_yearly, false, NEW.payment_reference, true, now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.owner_subscriptions os
    WHERE os.user_id = NEW.user_id AND os.status IN ('pending', 'active')
  );

  INSERT INTO public.notifications (user_id, title, message, metadata)
  VALUES (
    NEW.user_id,
    'Ya eres propietario',
    format('El pago del plan %s se confirmó. Tu cuenta se actualizó automáticamente a propietario (%s).',
      NEW.plan_type, CASE WHEN v_owner_type = 'agency' THEN 'agencia inmobiliaria' ELSE 'particular' END),
    jsonb_build_object('event', 'owner_payment_activated', 'request_id', NEW.id,
      'owner_type', v_owner_type, 'actor_name', 'Sistema', 'actor_role', 'sistema')
  );

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.admin_notifications (recipient_user_id, title, message, type, metadata)
    SELECT a.user_id, 'Alta de propietario confirmada',
    format('%s completó el pago del plan %s y pasó automáticamente a propietario (%s).',
      v_user_name, NEW.plan_type, CASE WHEN v_owner_type = 'agency' THEN 'agencia inmobiliaria' ELSE 'particular' END),
    'owner_payment_activated',
    jsonb_build_object('target_roles', jsonb_build_array('admin', 'superadmin'),
      'target_user_id', NEW.user_id, 'target_user_name', v_user_name,
      'request_id', NEW.id, 'owner_type', v_owner_type,
      'actor_name', 'Sistema', 'actor_role', 'sistema')
    FROM public.administrators a
    WHERE a.status = 'active' AND a.role IN ('admin', 'superadmin');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_owner_after_verified_payment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS activate_owner_after_verified_payment_insert ON public.owner_upgrade_requests;
CREATE TRIGGER activate_owner_after_verified_payment_insert
  AFTER INSERT ON public.owner_upgrade_requests
  FOR EACH ROW EXECUTE FUNCTION public.activate_owner_after_verified_payment();
DROP TRIGGER IF EXISTS activate_owner_after_verified_payment_update ON public.owner_upgrade_requests;
CREATE TRIGGER activate_owner_after_verified_payment_update
  AFTER UPDATE OF payment_status ON public.owner_upgrade_requests
  FOR EACH ROW EXECUTE FUNCTION public.activate_owner_after_verified_payment();

CREATE OR REPLACE FUNCTION public.admin_update_platform_user(
  p_user_id uuid,
  p_role text,
  p_status text,
  p_owner_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_role text := public.user_role_for_rls(auth.uid());
  v_previous_type text;
  v_result jsonb;
BEGIN
  IF v_actor_role <> 'superadmin' AND p_owner_type IS NOT NULL THEN
    RAISE EXCEPTION 'Solo el superadmin puede asignar el tipo de propietario';
  END IF;
  IF p_role = 'owner' AND p_owner_type IS NOT NULL AND p_owner_type NOT IN ('individual', 'agency') THEN
    RAISE EXCEPTION 'Tipo de propietario no válido';
  END IF;

  SELECT owner_type INTO v_previous_type FROM public.users WHERE id = p_user_id;
  v_result := public.admin_update_platform_user(p_user_id, p_role, p_status);

  IF p_owner_type IS NOT NULL AND COALESCE(p_role, v_result->>'role') <> 'owner' THEN
    RAISE EXCEPTION 'El tipo solo se puede asignar a una cuenta propietaria';
  END IF;

  IF COALESCE(p_role, v_result->>'role') = 'owner' THEN
    UPDATE public.users
    SET owner_type = COALESCE(p_owner_type, v_previous_type, 'individual'), updated_at = now()
    WHERE id = p_user_id;
    v_result := v_result || jsonb_build_object('ownerType', COALESCE(p_owner_type, v_previous_type, 'individual'));
  END IF;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_platform_user(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_platform_user(uuid, text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
