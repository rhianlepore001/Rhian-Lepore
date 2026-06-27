-- ==========================================================================
-- MIGRATION: get_dashboard_stats v6 — Fix schema drift (TEXT user_id + soft delete fantasma)
-- ==========================================================================
-- A v5 (20260321) estava quebrada em produção por DOIS motivos:
--
-- 1) CAST DE TIPO: comparava `user_id = p_user_id::UUID` em colunas que são
--    TEXT (appointments.user_id, clients.user_id, profiles.id,
--    public_bookings.business_id). Isso lançava `operator does not exist:
--    text = uuid` (SQLSTATE 42883), que o PostgREST traduz para HTTP 404.
--
-- 2) COLUNA FANTASMA: referenciava `deleted_at IS NULL` (soft delete), mas a
--    coluna `deleted_at` NÃO existe em nenhuma tabela de produção e nenhum
--    serviço do app a utiliza. Isso lançava `column "deleted_at" does not
--    exist` (SQLSTATE 42703).
--
-- Resultado dos dois bugs: o Dashboard travava eternamente em "Carregando...".
--
-- FIX:
--   - Comparar direto como TEXT nas colunas TEXT (sem cast, preserva índice).
--   - Manter `p_user_id::UUID` apenas nas colunas UUID de fato
--     (aios_logs.user_id, auth.users.id).
--   - Remover todas as condições `deleted_at IS NULL`.
--
-- A lógica de cálculo (valores, regras de receita) é idêntica à v5.
-- ==========================================================================

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
  v_month_scheduled_value     NUMERIC := 0;
  v_weekly_growth             NUMERIC := 0;
  v_monthly_goal              NUMERIC := 5000;
  v_last_week_revenue         NUMERIC := 0;
  v_this_week_revenue         NUMERIC := 0;

  -- Métricas de atribuição AIOS
  v_recovered_revenue         NUMERIC := 0;
  v_avoided_no_shows          NUMERIC := 0;
  v_filled_slots              NUMERIC := 0;
  v_campaigns_sent            INT     := 0;

  -- Data Maturity
  v_appointments_total        INT     := 0;
  v_appointments_this_month   INT     := 0;
  v_completed_this_month      INT     := 0;
  v_has_public_bookings       BOOLEAN := false;
  v_account_days_old          INT     := 0;
  v_data_maturity_score       INT     := 0;

  -- Financial Doctor
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
  WHERE user_id = p_user_id
    AND status = 'Completed';

  -- Receita realizada do mês (apenas Completed — receita efetivada)
  SELECT COALESCE(SUM(price), 0)
  INTO v_current_month_revenue
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  -- Valor total agendado do mês (Confirmed + Completed — pipeline de receita)
  SELECT COALESCE(SUM(price), 0)
  INTO v_month_scheduled_value
  FROM appointments
  WHERE user_id = p_user_id
    AND status IN ('Confirmed', 'Completed')
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  -- Crescimento semanal
  SELECT COALESCE(SUM(price), 0) INTO v_last_week_revenue
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week'
    AND appointment_time < DATE_TRUNC('week', CURRENT_DATE);

  SELECT COALESCE(SUM(price), 0) INTO v_this_week_revenue
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE);

  IF v_last_week_revenue > 0 THEN
    v_weekly_growth := ROUND(
      ((v_this_week_revenue - v_last_week_revenue) / v_last_week_revenue) * 100, 1
    );
  END IF;

  -- Meta mensal (perfil como fallback)
  SELECT COALESCE(monthly_goal, 5000) INTO v_monthly_goal
  FROM profiles WHERE id = p_user_id;

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
  WHERE a.user_id = p_user_id
    AND a.status = 'Completed'
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
  WHERE user_id = p_user_id
    AND status = 'Confirmed'
    AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE);

  -- Vagas preenchidas via booking público
  SELECT COALESCE(SUM(price), 0) INTO v_filled_slots
  FROM appointments
  WHERE user_id = p_user_id
    AND status IN ('Confirmed', 'Completed')
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND EXISTS (
      SELECT 1 FROM public_bookings pb
      WHERE pb.business_id = p_user_id
        AND pb.status IN ('confirmed', 'completed')
    );

  -- --- Data Maturity -------------------------------------------------------

  SELECT COUNT(*) INTO v_appointments_total
  FROM appointments
  WHERE user_id = p_user_id;

  SELECT COUNT(*) INTO v_appointments_this_month
  FROM appointments
  WHERE user_id = p_user_id
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  SELECT COUNT(*) INTO v_completed_this_month
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  SELECT EXISTS(
    SELECT 1 FROM public_bookings WHERE business_id = p_user_id LIMIT 1
  ) INTO v_has_public_bookings;

  SELECT created_at INTO v_created_at
  FROM auth.users WHERE id = p_user_id::UUID;
  IF v_created_at IS NOT NULL THEN
    v_account_days_old := EXTRACT(EPOCH FROM (NOW() - v_created_at)) / 86400;
  END IF;

  v_data_maturity_score :=
    CASE WHEN v_appointments_total >= 10 THEN 20 ELSE (v_appointments_total * 2) END +
    CASE WHEN v_appointments_this_month >= 5 THEN 20 ELSE (v_appointments_this_month * 4) END +
    CASE WHEN v_completed_this_month >= 1 THEN 20 ELSE 0 END +
    CASE WHEN v_has_public_bookings THEN 20 ELSE 0 END +
    CASE WHEN v_account_days_old >= 30 THEN 20 ELSE (v_account_days_old::INT) END;

  -- --- Financial Doctor ----------------------------------------------------

  SELECT COUNT(*) INTO v_completed_total
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= (NOW() - INTERVAL '90 days');

  IF v_completed_total > 0 THEN
    SELECT ROUND(
      COALESCE(SUM(price), 0) / v_completed_total, 2
    ) INTO v_avg_ticket
    FROM appointments
    WHERE user_id = p_user_id
      AND status = 'Completed'
      AND appointment_time >= (NOW() - INTERVAL '90 days');
  END IF;

  SELECT COUNT(DISTINCT c.id) INTO v_churn_risk_count
  FROM clients c
  WHERE c.user_id = p_user_id
    AND c.last_visit IS NOT NULL
    AND c.last_visit < (NOW() - INTERVAL '45 days')
    AND c.last_visit >= (NOW() - INTERVAL '180 days');

  SELECT COALESCE(service, '') INTO v_top_service
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= (NOW() - INTERVAL '90 days')
  GROUP BY service
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT COUNT(DISTINCT client_id) INTO v_total_unique_clients
  FROM appointments
  WHERE user_id = p_user_id
    AND appointment_time >= (NOW() - INTERVAL '90 days');

  SELECT COUNT(DISTINCT client_id) INTO v_clients_with_repeat
  FROM appointments
  WHERE user_id = p_user_id
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
    -- Métricas básicas
    'total_profit',             v_total_profit,
    'current_month_revenue',    v_current_month_revenue,   -- apenas Completed
    'month_scheduled_value',    v_month_scheduled_value,   -- Confirmed + Completed
    'weekly_growth',            v_weekly_growth,
    'monthly_goal',             v_monthly_goal,
    'recovered_revenue',        v_recovered_revenue,
    'avoided_no_shows',         v_avoided_no_shows,
    'filled_slots',             v_filled_slots,
    'campaigns_sent',           v_campaigns_sent,
    -- Data Maturity
    'appointments_total',       v_appointments_total,
    'appointments_this_month',  v_appointments_this_month,
    'completed_this_month',     v_completed_this_month,
    'has_public_bookings',      v_has_public_bookings,
    'account_days_old',         v_account_days_old,
    'data_maturity_score',      LEAST(v_data_maturity_score, 100),
    -- Financial Doctor
    'avg_ticket',               v_avg_ticket,
    'churn_risk_count',         v_churn_risk_count,
    'top_service',              v_top_service,
    'repeat_client_rate',       v_repeat_client_rate
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_stats(TEXT) TO authenticated;
