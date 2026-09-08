-- A fila é diária: painel do gestor e quadro público só consideram senhas de hoje
-- (joined_at >= date_trunc('day', now())). Duas RPCs ainda olhavam senhas "ativas" de
-- qualquer data e criavam efeitos fantasma:
--   * set_queue_mode recusava trocar o modo por senhas esquecidas de dias anteriores que
--     o gestor não vê em lugar nenhum ("Esvazie a fila para trocar o modo.");
--   * find_active_queue_entry_by_phone devolvia uma senha antiga e o cliente era
--     redirecionado para um ticket sem posição em vez de entrar na fila de hoje.
-- Ambas passam a usar o mesmo recorte diário.

CREATE OR REPLACE FUNCTION public.find_active_queue_entry_by_phone(
  p_business_id UUID,
  p_phone       TEXT
)
RETURNS SETOF public.queue_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT qe.*
  FROM public.queue_entries qe
  WHERE qe.business_id = p_business_id::text
    AND qe.status IN ('waiting', 'calling', 'serving')
    AND qe.joined_at >= date_trunc('day', now())
    AND public.phones_match(qe.client_phone, p_phone)
  ORDER BY qe.joined_at DESC
  LIMIT 1;
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
    AND status IN ('waiting', 'calling', 'serving')
    AND joined_at >= date_trunc('day', now());

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
