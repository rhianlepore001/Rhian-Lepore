-- Overwrite complete_appointment to be safe and not raise exception for missing commission
CREATE OR REPLACE FUNCTION complete_appointment(p_appointment_id UUID)
RETURNS VOID AS $$
DECLARE
  v_appointment RECORD;
  v_commission_rate DECIMAL(5,2);
  v_commission_value DECIMAL(10,2);
  v_professional_name TEXT;
BEGIN
  -- Get appointment details
  SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  -- Update appointment status
  UPDATE appointments 
  SET status = 'Completed', updated_at = NOW() 
  WHERE id = p_appointment_id;

  -- Get professional details and commission rate
  -- Handle case where professional_id is NULL
  IF v_appointment.professional_id IS NOT NULL THEN
    SELECT name, commission_rate INTO v_professional_name, v_commission_rate
    FROM team_members 
    WHERE id = v_appointment.professional_id;
  ELSE
    v_professional_name := 'Profissional';
    v_commission_rate := 0;
  END IF;

  -- Calculate commission
  v_commission_value := 0;
  IF v_commission_rate IS NOT NULL AND v_commission_rate > 0 THEN
    v_commission_value := (v_appointment.price * v_commission_rate) / 100;
  END IF;

  -- Create finance record
  INSERT INTO finance_records (
    user_id,
    barber_name,
    professional_id,
    appointment_id,
    revenue,
    commission_rate,
    commission_value,
    created_at
  ) VALUES (
    v_appointment.user_id,
    COALESCE(v_professional_name, 'Profissional'),
    v_appointment.professional_id,
    p_appointment_id,
    v_appointment.price,
    COALESCE(v_commission_rate, 0),
    v_commission_value,
    NOW()
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
