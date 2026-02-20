-- ==========================================================================
-- FIX SECURE BOOKING (UNIFICATION & CUSTOM SERVICE SUPPORT)
-- ==========================================================================
-- This migration drops old versions of create_secure_booking and creates
-- a single, unified version that supports p_custom_service_name.
-- ==========================================================================

-- 1. DROP EXISTING FUNCTIONS (Handle different parameter counts)
-- 12 params version
DROP FUNCTION IF EXISTS public.create_secure_booking(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, UUID, TEXT);
-- 13 params version (if exists)
DROP FUNCTION IF EXISTS public.create_secure_booking(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, UUID, TEXT, TEXT);

-- 2. CREATE UNIFIED FUNCTION
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
    p_notes TEXT DEFAULT NULL,
    p_custom_service_name TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_is_busy BOOLEAN;
    v_booking_id UUID;
    v_service_names TEXT;
BEGIN
    -- 1. Double-Booking Protection (Collision Check)
    SELECT EXISTS (
        -- Check appointments
        SELECT 1 FROM public.appointments a
        WHERE a.user_id = p_business_id::text
          AND a.professional_id = p_professional_id
          AND a.status != 'Cancelled'
          AND a.appointment_time < p_appointment_time + (p_duration_min || ' minutes')::INTERVAL
          AND (a.appointment_time + INTERVAL '1 minute') > p_appointment_time -- Small buffer to detect same-start collisions
          
        UNION ALL
        
        -- Check other public bookings
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

    -- 2. Construct Service Names string for appointments table
    SELECT string_agg(name, ', ') INTO v_service_names 
    FROM public.services 
    WHERE id = ANY(p_service_ids::uuid[]);
    
    -- Append custom service if provided
    IF p_custom_service_name IS NOT NULL AND p_custom_service_name != '' THEN
        IF v_service_names IS NOT NULL AND v_service_names != '' THEN
            v_service_names := v_service_names || ' + ' || p_custom_service_name;
        ELSE
            v_service_names := p_custom_service_name;
        END IF;
    END IF;

    -- 3. Routing: 'Confirmed' (Internal) vs 'pending' (External)
    IF p_status = 'Confirmed' AND p_client_id IS NOT NULL THEN
        -- Insert into appointments
        INSERT INTO public.appointments (
            user_id,
            client_id,
            professional_id,
            service, -- Stored as text names for UI display
            appointment_time,
            price,
            duration_minutes,
            status,
            notes
        ) VALUES (
            p_business_id::text,
            p_client_id,
            p_professional_id,
            v_service_names,
            p_appointment_time,
            p_total_price,
            p_duration_min,
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
            duration_minutes,
            status,
            notes
        ) VALUES (
            p_business_id::text,
            p_professional_id,
            p_customer_name,
            p_customer_phone,
            p_customer_email,
            p_appointment_time,
            p_service_ids::uuid[],
            p_total_price,
            p_duration_min,
            p_status,
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

-- Grant execution to authenticated (for dashboard) and anon (for public booking)
GRANT EXECUTE ON FUNCTION public.create_secure_booking(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, UUID, TEXT, TEXT) TO authenticated, anon;
