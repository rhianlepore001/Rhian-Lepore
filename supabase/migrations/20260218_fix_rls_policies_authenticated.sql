-- Fix RLS policies to use 'authenticated' role properly
-- Applied: 2025-12-16

-- ==============================================
-- CLIENTS TABLE
-- ==============================================
DROP POLICY IF EXISTS "Users manage own clients" ON clients;

CREATE POLICY "Users manage own clients" ON clients
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ==============================================
-- APPOINTMENTS TABLE
-- ==============================================
DROP POLICY IF EXISTS "Users can only see their own appointments" ON appointments;

-- ==============================================
-- FINANCE_RECORDS TABLE
-- ==============================================
DROP POLICY IF EXISTS "Users can only see their own finance records" ON finance_records;

-- ==============================================
-- Ensure RLS is enabled on all critical tables
-- ==============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- Fix get_finance_stats function with SECURITY DEFINER
-- ==============================================
DROP FUNCTION IF EXISTS get_finance_stats(UUID, TIMESTAMP, TIMESTAMP);

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
  -- Security check: only allow users to query their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_start_date := COALESCE(p_start_date, date_trunc('month', NOW()));
  v_end_date := COALESCE(p_end_date, NOW());

  SELECT COALESCE(SUM(price), 0) INTO v_revenue
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= v_start_date
    AND appointment_time <= v_end_date;

  SELECT COALESCE(SUM(commission_value), 0) INTO v_expenses
  FROM finance_records
  WHERE user_id = p_user_id
    AND created_at >= v_start_date
    AND created_at <= v_end_date;

  v_profit := v_revenue - v_expenses;

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
    ) combined
    GROUP BY date ORDER BY date
  ) t;

  SELECT json_agg(row_to_json(t)) INTO v_transactions
  FROM (
    SELECT id, created_at, barber_name, client_name, service_name, amount, expense, type, commission_paid
    FROM (
      SELECT a.id, a.appointment_time as created_at, tm.name as barber_name, c.name as client_name,
             a.service as service_name, a.price as amount, 0::numeric as expense, 'revenue' as type, false as commission_paid
      FROM appointments a
      LEFT JOIN team_members tm ON a.professional_id = tm.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.user_id = p_user_id AND a.status = 'Completed'
        AND a.appointment_time >= v_start_date AND a.appointment_time <= v_end_date
      UNION ALL
      SELECT f.id, f.created_at, f.barber_name, f.client_name, f.service_name,
             0::numeric as amount, f.commission_value as expense, 'expense' as type, true as commission_paid
      FROM finance_records f
      WHERE f.user_id = p_user_id AND f.created_at >= v_start_date AND f.created_at <= v_end_date
    ) all_transactions
    ORDER BY created_at DESC LIMIT 100
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
