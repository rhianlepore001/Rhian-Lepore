-- Bugs: quinzenal rejeitado no CHECK; recálculo lia finance_records.deleted_at
-- (coluna fantasma); complete_appointment(uuid) colidia com a assinatura de
-- 7 args no PostgREST (PGRST203) e o Faturar dos atrasados falhava.
-- Feature: lembrete universal opcional (flag em business_settings).

-- ---------------------------------------------------------------------------
-- 1. Quinzenal permitido em team_members
-- ---------------------------------------------------------------------------
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_commission_payment_frequency_check;

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_commission_payment_frequency_check
  CHECK (
    commission_payment_frequency IS NULL
    OR commission_payment_frequency = ANY (ARRAY['weekly'::text, 'biweekly'::text, 'monthly'::text])
  );

-- ---------------------------------------------------------------------------
-- 2. Lembrete universal opcional
-- ---------------------------------------------------------------------------
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS commission_universal_reminder_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.business_settings.commission_universal_reminder_enabled IS
  'Se true, todos os colaboradores seguem commission_settlement_day_of_month e a frequencia individual fica travada na UI.';

-- ---------------------------------------------------------------------------
-- 3. Recalculo: nao usar deleted_at (a coluna nao existe em finance_records)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.recalculate_pending_commissions(UUID, DECIMAL);
DROP FUNCTION IF EXISTS public.recalculate_pending_commissions(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.recalculate_pending_commissions(
  p_professional_id UUID,
  p_new_rate DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.';
  END IF;

  IF p_new_rate < 0 OR p_new_rate > 100 THEN
    RAISE EXCEPTION 'Taxa de comissao invalida.';
  END IF;

  SELECT COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT)
  INTO v_auth_company_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.id = p_professional_id
      AND tm.user_id::TEXT = v_auth_company_id
  ) THEN
    RAISE EXCEPTION 'Profissional nao encontrado no tenant autenticado.';
  END IF;

  UPDATE public.finance_records fr
  SET
    commission_rate = p_new_rate,
    commission_value = ROUND((COALESCE(fr.revenue, 0) * p_new_rate / 100)::NUMERIC, 2)
  WHERE fr.professional_id = p_professional_id
    AND fr.commission_paid = FALSE
    AND fr.type = 'revenue'
    AND fr.user_id::TEXT = v_auth_company_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.product_sales ps
      WHERE ps.finance_record_id = fr.id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_pending_commissions(UUID, DECIMAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_pending_commissions(UUID, DECIMAL) FROM anon;
GRANT EXECUTE ON FUNCTION public.recalculate_pending_commissions(UUID, DECIMAL) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. complete_appointment: uma assinatura só (7 args com defaults)
--    Remove o overload de 1 arg que o PostgREST não conseguia distinguir.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.complete_appointment(uuid);

CREATE OR REPLACE FUNCTION public.complete_appointment(
  p_appointment_id UUID,
  p_payment_method TEXT DEFAULT NULL,
  p_received_by UUID DEFAULT NULL,
  p_completed_by UUID DEFAULT NULL,
  p_machine_fee_percent DECIMAL(5,2) DEFAULT 0,
  p_machine_fee_amount DECIMAL(10,2) DEFAULT 0,
  p_final_price DECIMAL(10,2) DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment RECORD;
  v_commission_rate DECIMAL(5,2);
  v_commission_value DECIMAL(10,2);
  v_professional_name TEXT;
  v_client_name TEXT;
  v_machine_fee_enabled BOOLEAN;
  v_commission_base DECIMAL(10,2);
  v_existing_finance INT;
  v_final_price DECIMAL(10,2);
  v_auth_company_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.';
  END IF;

  SELECT COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT) INTO v_auth_company_id;

  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

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

  v_final_price := COALESCE(p_final_price, v_appointment.price, 0);

  IF v_final_price < 0 THEN
    RAISE EXCEPTION 'Preco final nao pode ser negativo.';
  END IF;

  IF COALESCE(p_machine_fee_amount, 0) > v_final_price THEN
    RAISE EXCEPTION 'Taxa de maquininha nao pode exceder o valor final.';
  END IF;

  SELECT COUNT(*) INTO v_existing_finance
  FROM public.finance_records f
  WHERE f.appointment_id = p_appointment_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.product_sales ps
      WHERE ps.finance_record_id = f.id
    );

  UPDATE public.appointments
  SET
    status = 'Completed',
    price = v_final_price,
    payment_method = COALESCE(p_payment_method, payment_method),
    received_by = COALESCE(p_received_by, received_by),
    completed_by = COALESCE(p_completed_by, p_received_by, completed_by),
    completed_at = COALESCE(completed_at, NOW()),
    machine_fee_percent = CASE
      WHEN COALESCE(p_machine_fee_percent, 0) > 0 THEN p_machine_fee_percent
      ELSE machine_fee_percent
    END,
    machine_fee_amount = CASE
      WHEN COALESCE(p_machine_fee_amount, 0) > 0 THEN p_machine_fee_amount
      ELSE machine_fee_amount
    END,
    machine_fee_applied = CASE
      WHEN COALESCE(p_machine_fee_amount, 0) > 0 THEN TRUE
      ELSE machine_fee_applied
    END,
    updated_at = NOW()
  WHERE id = p_appointment_id;

  IF v_existing_finance > 0 THEN
    UPDATE public.finance_records f
    SET
      revenue = v_final_price,
      payment_method = COALESCE(p_payment_method, payment_method),
      machine_fee_amount = COALESCE(p_machine_fee_amount, machine_fee_amount)
    WHERE f.appointment_id = p_appointment_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.product_sales ps
        WHERE ps.finance_record_id = f.id
      );
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

  SELECT name INTO v_client_name
  FROM public.clients
  WHERE id = v_appointment.client_id;

  SELECT COALESCE(machine_fee_enabled, FALSE) INTO v_machine_fee_enabled
  FROM public.business_settings
  WHERE user_id::TEXT = v_auth_company_id;

  IF v_machine_fee_enabled AND COALESCE(p_machine_fee_amount, 0) > 0 THEN
    v_commission_base := v_final_price - p_machine_fee_amount;
  ELSE
    v_commission_base := v_final_price;
  END IF;

  IF v_commission_base < 0 THEN
    v_commission_base := 0;
  END IF;

  v_commission_value := 0;
  IF v_commission_rate > 0 THEN
    v_commission_value := ROUND((v_commission_base * v_commission_rate / 100)::NUMERIC, 2);
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
    service_name,
    client_name,
    type,
    status,
    commission_paid,
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
    COALESCE(p_machine_fee_amount, 0),
    p_payment_method,
    v_appointment.service,
    v_client_name,
    'revenue',
    'paid',
    FALSE,
    NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_appointment(
  UUID, TEXT, UUID, UUID, DECIMAL, DECIMAL, DECIMAL
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_appointment(
  UUID, TEXT, UUID, UUID, DECIMAL, DECIMAL, DECIMAL
) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_appointment(
  UUID, TEXT, UUID, UUID, DECIMAL, DECIMAL, DECIMAL
) TO authenticated;

NOTIFY pgrst, 'reload schema';
