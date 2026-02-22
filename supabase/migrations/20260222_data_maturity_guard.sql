-- ==========================================================================
-- MIGRATION: Data Maturity Guard + Financial Doctor
-- Adiciona campos de maturidade de dados ao get_dashboard_stats
-- para evitar exibição de métricas enganosas em contas novas.
-- ==========================================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id TEXT)
RETURNS JSON AS $$
DECLARE
  -- Métricas financeiras principais
  v_total_profit NUMERIC;
  v_current_month_revenue NUMERIC;
  v_weekly_growth NUMERIC;
  v_monthly_goal NUMERIC;
  v_last_week_revenue NUMERIC;
  v_this_week_revenue NUMERIC;

  -- Métricas de Atribuição Real (AIOS)
  v_recovered_revenue NUMERIC;
  v_avoided_no_shows NUMERIC;
  v_filled_slots NUMERIC;
  v_campaigns_sent INT;

  -- Data Maturity: contadores para validação de contexto
  v_appointments_total INT;
  v_appointments_this_month INT;
  v_completed_this_month INT;
  v_has_public_bookings BOOLEAN;
  v_account_days_old INT;
  v_data_maturity_score INT;

  -- Doutor Financeiro: métricas de saúde
  v_avg_ticket NUMERIC;
  v_churn_risk_count INT;
  v_top_service TEXT;
  v_repeat_client_rate NUMERIC;
BEGIN
  -- === DATA MATURITY: Calcular contexto antes de tudo ===

  -- Quantos dias a conta tem de agendamentos
  SELECT COALESCE(
    EXTRACT(DAY FROM NOW() - MIN(created_at)),
    0
  )::INT INTO v_account_days_old
  FROM appointments
  WHERE user_id = p_user_id;

  -- Total de agendamentos históricos
  SELECT COUNT(*) INTO v_appointments_total
  FROM appointments
  WHERE user_id = p_user_id;

  -- Agendamentos no mês atual (qualquer status)
  SELECT COUNT(*) INTO v_appointments_this_month
  FROM appointments
  WHERE user_id = p_user_id
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  -- Agendamentos CONCLUÍDOS no mês atual
  SELECT COUNT(*) INTO v_completed_this_month
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  -- Existe agendamento via link público?
  SELECT EXISTS (
    SELECT 1 FROM public_bookings pb
    WHERE pb.business_id = p_user_id
      AND pb.status IN ('Confirmed', 'Completed')
    LIMIT 1
  ) INTO v_has_public_bookings;

  -- Score de maturidade (0-100), escalonado gradualmente
  -- 25pts: ter pelo menos 5 agendamentos
  -- 25pts: ter pelo menos 10 agendamentos concluídos
  -- 25pts: ter pelo menos 14 dias de dados
  -- 25pts: ter pelo menos 1 campanha enviada este mês
  SELECT COALESCE(
    (CASE WHEN v_appointments_total >= 5 THEN 25 ELSE (v_appointments_total * 5) END) +
    (CASE WHEN v_completed_this_month >= 10 THEN 25 ELSE (v_completed_this_month * 2) END) +
    (CASE WHEN v_account_days_old >= 14 THEN 25 ELSE (v_account_days_old) END),
    0
  ) INTO v_data_maturity_score;

  -- === MÉTRICAS FINANCEIRAS PRINCIPAIS ===

  -- Lucro Total (Agendamentos Concluídos)
  SELECT COALESCE(SUM(price), 0) INTO v_total_profit
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed';

  -- Receita do Mês Atual
  SELECT COALESCE(SUM(price), 0) INTO v_current_month_revenue
  FROM appointments
  WHERE user_id = p_user_id
    AND status IN ('Confirmed', 'Completed')
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  -- Crescimento Semanal
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
    v_weekly_growth := ROUND(((v_this_week_revenue - v_last_week_revenue) / v_last_week_revenue) * 100, 1);
  ELSE
    v_weekly_growth := 0;
  END IF;

  -- Ticket médio
  IF v_appointments_total > 0 THEN
    SELECT ROUND(COALESCE(AVG(price), 0), 2) INTO v_avg_ticket
    FROM appointments
    WHERE user_id = p_user_id AND status = 'Completed';
  ELSE
    v_avg_ticket := 0;
  END IF;

  -- Taxa de retorno (clientes com + de 1 visita / total de clientes únicos)
  SELECT
    ROUND(
      100.0 * COUNT(CASE WHEN visit_count > 1 THEN 1 END) / NULLIF(COUNT(*), 0),
      1
    ) INTO v_repeat_client_rate
  FROM (
    SELECT client_id, COUNT(*) AS visit_count
    FROM appointments
    WHERE user_id = p_user_id AND status = 'Completed'
    GROUP BY client_id
  ) t;

  -- Risco de churn: clientes que não voltam há >30 dias e já vieram 2+ vezes
  SELECT COUNT(DISTINCT a.client_id) INTO v_churn_risk_count
  FROM appointments a
  WHERE a.user_id = p_user_id
    AND a.status = 'Completed'
  GROUP BY a.client_id
  HAVING
    MAX(a.appointment_time) < NOW() - INTERVAL '30 days'
    AND COUNT(*) >= 2;

  -- Serviço mais popular
  SELECT service INTO v_top_service
  FROM appointments
  WHERE user_id = p_user_id AND status = 'Completed'
  GROUP BY service
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- === MÉTRICAS AIOS (só confiáveis com maturidade suficiente) ===

  -- Campanhas enviadas
  SELECT COUNT(*) INTO v_campaigns_sent
  FROM aios_logs
  WHERE user_id::TEXT = p_user_id
    AND action_type = 'execution'
    AND (content->>'type') = 'campaign_sent'
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

  -- Lucro Recuperado via campanhas
  SELECT COALESCE(SUM(a.price), 0) INTO v_recovered_revenue
  FROM appointments a
  WHERE a.user_id = p_user_id
    AND a.status = 'Completed'
    AND a.appointment_time >= DATE_TRUNC('month', CURRENT_DATE)
    AND EXISTS (
        SELECT 1 FROM aios_logs l
        WHERE l.user_id::TEXT = p_user_id
          AND l.action_type = 'execution'
          AND (l.content->>'type') = 'campaign_sent'
          AND (l.content->>'client_id')::TEXT = a.client_id::TEXT
          AND l.created_at < a.created_at
          AND l.created_at >= (a.created_at - INTERVAL '30 days')
    );

  -- No-Shows Evitados (confirmados via WhatsApp esta semana)
  -- Só é relevante se há campanhas ativas
  IF v_campaigns_sent > 0 THEN
    SELECT COALESCE(SUM(price * 0.5), 0) INTO v_avoided_no_shows
    FROM appointments
    WHERE user_id = p_user_id
      AND status = 'Confirmed'
      AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE);
  ELSE
    v_avoided_no_shows := 0;
  END IF;

  -- Vagas Preenchidas via link público
  IF v_has_public_bookings THEN
    SELECT COALESCE(SUM(price), 0) INTO v_filled_slots
    FROM appointments
    WHERE user_id = p_user_id
      AND status IN ('Confirmed', 'Completed')
      AND EXISTS (
          SELECT 1 FROM public_bookings pb
          WHERE pb.business_id = p_user_id
            AND (pb.status = 'Confirmed' OR pb.status = 'Completed')
      )
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE);
  ELSE
    v_filled_slots := 0;
  END IF;

  -- Meta Mensal
  SELECT COALESCE(monthly_goal, 5000) INTO v_monthly_goal
  FROM profiles
  WHERE id = p_user_id;

  RETURN json_build_object(
    -- Métricas padrão
    'total_profit',           v_total_profit,
    'current_month_revenue',  v_current_month_revenue,
    'weekly_growth',          v_weekly_growth,
    'monthly_goal',           v_monthly_goal,
    -- Métricas AIOS
    'recovered_revenue',      v_recovered_revenue,
    'avoided_no_shows',       v_avoided_no_shows,
    'filled_slots',           v_filled_slots,
    'campaigns_sent',         v_campaigns_sent,
    -- Data Maturity
    'appointments_total',     v_appointments_total,
    'appointments_this_month', v_appointments_this_month,
    'completed_this_month',   v_completed_this_month,
    'has_public_bookings',    v_has_public_bookings,
    'account_days_old',       v_account_days_old,
    'data_maturity_score',    v_data_maturity_score,
    -- Doutor Financeiro
    'avg_ticket',             v_avg_ticket,
    'churn_risk_count',       v_churn_risk_count,
    'top_service',            COALESCE(v_top_service, ''),
    'repeat_client_rate',     COALESCE(v_repeat_client_rate, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_dashboard_stats(TEXT) TO authenticated;
