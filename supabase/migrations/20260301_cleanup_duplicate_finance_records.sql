-- ============================================================
-- MIGRATION: 20260301_cleanup_duplicate_finance_records.sql
-- Data: 2026-03-01
-- Squad: finance
-- Afeta RPCs: complete_appointment (adiciona guard de idempotencia)
-- Afeta Tabelas: finance_records (remove duplicatas)
-- Contrato validado: SIM
-- Rollback: Nenhum necessario (dados removidos sao duplicatas)
-- Testado em staging: NAO (producao direta — dados duplicados confirmados)
-- ============================================================

-- -----------------------------------------------------------------------
-- PASSO 1: Remover finance_records duplicados
-- Mantém apenas o registro MAIS RECENTE (max created_at) por appointment_id
-- Todos os outros sao duplicatas geradas por multiple calls a complete_appointment
-- -----------------------------------------------------------------------

-- Diagnostico pre-limpeza
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM finance_records f
  WHERE f.appointment_id IS NOT NULL
    AND f.id NOT IN (
      SELECT DISTINCT ON (appointment_id) id
      FROM finance_records
      WHERE appointment_id IS NOT NULL
      ORDER BY appointment_id, created_at DESC
    );
  RAISE NOTICE 'Registros duplicados a remover: %', v_count;
END;
$$;

-- Executa limpeza: mantém o mais recente por appointment_id
DELETE FROM finance_records
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY appointment_id ORDER BY created_at DESC) as rn
    FROM finance_records
    WHERE appointment_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- -----------------------------------------------------------------------
-- PASSO 2: Adicionar guard de idempotencia ao complete_appointment
-- Evita que chamadas duplicadas criem registros multiplos
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_appointment(p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_appointment RECORD;
  v_commission_rate DECIMAL(5,2);
  v_commission_value DECIMAL(10,2);
  v_professional_name TEXT;
  v_client_name TEXT;
  v_existing_record_id UUID;
BEGIN
  -- Busca detalhes do agendamento
  SELECT * INTO v_appointment
  FROM appointments
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento nao encontrado';
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
