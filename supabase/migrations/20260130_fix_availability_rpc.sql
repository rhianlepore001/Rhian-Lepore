
-- ==========================================================================
-- FIX BOOKING AVAILABILITY & DOUBLE BOOKING PROTECTION
-- ==========================================================================
-- This migration fixes the issue where pending public bookings did not block
-- time slots, and adds a secure RPC for creating appointments.
-- ==========================================================================

-- 1. ROBUST AVAILABILITY FUNCTION
-- This function calculates available slots considering:
-- - Business hours from business_settings
-- - Confirmed appointments from appointments table
-- - Pending/Confirmed requests from public_bookings table
CREATE OR REPLACE FUNCTION get_available_slots(
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
    SELECT business_hours INTO v_hours FROM business_settings WHERE user_id = p_business_id;
    
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
                SELECT 1 FROM appointments a
                WHERE a.user_id = p_business_id
                  AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
                  AND a.status != 'Cancelled'
                  AND a.appointment_time < v_current_slot + (p_duration_min || ' minutes')::INTERVAL
                  AND (a.appointment_time + INTERVAL '30 minutes') > v_current_slot -- Assuming default 30min if not stored, adjust if duration is in table
                
                UNION ALL
                
                -- Check pending public bookings
                SELECT 1 FROM public_bookings pb
                WHERE pb.business_id = p_business_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. SECURE BOOKING RPC
-- Handles availability check and insert in one transaction
-- Now supports both 'public_bookings' and 'appointments' tables
CREATE OR REPLACE FUNCTION create_secure_booking(
    p_business_id UUID,
    p_professional_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_appointment_time TIMESTAMPTZ,
    p_service_ids TEXT[],
    p_total_price NUMERIC,
    p_duration_min INTEGER DEFAULT 30,
    p_status TEXT DEFAULT 'pending', -- 'pending' or 'Confirmed'
    p_client_id UUID DEFAULT NULL,    -- For internal bookings
    p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_is_busy BOOLEAN;
    v_booking_id UUID;
BEGIN
    -- Check for collision again (Double Tap Protection)
    SELECT EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.user_id = p_business_id
          AND a.professional_id = p_professional_id
          AND a.status != 'Cancelled'
          AND a.appointment_time < p_appointment_time + (p_duration_min || ' minutes')::INTERVAL
          AND (a.appointment_time + INTERVAL '30 minutes') > p_appointment_time
          
        UNION ALL
        
        SELECT 1 FROM public_bookings pb
        WHERE pb.business_id = p_business_id
          AND pb.professional_id = p_professional_id
          AND pb.status IN ('pending', 'confirmed')
          AND pb.appointment_time < p_appointment_time + (p_duration_min || ' minutes')::INTERVAL
          AND (pb.appointment_time + (p_duration_min || ' minutes')::INTERVAL) > p_appointment_time
    ) INTO v_is_busy;

    IF v_is_busy THEN
        RETURN json_build_object('success', false, 'message', 'Desculpe, este horário acabou de ser ocupado. Por favor, escolha outro.');
    END IF;

    -- Routing based on status:
    -- 'Confirmed' usually goes to appointments (Internal)
    -- 'pending' goes to public_bookings (External)
    
    IF p_status = 'Confirmed' AND p_client_id IS NOT NULL THEN
        -- Insert into appointments
        INSERT INTO appointments (
            user_id,
            client_id,
            professional_id,
            service, -- Keep as text names for legacy compatibility
            appointment_time,
            price,
            status,
            notes
        ) VALUES (
            p_business_id,
            p_client_id,
            p_professional_id,
            (SELECT string_agg(name, ', ') FROM services WHERE id = ANY(p_service_ids::uuid[])),
            p_appointment_time,
            p_total_price,
            'Confirmed',
            p_notes
        ) RETURNING id INTO v_booking_id;
    ELSE
        -- Insert into public_bookings
        INSERT INTO public_bookings (
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
            p_business_id,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
