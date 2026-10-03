-- =============================================================================
-- Remarcar horário (staff): RPC atômica + histórico
-- =============================================================================
-- ADITIVO. Não altera create_secure_booking, enforce_staff_appointment_edit_scope
-- nem enforce_agenda_block_on_appointments (md5 tem que permanecer igual).
-- O trigger de bloqueio continua sendo a garantia de R-07 (B-39).
--
-- ROLLBACK: docs/rollbacks/20261003150000_reschedule_appointment.rollback.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.appointment_reschedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  old_appointment_time timestamptz NOT NULL,
  new_appointment_time timestamptz NOT NULL,
  old_professional_id uuid,
  new_professional_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'staff',
  request_id uuid
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointment_reschedules_source_check'
      AND conrelid = 'public.appointment_reschedules'::regclass
  ) THEN
    ALTER TABLE public.appointment_reschedules
      ADD CONSTRAINT appointment_reschedules_source_check
      CHECK (source IN ('staff', 'client_request'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS appointment_reschedules_appointment_id_idx
  ON public.appointment_reschedules (appointment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS appointment_reschedules_user_id_idx
  ON public.appointment_reschedules (user_id);

COMMENT ON TABLE public.appointment_reschedules IS
  'Histórico de remarcações. Escrita só pela RPC reschedule_appointment; source=staff agora, client_request no #91.';
COMMENT ON COLUMN public.appointment_reschedules.source IS
  'staff = equipe (este PR). client_request = pedido do cliente (PR futuro).';

ALTER TABLE public.appointment_reschedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointment_reschedules_select_company ON public.appointment_reschedules;
CREATE POLICY appointment_reschedules_select_company
  ON public.appointment_reschedules
  FOR SELECT
  TO authenticated
  USING (user_id = get_auth_company_id());

REVOKE ALL ON TABLE public.appointment_reschedules FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.appointment_reschedules TO authenticated;
GRANT ALL ON TABLE public.appointment_reschedules TO service_role;

CREATE OR REPLACE FUNCTION public.reschedule_appointment(
  p_appointment_id uuid,
  p_new_time timestamp with time zone,
  p_new_professional_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company text;
  v_uid uuid;
  v_role text;
  v_apt public.appointments%ROWTYPE;
  v_dest uuid;
  v_duration integer;
  v_end timestamptz;
  v_pro_name text;
  v_pb_status text;
  v_pb_is_edit boolean;
BEGIN
  v_company := get_auth_company_id();
  v_uid := auth.uid();
  IF v_company IS NULL OR v_uid IS NULL THEN
    RAISE EXCEPTION 'Sua sessão expirou. Entre de novo.'
      USING ERRCODE = '42501', HINT = 'auth_expired';
  END IF;

  IF p_appointment_id IS NULL OR p_new_time IS NULL THEN
    RAISE EXCEPTION 'Não foi possível remarcar. Tente novamente.'
      USING ERRCODE = 'P0001', HINT = 'reschedule_not_found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_company, 0));

  SELECT * INTO v_apt
  FROM public.appointments
  WHERE id = p_appointment_id
    AND user_id = v_company
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não foi possível remarcar. Tente novamente.'
      USING ERRCODE = 'P0001', HINT = 'reschedule_not_found';
  END IF;

  IF v_apt.status IS NULL OR v_apt.status NOT IN ('Pending', 'Confirmed') THEN
    RAISE EXCEPTION 'Só dá para remarcar atendimentos pendentes ou confirmados.'
      USING ERRCODE = 'P0001', HINT = 'reschedule_status_invalid';
  END IF;

  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = v_uid::text;

  IF v_role = 'staff' AND NOT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.staff_user_id = v_uid
      AND tm.user_id = v_company
      AND tm.active IS TRUE
      AND tm.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Sua permissão não permite alterar este agendamento. Fale com o dono.'
      USING ERRCODE = '42501', HINT = 'staff_appointment_edit_forbidden';
  END IF;

  v_dest := COALESCE(p_new_professional_id, v_apt.professional_id);

  IF NOT public.staff_can_modify_appointment(
    v_apt.user_id,
    v_apt.professional_id,
    v_dest,
    v_apt.status
  ) THEN
    RAISE EXCEPTION 'Sua permissão não permite alterar este agendamento. Fale com o dono.'
      USING ERRCODE = '42501', HINT = 'staff_appointment_edit_forbidden';
  END IF;

  IF v_dest IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.id = v_dest
      AND tm.user_id = v_company
      AND tm.active IS TRUE
      AND tm.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Esse profissional não está disponível para agendamentos.'
      USING ERRCODE = 'P0001', HINT = 'reschedule_professional_unavailable';
  END IF;

  IF p_new_time IS NOT DISTINCT FROM v_apt.appointment_time
     AND v_dest IS NOT DISTINCT FROM v_apt.professional_id THEN
    RAISE EXCEPTION 'Escolha um horário ou profissional diferente do atual.'
      USING ERRCODE = 'P0001', HINT = 'reschedule_unchanged';
  END IF;

  SELECT COALESCE(NULLIF(btrim(tm.name), ''), 'profissional')
    INTO v_pro_name
  FROM public.team_members tm
  WHERE tm.id = v_dest;

  IF v_apt.public_booking_id IS NOT NULL THEN
    SELECT pb.status, COALESCE(pb.is_edit, false)
      INTO v_pb_status, v_pb_is_edit
    FROM public.public_bookings pb
    WHERE pb.id = v_apt.public_booking_id
      AND pb.business_id = v_company
    FOR UPDATE;

    IF v_pb_status = 'pending' AND v_pb_is_edit THEN
      RAISE EXCEPTION 'O cliente pediu outro horário para este agendamento. Aceite ou recuse o pedido antes de remarcar.'
        USING ERRCODE = 'P0001', HINT = 'reschedule_pending_client_request';
    END IF;
  END IF;

  v_duration := GREATEST(COALESCE(v_apt.duration_minutes, 30), 1);
  v_end := p_new_time + make_interval(mins => v_duration);

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.user_id = v_company
      AND a.id IS DISTINCT FROM v_apt.id
      AND a.professional_id = v_dest
      AND a.status IN ('Pending', 'Confirmed', 'Completed')
      AND a.appointment_time < v_end
      AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_new_time
  ) OR EXISTS (
    SELECT 1
    FROM public.public_bookings pb
    WHERE pb.business_id = v_company
      AND (v_apt.public_booking_id IS NULL OR pb.id IS DISTINCT FROM v_apt.public_booking_id)
      AND pb.professional_id = v_dest
      AND pb.status IN ('pending', 'confirmed')
      AND NOT (
        pb.status = 'confirmed'
        AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id)
      )
      AND pb.appointment_time < v_end
      AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_new_time
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = format('Esse horário já está ocupado na agenda de %s. Escolha outro.', COALESCE(v_pro_name, 'profissional')),
      HINT = 'reschedule_slot_busy';
  END IF;

  UPDATE public.appointments
  SET
    appointment_time = p_new_time,
    professional_id = v_dest,
    edited_at = now(),
    updated_at = now()
  WHERE id = v_apt.id
    AND user_id = v_company;

  IF v_apt.public_booking_id IS NOT NULL THEN
    UPDATE public.public_bookings
    SET
      appointment_time = p_new_time,
      professional_id = v_dest,
      original_appointment_time = v_apt.appointment_time,
      updated_at = now()
    WHERE id = v_apt.public_booking_id
      AND business_id = v_company
      AND status = 'confirmed';
  END IF;

  INSERT INTO public.appointment_reschedules (
    appointment_id,
    user_id,
    old_appointment_time,
    new_appointment_time,
    old_professional_id,
    new_professional_id,
    created_by,
    source
  ) VALUES (
    v_apt.id,
    v_company,
    v_apt.appointment_time,
    p_new_time,
    v_apt.professional_id,
    v_dest,
    auth.uid(),
    'staff'
  );

  RETURN json_build_object(
    'success', true,
    'id', v_apt.id,
    'appointment_time', p_new_time,
    'professional_id', v_dest
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reschedule_appointment(uuid, timestamp with time zone, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_appointment(uuid, timestamp with time zone, uuid) TO authenticated, service_role;
