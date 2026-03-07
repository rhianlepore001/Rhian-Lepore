-- ==========================================================================
-- MIGRATION: goal_settings TABLE + get_dashboard_stats v4
-- ==========================================================================
-- Cria a tabela goal_settings (ausente, causando falha no upsert de metas).
-- Atualiza get_dashboard_stats para retornar os 10 campos que o frontend espera
-- mas a versão atual (hotfix) não retorna.
-- ==========================================================================

-- 1. TABELA goal_settings
-- Necessária para persistir metas mensais por mês/ano.
-- O frontend faz upsert com onConflict:'user_id,month,year' — requer UNIQUE.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS goal_settings (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month      INT         NOT NULL CHECK (month >= 0 AND month <= 11), -- 0-based (JS Date.getMonth())
  year       INT         NOT NULL CHECK (year >= 2020),
  monthly_goal NUMERIC   NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, month, year)
);

ALTER TABLE goal_settings ENABLE ROW LEVEL SECURITY;

-- Política: cada usuário acessa apenas seus próprios registros
CREATE POLICY "goal_settings_isolamento_usuario"
  ON goal_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON TABLE goal_settings TO authenticated;

-- 2. get_dashboard_stats v4 (CANÔNICA)
-- ==========================================================================
-- Remove todas as variantes existentes para evitar ambiguidade
DROP FUNCTION IF EXISTS get_dashboard_stats(TEXT);
DROP FUNCTION IF EXISTS get_dashboard_stats(UUID);

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Métricas básicas
  v_total_profit              NUMERIC := 0;
  v_current_month_revenue     NUMERIC := 0;
  v_weekly_growth             NUMERIC := 0;
  v_monthly_goal              NUMERIC := 5000;
  v_last_week_revenue         NUMERIC := 0;
  v_this_week_revenue         NUMERIC := 0;

  -- Métricas de atribuição AIOS
  v_recovered_revenue         NUMERIC := 0;
  v_avoided_no_shows          NUMERIC := 0;
  v_filled_slots              NUMERIC := 0;
  v_campaigns_sent            INT     := 0;

  -- Data Maturity (novos)
  v_appointments_total        INT     := 0;
  v_appointments_this_month   INT     := 0;
  v_completed_this_month      INT     := 0;
  v_has_public_bookings       BOOLEAN := false;
  v_account_days_old          INT     := 0;
  v_data_maturity_score       INT     := 0;

  -- Financial Doctor (novos)
  v_avg_ticket                NUMERIC := 0;
  v_churn_risk_count          INT     := 0;
  v_top_service               TEXT    := '';
  v_repeat_client_rate        NUMERIC := 0;

  -- Auxiliares
  v_completed_total           INT     := 0;
  v_clients_with_repeat       INT     := 0;
  v_total_unique_clients      INT     := 0;
  v_created_at                TIMESTAMPTZ;
BEGIN
  -- --- Métricas Básicas ---------------------------------------------------

  -- Lucro total (agendamentos concluídos de todos os tempos)
  SELECT COALESCE(SUM(price), 0)
  INTO v_total_profit
  FROM appointments
  WHERE user_id = p_user_id::UUID
    AND status = 'Completed'
    AND deleted_at IS NULL;

  -- Receita do mês atual
  SELECT COALESCE(SUM(price), 0)
  INTO v_current_month_revenue
  FROM appointments
  WHERE user_id = p_user_id::UUID
    AND status IN ('Confirmed', 'Completed')
    AND deleted_at IS NULL
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  -- Crescimento semanal
  SELECT COALESCE(SUM(price), 0) INTO v_last_week_revenue
  FROM appointments
  WHERE user_id = p_user_id::UUID
    AND status = 'Completed'
    AND deleted_at IS NULL
    AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week'
    AND appointment_time < DATE_TRUNC('week', CURRENT_DATE);

  SELECT COALESCE(SUM(price), 0) INTO v_this_week_revenue
  FROM appointments
  WHERE user_id = p_user_id::UUID
    AND status = 'Completed'
    AND deleted_at IS NULL
    AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE);

  IF v_last_week_revenue > 0 THEN
    v_weekly_growth := ROUND(
      ((v_this_week_revenue - v_last_week_revenue) / v_last_week_revenue) * 100, 1
    );
  END IF;

  -- Meta mensal (perfil como fallback)
  SELECT COALESCE(monthly_goal, 5000) INTO v_monthly_goal
  FROM profiles WHERE id = p_user_id::UUID;

  -- Campanhas AIOS enviadas no mês
  SELECT COUNT(*) INTO v_campaigns_sent
  FROM aios_logs
  WHERE user_id = p_user_id::UUID
    AND action_type = 'execution'
    AND (content->>'type') = 'campaign_sent'
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

  -- Lucro recuperado via AIOS
  SELECT COALESCE(SUM(a.price), 0) INTO v_recovered_revenue
  FROM appointments a
  WHERE a.user_id = p_user_id::UUID
    AND a.status = 'Completed'
    AND a.deleted_at IS NULL
    AND a.appointment_time >= DATE_TRUNC('month', CURRENT_DATE)
    AND EXISTS (
      SELECT 1 FROM aios_logs l
      WHERE l.user_id = p_user_id::UUID
        AND l.action_type = 'execution'
        AND (l.content->>'type') = 'campaign_sent'
        AND (l.content->>'client_id')::TEXT = a.client_id::TEXT
        AND l.created_at < a.created_at
        AND l.created_at >= (a.created_at - INTERVAL '30 days')
    );

  -- No-shows evitados (agendamentos confirmados desta semana)
  SELECT COALESCE(SUM(price * 0.5), 0) INTO v_avoided_no_shows
  FROM appointments
  WHERE user_id = p_user_id::UUID
    AND status = 'Confirmed'
    AND deleted_at IS NULL
    AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE);

  -- Vagas preenchidas via booking público
  SELECT COALESCE(SUM(price), 0) INTO v_filled_slots
  FROM appointments
  WHERE user_id = p_user_id::UUID
    AND status IN ('Confirmed', 'Completed')
    AND deleted_at IS NULL
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND EXISTS (
      SELECT 1 FROM public_bookings pb
      WHERE pb.business_id = p_user_id::UUID
        AND pb.status IN ('confirmed', 'completed')
    );

  -- --- Data Maturity -------------------------------------------------------

  -- Total de todos os agendamentos
  SELECT COUNT(*) INTO v_appointments_total
  FROM appointments
  WHERE user_id = p_user_id::UUID
    AND deleted_at IS NULL;

  -- Agendamentos deste mês (todos os status)
  SELECT COUNT(*) INTO v_appointments_this_month
  FROM appointments
  WHERE user_id = p_user_id::UUID
    AND deleted_at IS NULL
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  -- Concluídos deste mês
  SELECT COUNT(*) INTO v_completed_this_month
  FROM appointments
  WHERE user_id = p_user_id::UUID
    AND deleted_at IS NULL
    AND status = 'Completed'
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  -- Tem bookings públicos?
  SELECT EXISTS(
    SELECT 1 FROM public_bookings WHERE business_id = p_user_id::UUID LIMIT 1
  ) INTO v_has_public_bookings;

  -- Idade da conta em dias
  SELECT created_at INTO v_created_at
  FROM auth.users WHERE id = p_user_id::UUID;
  IF v_created_at IS NOT NULL THEN
    v_account_days_old := EXTRACT(EPOCH FROM (NOW() - v_created_at)) / 86400;
  END IF;

  -- Data Maturity Score (0–100):
  -- 20pts: >= 10 agendamentos totais
  -- 20pts: >= 5 agendamentos no mês
  -- 20pts: >= 1 conclusão no mês
  -- 20pts: tem bookings públicos
  -- 20pts: conta >= 30 dias
  v_data_maturity_score :=
    CASE WHEN v_appointments_total >= 10 THEN 20 ELSE (v_appointments_total * 2) END +
    CASE WHEN v_appointments_this_month >= 5 THEN 20 ELSE (v_appointments_this_month * 4) END +
    CASE WHEN v_completed_this_month >= 1 THEN 20 ELSE 0 END +
    CASE WHEN v_has_public_bookings THEN 20 ELSE 0 END +
    CASE WHEN v_account_days_old >= 30 THEN 20 ELSE (v_account_days_old::INT) END;

  -- --- Financial Doctor ----------------------------------------------------

  -- Ticket médio (agendamentos concluídos dos últimos 90 dias)
  SELECT COUNT(*) INTO v_completed_total
  FROM appointments
  WHERE user_id = p_user_id::UUID
    AND status = 'Completed'
    AND deleted_at IS NULL
    AND appointment_time >= (NOW() - INTERVAL '90 days');

  IF v_completed_total > 0 THEN
    SELECT ROUND(
      COALESCE(SUM(price), 0) / v_completed_total, 2
    ) INTO v_avg_ticket
    FROM appointments
    WHERE user_id = p_user_id::UUID
      AND status = 'Completed'
      AND deleted_at IS NULL
      AND appointment_time >= (NOW() - INTERVAL '90 days');
  END IF;

  -- Risco de churn: clientes que não retornam há 45+ dias
  SELECT COUNT(DISTINCT c.id) INTO v_churn_risk_count
  FROM clients c
  WHERE c.user_id = p_user_id::UUID
    AND c.deleted_at IS NULL
    AND c.last_visit IS NOT NULL
    AND c.last_visit < (NOW() - INTERVAL '45 days')
    AND c.last_visit >= (NOW() - INTERVAL '180 days'); -- exclui clientes inativos crônicos

  -- Serviço mais vendido (últimos 90 dias)
  SELECT COALESCE(service, '') INTO v_top_service
  FROM appointments
  WHERE user_id = p_user_id::UUID
    AND status = 'Completed'
    AND deleted_at IS NULL
    AND appointment_time >= (NOW() - INTERVAL '90 days')
  GROUP BY service
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Taxa de clientes recorrentes (clientes com 2+ visitas / total de clientes únicos)
  SELECT COUNT(DISTINCT client_id) INTO v_total_unique_clients
  FROM appointments
  WHERE user_id = p_user_id::UUID
    AND deleted_at IS NULL
    AND appointment_time >= (NOW() - INTERVAL '90 days');

  SELECT COUNT(DISTINCT client_id) INTO v_clients_with_repeat
  FROM appointments
  WHERE user_id = p_user_id::UUID
    AND deleted_at IS NULL
    AND appointment_time >= (NOW() - INTERVAL '90 days')
  GROUP BY client_id
  HAVING COUNT(*) >= 2;

  IF v_total_unique_clients > 0 THEN
    v_repeat_client_rate := ROUND(
      (v_clients_with_repeat::NUMERIC / v_total_unique_clients) * 100, 1
    );
  END IF;

  -- --- Retorno Final -------------------------------------------------------
  RETURN json_build_object(
    -- Métricas básicas (já existiam)
    'total_profit',             v_total_profit,
    'current_month_revenue',    v_current_month_revenue,
    'weekly_growth',            v_weekly_growth,
    'monthly_goal',             v_monthly_goal,
    'recovered_revenue',        v_recovered_revenue,
    'avoided_no_shows',         v_avoided_no_shows,
    'filled_slots',             v_filled_slots,
    'campaigns_sent',           v_campaigns_sent,
    -- Data Maturity (novos)
    'appointments_total',       v_appointments_total,
    'appointments_this_month',  v_appointments_this_month,
    'completed_this_month',     v_completed_this_month,
    'has_public_bookings',      v_has_public_bookings,
    'account_days_old',         v_account_days_old,
    'data_maturity_score',      LEAST(v_data_maturity_score, 100),
    -- Financial Doctor (novos)
    'avg_ticket',               v_avg_ticket,
    'churn_risk_count',         v_churn_risk_count,
    'top_service',              v_top_service,
    'repeat_client_rate',       v_repeat_client_rate
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_stats(TEXT) TO authenticated;
