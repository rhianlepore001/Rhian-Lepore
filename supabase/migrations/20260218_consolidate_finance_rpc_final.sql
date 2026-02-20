-- Consolidação da RPC get_finance_stats
-- Esta migração remove versões duplicadas e unifica a lógica financeira

-- 1. Remove versões anteriores para evitar conflitos de assinatura
DROP FUNCTION IF EXISTS get_finance_stats(uuid, timestamp without time zone, timestamp without time zone);
DROP FUNCTION IF EXISTS get_finance_stats(uuid, text, text);
DROP FUNCTION IF EXISTS get_finance_stats(text, text, text);

-- 2. Cria a nova versão única e robusta
CREATE OR REPLACE FUNCTION get_finance_stats(
  p_user_id TEXT,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_start TIMESTAMP;
  v_end TIMESTAMP;
  v_revenue DECIMAL(10,2);
  v_expenses DECIMAL(10,2);
  v_profit DECIMAL(10,2);
  v_chart_data JSON;
  v_transactions JSON;
  v_result JSON;
BEGIN
  -- Converte user_id para UUID com segurança
  v_uid := p_user_id::UUID;

  -- Define datas padrão (30 dias atrás até hoje se nulo)
  v_start := COALESCE(p_start_date::TIMESTAMP, (NOW() - INTERVAL '30 days')::DATE::TIMESTAMP);
  v_end := (COALESCE(p_end_date::TIMESTAMP, NOW())::DATE + INTERVAL '1 day' - INTERVAL '1 millisecond')::TIMESTAMP;

  -- 1. RECEITA TOTAL (Appointments + Records do tipo revenue)
  SELECT COALESCE(SUM(amount), 0) INTO v_revenue
  FROM (
    SELECT price as amount FROM appointments 
    WHERE user_id = p_user_id AND status = 'Completed' AND appointment_time >= v_start AND appointment_time <= v_end
    UNION ALL
    SELECT revenue as amount FROM finance_records 
    WHERE user_id = p_user_id AND type = 'revenue' AND created_at >= v_start AND created_at <= v_end
  ) r;

  -- 2. DESPESAS TOTAIS (Finance Records do tipo expense)
  SELECT COALESCE(SUM(commission_value), 0) INTO v_expenses
  FROM finance_records
  WHERE user_id = p_user_id
    AND type = 'expense'
    AND created_at >= v_start
    AND created_at <= v_end;

  -- 3. LUCRO
  v_profit := v_revenue - v_expenses;

  -- 4. DADOS DO GRÁFICO (Agrupamento Diário)
  SELECT json_agg(row_to_json(t)) INTO v_chart_data
  FROM (
    SELECT 
      TO_CHAR(date, 'DD/MM') as name,
      COALESCE(SUM(CASE WHEN type = 'revenue' THEN val ELSE 0 END), 0) as receita,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN val ELSE 0 END), 0) as despesas
    FROM (
      -- Appointments
      SELECT DATE(appointment_time) as date, 'revenue' as type, price as val FROM appointments
      WHERE user_id = p_user_id AND status = 'Completed' AND appointment_time >= v_start AND appointment_time <= v_end
      UNION ALL
      -- Revenue records
      SELECT DATE(created_at) as date, 'revenue' as type, revenue as val FROM finance_records
      WHERE user_id = p_user_id AND type = 'revenue' AND created_at >= v_start AND created_at <= v_end
      UNION ALL
      -- Expense records
      SELECT DATE(created_at) as date, 'expense' as type, commission_value as val FROM finance_records
      WHERE user_id = p_user_id AND type = 'expense' AND created_at >= v_start AND created_at <= v_end
    ) c
    GROUP BY date
    ORDER BY date
  ) t;

  -- 5. TRANSAÇÕES RECENTES (UNION de tudo)
  SELECT json_agg(row_to_json(tr)) INTO v_transactions
  FROM (
    SELECT * FROM (
      -- Receitas de Agendamentos
      SELECT 
        a.id,
        a.appointment_time as created_at,
        tm.name as barber_name,
        cl.name as client_name,
        a.service as service_name,
        NULL::TEXT as description,
        a.price as amount,
        0 as expense,
        'revenue' as type,
        false as commission_paid
      FROM appointments a
      LEFT JOIN team_members tm ON a.professional_id = tm.id
      LEFT JOIN clients cl ON a.client_id = cl.id
      WHERE a.user_id = p_user_id AND a.status = 'Completed' AND a.appointment_time >= v_start AND a.appointment_time <= v_end
      
      UNION ALL
      
      -- Registros Financeiros (Receitas e Despesas Manuais)
      SELECT 
        f.id,
        f.created_at,
        f.barber_name,
        f.client_name,
        f.service_name,
        f.description,
        CASE WHEN f.type = 'revenue' THEN f.revenue ELSE 0 END as amount,
        CASE WHEN f.type = 'expense' THEN f.commission_value ELSE 0 END as expense,
        f.type,
        f.commission_paid
      FROM finance_records f
      WHERE f.user_id = p_user_id AND f.created_at >= v_start AND f.created_at <= v_end
    ) comb
    ORDER BY created_at DESC
    LIMIT 100
  ) tr;

  -- 6. MONTA O RESULTADO
  v_result := json_build_object(
    'revenue', v_revenue,
    'expenses', v_expenses,
    'profit', v_profit,
    'chart_data', COALESCE(v_chart_data, '[]'::json),
    'transactions', COALESCE(v_transactions, '[]'::json)
  );

  RETURN v_result;
END;
$$;
