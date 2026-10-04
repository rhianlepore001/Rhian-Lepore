-- PR-5: prazo para o cliente cancelar + cancelamento libera a agenda.
-- Aditivo. Não reescreve cancel_public_booking_by_client (v1 intacta).
--
-- 0 em client_cancel_cutoff_hours = "Não pode cancelar online" (sentinela
-- explícita, NOT NULL DEFAULT 2). NULL seria "não configurado" e forçaria
-- COALESCE em todo leitor; 0 é um valor de produto, entra no CHECK e no chip.
--
-- Política: a frase que o cliente lê é gerada no frontend a partir deste
-- cutoff (+ nota opcional). cancellation_policy NÃO é migrada. Textos
-- enlatados (flexible/moderate/strict e parágrafos 24h/48h/72h no código)
-- deixam de ser lidos na UI; texto livre antigo só aparece como observações
-- se NÃO for match exato desses enlatados (ver utils/cancellationPolicyCopy.ts).
--
-- cancel_public_booking_by_client_v2:
--   identidade = igualdade de dígitos (como get_client_bookings_history_v2),
--   NÃO phones_match/last-8.
--   pending  → permitido enquanto now() < appointment_time
--   confirmed → permitido iff cutoff > 0 AND now() <= appointment_time - cutoff
--   passado  → booking_not_cancellable
--   janela   → cancel_window_closed
--   telefone → booking_not_found
-- Cancela agendamentos via public_booking_linked_appointments (status
-- 'Cancelled'). O trigger #98 (sync cancel) é no-op porque o pedido já está
-- cancelled; o trigger #123 (outcome) retorna cedo para cancelled. Sem loop.
--
-- TODO(PR-9): pedido com sinal pago — caminho de cancelamento/reembolso ainda
-- não existe; esta RPC não distingue depósito.
--
-- ROLLBACK: docs/rollbacks/20261004083800_client_cancel_cutoff.rollback.sql
-- Reverter o frontend ANTES (Minha Área chama v2; a página pública lê as
-- colunas novas no JSON).

-- 1) Colunas -----------------------------------------------------------------
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS client_cancel_cutoff_hours integer NOT NULL DEFAULT 2;

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS client_cancel_note text;

ALTER TABLE public.business_settings
  DROP CONSTRAINT IF EXISTS client_cancel_cutoff_hours_allowed;
ALTER TABLE public.business_settings
  ADD CONSTRAINT client_cancel_cutoff_hours_allowed
  CHECK (client_cancel_cutoff_hours = ANY (ARRAY[0, 1, 2, 6, 12, 24, 48]));

ALTER TABLE public.business_settings
  DROP CONSTRAINT IF EXISTS client_cancel_note_length;
ALTER TABLE public.business_settings
  ADD CONSTRAINT client_cancel_note_length
  CHECK (client_cancel_note IS NULL OR char_length(client_cancel_note) <= 500);

-- 2) RPC pública: expor só cutoff + nota (aditivo) ---------------------------
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

-- 3) Cancelamento v2 ---------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.cancel_public_booking_by_client_v2(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_public_booking_by_client_v2(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_public_booking_by_client_v2(uuid, text) TO service_role;
