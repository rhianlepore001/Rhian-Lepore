-- Migration: comanda de serviço já pago não sobrescreve a forma de pagamento original
-- Data: 2026-09-08
-- Contexto: quando o serviço já estava pago (Pix/MB WAY confirmado ou assinatura) e o
-- gestor adiciona extras na comanda, o front envia a forma de pagamento dos extras.
-- `settle_queue_ticket` fazia COALESCE(p_payment_method, payment_method) e trocava o
-- Pix/assinatura original pelo método dos extras. Agora o método original é preservado
-- quando payment_status já é 'paid' ou 'membership'.
-- Também garante REPLICA IDENTITY FULL em queue_entries para que UPDATE/DELETE com filtro
-- (business_id=eq.…) cheguem pelo Realtime.

ALTER TABLE public.queue_entries REPLICA IDENTITY FULL;

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
    user_id, client_id, professional_id, service, appointment_time, price, status, duration_minutes
  ) VALUES (
    v_tenant, v_client_id, v_pro, v_service_name, NOW(), v_price, 'Completed',
    COALESCE(v_entry.duration_minutes, 30)
  )
  RETURNING id INTO v_appointment_id;

  INSERT INTO public.finance_records (
    user_id, appointment_id, professional_id, barber_name, revenue, commission_rate,
    commission_value, created_at, type, client_name, service_name
  ) VALUES (
    v_tenant, v_appointment_id, v_pro, v_professional_name, v_price,
    COALESCE(v_commission_rate, 0), v_commission_value, NOW(), 'revenue',
    v_entry.client_name, v_service_name
  );

  UPDATE public.queue_entries
  SET status = 'completed',
      ticket_status = 'settled',
      settled_appointment_id = v_appointment_id,
      closed_at = COALESCE(closed_at, NOW()),
      closed_by = COALESCE(closed_by, auth.uid()),
      payment_method = CASE
        WHEN payment_status IN ('paid', 'membership') THEN payment_method
        ELSE COALESCE(p_payment_method, payment_method)
      END,
      payment_status = CASE
        WHEN COALESCE(p_payment_method, payment_method) = 'membership' THEN 'membership'
        WHEN payment_status IN ('paid', 'membership') THEN payment_status
        ELSE 'paid'
      END
  WHERE id = p_entry_id;
END;
$$;
