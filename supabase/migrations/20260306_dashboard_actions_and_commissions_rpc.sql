-- ==========================================================================
-- MIGRATION: Dashboard Actions + Recalculate Commissions
-- ==========================================================================
-- Implementa:
--   1. get_dashboard_actions          → ações recomendadas para o dashboard
--   2. recalculate_pending_commissions → sincroniza taxa de comissão em registros pendentes
-- Chamadas em: useDashboardData.ts:120 e CommissionsSettings.tsx:135
-- ==========================================================================

-- 1. get_dashboard_actions
-- ==========================================================================
-- Retorna uma lista de ações recomendadas baseadas em dados reais do negócio.
-- Prioridades: comissões pendentes, bookings para confirmar, meta próxima.
DROP FUNCTION IF EXISTS get_dashboard_actions(UUID);
DROP FUNCTION IF EXISTS get_dashboard_actions(TEXT);

CREATE OR REPLACE FUNCTION get_dashboard_actions(p_user_id UUID)
RETURNS TABLE (
  id          TEXT,
  title       TEXT,
  description TEXT,
  priority    TEXT,   -- 'high' | 'medium' | 'low'
  action_type TEXT    -- 'commissions' | 'bookings' | 'goal' | 'clients' | 'content'
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commissions_due     NUMERIC := 0;
  v_pending_bookings    INT     := 0;
  v_churn_risk          INT     := 0;
  v_current_revenue     NUMERIC := 0;
  v_monthly_goal        NUMERIC := 0;
  v_content_pending     INT     := 0;
BEGIN
  -- Comissões em aberto
  SELECT COALESCE(SUM(commission_value), 0) INTO v_commissions_due
  FROM finance_records
  WHERE user_id = p_user_id
    AND commission_paid = false
    AND commission_value > 0
    AND type = 'revenue'
    AND deleted_at IS NULL;

  -- Bookings públicos aguardando confirmação
  SELECT COUNT(*) INTO v_pending_bookings
  FROM public_bookings
  WHERE business_id = p_user_id
    AND status = 'pending';

  -- Clientes em risco de churn
  SELECT COUNT(DISTINCT id) INTO v_churn_risk
  FROM clients
  WHERE user_id = p_user_id
    AND deleted_at IS NULL
    AND last_visit IS NOT NULL
    AND last_visit < (NOW() - INTERVAL '45 days')
    AND last_visit >= (NOW() - INTERVAL '180 days');

  -- Receita atual vs meta
  SELECT COALESCE(SUM(price), 0) INTO v_current_revenue
  FROM appointments
  WHERE user_id = p_user_id
    AND status IN ('Confirmed', 'Completed')
    AND deleted_at IS NULL
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  SELECT COALESCE(monthly_goal, 5000) INTO v_monthly_goal
  FROM profiles WHERE id = p_user_id;

  -- Conteúdo de marketing pendente de publicação (hoje ou no passado)
  SELECT COUNT(*) INTO v_content_pending
  FROM content_calendar
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND date <= CURRENT_DATE;

  -- --- Retorna as ações baseadas nos dados ---------------------------------

  -- Bookings pendentes (alta prioridade se > 0)
  IF v_pending_bookings > 0 THEN
    RETURN QUERY SELECT
      'pending_bookings'::TEXT,
      ('Confirmar ' || v_pending_bookings || ' agendamento' || CASE WHEN v_pending_bookings > 1 THEN 's' ELSE '' END)::TEXT,
      ('Você tem ' || v_pending_bookings || ' solicitação' || CASE WHEN v_pending_bookings > 1 THEN 'ões' ELSE '' END || ' de agendamento aguardando confirmação.')::TEXT,
      'high'::TEXT,
      'bookings'::TEXT;
  END IF;

  -- Comissões em aberto (alta prioridade se valor significativo)
  IF v_commissions_due >= 50 THEN
    RETURN QUERY SELECT
      'commissions_due'::TEXT,
      'Comissões pendentes de pagamento'::TEXT,
      ('R$ ' || to_char(v_commissions_due, 'FM999G990D00') || ' em comissões ainda não pagas à sua equipe.')::TEXT,
      CASE WHEN v_commissions_due >= 500 THEN 'high' ELSE 'medium' END::TEXT,
      'commissions'::TEXT;
  END IF;

  -- Clientes em risco de churn
  IF v_churn_risk > 0 THEN
    RETURN QUERY SELECT
      'churn_risk'::TEXT,
      (v_churn_risk || ' cliente' || CASE WHEN v_churn_risk > 1 THEN 's' ELSE '' END || ' em risco de abandono')::TEXT,
      ('Esses clientes não retornam há mais de 45 dias. Envie uma mensagem de reativação.')::TEXT,
      'medium'::TEXT,
      'clients'::TEXT;
  END IF;

  -- Meta mensal próxima do fim
  IF v_monthly_goal > 0 AND v_current_revenue >= (v_monthly_goal * 0.8) AND v_current_revenue < v_monthly_goal THEN
    RETURN QUERY SELECT
      'goal_close'::TEXT,
      'Você está a 20% de bater a meta!'::TEXT,
      ('Faltam R$ ' || to_char(v_monthly_goal - v_current_revenue, 'FM999G990D00') || ' para atingir sua meta mensal.')::TEXT,
      'medium'::TEXT,
      'goal'::TEXT;
  END IF;

  -- Meta já atingida
  IF v_current_revenue >= v_monthly_goal AND v_monthly_goal > 0 THEN
    RETURN QUERY SELECT
      'goal_achieved'::TEXT,
      'Meta do mês atingida! 🎉'::TEXT,
      ('Parabéns! Você já superou sua meta de R$ ' || to_char(v_monthly_goal, 'FM999G990D00') || ' este mês.')::TEXT,
      'low'::TEXT,
      'goal'::TEXT;
  END IF;

  -- Conteúdo de marketing atrasado
  IF v_content_pending > 0 THEN
    RETURN QUERY SELECT
      'content_pending'::TEXT,
      (v_content_pending || ' post' || CASE WHEN v_content_pending > 1 THEN 's' ELSE '' END || ' para publicar')::TEXT,
      ('Você tem conteúdo programado que ainda não foi publicado. Acesse o Calendário de Conteúdo.')::TEXT,
      'low'::TEXT,
      'content'::TEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_actions(UUID) TO authenticated;


-- 2. recalculate_pending_commissions
-- ==========================================================================
-- Quando a taxa de comissão de um profissional é alterada,
-- recalcula o commission_value em todos os finance_records ainda não pagos.
-- Garante que o financeiro reflita a nova taxa imediatamente.
DROP FUNCTION IF EXISTS recalculate_pending_commissions(UUID, DECIMAL);
DROP FUNCTION IF EXISTS recalculate_pending_commissions(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION recalculate_pending_commissions(
  p_professional_id  UUID,
  p_new_rate         DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualiza apenas registros não pagos do profissional
  -- Garante isolamento: o profissional deve pertencer ao usuário autenticado
  UPDATE finance_records
  SET
    commission_rate  = p_new_rate,
    commission_value = ROUND((revenue * p_new_rate / 100)::NUMERIC, 2)
  WHERE professional_id = p_professional_id
    AND commission_paid  = false
    AND type             = 'revenue'
    AND deleted_at       IS NULL
    AND user_id IN (
      -- Segurança: limita ao usuário autenticado
      SELECT user_id FROM team_members
      WHERE id = p_professional_id
        AND user_id = auth.uid()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_pending_commissions(UUID, DECIMAL) TO authenticated;
