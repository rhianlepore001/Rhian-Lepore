-- Extras do harness PR-6. Carregar DEPOIS de PR-4 + PR-5.
-- Instala o estado ATUAL (v1) de edição/aceite/recusa para a migration substituir.
-- Postgres descartável. Não toca produção.

ALTER TABLE public.public_bookings
  ADD COLUMN IF NOT EXISTS is_edit boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_appointment_time timestamptz,
  ADD COLUMN IF NOT EXISTS product_lines jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS booking_lead_time_hours integer DEFAULT 2;

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS enable_self_rescheduling boolean DEFAULT true;

UPDATE public.profiles
   SET booking_lead_time_hours = 2
 WHERE booking_lead_time_hours IS NULL;

CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT;
BEGIN
  SELECT COALESCE(NULLIF(btrim(company_id), ''), id)
    INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid()::text;
  RETURN v_company_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.public_booking_lead_time_hours(p_business_id text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT GREATEST(COALESCE(
    (
      SELECT p.booking_lead_time_hours
      FROM public.profiles p
      WHERE p.id = p_business_id
      LIMIT 1
    ),
    2
  ), 0);
$function$;
REVOKE ALL ON FUNCTION public.public_booking_lead_time_hours(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_booking_lead_time_hours(text) TO service_role;

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

DROP TRIGGER IF EXISTS enforce_lead_time_on_public_bookings ON public.public_bookings;
CREATE TRIGGER enforce_lead_time_on_public_bookings
  BEFORE INSERT OR UPDATE OF appointment_time, status
  ON public.public_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_lead_time_on_public_bookings();

CREATE TABLE IF NOT EXISTS public.agenda_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  professional_id uuid,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_blocks TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.agenda_interval_blocked(
  p_user_id text,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.agenda_blocks b
    WHERE b.user_id = p_user_id
      AND (p_professional_id IS NULL OR b.professional_id IS NOT DISTINCT FROM p_professional_id)
      AND b.starts_at < p_ends_at
      AND b.ends_at > p_starts_at
  );
$function$;
REVOKE ALL ON FUNCTION public.agenda_interval_blocked(text, uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agenda_interval_blocked(text, uuid, timestamptz, timestamptz) TO service_role;

CREATE TABLE IF NOT EXISTS public.public_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  name text,
  phone text,
  photo_url text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_clients TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.copy_booking_products_to_appointment(p_booking_id uuid, p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN;
END;
$function$;

-- Slot: appointment ativo OU pedido pending/confirmed no mesmo instante.
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_business_id uuid,
  p_date date,
  p_professional_id uuid DEFAULT NULL,
  p_duration_min integer DEFAULT 30,
  p_is_professional boolean DEFAULT false
)
RETURNS TABLE(slot_time timestamptz)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT gs::timestamptz
  FROM generate_series(
    p_date::timestamp,
    p_date::timestamp + interval '23 hours 30 minutes',
    interval '30 minutes'
  ) AS gs
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.user_id = p_business_id::text
      AND a.appointment_time = gs::timestamptz
      AND a.status IS DISTINCT FROM 'Cancelled'
      AND a.status IS DISTINCT FROM 'NoShow'
      AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.public_bookings pb
    WHERE pb.business_id = p_business_id::text
      AND pb.appointment_time = gs::timestamptz
      AND pb.status IN ('pending', 'confirmed')
      AND (p_professional_id IS NULL OR pb.professional_id = p_professional_id)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, date, uuid, integer, boolean) TO anon, authenticated, service_role;

-- v1 atuais (antes do PR-6) -------------------------------------------------
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
GRANT EXECUTE ON FUNCTION public.get_booking_by_id(UUID, TEXT) TO anon, authenticated;

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
GRANT EXECUTE ON FUNCTION public.update_public_booking_by_client(
  UUID, TEXT, UUID[], UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, NUMERIC, INTEGER, JSONB
) TO anon, authenticated;

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

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (user_id, name, phone, email)
    VALUES (v_company_id, v_booking.customer_name, v_booking.customer_phone, v_booking.customer_email)
    RETURNING id INTO v_client_id;
  END IF;

  SELECT string_agg(s.name, ', ' ORDER BY s.name)
    INTO v_service_names
  FROM public.services s
  WHERE s.user_id::text = v_company_id
    AND s.id = ANY (v_booking.service_ids);

  v_service_names := COALESCE(NULLIF(v_service_names, ''), 'Serviço');
  v_professional_id := v_booking.professional_id;

  INSERT INTO public.appointments (
    user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_company_id, v_client_id, v_professional_id, v_service_names,
    v_booking.appointment_time, v_booking.total_price, 'Confirmed',
    COALESCE(v_booking.duration_minutes, 30), v_booking.id
  )
  RETURNING id INTO v_appointment_id;

  UPDATE public.public_bookings
  SET status = 'confirmed', updated_at = NOW()
  WHERE id = v_booking.id AND business_id = v_company_id;

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
REVOKE ALL ON FUNCTION public.accept_public_booking(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_public_booking(UUID) TO authenticated;

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
  SET status = 'cancelled', updated_at = NOW()
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
REVOKE ALL ON FUNCTION public.reject_public_booking(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_public_booking(UUID) TO authenticated;

INSERT INTO public.team_members (id, user_id, name, is_owner, active)
VALUES (
  '10000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000000a0',
  'Aline', false, true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.services (id, user_id, name, price, duration_minutes)
VALUES (
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-0000000000a0',
  'Barba', 25, 20
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.business_settings
   SET enable_self_rescheduling = true
 WHERE user_id = '00000000-0000-0000-0000-0000000000a0';
