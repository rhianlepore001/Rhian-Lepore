-- Add professional_id to appointments if not exists
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES team_members(id);

-- Update finance_records to support commissions
ALTER TABLE finance_records 
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES team_members(id),
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id),
ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS commission_paid_at TIMESTAMP WITH TIME ZONE;

-- Function to complete appointment and generate finance record
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
  SELECT name, commission_rate INTO v_professional_name, v_commission_rate
  FROM team_members 
  WHERE id = v_appointment.professional_id;

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

-- Function to get commissions due
CREATE OR REPLACE FUNCTION get_commissions_due(p_user_id UUID)
RETURNS TABLE (
  professional_id UUID,
  professional_name TEXT,
  total_due DECIMAL(10,2),
  total_records BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fr.professional_id,
    tm.name as professional_name,
    SUM(fr.commission_value) as total_due,
    COUNT(*) as total_records
  FROM finance_records fr
  JOIN team_members tm ON fr.professional_id = tm.id
  WHERE fr.user_id = p_user_id
    AND fr.commission_paid = false
    AND fr.commission_value > 0
  GROUP BY fr.professional_id, tm.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark commissions as paid
CREATE OR REPLACE FUNCTION mark_commissions_as_paid(
  p_user_id UUID,
  p_professional_id UUID,
  p_amount DECIMAL(10,2),
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS VOID AS $$
BEGIN
  -- Create an expense record for the payment
  INSERT INTO finance_records (
    user_id,
    professional_id,
    barber_name,
    revenue,
    commission_value,
    type,
    description,
    created_at
  ) VALUES (
    p_user_id,
    p_professional_id,
    (SELECT name FROM team_members WHERE id = p_professional_id),
    0, -- No revenue
    p_amount, -- This is an expense
    'expense',
    'Pagamento de Comissão',
    NOW()
  );

  -- Mark records as paid
  UPDATE finance_records
  SET 
    commission_paid = true,
    commission_paid_at = NOW()
  WHERE user_id = p_user_id
    AND professional_id = p_professional_id
    AND commission_paid = false
    AND created_at >= p_start_date
    AND created_at <= p_end_date;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
