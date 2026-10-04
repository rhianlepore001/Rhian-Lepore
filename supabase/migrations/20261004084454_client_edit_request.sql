-- PR-6: edição do cliente vira pedido de alteração (sem duplicar agendamento).
-- Aditivo. v1 update/get/accept/reject (mesma assinatura) encaminham para v2.
--
-- "Edit pending" = status='pending' AND is_edit. Não confiar em is_edit sozinho:
-- prod tem confirmed com is_edit=true (accept antigo não limpava). Confirmed
-- sempre faz snapshot fresco de original_* a partir dos valores atuais.
-- Accept v2 edit-pending: MOVE o mesmo appointment. Reject v2: restaura
-- original e volta a confirmed (não cancela).
-- Pending (Aguardando, sem is_edit): substitui direto, sem camada de aprovação.
-- Cancel v2: edit-pending aplica o cutoff PR-5 contra original_appointment_time.
--
-- Identidade = igualdade de dígitos (como cancel v2), NÃO phones_match/last-8.
-- enable_self_rescheduling recusado no servidor. Cutoff = client_cancel_cutoff_hours
-- (0 = não altera online). Lead time via trigger #121; reject de edição NÃO
-- dispara lead_time no horário original.
-- service_only_edit_skip_acceptance default false; NÃO vai no JSON público.
--
-- ROLLBACK: docs/rollbacks/20261004084454_client_edit_request.rollback.sql
-- Reverter o frontend ANTES (Minha Área / link público chamam v2).

-- 1) Colunas -----------------------------------------------------------------
ALTER TABLE public.public_bookings
  ADD COLUMN IF NOT EXISTS original_professional_id uuid,
  ADD COLUMN IF NOT EXISTS original_service_ids uuid[],
  ADD COLUMN IF NOT EXISTS original_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS original_total_price numeric,
  ADD COLUMN IF NOT EXISTS original_product_lines jsonb;

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS service_only_edit_skip_acceptance boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.business_settings.service_only_edit_skip_acceptance IS
  'Se true, o cliente pode trocar só o(s) serviço(s) sem aprovação, quando a nova duração cabe no horário. Padrão false.';

-- 2) Helper interno: conflito de slot (exclui o próprio pedido) --------------
CREATE OR REPLACE FUNCTION public.client_edit_request_slot_conflict(
  p_business_id text,
  p_starts timestamptz,
  p_duration integer,
  p_professional_id uuid,
  p_exclude_booking_id uuid,
  p_exclude_linked boolean
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_end timestamptz;
  v_linked uuid[] := '{}';
  v_mins integer;
BEGIN
  v_mins := GREATEST(COALESCE(p_duration, 30), 1);
  v_end := p_starts + make_interval(mins => v_mins);

  IF p_exclude_linked AND p_exclude_booking_id IS NOT NULL THEN
    SELECT COALESCE(array_agg(l.appointment_id), '{}')
      INTO v_linked
    FROM public.public_booking_linked_appointments(p_exclude_booking_id) l;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.user_id::text = p_business_id
      AND COALESCE(a.status, '') NOT IN ('Cancelled', 'NoShow')
      AND (p_professional_id IS NULL OR a.professional_id IS NOT DISTINCT FROM p_professional_id)
      AND NOT (a.id = ANY (v_linked))
      AND a.appointment_time < v_end
      AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_starts
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.public_bookings pb
    WHERE pb.business_id = p_business_id
      AND pb.id IS DISTINCT FROM p_exclude_booking_id
      AND pb.status IN ('pending', 'confirmed')
      AND (p_professional_id IS NULL OR pb.professional_id IS NOT DISTINCT FROM p_professional_id)
      AND pb.appointment_time < v_end
      AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_starts
  ) THEN
    RETURN true;
  END IF;

  IF public.agenda_interval_blocked(p_business_id, p_professional_id, p_starts, v_end) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION public.client_edit_request_slot_conflict(text, timestamptz, integer, uuid, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.client_edit_request_slot_conflict(text, timestamptz, integer, uuid, uuid, boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_edit_request_slot_conflict(text, timestamptz, integer, uuid, uuid, boolean) TO service_role;

-- 3) Lead time: recusa de edição não valida o horário original ---------------
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
    -- Restaurar pedido de alteração (reject): o horário original já estava reservado.
    IF OLD.status = 'pending'
       AND COALESCE(OLD.is_edit, false)
       AND NEW.status = 'confirmed'
       AND NEW.appointment_time IS NOT DISTINCT FROM OLD.original_appointment_time THEN
      RETURN NEW;
    END IF;

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

-- 4) update v2 ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_public_booking_by_client_v2(
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
RETURNS SETOF public.public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking public.public_bookings%ROWTYPE;
  v_digits_in text;
  v_digits_stored text;
  v_allow boolean;
  v_cutoff integer;
  v_skip boolean;
  v_duration integer;
  v_reserved_time timestamptz;
  v_reserved_pro uuid;
  v_same_slot boolean;
  v_fits boolean;
  v_already_edit boolean;
BEGIN
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

  SELECT COALESCE(bs.enable_self_rescheduling, true),
         COALESCE(bs.client_cancel_cutoff_hours, 2),
         COALESCE(bs.service_only_edit_skip_acceptance, false)
    INTO v_allow, v_cutoff, v_skip
  FROM public.business_settings bs
  WHERE bs.user_id::text = v_booking.business_id
  LIMIT 1;
  v_allow := COALESCE(v_allow, true);
  v_cutoff := COALESCE(v_cutoff, 2);
  v_skip := COALESCE(v_skip, false);

  IF NOT v_allow THEN
    RAISE EXCEPTION 'self_rescheduling_disabled';
  END IF;

  IF v_booking.status IS DISTINCT FROM 'pending'
     AND v_booking.status IS DISTINCT FROM 'confirmed' THEN
    RAISE EXCEPTION 'booking_not_editable';
  END IF;

  v_already_edit := (v_booking.status = 'pending' AND COALESCE(v_booking.is_edit, false));
  v_reserved_time := CASE
    WHEN v_already_edit THEN COALESCE(v_booking.original_appointment_time, v_booking.appointment_time)
    ELSE v_booking.appointment_time
  END;
  v_reserved_pro := CASE
    WHEN v_already_edit THEN COALESCE(v_booking.original_professional_id, v_booking.professional_id)
    ELSE v_booking.professional_id
  END;

  IF v_booking.status = 'confirmed' OR v_already_edit THEN
    IF EXISTS (
      SELECT 1
      FROM public.public_booking_linked_appointments(v_booking.id) l
      WHERE l.status IN ('Completed', 'NoShow')
    ) THEN
      RAISE EXCEPTION 'booking_not_editable';
    END IF;
    IF v_reserved_time <= now() THEN
      RAISE EXCEPTION 'booking_not_editable';
    END IF;
    IF v_cutoff <= 0
       OR now() > (v_reserved_time - make_interval(hours => v_cutoff)) THEN
      RAISE EXCEPTION 'cancel_window_closed';
    END IF;
  ELSE
    IF v_booking.appointment_time <= now() THEN
      RAISE EXCEPTION 'booking_not_editable';
    END IF;
  END IF;

  IF p_appointment_time IS NULL OR p_appointment_time <= now() THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'invalid_services';
  END IF;

  v_duration := LEAST(1440, GREATEST(COALESCE(p_duration_minutes, 30), 1));

  v_same_slot := p_appointment_time IS NOT DISTINCT FROM v_reserved_time
    AND p_professional_id IS NOT DISTINCT FROM v_reserved_pro;

  -- Troca só serviço, setting ON, cabe no horário, pedido confirmed (não é 2ª edição).
  IF v_booking.status = 'confirmed'
     AND NOT v_already_edit
     AND v_skip
     AND v_same_slot THEN
    v_fits := NOT public.client_edit_request_slot_conflict(
      v_booking.business_id,
      p_appointment_time,
      v_duration,
      p_professional_id,
      v_booking.id,
      true
    );
    IF v_fits THEN
      UPDATE public.public_bookings pb
      SET
        service_ids = p_service_ids,
        duration_minutes = v_duration,
        total_price = COALESCE(p_total_price, pb.total_price),
        product_lines = COALESCE(p_product_lines, '[]'::jsonb),
        customer_name = COALESCE(NULLIF(btrim(p_customer_name), ''), pb.customer_name),
        customer_phone = COALESCE(NULLIF(btrim(p_customer_phone), ''), pb.customer_phone),
        updated_at = NOW()
      WHERE pb.id = v_booking.id;

      UPDATE public.appointments a
      SET
        duration_minutes = v_duration,
        price = COALESCE(p_total_price, a.price),
        service = COALESCE((
          SELECT string_agg(s.name, ', ' ORDER BY s.name)
          FROM public.services s
          WHERE s.user_id::text = v_booking.business_id
            AND s.id = ANY (p_service_ids)
        ), a.service),
        updated_at = NOW()
      WHERE a.id IN (
        SELECT l.appointment_id
        FROM public.public_booking_linked_appointments(v_booking.id) l
        WHERE l.status IS DISTINCT FROM 'Cancelled'
      );

      RETURN QUERY
      SELECT pb.* FROM public.public_bookings pb WHERE pb.id = v_booking.id LIMIT 1;
      RETURN;
    END IF;
  END IF;

  -- Pedido ainda Aguardando (não é edição de confirmado): substitui direto.
  IF v_booking.status = 'pending' AND NOT v_already_edit THEN
    IF public.client_edit_request_slot_conflict(
      v_booking.business_id, p_appointment_time, v_duration, p_professional_id,
      v_booking.id, false
    ) THEN
      RAISE EXCEPTION 'slot_unavailable';
    END IF;

    UPDATE public.public_bookings pb
    SET
      service_ids = p_service_ids,
      professional_id = p_professional_id,
      appointment_time = p_appointment_time,
      duration_minutes = v_duration,
      total_price = COALESCE(p_total_price, pb.total_price),
      product_lines = COALESCE(p_product_lines, '[]'::jsonb),
      customer_name = COALESCE(NULLIF(btrim(p_customer_name), ''), pb.customer_name),
      customer_phone = COALESCE(NULLIF(btrim(p_customer_phone), ''), pb.customer_phone),
      updated_at = NOW(),
      is_edit = false
    WHERE pb.id = v_booking.id;

    RETURN QUERY
    SELECT pb.* FROM public.public_bookings pb WHERE pb.id = v_booking.id LIMIT 1;
    RETURN;
  END IF;

  -- Pedido de alteração (confirmed, ou 2ª edição ainda pending).
  -- Sempre exclui os appointments ligados ao próprio pedido (o original
  -- continua reservado; senão mover 30 min no mesmo pro conflita consigo).
  IF public.client_edit_request_slot_conflict(
    v_booking.business_id, p_appointment_time, v_duration, p_professional_id,
    v_booking.id, true
  ) THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  UPDATE public.public_bookings pb
  SET
    original_appointment_time = CASE
      WHEN v_already_edit THEN pb.original_appointment_time
      ELSE pb.appointment_time
    END,
    original_professional_id = CASE
      WHEN v_already_edit THEN pb.original_professional_id
      ELSE pb.professional_id
    END,
    original_service_ids = CASE
      WHEN v_already_edit THEN pb.original_service_ids
      ELSE pb.service_ids
    END,
    original_duration_minutes = CASE
      WHEN v_already_edit THEN pb.original_duration_minutes
      ELSE pb.duration_minutes
    END,
    original_total_price = CASE
      WHEN v_already_edit THEN pb.original_total_price
      ELSE pb.total_price
    END,
    original_product_lines = CASE
      WHEN v_already_edit THEN pb.original_product_lines
      ELSE pb.product_lines
    END,
    service_ids = p_service_ids,
    professional_id = p_professional_id,
    appointment_time = p_appointment_time,
    duration_minutes = v_duration,
    total_price = COALESCE(p_total_price, pb.total_price),
    product_lines = COALESCE(p_product_lines, '[]'::jsonb),
    customer_name = COALESCE(NULLIF(btrim(p_customer_name), ''), pb.customer_name),
    customer_phone = COALESCE(NULLIF(btrim(p_customer_phone), ''), pb.customer_phone),
    status = 'pending',
    is_edit = true,
    updated_at = NOW()
  WHERE pb.id = v_booking.id;

  RETURN QUERY
  SELECT pb.* FROM public.public_bookings pb WHERE pb.id = v_booking.id LIMIT 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_public_booking_by_client_v2(uuid, text, uuid[], uuid, timestamptz, timestamptz, text, text, numeric, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_public_booking_by_client_v2(uuid, text, uuid[], uuid, timestamptz, timestamptz, text, text, numeric, integer, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_public_booking_by_client_v2(uuid, text, uuid[], uuid, timestamptz, timestamptz, text, text, numeric, integer, jsonb) TO service_role;

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
RETURNS SETOF public.public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.update_public_booking_by_client_v2(
    p_booking_id, p_phone, p_service_ids, p_professional_id,
    p_appointment_time, p_original_appointment_time, p_customer_name,
    p_customer_phone, p_total_price, p_duration_minutes, p_product_lines
  );
END;
$function$;

-- 5) get_booking v2 ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_booking_by_id_v2(
  p_booking_id UUID,
  p_phone      TEXT
)
RETURNS SETOF public.public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_digits_in text;
  v_allow boolean;
BEGIN
  v_digits_in := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF v_digits_in = '' THEN
    RETURN;
  END IF;

  SELECT COALESCE(bs.enable_self_rescheduling, true)
    INTO v_allow
  FROM public.public_bookings pb
  LEFT JOIN public.business_settings bs ON bs.user_id::text = pb.business_id
  WHERE pb.id = p_booking_id
  LIMIT 1;

  IF COALESCE(v_allow, true) IS NOT TRUE THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT pb.*
  FROM public.public_bookings pb
  WHERE pb.id = p_booking_id
    AND regexp_replace(COALESCE(pb.customer_phone, ''), '\D', '', 'g') <> ''
    AND regexp_replace(COALESCE(pb.customer_phone, ''), '\D', '', 'g') = v_digits_in
    AND pb.status IN ('pending', 'confirmed')
  LIMIT 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_booking_by_id_v2(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_by_id_v2(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_by_id_v2(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_booking_by_id(
  p_booking_id UUID,
  p_phone      TEXT
)
RETURNS SETOF public.public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT * FROM public.get_booking_by_id_v2(p_booking_id, p_phone);
END;
$function$;

-- 6) accept v2 ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_public_booking_v2(p_booking_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT;
  v_booking public.public_bookings%ROWTYPE;
  v_client_id UUID;
  v_service_names TEXT;
  v_professional_id UUID;
  v_appointment_id UUID;
  v_photo TEXT;
  v_is_edit boolean;
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

  v_is_edit := (v_booking.status = 'pending' AND COALESCE(v_booking.is_edit, false));

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

  IF v_is_edit THEN
    IF COALESCE(v_booking.original_appointment_time, v_booking.appointment_time) <= now()
       OR EXISTS (
         SELECT 1
         FROM public.public_booking_linked_appointments(v_booking.id) l
         WHERE l.status IN ('Completed', 'NoShow')
       ) THEN
      RAISE EXCEPTION 'booking_not_pending';
    END IF;

    SELECT l.appointment_id
      INTO v_appointment_id
    FROM public.public_booking_linked_appointments(v_booking.id) l
    WHERE l.status IS DISTINCT FROM 'Cancelled'
    ORDER BY l.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_appointment_id IS NOT NULL THEN
      IF public.client_edit_request_slot_conflict(
        v_company_id,
        v_booking.appointment_time,
        COALESCE(v_booking.duration_minutes, 30),
        v_professional_id,
        v_booking.id,
        true
      ) THEN
        RAISE EXCEPTION 'slot_unavailable';
      END IF;

      UPDATE public.appointments
      SET
        appointment_time = v_booking.appointment_time,
        professional_id = v_professional_id,
        duration_minutes = COALESCE(v_booking.duration_minutes, 30),
        price = v_booking.total_price,
        service = v_service_names,
        status = 'Confirmed',
        updated_at = NOW()
      WHERE id = v_appointment_id
        AND user_id = v_company_id;
    END IF;
  END IF;

  IF v_appointment_id IS NULL THEN
    INSERT INTO public.appointments (
      user_id, client_id, professional_id, service, appointment_time, price, status,
      duration_minutes, public_booking_id
    ) VALUES (
      v_company_id, v_client_id, v_professional_id, v_service_names,
      v_booking.appointment_time, v_booking.total_price, 'Confirmed',
      COALESCE(v_booking.duration_minutes, 30), v_booking.id
    )
    RETURNING id INTO v_appointment_id;
  END IF;

  UPDATE public.public_bookings
  SET
    status = 'confirmed',
    is_edit = false,
    original_appointment_time = NULL,
    original_professional_id = NULL,
    original_service_ids = NULL,
    original_duration_minutes = NULL,
    original_total_price = NULL,
    original_product_lines = NULL,
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
$function$;

REVOKE ALL ON FUNCTION public.accept_public_booking_v2(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_public_booking_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_public_booking_v2(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.accept_public_booking(p_booking_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.accept_public_booking_v2(p_booking_id);
END;
$function$;

-- 7) reject v2 ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_public_booking_v2(p_booking_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT;
  v_booking public.public_bookings%ROWTYPE;
  v_updated INT;
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
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_booking.status = 'pending' AND COALESCE(v_booking.is_edit, false) THEN
    UPDATE public.public_bookings
    SET
      appointment_time = COALESCE(original_appointment_time, appointment_time),
      professional_id = COALESCE(original_professional_id, professional_id),
      service_ids = COALESCE(original_service_ids, service_ids),
      duration_minutes = COALESCE(original_duration_minutes, duration_minutes),
      total_price = COALESCE(original_total_price, total_price),
      product_lines = COALESCE(original_product_lines, product_lines),
      status = 'confirmed',
      is_edit = false,
      original_appointment_time = NULL,
      original_professional_id = NULL,
      original_service_ids = NULL,
      original_duration_minutes = NULL,
      original_total_price = NULL,
      original_product_lines = NULL,
      updated_at = NOW()
    WHERE id = v_booking.id
      AND business_id = v_company_id
      AND status = 'pending';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      RAISE EXCEPTION 'booking_not_found';
    END IF;
    RETURN true;
  END IF;

  UPDATE public.public_bookings
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = v_booking.id
    AND business_id = v_company_id
    AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.reject_public_booking_v2(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_public_booking_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_public_booking_v2(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.reject_public_booking(p_booking_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.reject_public_booking_v2(p_booking_id);
END;
$function$;

-- 8) Histórico v2: is_edit + original_appointment_time (card do cliente)
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
  created_at timestamptz,
  is_edit boolean,
  original_appointment_time timestamptz
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
    pb.created_at,
    (pb.status = 'pending' AND COALESCE(pb.is_edit, false)) AS is_edit,
    pb.original_appointment_time
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
GRANT EXECUTE ON FUNCTION public.get_client_bookings_history_v2(text, uuid) TO anon, authenticated, service_role;

-- 9) Cancel v2: edit-pending aplica o cutoff contra o horário original --------
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
  v_cutoff_time timestamptz;
  v_pending_edit boolean;
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

  v_pending_edit := (v_booking.status = 'pending' AND COALESCE(v_booking.is_edit, false));
  v_cutoff_time := CASE
    WHEN v_pending_edit THEN COALESCE(v_booking.original_appointment_time, v_booking.appointment_time)
    ELSE v_booking.appointment_time
  END;

  IF NOT v_pending_edit AND v_booking.appointment_time <= now() THEN
    RAISE EXCEPTION 'booking_not_cancellable';
  END IF;

  IF v_booking.status = 'confirmed' OR v_pending_edit THEN
    SELECT bs.client_cancel_cutoff_hours
      INTO v_cutoff
    FROM public.business_settings bs
    WHERE bs.user_id::text = v_booking.business_id
    LIMIT 1;
    v_cutoff := COALESCE(v_cutoff, 2);

    IF v_cutoff <= 0
       OR now() > (v_cutoff_time - make_interval(hours => v_cutoff)) THEN
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
