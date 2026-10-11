-- =============================================================================
-- Confirmação automática de agendamentos online (toggle do dono)
-- Spec: docs/specs/auto-confirm-online-bookings-SPEC.md
-- Aditivo. NÃO aplicado em produção por este PR.
--
-- 1. business_settings.online_booking_requires_approval (NOT NULL DEFAULT true = hoje)
-- 2. public_booking_auto_confirmations: marca interna (sem acesso anon/authenticated)
--    dos pedidos confirmados automaticamente, para a janela de 15 min de cancelamento
-- 3. copy_public_booking_products_internal / materialize_public_booking_appointment:
--    internas (só service_role); ramo "pedido novo" do accept_public_booking_v2
--    (prod 8fdee6db…) sem mudança, com a cópia de produtos escopada pelo negócio do
--    pedido (a pública exige auth.uid() e falharia no contexto anon)
-- 4. create_public_booking: corpo de prod (eadd867f…) + ramo automático
-- 5. notify_booking_recipients: corpo de prod (439b4a1b…) + texto "Novo agendamento"
-- 6. cancel_public_booking_by_client_v2: corpo de prod (ea0917ff…) + 15 min de
--    arrependimento para auto-confirmados
-- 7. get_public_business_settings_json: corpo de prod (98bd5e69…) + online_booking_auto_confirm
--
-- accept/reject v2, update v2 e os triggers ficam intocados.
-- CREATE OR REPLACE mantém dono, ACL, SECURITY DEFINER e search_path das funções.
-- ROLLBACK: docs/rollbacks/20261011160000_auto_confirm_online_bookings.rollback.sql
-- =============================================================================

BEGIN;

-- 1) Toggle ---------------------------------------------------------------------
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS online_booking_requires_approval boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.business_settings.online_booking_requires_approval IS
  'true = agendamento online vira pedido e precisa de aceite (padrão, comportamento histórico); false = entra confirmado direto na agenda.';

-- 2) Marca interna dos auto-confirmados -------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_booking_auto_confirmations (
  booking_id uuid PRIMARY KEY REFERENCES public.public_bookings(id) ON DELETE CASCADE,
  business_id text NOT NULL,
  appointment_id uuid,
  confirmed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.public_booking_auto_confirmations IS
  'Pedidos online confirmados automaticamente (toggle desligado). Só funções SECURITY DEFINER leem/gravam: base da janela de 15 min de cancelamento.';

ALTER TABLE public.public_booking_auto_confirmations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.public_booking_auto_confirmations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.public_booking_auto_confirmations TO service_role;

-- 3a) Cópia de produtos interna -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.copy_public_booking_products_internal(
  p_booking_id uuid,
  p_appointment_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT;
  v_lines JSONB;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_price DECIMAL(10,2);
BEGIN
  -- Igual a copy_booking_products_to_appointment, mas o negócio vem do pedido
  -- (não de auth.uid()): chamada só por funções internas.
  SELECT pb.business_id, pb.product_lines
    INTO v_company_id, v_lines
  FROM public.public_bookings pb
  WHERE pb.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = p_appointment_id AND user_id::TEXT = v_company_id
  ) THEN
    RAISE EXCEPTION 'appointment_not_found';
  END IF;

  IF v_lines IS NULL OR jsonb_typeof(v_lines) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_lines)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := GREATEST(COALESCE((v_item->>'quantity')::INTEGER, 0), 0);
    IF v_product_id IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT sale_price INTO v_price
    FROM public.products
    WHERE id = v_product_id
      AND company_id::TEXT = v_company_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    INSERT INTO public.appointment_product_lines (
      company_id, appointment_id, product_id, quantity, unit_sale_price
    ) VALUES (
      v_company_id::UUID, p_appointment_id, v_product_id, v_qty, v_price
    )
    ON CONFLICT (appointment_id, product_id)
    DO UPDATE SET
      quantity = public.appointment_product_lines.quantity + EXCLUDED.quantity,
      unit_sale_price = EXCLUDED.unit_sale_price;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.copy_public_booking_products_internal(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.copy_public_booking_products_internal(uuid, uuid) TO service_role;

-- 3b) Pedido → agendamento (ramo "pedido novo" do aceite) ------------------------------
CREATE OR REPLACE FUNCTION public.materialize_public_booking_appointment(p_booking public.public_bookings)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT := p_booking.business_id;
  v_client_id UUID;
  v_service_names TEXT;
  v_professional_id UUID;
  v_appointment_id UUID;
  v_photo TEXT;
BEGIN
  IF v_company_id IS NULL OR btrim(v_company_id) = '' THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  SELECT c.id INTO v_client_id
  FROM public.clients c
  WHERE c.user_id::text = v_company_id
    AND public.phones_match(c.phone, p_booking.customer_phone)
  ORDER BY c.id
  LIMIT 1;

  SELECT pc.photo_url INTO v_photo
  FROM public.public_clients pc
  WHERE public.phones_match(pc.phone, p_booking.customer_phone)
    AND pc.business_id::text = v_company_id
  ORDER BY pc.created_at DESC
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (user_id, name, phone, email, photo_url)
    VALUES (
      v_company_id,
      p_booking.customer_name,
      p_booking.customer_phone,
      p_booking.customer_email,
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
    AND s.id = ANY (p_booking.service_ids);

  v_service_names := COALESCE(NULLIF(v_service_names, ''), 'Serviço');

  v_professional_id := p_booking.professional_id;
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
    user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_company_id, v_client_id, v_professional_id, v_service_names,
    p_booking.appointment_time, p_booking.total_price, 'Confirmed',
    COALESCE(p_booking.duration_minutes, 30), p_booking.id
  )
  RETURNING id INTO v_appointment_id;

  -- Mesmo contrato do aceite: falha na cópia de produtos não derruba o agendamento.
  BEGIN
    PERFORM public.copy_public_booking_products_internal(p_booking.id, v_appointment_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'materialize_public_booking_appointment products(%): %', p_booking.id, SQLERRM;
  END;

  RETURN v_appointment_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.materialize_public_booking_appointment(public.public_bookings) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_public_booking_appointment(public.public_bookings) TO service_role;

-- 4) create_public_booking ---------------------------------------------------------------
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
  v_auto BOOLEAN;
  v_appointment_id UUID;
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

  -- Decisão sempre lida no banco (nenhum parâmetro do cliente influencia).
  -- Sem linha em business_settings → aprovação manual (comportamento histórico).
  v_auto := NOT COALESCE((
    SELECT bs.online_booking_requires_approval
    FROM public.business_settings bs
    WHERE bs.user_id = v_business_id
    LIMIT 1
  ), true);

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
    CASE WHEN v_auto THEN 'confirmed' ELSE 'pending' END,
    v_duration,
    COALESCE(p_product_lines, '[]'::jsonb)
  )
  RETURNING * INTO v_booking;

  IF v_auto THEN
    -- Mesma transação e mesmo advisory lock: se o agendamento falhar, o pedido
    -- confirmado também volta (nunca fica pedido confirmado sem agendamento).
    v_appointment_id := public.materialize_public_booking_appointment(v_booking);

    INSERT INTO public.public_booking_auto_confirmations (booking_id, business_id, appointment_id)
    VALUES (v_booking.id, v_business_id, v_appointment_id);

    -- O trigger de notificação só avisa pedidos pending; aqui avisa o dono e o
    -- profissional. Falha de notificação nunca derruba o agendamento.
    BEGIN
      IF current_setting('agendix.fail_booking_notifications', true) = 'on' THEN
        RAISE EXCEPTION 'forced_notification_failure';
      END IF;
      PERFORM public.notify_booking_recipients(v_booking, 'new', NULL, ARRAY[v_booking.professional_id]);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'create_public_booking notify(%): %', v_booking.id, SQLERRM;
    END;
  END IF;

  RETURN NEXT v_booking;
END;
$$;

-- 5) notify_booking_recipients -------------------------------------------------------------
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
  ELSIF p_booking.status = 'confirmed' THEN
    -- Confirmado automaticamente (aprovação manual desligada).
    v_title := 'Novo agendamento';
    v_message := 'Novo agendamento online: ' || COALESCE(p_booking.customer_name, 'Cliente')
      || ', ' || v_service || ', ' || v_when || ' — já está na agenda.';
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

-- 6) cancel_public_booking_by_client_v2 ----------------------------------------------------
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
  v_auto_grace boolean;
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

  -- Auto-confirmado: o cliente pode cancelar online nos primeiros 15 minutos
  -- depois de agendar, mesmo dentro do prazo, enquanto o horário não chegou.
  -- A marca vem de tabela interna (o cliente não consegue forjar).
  v_auto_grace := v_cutoff_time > now() AND EXISTS (
    SELECT 1
    FROM public.public_booking_auto_confirmations ac
    WHERE ac.booking_id = v_booking.id
      AND ac.confirmed_at <= now()
      AND now() < ac.confirmed_at + interval '15 minutes'
  );

  IF (v_booking.status = 'confirmed' OR v_pending_edit) AND NOT v_auto_grace THEN
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

-- 7) get_public_business_settings_json ---------------------------------------------------
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
    'client_cancel_note', bs.client_cancel_note,
    'online_booking_auto_confirm', NOT COALESCE(bs.online_booking_requires_approval, true)
  )
  INTO v_result
  FROM public.business_settings bs
  WHERE bs.user_id::text = p_business_id::text
  LIMIT 1;

  RETURN v_result;
END;
$function$;

COMMIT;
