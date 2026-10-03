-- PR-4: pedido online Finalizado / Não compareceu (Minha Área).
-- Aditivo. Não reescreve linhas legado: a leitura (v2) infere completed/no_show.
--
-- 1) Constraint public_bookings_status_check passa a aceitar 'no_show'
--    (drop + recreate com superset: pending, confirmed, cancelled, completed, no_show).
-- 2) Trigger appointments → public_bookings para Completed / NoShow, desfazer
--    esses estados e Cancelled depois de Completed. Espelha o sync de cancelamento
--    (#98, 20260925170000). Fila (settle_queue_ticket) grava appointments.status
--    = 'Completed' no INSERT — o trigger também dispara em INSERT.
-- 3) get_client_bookings_history_v2: mesma assinatura/security de v1 + status
--    derivado. v1 permanece intacta. WHERE lista por igualdade de dígitos
--    (não phones_match/last-8). Inferência legado ainda usa phones_match.
--    Pedido cancelled não é ressuscitado pelo trigger de outcome.
--
-- Multi-serviço (um pedido, N agendamentos ligados):
--   completed = todos os ligados não-Cancelled estão Completed (e há pelo menos um);
--   no_show   = há pelo menos um NoShow e nenhum Completed;
--   mistura Completed+NoShow permanece confirmed (não reescreve).
--
-- Rollback: docs/rollbacks/20261003220000_public_booking_completed_noshow.rollback.sql

-- 1) Constraint --------------------------------------------------------------
ALTER TABLE public.public_bookings DROP CONSTRAINT IF EXISTS public_bookings_status_check;
ALTER TABLE public.public_bookings
  ADD CONSTRAINT public_bookings_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'confirmed'::text,
    'cancelled'::text,
    'completed'::text,
    'no_show'::text
  ]));

-- 2) Sync Completed / NoShow / undo / cancel-after-complete ------------------
CREATE OR REPLACE FUNCTION public.sync_public_booking_on_appointment_outcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET lock_timeout TO '2s'
AS $function$
DECLARE
  v_booking_id uuid;
  v_current text;
  v_next text;
  v_total int;
  v_non_cancelled int;
  v_completed int;
  v_noshow int;
  v_confirmed int;
BEGIN
  BEGIN
    SELECT pb.id, pb.status
      INTO v_booking_id, v_current
    FROM public.public_bookings pb
    WHERE pb.business_id = NEW.user_id
      AND pb.status IS DISTINCT FROM 'pending'
      AND (
        pb.id = NEW.public_booking_id
        OR (NEW.public_booking_id IS NULL AND pb.appointment_time = NEW.appointment_time)
      )
      AND EXISTS (
        SELECT 1 FROM public.public_booking_linked_appointments(pb.id) l
        WHERE l.appointment_id = NEW.id
      )
    LIMIT 1;

    IF v_booking_id IS NULL THEN
      RETURN NULL;
    END IF;

    -- Cancelado pelo cliente/dono não volta por toque no appointment.
    IF v_current = 'cancelled' THEN
      RETURN NULL;
    END IF;

    SELECT
      count(*)::int,
      count(*) FILTER (WHERE l.status IS DISTINCT FROM 'Cancelled')::int,
      count(*) FILTER (WHERE l.status = 'Completed')::int,
      count(*) FILTER (WHERE l.status = 'NoShow')::int,
      count(*) FILTER (WHERE l.status IN ('Confirmed', 'Pending'))::int
    INTO v_total, v_non_cancelled, v_completed, v_noshow, v_confirmed
    FROM public.public_booking_linked_appointments(v_booking_id) l;

    IF v_total = 0 THEN
      RETURN NULL;
    END IF;

    IF v_non_cancelled = 0 THEN
      v_next := 'cancelled';
    ELSIF v_completed = v_non_cancelled THEN
      v_next := 'completed';
    ELSIF v_noshow > 0 AND v_completed = 0 THEN
      v_next := 'no_show';
    ELSIF v_current IN ('completed', 'no_show')
          AND (v_confirmed > 0 OR v_completed > 0) THEN
      -- undo Faltou / reabrir após Complete, ou mistura Completed+NoShow.
      -- cancelled nunca entra aqui: pedido cancelado pelo cliente/dono
      -- não é ressuscitado por toque no appointment.
      v_next := 'confirmed';
    ELSE
      v_next := v_current;
    END IF;

    IF v_next IS DISTINCT FROM v_current THEN
      UPDATE public.public_bookings
         SET status = v_next,
             updated_at = NOW()
       WHERE id = v_booking_id
         AND status IS DISTINCT FROM v_next;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_public_booking_on_appointment_outcome(%): %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_public_booking_on_appointment_outcome() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_public_booking_on_appointment_outcome() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_public_booking_on_appointment_outcome() TO service_role;

DROP TRIGGER IF EXISTS sync_public_booking_on_appointment_outcome ON public.appointments;
CREATE TRIGGER sync_public_booking_on_appointment_outcome
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW
  WHEN (NEW.status IN ('Completed', 'NoShow', 'Cancelled', 'Confirmed', 'Pending'))
  EXECUTE FUNCTION public.sync_public_booking_on_appointment_outcome();

-- 3) Status derivado na leitura (legado sem public_booking_id) ---------------
CREATE OR REPLACE FUNCTION public.derive_client_booking_status(
  p_stored text,
  p_booking_id uuid,
  p_business_id text,
  p_appointment_time timestamptz,
  p_professional_id uuid,
  p_phone text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total int;
  v_non_cancelled int;
  v_completed int;
  v_noshow int;
  v_has_link boolean;
BEGIN
  IF p_stored IS DISTINCT FROM 'confirmed' THEN
    RETURN p_stored;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.public_booking_linked_appointments(p_booking_id)
  ) INTO v_has_link;

  IF v_has_link THEN
    SELECT
      count(*)::int,
      count(*) FILTER (WHERE l.status IS DISTINCT FROM 'Cancelled')::int,
      count(*) FILTER (WHERE l.status = 'Completed')::int,
      count(*) FILTER (WHERE l.status = 'NoShow')::int
    INTO v_total, v_non_cancelled, v_completed, v_noshow
    FROM public.public_booking_linked_appointments(p_booking_id) l;
  ELSE
    -- legado: mesmo negócio + horário + telefone (phones_match) + profissional compatível
    SELECT
      count(*)::int,
      count(*) FILTER (WHERE a.status IS DISTINCT FROM 'Cancelled')::int,
      count(*) FILTER (WHERE a.status = 'Completed')::int,
      count(*) FILTER (WHERE a.status = 'NoShow')::int
    INTO v_total, v_non_cancelled, v_completed, v_noshow
    FROM public.appointments a
    JOIN public.clients c ON c.id = a.client_id
    WHERE a.user_id = p_business_id
      AND a.appointment_time = p_appointment_time
      AND a.public_booking_id IS NULL
      AND public.phones_match(c.phone, p_phone)
      AND (p_professional_id IS NULL OR a.professional_id = p_professional_id);
  END IF;

  IF COALESCE(v_total, 0) = 0 THEN
    RETURN p_stored;
  END IF;
  IF v_non_cancelled > 0 AND v_completed = v_non_cancelled THEN
    RETURN 'completed';
  END IF;
  IF v_noshow > 0 AND v_completed = 0 THEN
    RETURN 'no_show';
  END IF;
  RETURN p_stored;
END;
$function$;

REVOKE ALL ON FUNCTION public.derive_client_booking_status(text, uuid, text, timestamptz, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.derive_client_booking_status(text, uuid, text, timestamptz, uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.derive_client_booking_status(text, uuid, text, timestamptz, uuid, text) TO service_role;

-- 4) Histórico v2 (v1 intacta) ----------------------------------------------
CREATE OR REPLACE FUNCTION public.get_client_bookings_history_v2(
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
