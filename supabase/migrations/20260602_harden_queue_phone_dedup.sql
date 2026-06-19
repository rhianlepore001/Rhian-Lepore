-- Fase estabilizacao: normalizacao de telefone para fila/CRM.
-- Mantem compatibilidade com dados legados e evita duplicatas na finalizacao atomica.

CREATE OR REPLACE FUNCTION public.normalize_phone_digits(p_phone TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE INDEX IF NOT EXISTS idx_clients_user_phone_digits
  ON public.clients (user_id, public.normalize_phone_digits(phone));

CREATE INDEX IF NOT EXISTS idx_queue_entries_business_phone_digits
  ON public.queue_entries (business_id, public.normalize_phone_digits(client_phone));

CREATE OR REPLACE FUNCTION public.finish_queue_entry(
  p_queue_entry_id UUID,
  p_service_name TEXT,
  p_final_price DECIMAL(10,2),
  p_professional_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_auth_company_id TEXT;
  v_entry RECORD;
  v_client_id UUID;
  v_appointment_id UUID;
  v_commission_rate DECIMAL(5,2) := 0;
  v_commission_value DECIMAL(10,2) := 0;
  v_professional_name TEXT := 'Profissional';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.';
  END IF;

  IF p_final_price < 0 THEN
    RAISE EXCEPTION 'Preco final nao pode ser negativo.';
  END IF;

  SELECT COALESCE(get_auth_company_id(), auth.uid()::TEXT) INTO v_auth_company_id;

  SELECT * INTO v_entry
  FROM public.queue_entries
  WHERE id = p_queue_entry_id
    AND business_id::TEXT = v_auth_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrada da fila nao encontrada ou sem permissao: %', p_queue_entry_id;
  END IF;

  IF v_entry.status <> 'serving' THEN
    RAISE EXCEPTION 'Apenas entradas em atendimento podem ser finalizadas.';
  END IF;

  SELECT id INTO v_client_id
  FROM public.clients
  WHERE user_id::TEXT = v_auth_company_id
    AND public.normalize_phone_digits(phone) = public.normalize_phone_digits(v_entry.client_phone)
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (
      user_id,
      name,
      phone
    ) VALUES (
      v_auth_company_id,
      v_entry.client_name,
      v_entry.client_phone
    )
    RETURNING id INTO v_client_id;
  END IF;

  IF p_professional_id IS NOT NULL THEN
    SELECT name, COALESCE(commission_rate, commission_percent, 0)
    INTO v_professional_name, v_commission_rate
    FROM public.team_members
    WHERE id = p_professional_id
      AND user_id::TEXT = v_auth_company_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profissional nao encontrado ou sem permissao.';
    END IF;
  END IF;

  v_commission_value := (p_final_price * COALESCE(v_commission_rate, 0)) / 100;

  INSERT INTO public.appointments (
    user_id,
    client_id,
    professional_id,
    service,
    appointment_time,
    price,
    status,
    duration_minutes
  ) VALUES (
    v_auth_company_id,
    v_client_id,
    p_professional_id,
    p_service_name,
    NOW(),
    p_final_price,
    'Completed',
    30
  )
  RETURNING id INTO v_appointment_id;

  INSERT INTO public.finance_records (
    user_id,
    appointment_id,
    professional_id,
    barber_name,
    revenue,
    commission_rate,
    commission_value,
    created_at,
    type,
    client_name,
    service_name
  ) VALUES (
    v_auth_company_id,
    v_appointment_id,
    p_professional_id,
    v_professional_name,
    p_final_price,
    COALESCE(v_commission_rate, 0),
    v_commission_value,
    NOW(),
    'revenue',
    v_entry.client_name,
    p_service_name
  );

  UPDATE public.queue_entries
  SET status = 'completed'
  WHERE id = p_queue_entry_id
    AND business_id::TEXT = v_auth_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.normalize_phone_digits(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_queue_entry(UUID, TEXT, DECIMAL, UUID) TO authenticated;
