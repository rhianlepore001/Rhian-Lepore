-- Fase 9: Produtos v1.
-- Estoque, vendas avulsas e venda vinculada a atendimento com transacao atomica.

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL CHECK (sale_price >= 0),
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  min_stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (min_stock_quantity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.product_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  finance_record_id UUID REFERENCES public.finance_records(id) ON DELETE SET NULL,
  sold_by UUID NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_sale_price DECIMAL(10,2) NOT NULL CHECK (unit_sale_price >= 0),
  unit_cost_price DECIMAL(10,2) NOT NULL CHECK (unit_cost_price >= 0),
  total_revenue DECIMAL(10,2) NOT NULL CHECK (total_revenue >= 0),
  total_cost DECIMAL(10,2) NOT NULL CHECK (total_cost >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_products_company_active
  ON public.products (company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_product_sales_company_created
  ON public.product_sales (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_sales_product
  ON public.product_sales (product_id);

DROP POLICY IF EXISTS "Products: tenant can view active" ON public.products;
CREATE POLICY "Products: tenant can view active"
  ON public.products
  FOR SELECT
  USING (
    company_id::TEXT = get_auth_company_id()
    AND (is_active = TRUE OR get_auth_role() = 'owner')
  );

DROP POLICY IF EXISTS "Products: owner can insert" ON public.products;
CREATE POLICY "Products: owner can insert"
  ON public.products
  FOR INSERT
  WITH CHECK (
    company_id::TEXT = get_auth_company_id()
    AND get_auth_role() = 'owner'
  );

DROP POLICY IF EXISTS "Products: owner can update" ON public.products;
CREATE POLICY "Products: owner can update"
  ON public.products
  FOR UPDATE
  USING (
    company_id::TEXT = get_auth_company_id()
    AND get_auth_role() = 'owner'
  )
  WITH CHECK (
    company_id::TEXT = get_auth_company_id()
    AND get_auth_role() = 'owner'
  );

DROP POLICY IF EXISTS "Product sales: tenant can view" ON public.product_sales;
CREATE POLICY "Product sales: tenant can view"
  ON public.product_sales
  FOR SELECT
  USING (company_id::TEXT = get_auth_company_id());

CREATE OR REPLACE FUNCTION public.sell_product(
  p_product_id UUID,
  p_quantity INTEGER,
  p_appointment_id UUID DEFAULT NULL
)
RETURNS public.product_sales AS $$
DECLARE
  v_company_id TEXT;
  v_product public.products%ROWTYPE;
  v_finance_record_id UUID;
  v_sale public.product_sales%ROWTYPE;
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
    revenue,
    type,
    description,
    service_name,
    created_at
  ) VALUES (
    COALESCE(
      (SELECT full_name FROM public.profiles WHERE id = auth.uid()::TEXT),
      'Venda de Produto'
    ),
    v_company_id,
    p_appointment_id,
    v_product.sale_price * p_quantity,
    'revenue',
    'Venda de produto: ' || v_product.name,
    v_product.name,
    NOW()
  )
  RETURNING id INTO v_finance_record_id;

  INSERT INTO public.product_sales (
    company_id,
    product_id,
    appointment_id,
    finance_record_id,
    sold_by,
    quantity,
    unit_sale_price,
    unit_cost_price,
    total_revenue,
    total_cost
  ) VALUES (
    v_company_id::UUID,
    p_product_id,
    p_appointment_id,
    v_finance_record_id,
    auth.uid(),
    p_quantity,
    v_product.sale_price,
    v_product.cost_price,
    v_product.sale_price * p_quantity,
    v_product.cost_price * p_quantity
  )
  RETURNING * INTO v_sale;

  RETURN v_sale;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.sell_product(UUID, INTEGER, UUID) TO authenticated;
