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


ALTER TABLE public.products ADD COLUMN commission_percent numeric DEFAULT 0,ADD COLUMN show_in_public boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN full_name text;
ALTER TABLE public.product_sales ADD COLUMN product_id uuid REFERENCES public.products(id), ADD COLUMN sold_by uuid,
 ADD COLUMN client_id uuid,ADD COLUMN unit_sale_price numeric,ADD COLUMN unit_cost_price numeric,ADD COLUMN commission_percent numeric DEFAULT 0;
ALTER TABLE public.product_sales ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.finance_records ALTER COLUMN type SET DEFAULT 'expense';
CREATE TABLE public.appointment_product_lines(id uuid DEFAULT gen_random_uuid(),company_id uuid,appointment_id uuid,product_id uuid,quantity integer,unit_sale_price numeric);
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


GRANT SELECT ON public.products,public.product_sales,public.finance_records,public.team_members TO authenticated;
ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY legacy_staff_own ON public.finance_records FOR SELECT TO authenticated USING(professional_id IN (SELECT id FROM public.team_members WHERE staff_user_id=auth.uid()));
CREATE POLICY legacy_owner ON public.finance_records FOR ALL TO authenticated USING(user_id=public.get_auth_company_id() AND public.get_auth_role()='owner');
UPDATE public.business_settings SET business_hours='{"sun":{"isOpen":true,"blocks":[{"start":"09:00","end":"17:00"}]},"mon":{"isOpen":true,"blocks":[{"start":"09:00","end":"17:00"}]},"tue":{"isOpen":true,"blocks":[{"start":"09:00","end":"17:00"}]},"wed":{"isOpen":true,"blocks":[{"start":"09:00","end":"17:00"}]},"thu":{"isOpen":true,"blocks":[{"start":"09:00","end":"17:00"}]},"fri":{"isOpen":true,"blocks":[{"start":"09:00","end":"17:00"}]},"sat":{"isOpen":true,"blocks":[{"start":"09:00","end":"17:00"}]}}';
