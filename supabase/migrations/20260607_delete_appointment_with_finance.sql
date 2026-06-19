-- ============================================================================
-- G3: Delete atomico de agendamento historico + registros financeiros
-- Substitui o fluxo client-side Agenda.tsx:
--   1) DELETE finance_records WHERE appointment_id = ...
--   2) DELETE appointments WHERE id = ...
-- ============================================================================

DROP FUNCTION IF EXISTS public.delete_appointment_with_finance(UUID);

CREATE OR REPLACE FUNCTION public.delete_appointment_with_finance(
  p_appointment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id TEXT;
  v_appointment_user_id TEXT;
  v_appointment_status TEXT;
  v_deleted_finance_records INTEGER := 0;
  v_deleted_appointments INTEGER := 0;
BEGIN
  v_auth_user_id := auth.uid()::TEXT;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT user_id, status
  INTO v_appointment_user_id, v_appointment_status
  FROM public.appointments
  WHERE id = p_appointment_id
  FOR UPDATE;

  IF v_appointment_user_id IS NULL OR v_appointment_user_id <> v_auth_user_id THEN
    RAISE EXCEPTION 'Agendamento nao encontrado ou sem permissao.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_appointment_status NOT IN ('Completed', 'Cancelled') THEN
    RAISE EXCEPTION 'Apenas agendamentos do historico podem ser excluidos.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  DELETE FROM public.finance_records
  WHERE appointment_id = p_appointment_id
    AND user_id = v_auth_user_id;

  GET DIAGNOSTICS v_deleted_finance_records = ROW_COUNT;

  DELETE FROM public.appointments
  WHERE id = p_appointment_id
    AND user_id = v_auth_user_id;

  GET DIAGNOSTICS v_deleted_appointments = ROW_COUNT;

  IF v_deleted_appointments <> 1 THEN
    RAISE EXCEPTION 'Falha ao excluir agendamento.'
      USING ERRCODE = 'data_exception';
  END IF;

  RETURN jsonb_build_object(
    'appointment_id', p_appointment_id,
    'deleted_appointments', v_deleted_appointments,
    'deleted_finance_records', v_deleted_finance_records
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_appointment_with_finance(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_appointment_with_finance(UUID) TO authenticated;

COMMENT ON FUNCTION public.delete_appointment_with_finance(UUID) IS
  'G3 v1: exclui atomicamente agendamento historico do owner autenticado e finance_records associados.';
