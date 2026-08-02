-- Produtos v2: comissão, linhas pendentes, booking público, venda com cliente/vendedor.

-- ---------------------------------------------------------------------------
-- 1. products
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0
    CHECK (commission_percent >= 0 AND commission_percent <= 100);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS show_in_public BOOLEAN NOT NULL DEFAULT TRUE;

-- ---------------------------------------------------------------------------
-- 2. product_sales
-- ---------------------------------------------------------------------------
ALTER TABLE public.product_sales
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.product_sales
  ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL;

ALTER TABLE public.product_sales
  ADD COLUMN IF NOT EXISTS commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0
    CHECK (commission_percent >= 0 AND commission_percent <= 100);

ALTER TABLE public.product_sales
  ADD COLUMN IF NOT EXISTS commission_value DECIMAL(10,2) NOT NULL DEFAULT 0
    CHECK (commission_value >= 0);

CREATE INDEX IF NOT EXISTS idx_product_sales_professional
  ON public.product_sales (professional_id)
  WHERE professional_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. appointment_product_lines (intenção até checkout)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointment_product_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_sale_price DECIMAL(10,2) NOT NULL CHECK (unit_sale_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (appointment_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_appt_product_lines_appointment
  ON public.appointment_product_lines (appointment_id);

CREATE INDEX IF NOT EXISTS idx_appt_product_lines_company
  ON public.appointment_product_lines (company_id);

ALTER TABLE public.appointment_product_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Appt product lines: tenant select" ON public.appointment_product_lines;
CREATE POLICY "Appt product lines: tenant select"
  ON public.appointment_product_lines
  FOR SELECT
  USING (company_id::TEXT = get_auth_company_id());

DROP POLICY IF EXISTS "Appt product lines: tenant insert" ON public.appointment_product_lines;
CREATE POLICY "Appt product lines: tenant insert"
  ON public.appointment_product_lines
  FOR INSERT
  WITH CHECK (company_id::TEXT = get_auth_company_id());

DROP POLICY IF EXISTS "Appt product lines: tenant update" ON public.appointment_product_lines;
CREATE POLICY "Appt product lines: tenant update"
  ON public.appointment_product_lines
  FOR UPDATE
  USING (company_id::TEXT = get_auth_company_id())
  WITH CHECK (company_id::TEXT = get_auth_company_id());

DROP POLICY IF EXISTS "Appt product lines: tenant delete" ON public.appointment_product_lines;
CREATE POLICY "Appt product lines: tenant delete"
  ON public.appointment_product_lines
  FOR DELETE
  USING (company_id::TEXT = get_auth_company_id());

-- ---------------------------------------------------------------------------
-- 4. public_bookings.product_lines + business_settings flag
-- ---------------------------------------------------------------------------
ALTER TABLE public.public_bookings
  ADD COLUMN IF NOT EXISTS product_lines JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS public_products_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- 5. sell_product v2 (comissão + cliente + profissional)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.sell_product(UUID, INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.sell_product(
  p_product_id UUID,
  p_quantity INTEGER,
  p_appointment_id UUID DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_professional_id UUID DEFAULT NULL
)
RETURNS public.product_sales AS $$
DECLARE
  v_company_id TEXT;
  v_product public.products%ROWTYPE;
  v_finance_record_id UUID;
  v_sale public.product_sales%ROWTYPE;
  v_total_revenue DECIMAL(10,2);
  v_total_cost DECIMAL(10,2);
  v_commission_percent DECIMAL(5,2);
  v_commission_value DECIMAL(10,2);
  v_professional_name TEXT;
  v_professional_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'invalid_quantity';
  END IF;

  SELECT COALESCE(get_auth_company_id(), auth.uid()::TEXT) INTO v_company_id;

  SELECT * INTO v_product
  FROM public.products
  WHERE id = p_product_id
    AND company_id::TEXT = v_company_id
    AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  IF v_product.stock_quantity < p_quantity THEN
    RAISE EXCEPTION 'insufficient_stock';
  END IF;

  IF p_appointment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.appointments
    WHERE id = p_appointment_id
      AND user_id::TEXT = v_company_id
  ) THEN
    RAISE EXCEPTION 'appointment_not_found';
  END IF;

  IF p_client_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.clients
    WHERE id = p_client_id
      AND user_id::TEXT = v_company_id
  ) THEN
    RAISE EXCEPTION 'client_not_found';
  END IF;

  v_professional_id := p_professional_id;

  -- Fallback: profissional do agendamento
  IF v_professional_id IS NULL AND p_appointment_id IS NOT NULL THEN
    SELECT professional_id INTO v_professional_id
    FROM public.appointments
    WHERE id = p_appointment_id;
  END IF;

  IF v_professional_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE id = v_professional_id
      AND user_id::TEXT = v_company_id
  ) THEN
    RAISE EXCEPTION 'professional_not_found';
  END IF;

  v_total_revenue := v_product.sale_price * p_quantity;
  v_total_cost := v_product.cost_price * p_quantity;
  v_commission_percent := COALESCE(v_product.commission_percent, 0);
  v_commission_value := 0;
  IF v_commission_percent > 0 THEN
    v_commission_value := (v_total_revenue * v_commission_percent) / 100;
  END IF;

  IF v_professional_id IS NOT NULL THEN
    SELECT name INTO v_professional_name
    FROM public.team_members
    WHERE id = v_professional_id;
  END IF;
  IF v_professional_name IS NULL THEN
    SELECT full_name INTO v_professional_name
    FROM public.profiles
    WHERE id = auth.uid()::TEXT;
  END IF;
  v_professional_name := COALESCE(v_professional_name, 'Venda de Produto');

  UPDATE public.products
  SET
    stock_quantity = stock_quantity - p_quantity,
    updated_at = NOW()
  WHERE id = p_product_id
    AND company_id::TEXT = v_company_id;

  INSERT INTO public.finance_records (
    barber_name,
    user_id,
    appointment_id,
    professional_id,
    revenue,
    type,
    description,
    service_name,
    commission_rate,
    commission_value,
    commission_paid,
    created_at
  ) VALUES (
    v_professional_name,
    v_company_id,
    p_appointment_id,
    v_professional_id,
    v_total_revenue,
    'revenue',
    'Venda de produto: ' || v_product.name,
    v_product.name,
    v_commission_percent,
    v_commission_value,
    FALSE,
    NOW()
  )
  RETURNING id INTO v_finance_record_id;

  INSERT INTO public.product_sales (
    company_id,
    product_id,
    appointment_id,
    finance_record_id,
    sold_by,
    professional_id,
    client_id,
    quantity,
    unit_sale_price,
    unit_cost_price,
    total_revenue,
    total_cost,
    commission_percent,
    commission_value
  ) VALUES (
    v_company_id::UUID,
    p_product_id,
    p_appointment_id,
    v_finance_record_id,
    auth.uid(),
    v_professional_id,
    p_client_id,
    p_quantity,
    v_product.sale_price,
    v_product.cost_price,
    v_total_revenue,
    v_total_cost,
    v_commission_percent,
    v_commission_value
  )
  RETURNING * INTO v_sale;

  -- Limpa linha pendente se venda veio do checkout do agendamento
  IF p_appointment_id IS NOT NULL THEN
    DELETE FROM public.appointment_product_lines
    WHERE appointment_id = p_appointment_id
      AND product_id = p_product_id
      AND company_id::TEXT = v_company_id;
  END IF;

  RETURN v_sale;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.sell_product(UUID, INTEGER, UUID, UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Catálogo público de produtos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_products_catalog(p_business_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_result JSON;
BEGIN
  SELECT COALESCE(bs.public_products_enabled, FALSE)
  INTO v_enabled
  FROM public.business_settings bs
  WHERE bs.user_id::TEXT = p_business_id::TEXT
  LIMIT 1;

  IF NOT COALESCE(v_enabled, FALSE) THEN
    RETURN '[]'::json;
  END IF;

  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', p.id,
        'name', p.name,
        'sale_price', p.sale_price,
        'stock_quantity', p.stock_quantity
      )
      ORDER BY p.name ASC
    ),
    '[]'::json
  )
  INTO v_result
  FROM public.products p
  WHERE p.company_id::TEXT = p_business_id::TEXT
    AND p.is_active = TRUE
    AND p.show_in_public = TRUE
    AND p.stock_quantity > 0;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_products_catalog(UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. update_public_booking_by_client — aceita product_lines
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.update_public_booking_by_client(
  UUID, TEXT, UUID[], UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, NUMERIC, INTEGER
);

CREATE OR REPLACE FUNCTION public.update_public_booking_by_client(
  p_booking_id                UUID,
  p_phone                     TEXT,
  p_service_ids               UUID[],
  p_professional_id           UUID,
  p_appointment_time          TIMESTAMPTZ,
  p_original_appointment_time TIMESTAMPTZ,
  p_customer_name             TEXT,
  p_customer_phone            TEXT,
  p_total_price               NUMERIC,
  p_duration_minutes          INTEGER,
  p_product_lines             JSONB DEFAULT '[]'::jsonb
)
RETURNS SETOF public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public_bookings pb
  SET
    service_ids               = p_service_ids,
    professional_id           = p_professional_id,
    appointment_time          = p_appointment_time,
    original_appointment_time = p_original_appointment_time,
    updated_at                = NOW(),
    customer_name             = p_customer_name,
    customer_phone            = p_customer_phone,
    total_price               = p_total_price,
    status                    = 'pending',
    duration_minutes          = p_duration_minutes,
    is_edit                   = true,
    product_lines             = COALESCE(p_product_lines, '[]'::jsonb)
  WHERE pb.id = p_booking_id
    AND public.phones_match(pb.customer_phone, p_phone)
    AND pb.status IN ('pending', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'update_public_booking_by_client: booking not found or not editable';
  END IF;

  RETURN QUERY
  SELECT pb.*
  FROM public_bookings pb
  WHERE pb.id = p_booking_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_public_booking_by_client(
  UUID, TEXT, UUID[], UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, NUMERIC, INTEGER, JSONB
) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Copiar product_lines do booking → appointment_product_lines
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.copy_booking_products_to_appointment(
  p_booking_id UUID,
  p_appointment_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id TEXT;
  v_lines JSONB;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_price DECIMAL(10,2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  SELECT COALESCE(get_auth_company_id(), auth.uid()::TEXT) INTO v_company_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = p_appointment_id AND user_id::TEXT = v_company_id
  ) THEN
    RAISE EXCEPTION 'appointment_not_found';
  END IF;

  SELECT product_lines INTO v_lines
  FROM public.public_bookings
  WHERE id = p_booking_id
    AND business_id::TEXT = v_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_lines IS NULL OR jsonb_typeof(v_lines) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_lines)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := GREATEST(COALESCE((v_item->>'quantity')::INTEGER, 0), 0);
    IF v_product_id IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT sale_price INTO v_price
    FROM public.products
    WHERE id = v_product_id
      AND company_id::TEXT = v_company_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    INSERT INTO public.appointment_product_lines (
      company_id, appointment_id, product_id, quantity, unit_sale_price
    ) VALUES (
      v_company_id::UUID, p_appointment_id, v_product_id, v_qty, v_price
    )
    ON CONFLICT (appointment_id, product_id)
    DO UPDATE SET
      quantity = public.appointment_product_lines.quantity + EXCLUDED.quantity,
      unit_sale_price = EXCLUDED.unit_sale_price;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.copy_booking_products_to_appointment(UUID, UUID) TO authenticated;
