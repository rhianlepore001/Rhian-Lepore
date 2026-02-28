-- =============================================================
-- CORREÇÃO: Nomes ausentes nas saídas do Financeiro
-- Data: 2026-02-28
-- =============================================================
-- Problema 1: complete_appointment não gravava service_name/client_name
-- Problema 2: get_finance_stats retornava tipo errado para receitas manuais
--             e não recuperava service_name das comissões antigas via appointment_id
-- =============================================================

-- ==========================
-- FIX 1: complete_appointment
-- Adicionamos service_name e client_name no INSERT de finance_records
-- ==========================
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
BEGIN
  -- Busca detalhes do agendamento
  SELECT * INTO v_appointment
  FROM appointments
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado';
  END IF;

  -- Atualiza o status do agendamento
  UPDATE appointments 
  SET status = 'Completed', updated_at = NOW() 
  WHERE id = p_appointment_id;

  -- Busca nome do profissional e taxa de comissão
  SELECT name, commission_rate INTO v_professional_name, v_commission_rate
  FROM team_members 
  WHERE id = v_appointment.professional_id;

  -- Busca nome do cliente
  SELECT name INTO v_client_name
  FROM clients
  WHERE id = v_appointment.client_id;

  -- Calcula comissão
  v_commission_value := 0;
  IF v_commission_rate IS NOT NULL AND v_commission_rate > 0 THEN
    v_commission_value := (v_appointment.price * v_commission_rate) / 100;
  END IF;

  -- Cria o registro financeiro COM service_name e client_name preenchidos
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
    v_appointment.service,   -- nome do serviço do agendamento
    v_client_name,            -- nome do cliente
    'revenue',                -- tipo correto: receita gerada pelo agendamento
    'paid',
    FALSE,
    NOW()
  );
END;
$function$;

-- ==========================
-- FIX 2: get_finance_stats
-- Recupera service_name retroativamente via appointment_id para comissões antigas
-- Usa f.type corretamente em vez de hardcoded 'expense'
-- ==========================
DROP FUNCTION IF EXISTS get_finance_stats(text, timestamp without time zone, timestamp without time zone);

CREATE OR REPLACE FUNCTION public.get_finance_stats(
  p_user_id TEXT,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date TIMESTAMP;
  v_end_date TIMESTAMP;
  v_revenue DECIMAL(10,2);
  v_expenses DECIMAL(10,2);
  v_pending_expenses DECIMAL(10,2);
  v_commissions_pending DECIMAL(10,2);
  v_profit DECIMAL(10,2);
  v_chart_data JSON;
  v_transactions JSON;
  v_revenue_by_method JSON;
  v_result JSON;
BEGIN
  v_start_date := COALESCE(p_start_date, (NOW() - INTERVAL '30 days')::DATE)::TIMESTAMP;
  v_end_date := (COALESCE(p_end_date, NOW()::DATE)::DATE + INTERVAL '1 day' - INTERVAL '1 millisecond')::TIMESTAMP;

  -- RECEITA: agendamentos concluídos + finance_records do tipo revenue
  SELECT COALESCE(SUM(amount), 0) INTO v_revenue
  FROM (
    SELECT price AS amount
    FROM appointments
    WHERE user_id = p_user_id
      AND status = 'Completed'
      AND appointment_time >= v_start_date
      AND appointment_time <= v_end_date
    UNION ALL
    SELECT revenue AS amount
    FROM finance_records
    WHERE user_id = p_user_id
      AND type = 'revenue'
      AND appointment_id IS NULL -- Apenas entradas manuais (agendamentos já entram via appointments)
      AND created_at >= v_start_date
      AND created_at <= v_end_date
  ) r;

  -- DESPESAS PAGAS
  SELECT COALESCE(SUM(commission_value), 0) INTO v_expenses
  FROM finance_records
  WHERE user_id = p_user_id
    AND type = 'expense'
    AND commission_paid IS TRUE
    AND created_at >= v_start_date
    AND created_at <= v_end_date;

  -- DESPESAS PENDENTES
  SELECT COALESCE(SUM(commission_value), 0) INTO v_pending_expenses
  FROM finance_records
  WHERE user_id = p_user_id
    AND type = 'expense'
    AND (commission_paid IS FALSE OR commission_paid IS NULL)
    AND created_at >= v_start_date
    AND created_at <= v_end_date;

  -- COMISSÕES PENDENTES (a pagar aos profissionais - apenas registros de comissão gerados automaticamente)
  SELECT COALESCE(SUM(commission_value), 0) INTO v_commissions_pending
  FROM finance_records
  WHERE user_id = p_user_id
    AND type = 'revenue'
    AND commission_paid IS FALSE
    AND commission_value > 0
    AND created_at >= v_start_date
    AND created_at <= v_end_date;

  v_profit := v_revenue - v_expenses;

  -- DADOS DO GRÁFICO
  SELECT json_agg(row_to_json(t)) INTO v_chart_data
  FROM (
    SELECT
      TO_CHAR(date, 'DD/MM') AS name,
      COALESCE(SUM(CASE WHEN type = 'revenue' THEN val ELSE 0 END), 0) AS receita,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN val ELSE 0 END), 0) AS despesas
    FROM (
      SELECT DATE(appointment_time) AS date, 'revenue' AS type, price AS val
      FROM appointments
      WHERE user_id = p_user_id AND status = 'Completed'
        AND appointment_time >= v_start_date AND appointment_time <= v_end_date
      UNION ALL
      SELECT DATE(created_at) AS date, 'revenue' AS type, revenue AS val
      FROM finance_records
      WHERE user_id = p_user_id AND type = 'revenue'
        AND appointment_id IS NULL
        AND created_at >= v_start_date AND created_at <= v_end_date
      UNION ALL
      SELECT DATE(created_at) AS date, 'expense' AS type, commission_value AS val
      FROM finance_records
      WHERE user_id = p_user_id AND type = 'expense'
        AND commission_paid IS TRUE
        AND created_at >= v_start_date AND created_at <= v_end_date
    ) c
    GROUP BY date
    ORDER BY date
  ) t;

  -- RECEITA POR MÉTODO DE PAGAMENTO
  SELECT json_build_object(
    'pix', COALESCE(SUM(CASE WHEN LOWER(payment_method) = 'pix' THEN price ELSE 0 END), 0),
    'dinheiro', COALESCE(SUM(CASE WHEN LOWER(payment_method) IN ('dinheiro', 'cash') THEN price ELSE 0 END), 0),
    'cartao', COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%cartão%' OR LOWER(payment_method) LIKE '%cartao%' OR LOWER(payment_method) LIKE '%card%' THEN price ELSE 0 END), 0)
  ) INTO v_revenue_by_method
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= v_start_date
    AND appointment_time <= v_end_date;

  -- TRANSAÇÕES RECENTES
  -- Para finance_records ligados a agendamentos: recupera service_name via JOIN retroativo
  SELECT json_agg(row_to_json(tr)) INTO v_transactions
  FROM (
    SELECT * FROM (
      -- Receitas de agendamentos diretos (não registradas em finance_records)
      SELECT
        a.id,
        a.appointment_time AS created_at,
        tm.name AS barber_name,
        cl.name AS client_name,
        a.service AS service_name,
        NULL::TEXT AS description,
        a.price AS amount,
        0::DECIMAL AS expense,
        'revenue' AS type,
        TRUE AS commission_paid,
        a.payment_method,
        'paid' AS status
      FROM appointments a
      LEFT JOIN team_members tm ON a.professional_id = tm.id
      LEFT JOIN clients cl ON a.client_id = cl.id
      WHERE a.user_id = p_user_id
        AND a.status = 'Completed'
        AND a.appointment_time >= v_start_date
        AND a.appointment_time <= v_end_date

      UNION ALL

      -- Todos os finance_records (manuais e automáticos)
      -- Para os registros antigos sem service_name, recupera via appointment
      SELECT
        f.id,
        f.created_at,
        f.barber_name,
        f.client_name,
        COALESCE(f.service_name, a_link.service, f.description) AS service_name,
        f.description,
        CASE WHEN f.type = 'revenue' THEN f.revenue ELSE 0 END AS amount,
        CASE WHEN f.type = 'expense' THEN f.commission_value ELSE 0 END AS expense,
        f.type,
        COALESCE(f.commission_paid, FALSE) AS commission_paid,
        f.payment_method,
        COALESCE(f.status, CASE WHEN COALESCE(f.commission_paid, FALSE) THEN 'paid' ELSE 'pending' END) AS status
      FROM finance_records f
      LEFT JOIN appointments a_link ON f.appointment_id = a_link.id
      WHERE f.user_id = p_user_id
        -- Exclui os finance_records automáticos do tipo 'revenue' (já aparecem via appointments acima)
        AND NOT (f.type = 'revenue' AND f.appointment_id IS NOT NULL)
        AND f.created_at >= v_start_date
        AND f.created_at <= v_end_date
    ) all_trans
    ORDER BY created_at DESC
    LIMIT 100
  ) tr;

  v_result := json_build_object(
    'revenue', v_revenue,
    'expenses', v_expenses,
    'pendingExpenses', v_pending_expenses,
    'commissions_pending', v_commissions_pending,
    'profit', v_profit,
    'revenue_by_method', COALESCE(v_revenue_by_method, '{"pix":0,"dinheiro":0,"cartao":0}'::json),
    'chart_data', COALESCE(v_chart_data, '[]'::json),
    'transactions', COALESCE(v_transactions, '[]'::json)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_stats(TEXT, TIMESTAMP, TIMESTAMP) TO authenticated;
