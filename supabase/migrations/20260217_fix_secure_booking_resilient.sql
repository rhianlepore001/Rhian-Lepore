-- ==========================================================================
-- FIX SECURE BOOKING RESILIENT (TEXT PARAMETERS)
-- ==========================================================================
-- This migration changes the input types from UUID to TEXT to prevent
-- PostgREST type casting issues (Function not found errors).
-- It handles the casting to UUID internally.
-- ==========================================================================

-- 1. DROP EXISTING FUNCTIONS (All variations)
DROP FUNCTION IF EXISTS public.create_secure_booking(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, UUID, TEXT, TEXT);

-- 2. CREATE RESILIENT FUNCTION (Inputs as TEXT where possible)
CREATE OR REPLACE FUNCTION public.create_secure_booking(
    p_business_id TEXT,        -- Changed to TEXT
    p_professional_id TEXT,    -- Changed to TEXT
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_appointment_time TIMESTAMPTZ, -- Keep as TIMESTAMPTZ (PostgREST handles ISO strings well)
    p_service_ids TEXT[],
    p_total_price NUMERIC,
    p_duration_min INTEGER DEFAULT 30,
    p_status TEXT DEFAULT 'pending',
    p_client_id TEXT DEFAULT NULL, -- Changed to TEXT
    p_notes TEXT DEFAULT NULL,
    p_custom_service_name TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_is_busy BOOLEAN;
    v_booking_id UUID;
    v_service_names TEXT;
    
    -- Internal UUID variables
    v_business_uuid UUID;
    v_professional_uuid UUID;
    v_client_uuid UUID;
    v_service_uuids UUID[];
BEGIN
    -- 0. Safe Casting
    BEGIN
        v_business_uuid := p_business_id::UUID;
        v_professional_uuid := p_professional_id::UUID;
        IF p_client_id IS NOT NULL AND p_client_id != '' THEN
            v_client_uuid := p_client_id::UUID;
        END IF;
        
        -- Safe cast for array
        SELECT array_agg(id::uuid) INTO v_service_uuids
        FROM unnest(p_service_ids) as id;
        
    EXCEPTION WHEN invalid_text_representation THEN
        RETURN json_build_object('success', false, 'message', 'Invalid ID format (UUID expected)');
    END;

    -- 1. Double-Booking Protection (Collision Check)
    SELECT EXISTS (
        -- Check appointments
        SELECT 1 FROM public.appointments a
        WHERE a.user_id = v_business_uuid::text
          AND a.professional_id = v_professional_uuid
          AND a.status != 'Cancelled'
          AND a.appointment_time < p_appointment_time + (p_duration_min || ' minutes')::INTERVAL
          AND (a.appointment_time + INTERVAL '1 minute') > p_appointment_time
          
        UNION ALL
        
        -- Check other public bookings
        SELECT 1 FROM public.public_bookings pb
        WHERE pb.business_id = v_business_uuid::text
          AND pb.professional_id = v_professional_uuid
          AND pb.status IN ('pending', 'confirmed')
          AND pb.appointment_time < p_appointment_time + (p_duration_min || ' minutes')::INTERVAL
          AND (pb.appointment_time + (p_duration_min || ' minutes')::INTERVAL) > p_appointment_time
    ) INTO v_is_busy;

    IF v_is_busy THEN
        RETURN json_build_object('success', false, 'message', 'Desculpe, este horário acabou de ser ocupado. Por favor, escolha outro.');
    END IF;

    -- 2. Construct Service Names string
    SELECT string_agg(name, ', ') INTO v_service_names 
    FROM public.services 
    WHERE id = ANY(v_service_uuids);
    
    -- Append custom service if provided
    IF p_custom_service_name IS NOT NULL AND p_custom_service_name != '' THEN
        IF v_service_names IS NOT NULL AND v_service_names != '' THEN
            v_service_names := v_service_names || ' + ' || p_custom_service_name;
        ELSE
            v_service_names := p_custom_service_name;
        END IF;
    END IF;

    -- 3. Routing
    IF p_status = 'Confirmed' AND v_client_uuid IS NOT NULL THEN
        INSERT INTO public.appointments (
            user_id, client_id, professional_id, service, appointment_time, price, duration_minutes, status, notes
        ) VALUES (
            v_business_uuid::text, v_client_uuid, v_professional_uuid, v_service_names, p_appointment_time, p_total_price, p_duration_min, 'Confirmed', p_notes
        ) RETURNING id INTO v_booking_id;
    ELSE
        INSERT INTO public.public_bookings (
            business_id, professional_id, customer_name, customer_phone, customer_email, appointment_time, service_ids, total_price, duration_minutes, status, notes
        ) VALUES (
            v_business_uuid::text, v_professional_uuid, p_customer_name, p_customer_phone, p_customer_email, p_appointment_time, v_service_uuids, p_total_price, p_duration_min, p_status,
            CASE 
                WHEN p_custom_service_name IS NOT NULL AND p_custom_service_name != '' THEN 
                    COALESCE(p_notes, '') || E'\nServiço Personalizado: ' || p_custom_service_name
                ELSE p_notes 
            END
        ) RETURNING id INTO v_booking_id;
    END IF;

    RETURN json_build_object('success', true, 'booking_id', v_booking_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution
GRANT EXECUTE ON FUNCTION public.create_secure_booking(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;
