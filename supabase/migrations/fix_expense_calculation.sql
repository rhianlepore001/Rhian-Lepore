-- Fix calculation of expenses to only include actual payment records (type = 'expense')
-- Applied: 2025-12-16

CREATE OR REPLACE FUNCTION get_finance_stats(
  p_user_id UUID,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_start_date TIMESTAMP;
  v_end_date TIMESTAMP;
  v_revenue DECIMAL(10,2);
  v_expenses DECIMAL(10,2);
  v_profit DECIMAL(10,2);
  v_chart_data JSON;
  v_transactions JSON;
  v_result JSON;
BEGIN
  -- Security check
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_start_date := COALESCE(p_start_date, date_trunc('month', NOW()));
  v_end_date := COALESCE(p_end_date, NOW());

  -- Revenue (from appointments OR manual revenue records)
  -- 1. Appointments revenue
  SELECT COALESCE(SUM(price), 0) INTO v_revenue
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= v_start_date
    AND appointment_time <= v_end_date;

  -- Expenses (ONLY type = 'expense')
  SELECT COALESCE(SUM(commission_value), 0) INTO v_expenses
  FROM finance_records
  WHERE user_id = p_user_id
    AND created_at >= v_start_date
    AND created_at <= v_end_date
    AND type = 'expense'; -- CRITICAL FIX: Only count actual expenses

  v_profit := v_revenue - v_expenses;

  -- Chart Data
  SELECT json_agg(row_to_json(t)) INTO v_chart_data
  FROM (
    SELECT 
      TO_CHAR(date, 'DD/MM') as name,
      COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0) as receita,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as despesas
    FROM (
      SELECT DATE(appointment_time) as date, 'revenue' as type, price as amount
      FROM appointments
      WHERE user_id = p_user_id AND status = 'Completed'
        AND appointment_time >= v_start_date AND appointment_time <= v_end_date
      UNION ALL
      SELECT DATE(created_at) as date, 'expense' as type, commission_value as amount
      FROM finance_records
      WHERE user_id = p_user_id
        AND created_at >= v_start_date AND created_at <= v_end_date
        AND type = 'expense' -- CRITICAL FIX
    ) combined
    GROUP BY date ORDER BY date
  ) t;

  -- Transactions
  SELECT json_agg(row_to_json(t)) INTO v_transactions
  FROM (
    SELECT id, created_at, barber_name, client_name, service_name, amount, expense, type, commission_paid
    FROM (
      -- Appointments (Revenue)
      SELECT 
        a.id, 
        a.appointment_time as created_at, 
        tm.name as barber_name, 
        c.name as client_name,
        a.service as service_name, 
        a.price as amount, 
        0::numeric as expense, 
        'revenue' as type, 
        false as commission_paid -- Assuming not paid yet directly from appointment
      FROM appointments a
      LEFT JOIN team_members tm ON a.professional_id = tm.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.user_id = p_user_id AND a.status = 'Completed'
        AND a.appointment_time >= v_start_date AND a.appointment_time <= v_end_date
      
      UNION ALL
      
      -- Finance Records (Expenses ONLY)
      -- We show ONLY expenses here to avoid showing duplicates or commission accruals as transactions
      SELECT 
        f.id, 
        f.created_at, 
        f.barber_name, 
        f.client_name, 
        f.service_name,
        0::numeric as amount, 
        f.commission_value as expense, 
        'expense' as type, 
        true as commission_paid
      FROM finance_records f
      WHERE f.user_id = p_user_id 
        AND f.created_at >= v_start_date AND f.created_at <= v_end_date
        AND f.type = 'expense' -- Only show actual expense payments
    ) all_transactions
    ORDER BY created_at DESC
    LIMIT 100
  ) t;

  v_result := json_build_object(
    'revenue', v_revenue, 'expenses', v_expenses, 'profit', v_profit,
    'chart_data', COALESCE(v_chart_data, '[]'::json),
    'transactions', COALESCE(v_transactions, '[]'::json)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_finance_stats(UUID, TIMESTAMP, TIMESTAMP) TO authenticated;
