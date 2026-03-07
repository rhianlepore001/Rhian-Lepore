-- ==========================================================================
-- MIGRATION: RPCs Ausentes para Booking Público
-- ==========================================================================
-- Implementa:
--   1. get_full_dates         → datas sem slots disponíveis (calendário público)
--   2. get_first_available_professional → atribuição automática de profissional
-- Chamadas em: PublicBooking.tsx:246 e PublicBooking.tsx:533
-- Ambas devem ter GRANT para 'anon' (acesso sem autenticação).
-- ==========================================================================

-- 1. get_full_dates
-- ==========================================================================
-- Retorna um array de datas (YYYY-MM-DD) que não possuem nenhum slot
-- disponível no intervalo [p_start_date, p_end_date].
-- O calendário público usa isso para desabilitar visualmente dias lotados.
-- Lógica: reutiliza os mesmos critérios de get_available_slots.
DROP FUNCTION IF EXISTS get_full_dates(UUID, DATE, DATE, UUID, INT);
DROP FUNCTION IF EXISTS get_full_dates(UUID, TEXT, TEXT, UUID, INT);

CREATE OR REPLACE FUNCTION get_full_dates(
  p_business_id       UUID,
  p_start_date        DATE,
  p_end_date          DATE,
  p_professional_id   UUID    DEFAULT NULL,
  p_duration_min      INT     DEFAULT 30
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_date   DATE;
  v_hours          JSONB;
  v_day_name       TEXT;
  v_day_hours      JSONB;
  v_block          RECORD;
  v_current_slot   TIMESTAMPTZ;
  v_end_slot       TIMESTAMPTZ;
  v_is_busy        BOOLEAN;
  v_has_free_slot  BOOLEAN;
  v_full_dates     TEXT[] := '{}';
BEGIN
  -- Busca os horários de funcionamento do negócio
  SELECT business_hours INTO v_hours
  FROM business_settings
  WHERE user_id = p_business_id;

  -- Limita a 90 dias para evitar trabalho excessivo
  p_end_date := LEAST(p_end_date, p_start_date + INTERVAL '90 days');

  v_current_date := p_start_date;

  WHILE v_current_date <= p_end_date LOOP
    -- Mapeia o dia da semana para a chave do JSONB de horários
    v_day_name := CASE EXTRACT(DOW FROM v_current_date)
      WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue'
      WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' WHEN 5 THEN 'fri'
      WHEN 6 THEN 'sat'
    END;

    v_day_hours := v_hours->v_day_name;

    -- Dia fechado: considera cheio (desabilita no calendário)
    IF v_day_hours IS NULL OR NOT (v_day_hours->>'isOpen')::BOOLEAN THEN
      v_full_dates := array_append(v_full_dates, v_current_date::TEXT);
      v_current_date := v_current_date + 1;
      CONTINUE;
    END IF;

    v_has_free_slot := false;

    -- Itera os blocos de horário do dia
    FOR v_block IN
      SELECT * FROM jsonb_to_recordset(v_day_hours->'blocks')
      AS x(start TEXT, "end" TEXT)
    LOOP
      EXIT WHEN v_has_free_slot; -- encontrou slot livre: para de checar este dia

      v_current_slot := (v_current_date::TEXT || ' ' || v_block.start)::TIMESTAMPTZ;
      v_end_slot     := (v_current_date::TEXT || ' ' || v_block."end")::TIMESTAMPTZ;

      WHILE v_current_slot + (p_duration_min || ' minutes')::INTERVAL <= v_end_slot LOOP
        -- Só slots futuros interessam
        IF v_current_slot > NOW() THEN
          SELECT EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.user_id = p_business_id
              AND a.deleted_at IS NULL
              AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
              AND a.status != 'Cancelled'
              AND a.appointment_time < v_current_slot + (p_duration_min || ' minutes')::INTERVAL
              AND (a.appointment_time + INTERVAL '30 minutes') > v_current_slot

            UNION ALL

            SELECT 1 FROM public_bookings pb
            WHERE pb.business_id = p_business_id
              AND (p_professional_id IS NULL OR pb.professional_id = p_professional_id)
              AND pb.status IN ('pending', 'confirmed')
              AND pb.appointment_time < v_current_slot + (p_duration_min || ' minutes')::INTERVAL
              AND (pb.appointment_time + (COALESCE(pb.duration_minutes, p_duration_min) || ' minutes')::INTERVAL) > v_current_slot
          ) INTO v_is_busy;

          IF NOT v_is_busy THEN
            v_has_free_slot := true;
            EXIT; -- encontrou slot livre nesse bloco
          END IF;
        END IF;

        v_current_slot := v_current_slot + INTERVAL '30 minutes';
      END LOOP;
    END LOOP;

    -- Se não encontrou nenhum slot livre, o dia está cheio
    IF NOT v_has_free_slot THEN
      v_full_dates := array_append(v_full_dates, v_current_date::TEXT);
    END IF;

    v_current_date := v_current_date + 1;
  END LOOP;

  RETURN v_full_dates;
END;
$$;

-- Acesso público (sem autenticação, página de booking)
GRANT EXECUTE ON FUNCTION get_full_dates(UUID, DATE, DATE, UUID, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_full_dates(UUID, DATE, DATE, UUID, INT) TO authenticated;


-- 2. get_first_available_professional
-- ==========================================================================
-- Retorna o UUID do primeiro profissional ativo do negócio que não possui
-- conflito de agendamento no horário e duração solicitados.
-- Chamado quando o cliente escolhe "Qualquer Profissional".
DROP FUNCTION IF EXISTS get_first_available_professional(UUID, TIMESTAMPTZ, INT);

CREATE OR REPLACE FUNCTION get_first_available_professional(
  p_business_id       UUID,
  p_appointment_time  TIMESTAMPTZ,
  p_duration_min      INT DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro_id      UUID;
  v_end_time    TIMESTAMPTZ;
  v_is_busy     BOOLEAN;
BEGIN
  v_end_time := p_appointment_time + (p_duration_min || ' minutes')::INTERVAL;

  -- Itera profissionais ativos na ordem de exibição
  FOR v_pro_id IN
    SELECT id FROM team_members
    WHERE user_id = p_business_id
      AND active = true
      AND deleted_at IS NULL
    ORDER BY display_order, name
  LOOP
    -- Verifica se o profissional tem conflito nesse horário
    SELECT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.user_id = p_business_id
        AND a.professional_id = v_pro_id
        AND a.deleted_at IS NULL
        AND a.status != 'Cancelled'
        AND a.appointment_time < v_end_time
        AND (a.appointment_time + INTERVAL '30 minutes') > p_appointment_time

      UNION ALL

      SELECT 1 FROM public_bookings pb
      WHERE pb.business_id = p_business_id
        AND pb.professional_id = v_pro_id
        AND pb.status IN ('pending', 'confirmed')
        AND pb.appointment_time < v_end_time
        AND (pb.appointment_time + (COALESCE(pb.duration_minutes, p_duration_min) || ' minutes')::INTERVAL) > p_appointment_time
    ) INTO v_is_busy;

    -- Retorna o primeiro profissional livre
    IF NOT v_is_busy THEN
      RETURN v_pro_id;
    END IF;
  END LOOP;

  -- Nenhum disponível: retorna NULL (o booking prossegue sem profissional específico)
  RETURN NULL;
END;
$$;

-- Acesso público (sem autenticação)
GRANT EXECUTE ON FUNCTION get_first_available_professional(UUID, TIMESTAMPTZ, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_first_available_professional(UUID, TIMESTAMPTZ, INT) TO authenticated;
