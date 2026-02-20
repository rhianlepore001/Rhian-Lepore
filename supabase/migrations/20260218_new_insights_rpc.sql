-- Create RPC function to get advanced dashboard insights
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

  -- 2. New Clients (Created in period)
  SELECT COUNT(*) INTO v_new_clients
  FROM clients
  WHERE user_id = p_user_id
    AND created_at >= v_start_date
    AND created_at <= v_end_date;

  -- 3. Active Clients (Unique clients with at least one completed appointment in period)
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
    ORDER BY count DESC
    LIMIT 5
  ) t;

  -- 5. Top Services
  SELECT json_agg(row_to_json(t)) INTO v_top_services
  FROM (
    SELECT 
      service as name,
      COUNT(*) as count
    FROM appointments
    WHERE user_id = p_user_id
      AND status = 'Completed'
      AND appointment_time >= v_start_date
      AND appointment_time <= v_end_date
    GROUP BY service
    ORDER BY count DESC
    LIMIT 5
  ) t;

  -- 6. Appointments by Day (for charts)
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

  -- Build Result
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dashboard_insights(UUID, TIMESTAMP, TIMESTAMP) TO authenticated;
