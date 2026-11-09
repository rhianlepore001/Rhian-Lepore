-- Apply ONLY after the frontend that lists products via get_checkout_products_v1 is in production.
-- Before that, the live checkout reads public.products directly and staff would see an empty catalog.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.products') IS NOT NULL THEN
  ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS chair_products_owner_only ON public.products;
  CREATE POLICY chair_products_owner_only ON public.products AS RESTRICTIVE FOR ALL TO authenticated USING (company_id::text=public.get_auth_company_id() AND public.get_auth_role()='owner') WITH CHECK (company_id::text=public.get_auth_company_id() AND public.get_auth_role()='owner');
 END IF;
END $$;
COMMIT;
