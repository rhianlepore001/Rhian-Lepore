-- Fase 2: checkout atomico com preco final dentro da RPC.
-- Remove a necessidade de UPDATE separado no cliente antes de concluir atendimento.

DROP FUNCTION IF EXISTS public.complete_appointment(
  UUID,
  TEXT,
  UUID,
  UUID,
  DECIMAL,
  DECIMAL
);

CREATE OR REPLACE FUNCTION public.complete_appointment(
  p_appointment_id UUID,
  p_payment_method TEXT DEFAULT NULL,
  p_received_by UUID DEFAULT NULL,
  p_completed_by UUID DEFAULT NULL,
  p_machine_fee_percent DECIMAL(5,2) DEFAULT 0,
  p_machine_fee_amount DECIMAL(10,2) DEFAULT 0,
  p_final_price DECIMAL(10,2) DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_appointment RECORD;
  v_commission_rate DECIMAL(5,2);
  v_commission_value DECIMAL(10,2);
  v_professional_name TEXT;
  v_machine_fee_enabled BOOLEAN;
  v_commission_base DECIMAL(10,2);
  v_existing_finance INT;
  v_final_price DECIMAL(10,2);
  v_auth_company_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.';
  END IF;

  SELECT COALESCE(get_auth_company_id(), auth.uid()::TEXT) INTO v_auth_company_id;

  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id
    AND user_id::TEXT = v_auth_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento nao encontrado ou sem permissao: %', p_appointment_id;
  END IF;

  IF v_appointment.status = 'Cancelled' THEN
    RAISE EXCEPTION 'Agendamento cancelado nao pode ser concluido.';
  END IF;

  v_final_price := COALESCE(p_final_price, v_appointment.price);

  IF v_final_price < 0 THEN
    RAISE EXCEPTION 'Preco final nao pode ser negativo.';
  END IF;

  IF p_machine_fee_amount > v_final_price THEN
    RAISE EXCEPTION 'Taxa de maquininha nao pode exceder o valor final.';
  END IF;

  SELECT COUNT(*) INTO v_existing_finance
  FROM public.finance_records
  WHERE appointment_id = p_appointment_id;

  UPDATE public.appointments
  SET
    status = 'Completed',
    price = v_final_price,
    payment_method = COALESCE(p_payment_method, payment_method),
    received_by = COALESCE(p_received_by, received_by),
    completed_by = COALESCE(p_completed_by, p_received_by),
    completed_at = COALESCE(completed_at, NOW()),
    machine_fee_percent = CASE WHEN p_machine_fee_percent > 0 THEN p_machine_fee_percent ELSE machine_fee_percent END,
    machine_fee_amount = CASE WHEN p_machine_fee_amount > 0 THEN p_machine_fee_amount ELSE machine_fee_amount END,
    machine_fee_applied = CASE WHEN p_machine_fee_amount > 0 THEN TRUE ELSE machine_fee_applied END,
    updated_at = NOW()
  WHERE id = p_appointment_id;

  IF v_existing_finance > 0 THEN
    UPDATE public.finance_records
    SET
      revenue = v_final_price,
      payment_method = COALESCE(p_payment_method, payment_method),
      machine_fee_amount = p_machine_fee_amount
    WHERE appointment_id = p_appointment_id;
    RETURN;
  END IF;

  IF v_appointment.professional_id IS NOT NULL THEN
    SELECT name, COALESCE(commission_rate, commission_percent, 0)
    INTO v_professional_name, v_commission_rate
    FROM public.team_members
    WHERE id = v_appointment.professional_id
      AND user_id::TEXT = v_auth_company_id;
  END IF;

  v_professional_name := COALESCE(v_professional_name, 'Profissional');
  v_commission_rate := COALESCE(v_commission_rate, 0);

  SELECT COALESCE(machine_fee_enabled, FALSE) INTO v_machine_fee_enabled
  FROM public.business_settings
  WHERE user_id::TEXT = v_auth_company_id;

  IF v_machine_fee_enabled AND p_machine_fee_amount > 0 THEN
    v_commission_base := v_final_price - p_machine_fee_amount;
  ELSE
    v_commission_base := v_final_price;
  END IF;

  IF v_commission_base < 0 THEN
    v_commission_base := 0;
  END IF;

  v_commission_value := 0;
  IF v_commission_rate > 0 THEN
    v_commission_value := (v_commission_base * v_commission_rate) / 100;
  END IF;

  INSERT INTO public.finance_records (
    user_id,
    barber_name,
    professional_id,
    appointment_id,
    revenue,
    commission_rate,
    commission_value,
    commission_base,
    machine_fee_amount,
    payment_method,
    created_at
  ) VALUES (
    v_appointment.user_id,
    v_professional_name,
    v_appointment.professional_id,
    p_appointment_id,
    v_final_price,
    v_commission_rate,
    v_commission_value,
    v_commission_base,
    p_machine_fee_amount,
    p_payment_method,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.complete_appointment(
  UUID,
  TEXT,
  UUID,
  UUID,
  DECIMAL,
  DECIMAL,
  DECIMAL
) TO authenticated;
