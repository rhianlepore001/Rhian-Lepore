-- Update RPC function to get finance statistics with better transaction details
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
  -- Default to last 30 days if not specified
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  -- Calculate total revenue from appointments
  SELECT COALESCE(SUM(price), 0) INTO v_revenue
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= v_start_date
    AND appointment_time <= v_end_date;

  -- Calculate total expenses from finance_records
  SELECT COALESCE(SUM(commission_value), 0) INTO v_expenses
  FROM finance_records
  WHERE user_id = p_user_id
    AND created_at >= v_start_date
    AND created_at <= v_end_date;

  -- Calculate profit
  v_profit := v_revenue - v_expenses;

  -- Generate chart data (daily aggregation)
  SELECT json_agg(row_to_json(t)) INTO v_chart_data
  FROM (
    SELECT 
      TO_CHAR(date, 'DD/MM') as name,
      COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0) as receita,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as despesas
    FROM (
      -- Revenue from appointments
      SELECT 
        DATE(appointment_time) as date,
        'revenue' as type,
        price as amount
      FROM appointments
      WHERE user_id = p_user_id
        AND status = 'Completed'
        AND appointment_time >= v_start_date
        AND appointment_time <= v_end_date
      
      UNION ALL
      
      -- Expenses from finance_records (commissions paid)
      SELECT 
        DATE(created_at) as date,
        'expense' as type,
        commission_value as amount
      FROM finance_records
      WHERE user_id = p_user_id
        AND created_at >= v_start_date
        AND created_at <= v_end_date
    ) combined
    GROUP BY date
    ORDER BY date
  ) t;

  -- Get recent transactions with ENHANCED details
  SELECT json_agg(row_to_json(t)) INTO v_transactions
  FROM (
    SELECT 
      id,
      created_at,
      barber_name,
      client_name,
      service_name,
      amount,
      expense,
      type,
      commission_paid
    FROM (
      -- Revenue transactions (Appointments)
      SELECT 
        a.id,
        a.appointment_time as created_at,
        tm.name as barber_name,
        c.name as client_name,
        a.service as service_name,
        a.price as amount,
        0 as expense,
        'revenue' as type,
        false as commission_paid
      FROM appointments a
      LEFT JOIN team_members tm ON a.professional_id = tm.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.user_id = p_user_id
        AND a.status = 'Completed'
        AND a.appointment_time >= v_start_date
        AND a.appointment_time <= v_end_date
      
      UNION ALL
      
      -- Expense transactions (Finance Records)
      SELECT 
        f.id,
        f.created_at,
        f.barber_name,
        f.client_name, -- Ensure this column exists or add NULL
        f.service_name, -- Ensure this column exists or add NULL
        0 as amount,
        f.commission_value as expense,
        'expense' as type,
        TRUE as commission_paid
      FROM finance_records f
      WHERE f.user_id = p_user_id
        AND f.created_at >= v_start_date
        AND f.created_at <= v_end_date
    ) all_transactions
    ORDER BY created_at DESC
    LIMIT 100 -- Increased limit to show more history
  ) t;

  -- Build result JSON
  v_result := json_build_object(
    'revenue', v_revenue,
    'expenses', v_expenses,
    'profit', v_profit,
    'chart_data', COALESCE(v_chart_data, '[]'::json),
    'transactions', COALESCE(v_transactions, '[]'::json)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add missing columns to finance_records if they don't exist yet (for manual transactions)
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS service_name TEXT;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_finance_stats(UUID, TIMESTAMP, TIMESTAMP) TO authenticated;
