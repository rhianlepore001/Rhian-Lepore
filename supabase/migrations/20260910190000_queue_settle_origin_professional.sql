-- Fila: grava quem atendeu na senha e não mistura o lançamento com a grade da Agenda.
-- origin='queue' permanece no financeiro (appointment_id); a Agenda filtra esses registros.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'agenda';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_origin_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_origin_check
      CHECK (origin IN ('agenda', 'queue', 'booking'));
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.settle_queue_ticket(
  p_entry_id UUID,
  p_service_name TEXT DEFAULT NULL,
  p_final_price DECIMAL DEFAULT NULL,
  p_professional_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant TEXT := public.queue_tenant_id();
  v_entry public.queue_entries%ROWTYPE;
  v_client_id UUID;
  v_appointment_id UUID;
  v_commission_rate DECIMAL(5,2) := 0;
  v_commission_value DECIMAL(10,2) := 0;
  v_professional_name TEXT := 'Profissional';
  v_price DECIMAL(10,2);
  v_service_name TEXT;
  v_pro UUID;
  v_method TEXT;
  v_payment_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.';
  END IF;

  SELECT * INTO v_entry
  FROM public.queue_entries
  WHERE id = p_entry_id AND business_id::TEXT = v_tenant
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrada da fila nao encontrada.';
  END IF;

  IF v_entry.ticket_status = 'settled' THEN
    RETURN;
  END IF;

  IF v_entry.status NOT IN ('serving', 'completed') THEN
    RAISE EXCEPTION 'Comanda nao pode ser lancada neste estado.';
  END IF;

  v_price := COALESCE(p_final_price, COALESCE(v_entry.service_price_cents, 0) / 100.0);
  v_service_name := COALESCE(p_service_name, 'Servico');
  v_pro := COALESCE(p_professional_id, v_entry.professional_id);

  v_method := CASE
    WHEN v_entry.payment_status IN ('paid', 'membership') THEN v_entry.payment_method
    ELSE COALESCE(p_payment_method, v_entry.payment_method)
  END;
  v_payment_status := CASE
    WHEN v_method = 'membership' THEN 'membership'
    WHEN v_entry.payment_status IN ('paid', 'membership') THEN v_entry.payment_status
    ELSE 'paid'
  END;

  SELECT id INTO v_client_id
  FROM public.clients
  WHERE user_id::TEXT = v_tenant
    AND public.normalize_phone_digits(phone) = public.normalize_phone_digits(v_entry.client_phone)
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (user_id, name, phone)
    VALUES (v_tenant, v_entry.client_name, v_entry.client_phone)
    RETURNING id INTO v_client_id;
  END IF;

  IF v_pro IS NOT NULL THEN
    SELECT name, COALESCE(commission_rate, commission_percent, 0)
    INTO v_professional_name, v_commission_rate
    FROM public.team_members
    WHERE id = v_pro AND user_id::TEXT = v_tenant;
  END IF;

  v_commission_value := (v_price * COALESCE(v_commission_rate, 0)) / 100;

  INSERT INTO public.appointments (
    user_id, client_id, professional_id, service, appointment_time, price, status, duration_minutes,
    payment_method, completed_at, completed_by, origin
  ) VALUES (
    v_tenant, v_client_id, v_pro, v_service_name, NOW(), v_price, 'Completed',
    COALESCE(v_entry.duration_minutes, 30),
    v_method, NOW(), v_pro, 'queue'
  )
  RETURNING id INTO v_appointment_id;

  INSERT INTO public.finance_records (
    user_id, appointment_id, professional_id, barber_name, revenue, commission_rate,
    commission_value, created_at, type, client_name, service_name, payment_method
  ) VALUES (
    v_tenant, v_appointment_id, v_pro, v_professional_name, v_price,
    COALESCE(v_commission_rate, 0), v_commission_value, NOW(), 'revenue',
    v_entry.client_name, v_service_name, v_method
  );

  UPDATE public.queue_entries
  SET status = 'completed',
      ticket_status = 'settled',
      settled_appointment_id = v_appointment_id,
      closed_at = COALESCE(closed_at, NOW()),
      closed_by = COALESCE(closed_by, auth.uid()),
      professional_id = COALESCE(v_pro, professional_id),
      payment_method = v_method,
      payment_status = v_payment_status
  WHERE id = p_entry_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_queue_ticket(UUID, TEXT, DECIMAL, UUID, TEXT) TO authenticated;
