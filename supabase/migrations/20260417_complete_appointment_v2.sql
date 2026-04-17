-- F2: complete_appointment v2
-- Estende a RPC com suporte a received_by, completed_by, machine_fee e commission_base
-- Mantém idempotency guard: não cria finance_record duplicado

CREATE OR REPLACE FUNCTION complete_appointment(
  p_appointment_id UUID,
  p_payment_method TEXT DEFAULT NULL,
  p_received_by UUID DEFAULT NULL,
  p_completed_by UUID DEFAULT NULL,
  p_machine_fee_percent DECIMAL(5,2) DEFAULT 0,
  p_machine_fee_amount DECIMAL(10,2) DEFAULT 0
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
BEGIN
  -- Buscar dados do agendamento
  SELECT * INTO v_appointment FROM public.appointments WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado: %', p_appointment_id;
  END IF;

  -- Idempotency guard: verificar se finance_record já existe para este appointment
  SELECT COUNT(*) INTO v_existing_finance
    FROM public.finance_records
    WHERE appointment_id = p_appointment_id;

  -- Atualizar appointment com status + campos de checkout
  UPDATE public.appointments
  SET
    status        = 'Completed',
    payment_method = COALESCE(p_payment_method, payment_method),
    received_by   = COALESCE(p_received_by, received_by),
    completed_by  = COALESCE(p_completed_by, p_received_by),
    completed_at  = NOW(),
    machine_fee_percent = CASE WHEN p_machine_fee_percent > 0 THEN p_machine_fee_percent ELSE machine_fee_percent END,
    machine_fee_amount  = CASE WHEN p_machine_fee_amount > 0 THEN p_machine_fee_amount ELSE machine_fee_amount END,
    machine_fee_applied = CASE WHEN p_machine_fee_amount > 0 THEN TRUE ELSE machine_fee_applied END,
    updated_at    = NOW()
  WHERE id = p_appointment_id;

  -- Se finance_record já existe, apenas atualizar o método de pagamento e sair
  IF v_existing_finance > 0 THEN
    IF p_payment_method IS NOT NULL THEN
      UPDATE public.finance_records
      SET payment_method = p_payment_method
      WHERE appointment_id = p_appointment_id;
    END IF;
    RETURN;
  END IF;

  -- Buscar dados do profissional
  IF v_appointment.professional_id IS NOT NULL THEN
    SELECT name, COALESCE(commission_rate, commission_percent, 0)
    INTO v_professional_name, v_commission_rate
    FROM public.team_members
    WHERE id = v_appointment.professional_id;
  END IF;

  v_professional_name := COALESCE(v_professional_name, 'Profissional');
  v_commission_rate   := COALESCE(v_commission_rate, 0);

  -- Verificar se machine_fee deve ser repassado ao colaborador
  SELECT COALESCE(machine_fee_enabled, FALSE) INTO v_machine_fee_enabled
    FROM public.business_settings
    WHERE user_id = v_appointment.user_id;

  -- Calcular base de comissão
  IF v_machine_fee_enabled AND p_machine_fee_amount > 0 THEN
    v_commission_base := v_appointment.price - p_machine_fee_amount;
  ELSE
    v_commission_base := v_appointment.price;
  END IF;

  -- Garantir que a base não seja negativa
  IF v_commission_base < 0 THEN
    v_commission_base := 0;
  END IF;

  -- Calcular valor da comissão
  v_commission_value := 0;
  IF v_commission_rate > 0 THEN
    v_commission_value := (v_commission_base * v_commission_rate) / 100;
  END IF;

  -- Inserir finance_record com todos os campos
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
    v_appointment.price,
    v_commission_rate,
    v_commission_value,
    v_commission_base,
    p_machine_fee_amount,
    p_payment_method,
    NOW()
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
