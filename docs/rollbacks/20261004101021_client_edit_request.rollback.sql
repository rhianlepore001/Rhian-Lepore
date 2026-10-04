-- ROLLBACK de 20261004101021_client_edit_request
-- Idempotente. Restaura update/get/accept/reject/lead-time/history v2
-- exatamente como nas migrations anteriores (corpos atuais de prod).
-- Restaura cancel v2 ao corpo exato de 20261004082633 (PR-5).
-- CREATE OR REPLACE das v1 não altera grants.
--
-- ANTES de aplicar: reverter o frontend (Minha Área / link público chamam v2).

BEGIN;

-- Restaura v1 ANTES de dropar v2.
CREATE OR REPLACE FUNCTION public.update_public_booking_by_client(
  p_booking_id                UUID,
  p_phone                     TEXT,
  p_service_ids               UUID[],
  p_professional_id           UUID,
  p_appointment_time          TIMESTAMPTZ,
  p_original_appointment_time TIMESTAMPTZ,
  p_customer_name             TEXT,
  p_customer_phone            TEXT,
  p_total_price               NUMERIC,
  p_duration_minutes          INTEGER,
  p_product_lines             JSONB DEFAULT '[]'::jsonb
)
RETURNS SETOF public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public_bookings pb
  SET
    service_ids               = p_service_ids,
    professional_id           = p_professional_id,
    appointment_time          = p_appointment_time,
    original_appointment_time = p_original_appointment_time,
    updated_at                = NOW(),
    customer_name             = p_customer_name,
    customer_phone            = p_customer_phone,
    total_price               = p_total_price,
    status                    = 'pending',
    duration_minutes          = p_duration_minutes,
    is_edit                   = true,
    product_lines             = COALESCE(p_product_lines, '[]'::jsonb)
  WHERE pb.id = p_booking_id
    AND public.phones_match(pb.customer_phone, p_phone)
    AND pb.status IN ('pending', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'update_public_booking_by_client: booking not found or not editable';
  END IF;

  RETURN QUERY
  SELECT pb.*
  FROM public_bookings pb
  WHERE pb.id = p_booking_id
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_booking_by_id(
  p_booking_id UUID,
  p_phone      TEXT
)
RETURNS SETOF public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pb.*
  FROM public_bookings pb
  WHERE pb.id = p_booking_id
    AND public.phones_match(pb.customer_phone, p_phone)
    AND pb.status IN ('pending', 'confirmed')
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_public_booking(p_booking_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id TEXT;
  v_booking public.public_bookings%ROWTYPE;
  v_client_id UUID;
  v_service_names TEXT;
  v_professional_id UUID;
  v_appointment_id UUID;
  v_photo TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  v_company_id := public.get_auth_company_id();
  IF v_company_id IS NULL OR btrim(v_company_id) = '' THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  SELECT * INTO v_booking
  FROM public.public_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND OR v_booking.business_id IS DISTINCT FROM v_company_id THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_booking.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'booking_not_pending';
  END IF;

  SELECT c.id INTO v_client_id
  FROM public.clients c
  WHERE c.user_id::text = v_company_id
    AND public.phones_match(c.phone, v_booking.customer_phone)
  ORDER BY c.id
  LIMIT 1;

  SELECT pc.photo_url INTO v_photo
  FROM public.public_clients pc
  WHERE public.phones_match(pc.phone, v_booking.customer_phone)
    AND pc.business_id::text = v_company_id
  ORDER BY pc.created_at DESC
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (user_id, name, phone, email, photo_url)
    VALUES (
      v_company_id,
      v_booking.customer_name,
      v_booking.customer_phone,
      v_booking.customer_email,
      v_photo
    )
    RETURNING id INTO v_client_id;
  ELSIF v_photo IS NOT NULL THEN
    UPDATE public.clients
    SET photo_url = COALESCE(photo_url, v_photo)
    WHERE id = v_client_id
      AND user_id::text = v_company_id;
  END IF;

  SELECT string_agg(s.name, ', ' ORDER BY s.name)
    INTO v_service_names
  FROM public.services s
  WHERE s.user_id::text = v_company_id
    AND s.id = ANY (v_booking.service_ids);

  v_service_names := COALESCE(NULLIF(v_service_names, ''), 'Serviço');

  v_professional_id := v_booking.professional_id;
  IF v_professional_id IS NULL THEN
    SELECT tm.id INTO v_professional_id
    FROM public.team_members tm
    WHERE tm.user_id::text = v_company_id
      AND tm.active = true
      AND tm.deleted_at IS NULL
    ORDER BY tm.is_owner DESC NULLS LAST, tm.display_order NULLS LAST, tm.created_at
    LIMIT 1;
  END IF;

  INSERT INTO public.appointments (
    user_id,
    client_id,
    professional_id,
    service,
    appointment_time,
    price,
    status,
    duration_minutes,
    public_booking_id
  ) VALUES (
    v_company_id,
    v_client_id,
    v_professional_id,
    v_service_names,
    v_booking.appointment_time,
    v_booking.total_price,
    'Confirmed',
    COALESCE(v_booking.duration_minutes, 30),
    v_booking.id
  )
  RETURNING id INTO v_appointment_id;

  UPDATE public.public_bookings
  SET status = 'confirmed',
      updated_at = NOW()
  WHERE id = v_booking.id
    AND business_id = v_company_id;

  BEGIN
    PERFORM public.copy_booking_products_to_appointment(v_booking.id, v_appointment_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN json_build_object(
    'appointment_id', v_appointment_id,
    'booking_id', v_booking.id,
    'service_names', v_service_names,
    'customer_name', v_booking.customer_name,
    'customer_phone', v_booking.customer_phone,
    'appointment_time', v_booking.appointment_time,
    'total_price', v_booking.total_price
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_public_booking(p_booking_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id TEXT;
  v_updated INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  v_company_id := public.get_auth_company_id();
  IF v_company_id IS NULL OR btrim(v_company_id) = '' THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  UPDATE public.public_bookings
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_booking_id
    AND business_id = v_company_id
    AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_lead_time_on_public_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lead integer;
  v_was_active boolean;
  v_now_active boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid()::text = NEW.business_id THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.staff_user_id = auth.uid()
      AND tm.user_id = NEW.business_id
      AND tm.active IS TRUE
      AND tm.deleted_at IS NULL
  ) THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.status, 'pending') NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_was_active := COALESCE(OLD.status, 'pending') IN ('pending', 'confirmed');
    v_now_active := COALESCE(NEW.status, 'pending') IN ('pending', 'confirmed');
    IF NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time
       AND NOT (NOT v_was_active AND v_now_active) THEN
      RETURN NEW;
    END IF;
  END IF;

  v_lead := public.public_booking_lead_time_hours(NEW.business_id);

  IF NEW.appointment_time < NOW() + make_interval(hours => v_lead) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'lead_time_violation',
      DETAIL = v_lead::text,
      HINT = 'lead_time_violation';
  END IF;

  RETURN NEW;
END;
$function$;

-- Cancel v2: corpo EXATO de 20261004082633_client_cancel_cutoff.sql
CREATE OR REPLACE FUNCTION public.cancel_public_booking_by_client_v2(
  p_booking_id uuid,
  p_phone text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking public.public_bookings%ROWTYPE;
  v_cutoff integer;
  v_digits_in text;
  v_digits_stored text;
  v_updated integer;
BEGIN
  -- TODO(PR-9): depósito pago — ainda não há regra de cancelamento/reembolso.
  v_digits_in := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF v_digits_in = '' THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  SELECT * INTO v_booking
  FROM public.public_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  v_digits_stored := regexp_replace(COALESCE(v_booking.customer_phone, ''), '\D', '', 'g');
  IF v_digits_stored = '' OR v_digits_stored IS DISTINCT FROM v_digits_in THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_booking.status IS DISTINCT FROM 'pending'
     AND v_booking.status IS DISTINCT FROM 'confirmed' THEN
    RAISE EXCEPTION 'booking_not_cancellable';
  END IF;

  IF v_booking.appointment_time <= now() THEN
    RAISE EXCEPTION 'booking_not_cancellable';
  END IF;

  IF v_booking.status = 'confirmed' THEN
    SELECT bs.client_cancel_cutoff_hours
      INTO v_cutoff
    FROM public.business_settings bs
    WHERE bs.user_id::text = v_booking.business_id
    LIMIT 1;
    v_cutoff := COALESCE(v_cutoff, 2);

    IF v_cutoff <= 0
       OR now() > (v_booking.appointment_time - make_interval(hours => v_cutoff)) THEN
      RAISE EXCEPTION 'cancel_window_closed';
    END IF;
  END IF;

  UPDATE public.public_bookings
     SET status = 'cancelled',
         updated_at = NOW()
   WHERE id = v_booking.id
     AND status IN ('pending', 'confirmed');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'booking_not_cancellable';
  END IF;

  -- Libera a agenda. Pedido já está cancelled: #98 não reescreve (WHERE
  -- status = 'confirmed'); #123 retorna cedo para cancelled.
  UPDATE public.appointments a
     SET status = 'Cancelled',
         updated_at = NOW()
   WHERE a.id IN (
     SELECT l.appointment_id
     FROM public.public_booking_linked_appointments(v_booking.id) l
     WHERE l.status IS DISTINCT FROM 'Cancelled'
   );

  RETURN true;
END;
$function$;

DROP FUNCTION IF EXISTS public.update_public_booking_by_client_v2(uuid, text, uuid[], uuid, timestamptz, timestamptz, text, text, numeric, integer, jsonb);
DROP FUNCTION IF EXISTS public.get_booking_by_id_v2(uuid, text);
DROP FUNCTION IF EXISTS public.accept_public_booking_v2(uuid);
DROP FUNCTION IF EXISTS public.reject_public_booking_v2(uuid);
DROP FUNCTION IF EXISTS public.client_edit_request_slot_conflict(text, timestamptz, integer, uuid, uuid, boolean);

DROP FUNCTION IF EXISTS public.get_client_bookings_history_v2(text, uuid);
CREATE FUNCTION public.get_client_bookings_history_v2(
  p_phone text,
  p_business_id uuid
)
RETURNS TABLE (
  id uuid,
  appointment_time timestamptz,
  status text,
  service_ids uuid[],
  service_names text[],
  professional_id uuid,
  professional_name text,
  total_price decimal,
  duration_minutes integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    pb.id,
    pb.appointment_time,
    public.derive_client_booking_status(
      pb.status::text,
      pb.id,
      pb.business_id,
      pb.appointment_time,
      pb.professional_id,
      pb.customer_phone
    ) AS status,
    pb.service_ids,
    ARRAY(
      SELECT s.name
      FROM services s
      WHERE s.id = ANY(pb.service_ids)
      ORDER BY array_position(pb.service_ids, s.id)
    ) AS service_names,
    pb.professional_id,
    tm.name AS professional_name,
    pb.total_price,
    pb.duration_minutes,
    pb.created_at
  FROM public_bookings pb
  LEFT JOIN team_members tm ON tm.id = pb.professional_id
  WHERE regexp_replace(COALESCE(pb.customer_phone, ''), '\D', '', 'g') <> ''
    AND regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g') <> ''
    AND regexp_replace(COALESCE(pb.customer_phone, ''), '\D', '', 'g')
      = regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g')
    AND pb.business_id = p_business_id::text
  ORDER BY pb.appointment_time DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_client_bookings_history_v2(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_bookings_history_v2(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_bookings_history_v2(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_bookings_history_v2(text, uuid) TO service_role;

ALTER TABLE public.public_bookings
  DROP COLUMN IF EXISTS original_professional_id,
  DROP COLUMN IF EXISTS original_service_ids,
  DROP COLUMN IF EXISTS original_duration_minutes,
  DROP COLUMN IF EXISTS original_total_price,
  DROP COLUMN IF EXISTS original_product_lines;

ALTER TABLE public.business_settings
  DROP COLUMN IF EXISTS service_only_edit_skip_acceptance;

COMMIT;
