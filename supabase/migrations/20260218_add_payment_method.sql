-- 1. Alterar tabelas para incluir payment_method
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.public_bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.finance_records ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 2. Atualizar RPC create_secure_booking para aceitar payment_method
-- Drop versions para evitar conflito de assinatura
DROP FUNCTION IF EXISTS public.create_secure_booking(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, UUID, TEXT, TEXT);

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
    p_custom_service_name TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_is_busy BOOLEAN;
    v_booking_id UUID;
    v_service_names TEXT;
BEGIN
    -- 1. Double-Booking Protection
    SELECT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.user_id = p_business_id::text
          AND a.professional_id = p_professional_id
          AND a.status != 'Cancelled'
          AND a.appointment_time < p_appointment_time + (p_duration_min || ' minutes')::INTERVAL
          AND (a.appointment_time + INTERVAL '1 minute') > p_appointment_time
          
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

    -- 2. Construct Service Names
    SELECT string_agg(name, ', ') INTO v_service_names 
    FROM public.services 
    WHERE id = ANY(p_service_ids::uuid[]);
    
    IF p_custom_service_name IS NOT NULL AND p_custom_service_name != '' THEN
        IF v_service_names IS NOT NULL AND v_service_names != '' THEN
            v_service_names := v_service_names || ' + ' || p_custom_service_name;
        ELSE
            v_service_names := p_custom_service_name;
        END IF;
    END IF;

    -- 3. Routing
    IF p_status = 'Confirmed' AND p_client_id IS NOT NULL THEN
        INSERT INTO public.appointments (
            user_id,
            client_id,
            professional_id,
            service,
            appointment_time,
            price,
            duration_minutes,
            status,
            notes,
            payment_method
        ) VALUES (
            p_business_id::text,
            p_client_id,
            p_professional_id,
            v_service_names,
            p_appointment_time,
            p_total_price,
            p_duration_min,
            'Confirmed',
            p_notes,
            p_payment_method
        ) RETURNING id INTO v_booking_id;
    ELSE
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
            notes,
            payment_method
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
            END,
            p_payment_method
        ) RETURNING id INTO v_booking_id;
    END IF;

    RETURN json_build_object('success', true, 'booking_id', v_booking_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_secure_booking(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated, anon;

-- 3. Atualizar RPC complete_appointment para persistir payment_method
CREATE OR REPLACE FUNCTION complete_appointment(p_appointment_id UUID)
RETURNS VOID AS $$
DECLARE
  v_appointment RECORD;
  v_commission_rate DECIMAL(5,2);
  v_commission_value DECIMAL(10,2);
  v_professional_name TEXT;
BEGIN
  SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  UPDATE appointments 
  SET status = 'Completed', updated_at = NOW() 
  WHERE id = p_appointment_id;

  IF v_appointment.professional_id IS NOT NULL THEN
    SELECT name, commission_rate INTO v_professional_name, v_commission_rate
    FROM team_members 
    WHERE id = v_appointment.professional_id;
  ELSE
    v_professional_name := 'Profissional';
    v_commission_rate := 0;
  END IF;

  v_commission_value := 0;
  IF v_commission_rate IS NOT NULL AND v_commission_rate > 0 THEN
    v_commission_value := (v_appointment.price * v_commission_rate) / 100;
  END IF;

  INSERT INTO finance_records (
    user_id,
    barber_name,
    professional_id,
    appointment_id,
    revenue,
    commission_rate,
    commission_value,
    created_at,
    payment_method
  ) VALUES (
    v_appointment.user_id,
    COALESCE(v_professional_name, 'Profissional'),
    v_appointment.professional_id,
    p_appointment_id,
    v_appointment.price,
    COALESCE(v_commission_rate, 0),
    v_commission_value,
    NOW(),
    v_appointment.payment_method
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Atualizar get_finance_stats para retornar payment_method nas transações
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
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  SELECT COALESCE(SUM(price), 0) INTO v_revenue
  FROM appointments
  WHERE user_id = p_user_id::text
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
      SELECT 
        DATE(appointment_time) as date,
        'revenue' as type,
        price as amount
      FROM appointments
      WHERE user_id = p_user_id::text
        AND status = 'Completed'
        AND appointment_time >= v_start_date
        AND appointment_time <= v_end_date
      
      UNION ALL
      
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

  SELECT json_agg(row_to_json(t)) INTO v_transactions
  FROM (
    SELECT 
      id,
      created_at,
      barber_name,
      amount,
      expense,
      type,
      payment_method
    FROM (
      SELECT 
        a.id,
        a.appointment_time as created_at,
        'Serviço' as barber_name,
        a.price as amount,
        0 as expense,
        'revenue' as type,
        a.payment_method
      FROM appointments a
      WHERE a.user_id = p_user_id::text
        AND a.status = 'Completed'
        AND a.appointment_time >= v_start_date
        AND a.appointment_time <= v_end_date
      
      UNION ALL
      
      SELECT 
        f.id,
        f.created_at,
        f.barber_name,
        0 as amount,
        f.commission_value as expense,
        f.type,
        f.payment_method
      FROM finance_records f
      WHERE f.user_id = p_user_id
        AND f.created_at >= v_start_date
        AND f.created_at <= v_end_date
    ) all_transactions
    ORDER BY created_at DESC
    LIMIT 50
  ) t;

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
