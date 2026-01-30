-- 1. ADD BUSINESS_ID TO TEAM_MEMBERS
-- This links a team member (user_id) to the business owner (business_id)
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES auth.users(id);

-- Backfill business_id for existing owners who are also team members
UPDATE team_members
SET business_id = user_id
WHERE business_id IS NULL;

-- 2. UPDATE RLS POLICIES FOR MULTI-USER ACCESS
-- We need to allow staff to see and manage data belonging to their business_id

-- Helper function to check if a user is a staff member of a business
CREATE OR REPLACE FUNCTION is_staff_of(p_business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = auth.uid()
    AND business_id = p_business_id
    AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Appointments Policy
DROP POLICY IF EXISTS "Appointments: user isolation" ON appointments;
CREATE POLICY "Appointments: multi_user_access"
  ON appointments
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR -- Is owner
    is_staff_of(user_id)    -- Is staff
  )
  WITH CHECK (
    user_id = auth.uid() OR -- Is owner
    is_staff_of(user_id)    -- Is staff
  );

-- Update Clients Policy
DROP POLICY IF EXISTS "Clients: user isolation" ON clients;
CREATE POLICY "Clients: multi_user_access"
  ON clients
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    is_staff_of(user_id)
  )
  WITH CHECK (
    user_id = auth.uid() OR
    is_staff_of(user_id)
  );

-- Update Services Policy
DROP POLICY IF EXISTS "Services: user isolation" ON services;
CREATE POLICY "Services: multi_user_access"
  ON services
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    is_staff_of(user_id)
  )
  WITH CHECK (
    user_id = auth.uid() OR
    is_staff_of(user_id)
  );

-- Update Finance Records Policy (Staff can see, but maybe only owner can manage?)
-- For now, let's allow read for staff to see reports
DROP POLICY IF EXISTS "Finance: user isolation" ON finance_records;
CREATE POLICY "Finance: multi_user_access"
  ON finance_records
  FOR ALL -- Or separate per action
  TO authenticated
  USING (
    user_id = auth.uid() OR
    is_staff_of(user_id)
  );

-- 3. IMPROVE get_dashboard_insights GROUPING
-- The previous version grouped by the concatenated service string.
-- This version will try to be smarter or at least more consistent.
CREATE OR REPLACE FUNCTION get_dashboard_insights(
  p_user_id UUID,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_start_date TIMESTAMP;
  v_end_date TIMESTAMP;
  v_total_appointments INT;
  v_new_clients INT;
  v_active_clients INT;
  v_top_professionals JSON;
  v_top_services JSON;
  v_appointments_by_day JSON;
  v_result JSON;
BEGIN
  -- Default to last 30 days if not specified
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  -- 1. Total Appointments (Completed)
  SELECT COUNT(*) INTO v_total_appointments
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= v_start_date
    AND appointment_time <= v_end_date;

  -- 2. New Clients
  SELECT COUNT(*) INTO v_new_clients
  FROM clients
  WHERE user_id = p_user_id
    AND created_at >= v_start_date
    AND created_at <= v_end_date;

  -- 3. Active Clients
  SELECT COUNT(DISTINCT client_id) INTO v_active_clients
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= v_start_date
    AND appointment_time <= v_end_date;

  -- 4. Top Professionals
  SELECT json_agg(row_to_json(t)) INTO v_top_professionals
  FROM (
    SELECT 
      tm.name,
      COUNT(a.id) as count,
      SUM(a.price) as revenue
    FROM appointments a
    JOIN team_members tm ON a.professional_id = tm.id
    WHERE a.user_id = p_user_id
      AND a.status = 'Completed'
      AND a.appointment_time >= v_start_date
      AND a.appointment_time <= v_end_date
    GROUP BY tm.name
    ORDER BY revenue DESC
    LIMIT 5
  ) t;

  -- 5. Top Services (Now grouping by the first service name for better charts)
  SELECT json_agg(row_to_json(t)) INTO v_top_services
  FROM (
    SELECT 
      split_part(service, ',', 1) as name, -- Group by first service if multiple
      COUNT(*) as count
    FROM appointments
    WHERE user_id = p_user_id
      AND status = 'Completed'
      AND appointment_time >= v_start_date
      AND appointment_time <= v_end_date
    GROUP BY name
    ORDER BY count DESC
    LIMIT 5
  ) t;

  -- 6. Appointments by Day
  SELECT json_agg(row_to_json(t)) INTO v_appointments_by_day
  FROM (
    SELECT 
      TO_CHAR(DATE(appointment_time), 'DD/MM') as name,
      COUNT(*) as count
    FROM appointments
    WHERE user_id = p_user_id
        AND status = 'Completed'
      AND appointment_time >= v_start_date
      AND appointment_time <= v_end_date
    GROUP BY DATE(appointment_time)
    ORDER BY DATE(appointment_time)
  ) t;

  v_result := json_build_object(
    'total_appointments', COALESCE(v_total_appointments, 0),
    'new_clients', COALESCE(v_new_clients, 0),
    'active_clients', COALESCE(v_active_clients, 0),
    'top_professionals', COALESCE(v_top_professionals, '[]'::json),
    'top_services', COALESCE(v_top_services, '[]'::json),
    'appointments_by_day', COALESCE(v_appointments_by_day, '[]'::json)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
