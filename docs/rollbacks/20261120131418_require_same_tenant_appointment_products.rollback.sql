BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.appointment_product_lines
  DROP CONSTRAINT IF EXISTS appointment_products_appointment_tenant_fk,
  DROP CONSTRAINT IF EXISTS appointment_products_product_tenant_fk,
  DROP COLUMN IF EXISTS appointment_company_key;

DROP INDEX IF EXISTS public.appointment_products_appointments_tenant_key;
DROP INDEX IF EXISTS public.appointment_products_products_tenant_key;

COMMIT;
