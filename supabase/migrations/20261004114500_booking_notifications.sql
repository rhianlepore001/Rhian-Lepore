-- =============================================================================
-- PR-7: notificações de pedido online + aceite/recusa por profissional
-- Aditivo. Não aplica sozinho em produção.
--
-- 1. Colunas em public.notifications: link, booking_id, event_key
-- 2. Trigger SECURITY DEFINER AFTER INSERT/UPDATE em public_bookings
-- 3. accept/reject v2 recusam com not_allowed_for_booking (resto idêntico ao PR-6)
-- 4. Publication realtime de notifications (RLS por user_id)
--
-- ROLLBACK: docs/rollbacks/20261004114500_booking_notifications.rollback.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text,
  message text,
  type text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS booking_id uuid,
  ADD COLUMN IF NOT EXISTS event_key text;

COMMENT ON COLUMN public.notifications.link IS
  'Rota in-app (ex.: /agenda) para o sino abrir o pedido.';
COMMENT ON COLUMN public.notifications.booking_id IS
  'Pedido público que originou a notificação.';
COMMENT ON COLUMN public.notifications.event_key IS
  'Chave de dedupe por destinatário (new:<id> ou edit:<id>).';

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR ALL
  USING (auth.uid()::text = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_unread_event_key_uid_idx
  ON public.notifications (user_id, event_key)
  WHERE read = false AND event_key IS NOT NULL;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.format_booking_notification_when(
  p_at timestamptz,
  p_business_id text
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tz text;
  v_local timestamp;
  v_dow int;
  v_day text;
BEGIN
  v_tz := public.business_timezone(p_business_id);
  v_local := timezone(v_tz, p_at);
  v_dow := EXTRACT(DOW FROM v_local)::int;
  v_day := CASE v_dow
    WHEN 0 THEN 'dom.'
    WHEN 1 THEN 'seg.'
    WHEN 2 THEN 'ter.'
    WHEN 3 THEN 'qua.'
    WHEN 4 THEN 'qui.'
    WHEN 5 THEN 'sex.'
    ELSE 'sáb.'
  END;
  RETURN v_day || ', ' || to_char(v_local, 'DD/MM') || ' às ' || to_char(v_local, 'HH24:MI');
END;
$function$;

REVOKE ALL ON FUNCTION public.format_booking_notification_when(timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.format_booking_notification_when(timestamptz, text) TO service_role;

CREATE OR REPLACE FUNCTION public.booking_notification_service_label(
  p_business_id text,
  p_service_ids uuid[]
) RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(NULLIF(string_agg(s.name, ', ' ORDER BY s.name), ''), 'Serviço')
  FROM public.services s
  WHERE s.user_id::text = p_business_id
    AND s.id = ANY (p_service_ids);
$function$;

REVOKE ALL ON FUNCTION public.booking_notification_service_label(text, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.booking_notification_service_label(text, uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_booking_notification(
  p_user_id text,
  p_title text,
  p_message text,
  p_type text,
  p_booking_id uuid,
  p_event_key text,
  p_link text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS NULL OR btrim(p_user_id) = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    user_id, title, message, type, read, booking_id, event_key, link
  ) VALUES (
    p_user_id, p_title, p_message, p_type, false, p_booking_id, p_event_key, p_link
  )
  ON CONFLICT (user_id, event_key) WHERE (read = false AND event_key IS NOT NULL)
  DO UPDATE SET
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    type = EXCLUDED.type,
    booking_id = EXCLUDED.booking_id,
    link = EXCLUDED.link;
END;
$function$;

REVOKE ALL ON FUNCTION public.upsert_booking_notification(text, text, text, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_booking_notification(text, text, text, text, uuid, text, text) TO service_role;

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

REVOKE ALL ON FUNCTION public.notify_booking_recipients(public.public_bookings, text, timestamptz, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_booking_recipients(public.public_bookings, text, timestamptz, uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_public_booking_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_kind text;
  v_from timestamptz;
  v_pros uuid[];
BEGIN
  BEGIN
    IF current_setting('agendix.fail_booking_notifications', true) = 'on' THEN
      RAISE EXCEPTION 'forced_notification_failure';
    END IF;

    IF TG_OP = 'INSERT' THEN
      IF NEW.status IS DISTINCT FROM 'pending' THEN
        RETURN NULL;
      END IF;
      IF COALESCE(NEW.is_edit, false) THEN
        v_kind := 'edit';
        v_from := NEW.original_appointment_time;
        v_pros := ARRAY[NEW.professional_id];
      ELSE
        v_kind := 'new';
        v_from := NULL;
        v_pros := ARRAY[NEW.professional_id];
      END IF;
      PERFORM public.notify_booking_recipients(NEW, v_kind, v_from, v_pros);
      RETURN NULL;
    END IF;

    IF NEW.status IS DISTINCT FROM 'pending' THEN
      RETURN NULL;
    END IF;
    IF NOT COALESCE(NEW.is_edit, false) THEN
      RETURN NULL;
    END IF;
    IF COALESCE(OLD.is_edit, false)
       AND OLD.appointment_time IS NOT DISTINCT FROM NEW.appointment_time
       AND OLD.professional_id IS NOT DISTINCT FROM NEW.professional_id
       AND OLD.service_ids IS NOT DISTINCT FROM NEW.service_ids THEN
      RETURN NULL;
    END IF;

    v_kind := 'edit';
    v_from := COALESCE(NEW.original_appointment_time, OLD.appointment_time);
    v_pros := ARRAY[NEW.professional_id, OLD.professional_id];
    PERFORM public.notify_booking_recipients(NEW, v_kind, v_from, v_pros);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_public_booking_requests: %', SQLERRM;
  END;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_public_booking_requests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_public_booking_requests() TO service_role;

DROP TRIGGER IF EXISTS notify_public_booking_requests_trg ON public.public_bookings;
CREATE TRIGGER notify_public_booking_requests_trg
AFTER INSERT OR UPDATE ON public.public_bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_public_booking_requests();

CREATE OR REPLACE FUNCTION public.caller_can_act_on_public_booking(p_booking public.public_bookings)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_scope text;
  v_member_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  IF v_uid::text = p_booking.business_id THEN
    RETURN true;
  END IF;

  SELECT tm.id
    INTO v_member_id
  FROM public.team_members tm
  WHERE tm.staff_user_id = v_uid
    AND tm.user_id = p_booking.business_id
    AND tm.active IS TRUE
    AND tm.deleted_at IS NULL
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT COALESCE(bs.staff_appointment_edit_scope, 'none')
    INTO v_scope
  FROM public.business_settings bs
  WHERE bs.user_id = p_booking.business_id
  LIMIT 1;
  v_scope := COALESCE(v_scope, 'none');

  IF v_scope = 'all' THEN
    RETURN true;
  END IF;

  IF p_booking.professional_id IS NOT NULL AND p_booking.professional_id = v_member_id THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION public.caller_can_act_on_public_booking(public.public_bookings) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.caller_can_act_on_public_booking(public.public_bookings) TO authenticated, service_role;

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

  IF NOT public.caller_can_act_on_public_booking(v_booking) THEN
    RAISE EXCEPTION 'not_allowed_for_booking';
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

  IF NOT public.caller_can_act_on_public_booking(v_booking) THEN
    RAISE EXCEPTION 'not_allowed_for_booking';
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

