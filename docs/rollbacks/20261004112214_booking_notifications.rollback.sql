-- ROLLBACK de 20261004112214_booking_notifications
-- Idempotente. Restaura accept/reject v2 aos corpos exatos de 20261004101021.
-- Remove trigger/funções novas. Colunas extras de notifications são dropadas.
-- CREATE OR REPLACE das v2 não altera grants.

BEGIN;

DROP TRIGGER IF EXISTS notify_public_booking_requests_trg ON public.public_bookings;
DROP FUNCTION IF EXISTS public.notify_public_booking_requests();
DROP FUNCTION IF EXISTS public.notify_booking_recipients(public.public_bookings, text, timestamptz, uuid[]);
DROP FUNCTION IF EXISTS public.upsert_booking_notification(text, text, text, text, uuid, text, text);
DROP FUNCTION IF EXISTS public.format_booking_notification_when(timestamptz, text);
DROP FUNCTION IF EXISTS public.booking_notification_service_label(text, uuid[]);
DROP FUNCTION IF EXISTS public.caller_can_act_on_public_booking(public.public_bookings);

DROP INDEX IF EXISTS public.notifications_unread_event_key_uid_idx;

ALTER TABLE public.notifications
  DROP COLUMN IF EXISTS link,
  DROP COLUMN IF EXISTS booking_id,
  DROP COLUMN IF EXISTS event_key;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END
$$;

ALTER TABLE public.notifications REPLICA IDENTITY DEFAULT;

DROP POLICY IF EXISTS "Users can select own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR ALL
  USING (auth.uid()::text = user_id);

REVOKE ALL ON TABLE public.notifications FROM anon, authenticated;
GRANT ALL ON TABLE public.notifications TO anon, authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


-- accept/reject v2: corpos exatos de 20261004101021
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


COMMIT;
