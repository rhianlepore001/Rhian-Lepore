-- ROLLBACK exato de 20261011161117_auto_confirm_online_bookings.
-- Restaura as 4 funções com o corpo de prod de 2026-10-07 (md5 de pg_get_functiondef
-- indicado em cada uma; CREATE OR REPLACE mantém dono/ACL/SECURITY DEFINER/search_path),
-- remove as funções internas, a tabela de marca e a coluna do toggle.
-- Agendamentos já criados no modo automático ficam: são appointments normais
-- (public_bookings 'confirmed' + appointment 'Confirmed' ligado, como num aceite).
-- A escolha do toggle de cada dono se perde com o DROP COLUMN (o front trata a coluna
-- ausente como "aprovação manual", o comportamento histórico). Idempotente.

BEGIN;

-- create_public_booking: prod md5 eadd867f375290700ca2830e62c05857 (corpo de supabase/migrations/20261003120000_agenda_blocks_acceptance_followup.sql)
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

  v_duration := LEAST(1440, GREATEST(COALESCE(p_duration_minutes, 30), 1));

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

  IF p_professional_id IS NULL THEN
    p_professional_id := public.get_first_available_professional(v_business_id::uuid, p_appointment_time, v_duration);
  END IF;
  IF p_professional_id IS NULL THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

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

-- notify_booking_recipients: prod md5 439b4a1b0772bc52599a5cbe02b2de3f (corpo de supabase/migrations/20261004112214_booking_notifications.sql)
CREATE OR REPLACE FUNCTION public.notify_booking_recipients(
  p_booking public.public_bookings,
  p_kind text,
  p_from_time timestamptz,
  p_professional_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_service text;
  v_when text;
  v_when_from text;
  v_title text;
  v_message text;
  v_event text;
  v_uid text;
  v_ids uuid[];
BEGIN
  v_service := public.booking_notification_service_label(p_booking.business_id, p_booking.service_ids);
  v_when := public.format_booking_notification_when(p_booking.appointment_time, p_booking.business_id);
  v_event := p_kind || ':' || p_booking.id::text;

  IF p_kind = 'edit' THEN
    v_when_from := public.format_booking_notification_when(
      COALESCE(p_from_time, p_booking.original_appointment_time, p_booking.appointment_time),
      p_booking.business_id
    );
    v_title := 'Pedido de alteração';
    v_message := 'Pedido de alteração: ' || COALESCE(p_booking.customer_name, 'Cliente')
      || ', de ' || v_when_from || ' para ' || v_when;
  ELSE
    v_title := 'Novo pedido';
    v_message := 'Novo pedido: ' || COALESCE(p_booking.customer_name, 'Cliente')
      || ', ' || v_service || ', ' || v_when;
  END IF;

  PERFORM public.upsert_booking_notification(
    p_booking.business_id, v_title, v_message, p_kind, p_booking.id, v_event, '/agenda'
  );

  v_ids := ARRAY(
    SELECT DISTINCT x
    FROM unnest(COALESCE(p_professional_ids, ARRAY[]::uuid[])) AS x
    WHERE x IS NOT NULL
  );

  FOR v_uid IN
    SELECT DISTINCT tm.staff_user_id::text
    FROM public.team_members tm
    WHERE tm.id = ANY (v_ids)
      AND tm.user_id = p_booking.business_id
      AND tm.active IS TRUE
      AND tm.deleted_at IS NULL
      AND tm.staff_user_id IS NOT NULL
  LOOP
    IF v_uid IS DISTINCT FROM p_booking.business_id THEN
      PERFORM public.upsert_booking_notification(
        v_uid, v_title, v_message, p_kind, p_booking.id, v_event, '/agenda'
      );
    END IF;
  END LOOP;
END;
$function$;

-- cancel_public_booking_by_client_v2: prod md5 ea0917ffdd00fd432895dcc01a886015 (corpo de supabase/migrations/20261004101021_client_edit_request.sql)
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

-- get_public_business_settings_json: prod md5 98bd5e6957196faed146c3edce6625fd (corpo de supabase/migrations/20261004082633_client_cancel_cutoff.sql)
CREATE OR REPLACE FUNCTION public.get_public_business_settings_json(p_business_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'business_hours', bs.business_hours,
    'cancellation_policy', bs.cancellation_policy,
    'enable_self_rescheduling', bs.enable_self_rescheduling,
    'public_products_enabled', bs.public_products_enabled,
    'queue_mode', bs.queue_mode,
    'queue_allow_leave', bs.queue_allow_leave,
    'queue_late_minutes', bs.queue_late_minutes,
    'timezone', public.business_timezone(p_business_id::text),
    'client_cancel_cutoff_hours', COALESCE(bs.client_cancel_cutoff_hours, 2),
    'client_cancel_note', bs.client_cancel_note
  )
  INTO v_result
  FROM public.business_settings bs
  WHERE bs.user_id::text = p_business_id::text
  LIMIT 1;

  RETURN v_result;
END;
$function$;

DROP FUNCTION IF EXISTS public.materialize_public_booking_appointment(public.public_bookings);
DROP FUNCTION IF EXISTS public.copy_public_booking_products_internal(uuid, uuid);
DROP TABLE IF EXISTS public.public_booking_auto_confirmations;
ALTER TABLE public.business_settings DROP COLUMN IF EXISTS online_booking_requires_approval;

COMMIT;
