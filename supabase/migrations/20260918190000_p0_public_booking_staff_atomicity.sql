-- P0 CAM-001/014/016: staff no tenant + insert atômico + cancelamento com prova de telefone.
-- Idempotente. Não reabre EXECUTE anon em RPCs de financeiro/purge/delete.
-- Não amplia SELECT anon em public_bookings.

ALTER TABLE public.public_bookings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_edit BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- --------------------------------------------------------------------------
-- Helpers de tenant: profiles.id é TEXT; auth.uid() é UUID.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id TEXT;
BEGIN
  SELECT COALESCE(NULLIF(btrim(company_id), ''), id)
    INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid()::text;
  RETURN v_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()::text;
  RETURN v_role;
END;
$$;

-- --------------------------------------------------------------------------
-- CAM-001: staff da empresa lê/atualiza public_bookings do tenant.
-- INSERT público continua só pending via public_bookings_insert_anon.
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public bookings: company read" ON public.public_bookings;
CREATE POLICY "Public bookings: company read"
  ON public.public_bookings
  FOR SELECT
  TO authenticated
  USING (business_id = public.get_auth_company_id());

DROP POLICY IF EXISTS "Public bookings: company update" ON public.public_bookings;
CREATE POLICY "Public bookings: company update"
  ON public.public_bookings
  FOR UPDATE
  TO authenticated
  USING (business_id = public.get_auth_company_id())
  WITH CHECK (business_id = public.get_auth_company_id());

DROP POLICY IF EXISTS "Staff insert company appointments" ON public.appointments;
CREATE POLICY "Staff insert company appointments"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.get_auth_company_id());

-- --------------------------------------------------------------------------
-- Overlap compartilhado (appointments + public_bookings pending/confirmed)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_booking_slot_busy(
  p_business_id TEXT,
  p_appointment_time TIMESTAMPTZ,
  p_duration_minutes INTEGER,
  p_professional_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.user_id::text = p_business_id
      AND COALESCE(a.status, '') IS DISTINCT FROM 'Cancelled'
      AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
      AND a.appointment_time < p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
      AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_appointment_time

    UNION ALL

    SELECT 1
    FROM public.public_bookings pb
    WHERE pb.business_id = p_business_id
      AND pb.status IN ('pending', 'confirmed')
      AND (p_professional_id IS NULL OR pb.professional_id = p_professional_id)
      AND pb.appointment_time < p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
      AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_appointment_time
  );
$$;

REVOKE ALL ON FUNCTION public.public_booking_slot_busy(TEXT, TIMESTAMPTZ, INTEGER, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_booking_slot_busy(TEXT, TIMESTAMPTZ, INTEGER, UUID) TO authenticated;

-- --------------------------------------------------------------------------
-- CAM-014: INSERT público atômico com revalidação de slot
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_public_booking(
  TEXT, TEXT, TEXT, UUID[], UUID, TIMESTAMPTZ, NUMERIC, INTEGER, JSONB
);

CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_business_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_service_ids UUID[],
  p_professional_id UUID,
  p_appointment_time TIMESTAMPTZ,
  p_total_price NUMERIC,
  p_duration_minutes INTEGER,
  p_product_lines JSONB DEFAULT '[]'::jsonb
)
RETURNS SETOF public.public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id TEXT;
  v_duration INTEGER;
  v_booking public.public_bookings%ROWTYPE;
BEGIN
  v_business_id := btrim(COALESCE(p_business_id, ''));
  IF v_business_id = '' THEN
    RAISE EXCEPTION 'invalid_business';
  END IF;

  IF btrim(COALESCE(p_customer_name, '')) = '' OR btrim(COALESCE(p_customer_phone, '')) = '' THEN
    RAISE EXCEPTION 'invalid_customer';
  END IF;

  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'invalid_services';
  END IF;

  IF p_appointment_time IS NULL OR p_appointment_time <= NOW() THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  v_duration := GREATEST(COALESCE(p_duration_minutes, 30), 1);

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_business_id
  ) THEN
    RAISE EXCEPTION 'invalid_business';
  END IF;

  IF p_professional_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.id = p_professional_id
      AND tm.user_id::text = v_business_id
      AND tm.active = true
      AND tm.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid_professional';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_business_id, 0));

  IF public.public_booking_slot_busy(
    v_business_id,
    p_appointment_time,
    v_duration,
    p_professional_id
  ) THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  INSERT INTO public.public_bookings (
    business_id,
    customer_name,
    customer_phone,
    service_ids,
    professional_id,
    appointment_time,
    total_price,
    status,
    duration_minutes,
    product_lines
  ) VALUES (
    v_business_id,
    btrim(p_customer_name),
    btrim(p_customer_phone),
    p_service_ids,
    p_professional_id,
    p_appointment_time,
    COALESCE(p_total_price, 0),
    'pending',
    v_duration,
    COALESCE(p_product_lines, '[]'::jsonb)
  )
  RETURNING * INTO v_booking;

  RETURN NEXT v_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_booking(
  TEXT, TEXT, TEXT, UUID[], UUID, TIMESTAMPTZ, NUMERIC, INTEGER, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_booking(
  TEXT, TEXT, TEXT, UUID[], UUID, TIMESTAMPTZ, NUMERIC, INTEGER, JSONB
) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- CAM-001: listar / aceitar / recusar no tenant autenticado (sem anon)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_company_pending_public_bookings()
RETURNS SETOF public.public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  v_company_id := public.get_auth_company_id();
  IF v_company_id IS NULL OR btrim(v_company_id) = '' THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  RETURN QUERY
  SELECT pb.*
  FROM public.public_bookings pb
  WHERE pb.business_id = v_company_id
    AND pb.status = 'pending'
  ORDER BY pb.appointment_time;
END;
$$;

REVOKE ALL ON FUNCTION public.list_company_pending_public_bookings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_company_pending_public_bookings() TO authenticated;

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
    CASE WHEN COALESCE(v_booking.is_edit, false) THEN v_booking.id ELSE NULL END
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

REVOKE ALL ON FUNCTION public.reject_public_booking(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_public_booking(UUID) TO authenticated;

-- --------------------------------------------------------------------------
-- CAM-016: cliente cancela o próprio pending/confirmed com prova de telefone
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_public_booking_by_client(
  p_booking_id UUID,
  p_phone TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  IF btrim(COALESCE(p_phone, '')) = '' THEN
    RAISE EXCEPTION 'booking_not_cancellable';
  END IF;

  UPDATE public.public_bookings pb
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE pb.id = p_booking_id
    AND public.phones_match(pb.customer_phone, p_phone)
    AND pb.status IN ('pending', 'confirmed');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'booking_not_cancellable';
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_public_booking_by_client(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_public_booking_by_client(UUID, TEXT) TO anon, authenticated;
