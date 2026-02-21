-- ==========================================================================
-- HOTFIX: AIOS 2.0 - DASHBOARD DATA RESTORATION
-- ==========================================================================
-- Corrige o erro de incompatibilidade de tipos entre TEXT e UUID.

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_total_profit NUMERIC;
  v_current_month_revenue NUMERIC;
  v_weekly_growth NUMERIC;
  v_monthly_goal NUMERIC;
  v_last_week_revenue NUMERIC;
  v_this_week_revenue NUMERIC;
  
  -- Métricas de Atribuição Real
  v_recovered_revenue NUMERIC;
  v_avoided_no_shows NUMERIC;
  v_filled_slots NUMERIC;
  v_campaigns_sent INT;
BEGIN
  -- 1. Lucro Total (Agendamentos Concluídos)
  SELECT COALESCE(SUM(price), 0) INTO v_total_profit
  FROM appointments
  WHERE user_id = p_user_id 
    AND status = 'Completed';

  -- 2. Receita do Mês Atual
  SELECT COALESCE(SUM(price), 0) INTO v_current_month_revenue
  FROM appointments
  WHERE user_id = p_user_id 
    AND status IN ('Confirmed', 'Completed')
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  -- 3. Métricas para Crescimento Semanal
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

  -- 4. CAMPANHAS ENVIADAS (aios_logs usa UUID, então fazemos o cast)
  SELECT COUNT(*) INTO v_campaigns_sent
  FROM aios_logs
  WHERE user_id::TEXT = p_user_id
    AND action_type = 'execution'
    AND (content->>'type') = 'campaign_sent'
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

  -- 5. LUCRO RECUPERADO
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

  -- 6. NO-SHOWS EVITADOS (Sinceridade: Agendamentos confirmados)
  SELECT COALESCE(SUM(price * 0.5), 0) INTO v_avoided_no_shows
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Confirmed'
    AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE);

  -- 7. VAGAS PREENCHIDAS
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

  -- 8. Meta Mensal
  SELECT COALESCE(monthly_goal, 5000) INTO v_monthly_goal
  FROM profiles
  WHERE id = p_user_id;

  RETURN json_build_object(
    'total_profit', v_total_profit,
    'current_month_revenue', v_current_month_revenue,
    'weekly_growth', v_weekly_growth,
    'monthly_goal', v_monthly_goal,
    'recovered_revenue', v_recovered_revenue,
    'avoided_no_shows', v_avoided_no_shows,
    'filled_slots', v_filled_slots,
    'campaigns_sent', v_campaigns_sent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
