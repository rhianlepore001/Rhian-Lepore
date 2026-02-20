-- ==========================================================================
-- SECURE RPC FIX (SEARCH_PATH HARDENING)
-- ==========================================================================
-- This migration fixes the "Function Search Path Mutable" vulnerability
-- by explicitly setting search_path to 'public' for all SECURITY DEFINER functions.
-- This prevents search_path hijacking attacks.
-- ==========================================================================

-- 1. Secure get_queue_position
CREATE OR REPLACE FUNCTION public.get_queue_position(p_queue_id UUID, p_business_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_joined_at TIMESTAMPTZ;
    v_position INTEGER;
BEGIN
    SELECT joined_at INTO v_joined_at FROM public.queue_entries WHERE id = p_queue_id;
    
    SELECT COUNT(*) + 1 INTO v_position
    FROM public.queue_entries
    WHERE business_id = p_business_id 
      AND status = 'waiting'
      AND joined_at < v_joined_at;
      
    RETURN v_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Secure get_dashboard_insights
CREATE OR REPLACE FUNCTION public.get_dashboard_insights(
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
  FROM public.appointments
  WHERE user_id = p_user_id::text
    AND status = 'Completed'
    AND appointment_time >= v_start_date
    AND appointment_time <= v_end_date;

  -- 2. New Clients (Created in period)
  SELECT COUNT(*) INTO v_new_clients
  FROM public.clients
  WHERE user_id = p_user_id::text
    AND created_at >= v_start_date
    AND created_at <= v_end_date;

  -- 3. Active Clients (Unique clients with at least one completed appointment in period)
  SELECT COUNT(DISTINCT client_id) INTO v_active_clients
  FROM public.appointments
  WHERE user_id = p_user_id::text
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
    FROM public.appointments a
    JOIN public.team_members tm ON a.professional_id = tm.id
    WHERE a.user_id = p_user_id::text
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
    FROM public.appointments
    WHERE user_id = p_user_id::text
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
    FROM public.appointments
    WHERE user_id = p_user_id::text
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_dashboard_insights(UUID, TIMESTAMP, TIMESTAMP) TO authenticated;

-- 3. Secure get_available_slots
CREATE OR REPLACE FUNCTION public.get_available_slots(
    p_business_id UUID,
    p_date DATE,
    p_professional_id UUID DEFAULT NULL,
    p_duration_min INTEGER DEFAULT 30
) RETURNS JSON AS $$
DECLARE
    v_hours JSONB;
    v_day_name TEXT;
    v_day_hours JSONB;
    v_start_time TIME;
    v_end_time TIME;
    v_current_slot TIMESTAMPTZ;
    v_end_slot TIMESTAMPTZ;
    v_slots TEXT[] := '{}';
    v_is_busy BOOLEAN;
    v_day_of_week INTEGER;
    v_block RECORD;
BEGIN
    -- Get business hours
    SELECT business_hours INTO v_hours FROM public.business_settings WHERE user_id = p_business_id::text;
    
    -- Map dow (0-6, Sunday is 0) to mon, tue, etc.
    v_day_of_week := extract(dow from p_date);
    v_day_name := CASE v_day_of_week
        WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue' 
        WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' WHEN 5 THEN 'fri' 
        WHEN 6 THEN 'sat'
    END;
    
    v_day_hours := v_hours->v_day_name;
    
    -- If closed, return empty
    IF v_day_hours IS NULL OR NOT (v_day_hours->>'isOpen')::BOOLEAN THEN
        RETURN json_build_object('slots', v_slots);
    END IF;

    -- Iterate through each time block (e.g., Morning/Afternoon)
    FOR v_block IN SELECT * FROM jsonb_to_recordset(v_day_hours->'blocks') AS x(start TEXT, "end" TEXT) LOOP
        v_current_slot := (p_date::TEXT || ' ' || v_block.start)::TIMESTAMPTZ;
        v_end_slot := (p_date::TEXT || ' ' || v_block."end")::TIMESTAMPTZ;

        -- Generate slots every 30 minutes within the block
        WHILE v_current_slot + (p_duration_min || ' minutes')::INTERVAL <= v_end_slot LOOP
            -- Check if anyone is busy at this slot
            SELECT EXISTS (
                -- Check confirmed appointments
                SELECT 1 FROM public.appointments a
                WHERE a.user_id = p_business_id::text
                  AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
                  AND a.status != 'Cancelled'
                  AND a.appointment_time < v_current_slot + (p_duration_min || ' minutes')::INTERVAL
                  AND (a.appointment_time + INTERVAL '30 minutes') > v_current_slot
                
                UNION ALL
                
                -- Check pending public bookings
                SELECT 1 FROM public.public_bookings pb
                WHERE pb.business_id = p_business_id::text
                  AND (p_professional_id IS NULL OR pb.professional_id = p_professional_id)
                  AND pb.status IN ('pending', 'confirmed')
                  AND pb.appointment_time < v_current_slot + (p_duration_min || ' minutes')::INTERVAL
                  AND (pb.appointment_time + (p_duration_min || ' minutes')::INTERVAL) > v_current_slot
            ) INTO v_is_busy;

            IF NOT v_is_busy AND v_current_slot > NOW() THEN
                v_slots := array_append(v_slots, to_char(v_current_slot, 'HH24:MI'));
            END IF;

            v_current_slot := v_current_slot + INTERVAL '30 minutes';
        END WHILE;
    END LOOP;

    RETURN json_build_object('slots', v_slots);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Secure create_secure_booking
CREATE OR REPLACE FUNCTION public.create_secure_booking(
    p_business_id UUID,
    p_professional_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_appointment_time TIMESTAMPTZ,
    p_service_ids TEXT[],
    p_total_price NUMERIC,
    p_duration_min INTEGER DEFAULT 30,
    p_status TEXT DEFAULT 'pending',
    p_client_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_is_busy BOOLEAN;
    v_booking_id UUID;
BEGIN
    -- Check for collision again (Double Tap Protection)
    SELECT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.user_id = p_business_id::text
          AND a.professional_id = p_professional_id
          AND a.status != 'Cancelled'
          AND a.appointment_time < p_appointment_time + (p_duration_min || ' minutes')::INTERVAL
          AND (a.appointment_time + INTERVAL '30 minutes') > p_appointment_time
          
        UNION ALL
        
        SELECT 1 FROM public.public_bookings pb
        WHERE pb.business_id = p_business_id::text
          AND pb.professional_id = p_professional_id
          AND pb.status IN ('pending', 'confirmed')
          AND pb.appointment_time < p_appointment_time + (p_duration_min || ' minutes')::INTERVAL
          AND (pb.appointment_time + (p_duration_min || ' minutes')::INTERVAL) > p_appointment_time
    ) INTO v_is_busy;

    IF v_is_busy THEN
        RETURN json_build_object('success', false, 'message', 'Desculpe, este horário acabou de ser ocupado. Por favor, escolha outro.');
    END IF;

    -- Routing based on status
    IF p_status = 'Confirmed' AND p_client_id IS NOT NULL THEN
        -- Insert into appointments
        INSERT INTO public.appointments (
            user_id,
            client_id,
            professional_id,
            service, -- Keep as text names for legacy compatibility
            appointment_time,
            price,
            status,
            notes
        ) VALUES (
            p_business_id::text,
            p_client_id,
            p_professional_id,
            (SELECT string_agg(name, ', ') FROM public.services WHERE id = ANY(p_service_ids::uuid[])),
            p_appointment_time,
            p_total_price,
            'Confirmed',
            p_notes
        ) RETURNING id INTO v_booking_id;
    ELSE
        -- Insert into public_bookings
        INSERT INTO public.public_bookings (
            business_id, 
            professional_id, 
            customer_name, 
            customer_phone, 
            customer_email, 
            appointment_time, 
            service_ids, 
            total_price, 
            status
        ) VALUES (
            p_business_id::text,
            p_professional_id,
            p_customer_name,
            p_customer_phone,
            p_customer_email,
            p_appointment_time,
            p_service_ids,
            p_total_price,
            p_status
        ) RETURNING id INTO v_booking_id;
    END IF;

    RETURN json_build_object('success', true, 'booking_id', v_booking_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
