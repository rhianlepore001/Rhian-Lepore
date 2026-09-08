-- Tenants sem linha em business_settings (contas antigas / onboarding incompleto) salvavam
-- os ajustes da fila sem erro e sem efeito: UPDATE em zero linhas. Passa a fazer upsert.

CREATE OR REPLACE FUNCTION public.update_queue_settings(p_allow_leave BOOLEAN, p_late_minutes INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant TEXT := auth.uid()::TEXT;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.';
  END IF;

  IF p_late_minutes IS NULL OR p_late_minutes < 1 OR p_late_minutes > 120 THEN
    RAISE EXCEPTION 'Tolerância deve ficar entre 1 e 120 minutos.';
  END IF;

  INSERT INTO public.business_settings (user_id, queue_allow_leave, queue_late_minutes)
  VALUES (v_tenant, COALESCE(p_allow_leave, true), p_late_minutes)
  ON CONFLICT (user_id) DO UPDATE
    SET queue_allow_leave = EXCLUDED.queue_allow_leave,
        queue_late_minutes = EXCLUDED.queue_late_minutes,
        updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_queue_mode(p_mode TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant TEXT := auth.uid()::TEXT;
  v_active INTEGER;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.';
  END IF;

  IF p_mode NOT IN ('shared', 'per_professional') THEN
    RAISE EXCEPTION 'Modo de fila inválido.';
  END IF;

  PERFORM public.queue_lock_settings(v_tenant);

  SELECT COUNT(*) INTO v_active
  FROM public.queue_entries
  WHERE business_id::TEXT = v_tenant
    AND status IN ('waiting', 'calling', 'serving');

  IF COALESCE(v_active, 0) > 0 THEN
    RAISE EXCEPTION 'Esvazie a fila para trocar o modo.';
  END IF;

  INSERT INTO public.business_settings (user_id, queue_mode)
  VALUES (v_tenant, p_mode)
  ON CONFLICT (user_id) DO UPDATE
    SET queue_mode = EXCLUDED.queue_mode,
        updated_at = NOW();
END;
$$;
