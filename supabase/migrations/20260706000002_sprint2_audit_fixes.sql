-- ============================================================================
-- Sprint 2 — Auditoria 360 (2026-07-05)
-- 1) C2: dedup atomico da fila (mata race condition de dupla entrada)
-- 2) Hardening: complete_appointment(1 param) valida tenant
--    (corpo identico ao da 20260301 + escopo de tenant; guard de
--    idempotencia preservado)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) C2: indice UNIQUE parcial — 1 entrada ativa por telefone por barbearia.
--    normalize_phone_digits e IMMUTABLE (20260602), pode ir em indice.
--    Antes: cancelar duplicatas ativas existentes (mantem a mais antiga).
-- ----------------------------------------------------------------------------
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY business_id, normalize_phone_digits(client_phone)
           ORDER BY joined_at ASC
         ) AS rn
  FROM public.queue_entries
  WHERE status IN ('waiting', 'calling', 'serving')
)
UPDATE public.queue_entries qe
SET status = 'cancelled'
FROM ranked r
WHERE qe.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_active_phone_per_business
  ON public.queue_entries (business_id, normalize_phone_digits(client_phone))
  WHERE status IN ('waiting', 'calling', 'serving');

COMMENT ON INDEX uq_queue_active_phone_per_business IS
  'Sprint2 C2: impede dupla entrada ativa do mesmo telefone na mesma fila (race condition).';

-- ----------------------------------------------------------------------------
-- 2) complete_appointment(uuid) com validacao de tenant
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_appointment(p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_appointment RECORD;
  v_auth_company_id TEXT;
  v_commission_rate DECIMAL(5,2);
  v_commission_value DECIMAL(10,2);
  v_professional_name TEXT;
  v_client_name TEXT;
  v_existing_record_id UUID;
BEGIN
  -- Sprint2: validacao de tenant (SECURITY DEFINER nao passa por RLS)
  SELECT COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT)
  INTO v_auth_company_id;

  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Busca detalhes do agendamento (escopado ao tenant)
  SELECT * INTO v_appointment
  FROM appointments
  WHERE id = p_appointment_id
    AND user_id::TEXT = v_auth_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento nao encontrado ou sem permissao.';
  END IF;

  -- GUARD: Se ja existe finance_record para este appointment, nao duplicar
  SELECT id INTO v_existing_record_id
  FROM finance_records
  WHERE appointment_id = p_appointment_id
  LIMIT 1;

  IF v_existing_record_id IS NOT NULL THEN
    -- Ja existe registro financeiro — apenas atualizar status do appointment
    UPDATE appointments
    SET status = 'Completed', updated_at = NOW()
    WHERE id = p_appointment_id;
    RETURN; -- Sai sem criar duplicata
  END IF;

  -- Atualiza o status do agendamento
  UPDATE appointments
  SET status = 'Completed', updated_at = NOW()
  WHERE id = p_appointment_id;

  -- Busca nome do profissional e taxa de comissao
  SELECT name, commission_rate INTO v_professional_name, v_commission_rate
  FROM team_members
  WHERE id = v_appointment.professional_id;

  -- Busca nome do cliente
  SELECT name INTO v_client_name
  FROM clients
  WHERE id = v_appointment.client_id;

  -- Calcula comissao
  v_commission_value := 0;
  IF v_commission_rate IS NOT NULL AND v_commission_rate > 0 THEN
    v_commission_value := (v_appointment.price * v_commission_rate) / 100;
  END IF;

  -- Cria o registro financeiro COM service_name e client_name
  INSERT INTO finance_records (
    user_id,
    barber_name,
    professional_id,
    appointment_id,
    revenue,
    commission_rate,
    commission_value,
    service_name,
    client_name,
    type,
    status,
    commission_paid,
    created_at
  ) VALUES (
    v_appointment.user_id,
    COALESCE(v_professional_name, 'Profissional'),
    v_appointment.professional_id,
    p_appointment_id,
    v_appointment.price,
    COALESCE(v_commission_rate, 0),
    v_commission_value,
    v_appointment.service,
    v_client_name,
    'revenue',
    'paid',
    FALSE,
    NOW()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_appointment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_appointment(uuid) TO authenticated;
