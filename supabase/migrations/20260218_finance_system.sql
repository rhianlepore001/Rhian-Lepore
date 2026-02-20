-- Financial System Implementation
-- Creates RPC function for finance statistics with secure data isolation

-- Add expense tracking fields to finance_records if needed
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'expense'; -- 'revenue' or 'expense'
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS category TEXT;

-- Create RPC function to get finance statistics
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
      
      -- Expenses from finance_records
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

  -- Get recent transactions
  SELECT json_agg(row_to_json(t)) INTO v_transactions
  FROM (
    SELECT 
      id,
      created_at,
      COALESCE(barber_name, 'Serviço') as barber_name,
      revenue as amount,
      commission_value as expense
    FROM (
      -- Revenue transactions
      SELECT 
        a.id,
        a.appointment_time as created_at,
        NULL as barber_name,
        a.price as revenue,
        0 as commission_value
      FROM appointments a
      WHERE a.user_id = p_user_id
        AND a.status = 'Completed'
        AND a.appointment_time >= v_start_date
        AND a.appointment_time <= v_end_date
      
      UNION ALL
      
      -- Expense transactions
      SELECT 
        f.id,
        f.created_at,
        f.barber_name,
        0 as revenue,
        f.commission_value
      FROM finance_records f
      WHERE f.user_id = p_user_id
        AND f.created_at >= v_start_date
        AND f.created_at <= v_end_date
    ) all_transactions
    ORDER BY created_at DESC
    LIMIT 50
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_finance_stats(UUID, TIMESTAMP, TIMESTAMP) TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_time_status 
  ON appointments(user_id, appointment_time, status);

CREATE INDEX IF NOT EXISTS idx_finance_records_user_created 
  ON finance_records(user_id, created_at);
