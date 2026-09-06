-- Fila Digital v2: settings, pagamento, comandas, RPCs, RLS.

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS queue_mode TEXT NOT NULL DEFAULT 'shared',
  ADD COLUMN IF NOT EXISTS queue_allow_leave BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS queue_late_minutes INTEGER NOT NULL DEFAULT 10;

ALTER TABLE public.business_settings
  DROP CONSTRAINT IF EXISTS business_settings_queue_mode_check;
ALTER TABLE public.business_settings
  ADD CONSTRAINT business_settings_queue_mode_check
  CHECK (queue_mode IN ('shared', 'per_professional'));

ALTER TABLE public.business_settings
  DROP CONSTRAINT IF EXISTS business_settings_queue_late_minutes_check;
ALTER TABLE public.business_settings
  ADD CONSTRAINT business_settings_queue_late_minutes_check
  CHECK (queue_late_minutes BETWEEN 1 AND 120);

ALTER TABLE public.queue_entries
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS service_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS extra_service_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS ticket_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID,
  ADD COLUMN IF NOT EXISTS serving_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS settled_appointment_id UUID,
  ADD COLUMN IF NOT EXISTS product_lines JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.queue_entries
  DROP CONSTRAINT IF EXISTS queue_entries_payment_status_check;
ALTER TABLE public.queue_entries
  ADD CONSTRAINT queue_entries_payment_status_check
  CHECK (payment_status IN ('unpaid', 'awaiting_confirmation', 'paid', 'membership'));

ALTER TABLE public.queue_entries
  DROP CONSTRAINT IF EXISTS queue_entries_ticket_status_check;
ALTER TABLE public.queue_entries
  ADD CONSTRAINT queue_entries_ticket_status_check
  CHECK (ticket_status IN ('none', 'open', 'settled'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_entries_settled_appointment
  ON public.queue_entries (settled_appointment_id)
  WHERE settled_appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_queue_entries_active_lane
  ON public.queue_entries (business_id, professional_id, joined_at)
  WHERE status IN ('waiting', 'calling', 'serving');

CREATE TABLE IF NOT EXISTS public.queue_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  queue_entry_id UUID NOT NULL REFERENCES public.queue_entries(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('pix', 'mbway')),
  amount_cents INTEGER NOT NULL,
  br_code TEXT,
  txid TEXT,
  mbway_phone TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_payments_entry ON public.queue_payments (queue_entry_id);
CREATE INDEX IF NOT EXISTS idx_queue_payments_business_status ON public.queue_payments (business_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_payments_active
  ON public.queue_payments (queue_entry_id)
  WHERE status IN ('pending', 'paid');

ALTER TABLE public.queue_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can join queue" ON public.queue_entries;
DROP POLICY IF EXISTS "Queue: company isolation" ON public.queue_entries;
DROP POLICY IF EXISTS "Staff can update company queue" ON public.queue_entries;

DROP POLICY IF EXISTS "Owners manage queue_payments" ON public.queue_payments;
CREATE POLICY "Owners manage queue_payments"
  ON public.queue_payments
  FOR ALL
  TO authenticated
  USING (auth.uid() = business_id)
  WITH CHECK (auth.uid() = business_id);

DROP POLICY IF EXISTS "Staff view queue_payments" ON public.queue_payments;
CREATE POLICY "Staff view queue_payments"
  ON public.queue_payments
  FOR SELECT
  TO authenticated
  USING (
    business_id::TEXT IN (
      SELECT tm.user_id::TEXT FROM public.team_members tm
      WHERE tm.staff_user_id = auth.uid() AND tm.active = true
    )
  );

CREATE OR REPLACE FUNCTION public.queue_lock_settings(p_business_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM 1
  FROM public.business_settings
  WHERE user_id = p_business_id
  FOR UPDATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_tenant_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(get_auth_company_id(), auth.uid()::TEXT);
END;
$$;

CREATE OR REPLACE FUNCTION public.join_queue_entry(
  p_slug TEXT,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_service_id UUID,
  p_professional_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cash',
  p_br_code TEXT DEFAULT NULL,
  p_txid TEXT DEFAULT NULL,
  p_mbway_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_mode TEXT;
  v_service RECORD;
  v_staff_count INTEGER;
  v_client_id UUID;
  v_payment_status TEXT := 'unpaid';
  v_entry_id UUID;
BEGIN
  SELECT id INTO v_business_id
  FROM public.profiles
  WHERE business_slug = p_slug;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Estabelecimento nao encontrado.';
  END IF;

  PERFORM public.queue_lock_settings(v_business_id);

  SELECT COALESCE(queue_mode, 'shared') INTO v_mode
  FROM public.business_settings
  WHERE user_id = v_business_id;

  v_mode := COALESCE(v_mode, 'shared');

  IF v_mode = 'per_professional' AND p_professional_id IS NULL THEN
    RAISE EXCEPTION 'QR de colaborador obrigatorio.';
  END IF;

  IF v_mode = 'shared' THEN
    SELECT COUNT(*) INTO v_staff_count
    FROM public.team_members
    WHERE user_id::TEXT = v_business_id::TEXT AND active = true;
    IF COALESCE(v_staff_count, 0) = 0 THEN
      RAISE EXCEPTION 'Fila indisponivel no momento.';
    END IF;
  END IF;

  SELECT id, name, duration_minutes, price
  INTO v_service
  FROM public.services
  WHERE id = p_service_id
    AND user_id::TEXT = v_business_id::TEXT;

  IF v_service.id IS NULL THEN
    RAISE EXCEPTION 'Servico invalido.';
  END IF;

  IF p_professional_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.team_members
      WHERE id = p_professional_id
        AND user_id::TEXT = v_business_id::TEXT
        AND active = true
    ) THEN
      RAISE EXCEPTION 'Este QR nao esta ativo. Peca o QR da casa.';
    END IF;
  END IF;

  IF p_payment_method = 'membership' THEN
    v_payment_status := 'membership';
  ELSIF p_payment_method IN ('pix', 'mbway') THEN
    v_payment_status := 'awaiting_confirmation';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  SELECT id INTO v_client_id
  FROM public.clients
  WHERE user_id::TEXT = v_business_id::TEXT
    AND public.normalize_phone_digits(phone) = public.normalize_phone_digits(p_client_phone)
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  INSERT INTO public.queue_entries (
    business_id, client_id, client_name, client_phone, service_id, professional_id,
    status, duration_minutes, service_price_cents, payment_method, payment_status
  ) VALUES (
    v_business_id,
    v_client_id,
    p_client_name,
    p_client_phone,
    p_service_id,
    CASE WHEN v_mode = 'per_professional' THEN p_professional_id ELSE NULL END,
    'waiting',
    COALESCE(v_service.duration_minutes, 30),
    ROUND(COALESCE(v_service.price, 0) * 100),
    p_payment_method,
    v_payment_status
  )
  RETURNING id INTO v_entry_id;

  IF p_payment_method IN ('pix', 'mbway') THEN
    INSERT INTO public.queue_payments (
      business_id, queue_entry_id, method, amount_cents, br_code, txid, mbway_phone, expires_at
    ) VALUES (
      v_business_id,
      v_entry_id,
      p_payment_method,
      ROUND(COALESCE(v_service.price, 0) * 100),
      p_br_code,
      p_txid,
      p_mbway_phone,
      NOW() + INTERVAL '2 hours'
    );
  END IF;

  RETURN jsonb_build_object('id', v_entry_id, 'business_id', v_business_id);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Este telefone ja esta na fila.';
END;
$$;

CREATE OR REPLACE FUNCTION public.add_manual_queue_entry(
  p_client_name TEXT,
  p_client_phone TEXT,
  p_service_id UUID,
  p_professional_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cash'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant TEXT := public.queue_tenant_id();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.';
  END IF;

  RETURN public.join_queue_entry(
    (SELECT business_slug FROM public.profiles WHERE id::TEXT = v_tenant),
    p_client_name,
    p_client_phone,
    p_service_id,
    p_professional_id,
    p_payment_method,
    NULL,
    NULL,
    NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_queue_public_board(p_entry_id UUID, p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.queue_entries%ROWTYPE;
  v_settings RECORD;
  v_service_name TEXT;
  v_people JSONB;
  v_position INTEGER;
BEGIN
  SELECT * INTO v_entry
  FROM public.queue_entries
  WHERE id = p_entry_id
    AND public.phones_match(client_phone, p_phone);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrada da fila nao encontrada.';
  END IF;

  SELECT COALESCE(queue_allow_leave, true) AS allow_leave,
         COALESCE(queue_late_minutes, 10) AS late_minutes,
         COALESCE(queue_mode, 'shared') AS queue_mode
  INTO v_settings
  FROM public.business_settings
  WHERE user_id = v_entry.business_id;

  SELECT name INTO v_service_name
  FROM public.services
  WHERE id = v_entry.service_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'position', pos,
      'firstName', split_part(trim(client_name), ' ', 1),
      'isYou', id = v_entry.id
    ) ORDER BY pos
  ), '[]'::jsonb)
  INTO v_people
  FROM (
    SELECT id, client_name,
           ROW_NUMBER() OVER (ORDER BY joined_at, id) AS pos
    FROM public.queue_entries
    WHERE business_id = v_entry.business_id
      AND status IN ('waiting', 'calling')
      AND (
        COALESCE(v_settings.queue_mode, 'shared') = 'shared'
        OR professional_id IS NOT DISTINCT FROM v_entry.professional_id
      )
  ) ranked;

  SELECT pos INTO v_position
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY joined_at, id) AS pos
    FROM public.queue_entries
    WHERE business_id = v_entry.business_id
      AND status IN ('waiting', 'calling')
      AND (
        COALESCE(v_settings.queue_mode, 'shared') = 'shared'
        OR professional_id IS NOT DISTINCT FROM v_entry.professional_id
      )
  ) ranked
  WHERE id = v_entry.id;

  RETURN jsonb_build_object(
    'entryId', v_entry.id,
    'status', v_entry.status,
    'paymentStatus', v_entry.payment_status,
    'serviceName', COALESCE(v_service_name, 'Servico'),
    'position', v_position,
    'etaMinutes', NULL,
    'people', v_people,
    'settings', jsonb_build_object(
      'allowLeave', COALESCE(v_settings.allow_leave, true),
      'lateMinutes', COALESCE(v_settings.late_minutes, 10)
    ),
    'calledAt', v_entry.called_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_queue_status(
  p_entry_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant TEXT := public.queue_tenant_id();
  v_entry public.queue_entries%ROWTYPE;
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

  IF p_status = 'serving' THEN
    SELECT id INTO v_pro
    FROM public.team_members
    WHERE user_id::TEXT = v_tenant
      AND (staff_user_id = auth.uid() OR id::TEXT = auth.uid()::TEXT)
      AND active = true
    LIMIT 1;

    UPDATE public.queue_entries
    SET status = 'serving',
        serving_at = NOW(),
        called_at = COALESCE(called_at, NOW()),
        professional_id = COALESCE(professional_id, v_pro)
    WHERE id = p_entry_id;
    RETURN;
  END IF;

  IF p_status = 'calling' THEN
    UPDATE public.queue_entries
    SET status = 'calling', called_at = NOW()
    WHERE id = p_entry_id;
    RETURN;
  END IF;

  IF p_status = 'waiting' THEN
    UPDATE public.queue_entries
    SET status = 'waiting', called_at = NULL
    WHERE id = p_entry_id;
    RETURN;
  END IF;

  UPDATE public.queue_entries
  SET status = p_status
  WHERE id = p_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_queue_payment(p_entry_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant TEXT := public.queue_tenant_id();
BEGIN
  UPDATE public.queue_payments
  SET status = 'paid', confirmed_by = auth.uid(), confirmed_at = NOW()
  WHERE queue_entry_id = p_entry_id
    AND business_id::TEXT = v_tenant
    AND status = 'pending';

  UPDATE public.queue_entries
  SET payment_status = 'paid'
  WHERE id = p_entry_id AND business_id::TEXT = v_tenant;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_queue_payment(p_entry_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant TEXT := public.queue_tenant_id();
BEGIN
  UPDATE public.queue_payments
  SET status = 'cancelled'
  WHERE queue_entry_id = p_entry_id
    AND business_id::TEXT = v_tenant
    AND status = 'pending';

  UPDATE public.queue_entries
  SET payment_status = 'unpaid', payment_method = 'cash'
  WHERE id = p_entry_id AND business_id::TEXT = v_tenant;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_queue_mode(p_mode TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant UUID := auth.uid();
  v_active INTEGER;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.';
  END IF;

  PERFORM public.queue_lock_settings(v_tenant);

  SELECT COUNT(*) INTO v_active
  FROM public.queue_entries
  WHERE business_id = v_tenant
    AND status IN ('waiting', 'calling', 'serving');

  IF COALESCE(v_active, 0) > 0 THEN
    RAISE EXCEPTION 'Esvazie a fila para trocar o modo.';
  END IF;

  UPDATE public.business_settings
  SET queue_mode = p_mode
  WHERE user_id = v_tenant;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_queue_settings(
  p_allow_leave BOOLEAN,
  p_late_minutes INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.';
  END IF;

  UPDATE public.business_settings
  SET queue_allow_leave = p_allow_leave,
      queue_late_minutes = p_late_minutes
  WHERE user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.fetch_queue_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant TEXT := public.queue_tenant_id();
  v_row RECORD;
BEGIN
  SELECT queue_mode, queue_allow_leave, queue_late_minutes
  INTO v_row
  FROM public.business_settings
  WHERE user_id::TEXT = v_tenant;

  RETURN jsonb_build_object(
    'queueMode', COALESCE(v_row.queue_mode, 'shared'),
    'allowLeave', COALESCE(v_row.queue_allow_leave, true),
    'lateMinutes', COALESCE(v_row.queue_late_minutes, 10)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.close_queue_ticket(p_entry_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant TEXT := public.queue_tenant_id();
  v_entry public.queue_entries%ROWTYPE;
BEGIN
  SELECT * INTO v_entry
  FROM public.queue_entries
  WHERE id = p_entry_id AND business_id::TEXT = v_tenant
  FOR UPDATE;

  IF NOT FOUND OR v_entry.status <> 'serving' THEN
    RAISE EXCEPTION 'Apenas entradas em atendimento podem fechar comanda.';
  END IF;

  UPDATE public.queue_entries
  SET status = 'completed',
      ticket_status = 'open',
      closed_at = NOW(),
      closed_by = auth.uid()
  WHERE id = p_entry_id;
END;
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
      payment_method = COALESCE(p_payment_method, payment_method),
      payment_status = CASE
        WHEN COALESCE(p_payment_method, payment_method) = 'membership' THEN 'membership'
        WHEN payment_status IN ('paid', 'membership') THEN payment_status
        ELSE 'paid'
      END
  WHERE id = p_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_queue_entry(
  p_queue_entry_id UUID,
  p_service_name TEXT,
  p_final_price DECIMAL,
  p_professional_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.settle_queue_ticket(
    p_queue_entry_id,
    p_service_name,
    p_final_price,
    p_professional_id,
    NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.queue_lock_settings(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.queue_tenant_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_queue_entry(TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_manual_queue_entry(TEXT, TEXT, UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_queue_public_board(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_queue_status(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_queue_payment(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_queue_payment(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_queue_mode(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_queue_settings(BOOLEAN, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fetch_queue_settings() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_queue_ticket(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_queue_ticket(UUID, TEXT, DECIMAL, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finish_queue_entry(UUID, TEXT, DECIMAL, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.join_queue_entry(TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_queue_public_board(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_manual_queue_entry(TEXT, TEXT, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_queue_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_queue_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_queue_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_queue_mode(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_queue_settings(BOOLEAN, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fetch_queue_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_queue_ticket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_queue_ticket(UUID, TEXT, DECIMAL, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_queue_entry(UUID, TEXT, DECIMAL, UUID) TO authenticated;
