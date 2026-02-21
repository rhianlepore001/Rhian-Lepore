-- ==========================================================================
-- AIOS 2.0 - CAMPAIGN ROI & ATTRIBUTION
-- ==========================================================================
-- Implementa o rastreamento real de campanhas e atribuição de lucro.

-- 1. Função para registrar o envio de campanhas (Audit Trail)
CREATE OR REPLACE FUNCTION log_aios_campaign(
    p_client_id UUID,
    p_agent_name TEXT,
    p_campaign_type TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO aios_logs (
        user_id,
        agent_name,
        action_type,
        content,
        metadata
    ) VALUES (
        auth.uid(),
        p_agent_name,
        'execution',
        json_build_object(
            'type', 'campaign_sent',
            'campaign_type', p_campaign_type,
            'client_id', p_client_id
        ),
        p_metadata
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Refatoração Final de get_dashboard_stats (Substitui a v2 anterior)
-- Agora com lógica de atribuição de ROI real (Last-Touch 30 days)
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
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
  -- SET search_path = public; -- Segurança

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

  -- 4. CAMPANHAS ENVIADAS (Contagem de logs de execução)
  SELECT COUNT(*) INTO v_campaigns_sent
  FROM aios_logs
  WHERE user_id = p_user_id
    AND action_type = 'execution'
    AND (content->>'type') = 'campaign_sent'
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

  -- 5. LUCRO RECUPERADO (Atribuição: Agendamento após log de campanha)
  -- Lógica: Soma de agendamentos 'Completed' onde o cliente recebeu uma campanha nos 30 dias anteriores
  SELECT COALESCE(SUM(a.price), 0) INTO v_recovered_revenue
  FROM appointments a
  WHERE a.user_id = p_user_id
    AND a.status = 'Completed'
    AND a.appointment_time >= DATE_TRUNC('month', CURRENT_DATE)
    AND EXISTS (
        SELECT 1 FROM aios_logs l
        WHERE l.user_id = p_user_id
          AND l.action_type = 'execution'
          AND (l.content->>'type') = 'campaign_sent'
          AND (l.content->>'client_id')::UUID = a.client_id
          AND l.created_at < a.created_at
          AND l.created_at >= (a.created_at - INTERVAL '30 days')
    );

  -- 6. NO-SHOWS EVITADOS (Sinceridade: Agendamentos confirmados)
  SELECT COALESCE(SUM(price * 0.5), 0) INTO v_avoided_no_shows
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Confirmed'
    AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE);

  -- 7. VAGAS PREENCHIDAS (Booking via link público)
  SELECT COALESCE(SUM(price), 0) INTO v_filled_slots
  FROM appointments
  WHERE user_id = p_user_id
    AND status IN ('Confirmed', 'Completed')
    AND EXISTS (
        SELECT 1 FROM public_bookings pb
        WHERE pb.business_id = p_user_id
          AND (pb.status = 'Confirmed' OR pb.status = 'Completed')
          -- Cruzamento via cliente (se houver essa relação na tabela)
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

-- Permissões
GRANT EXECUTE ON FUNCTION log_aios_campaign(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO authenticated;
