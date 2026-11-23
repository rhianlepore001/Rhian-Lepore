BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE UNIQUE INDEX appointment_products_appointments_tenant_key
  ON public.appointments (id, user_id);

CREATE UNIQUE INDEX appointment_products_products_tenant_key
  ON public.products (id, company_id);

ALTER TABLE public.appointment_product_lines
  ADD CONSTRAINT appointment_products_product_tenant_fk
  FOREIGN KEY (product_id, company_id)
  REFERENCES public.products (id, company_id) NOT VALID;

DO $$
BEGIN
  IF pg_typeof((NULL::public.appointments).user_id) = 'uuid'::regtype THEN
    ALTER TABLE public.appointment_product_lines
      ADD CONSTRAINT appointment_products_appointment_tenant_fk
      FOREIGN KEY (appointment_id, company_id)
      REFERENCES public.appointments (id, user_id) ON DELETE CASCADE NOT VALID;
  ELSE
    ALTER TABLE public.appointment_product_lines
      ADD COLUMN appointment_company_key text GENERATED ALWAYS AS (company_id::text) STORED;

    ALTER TABLE public.appointment_product_lines
      ADD CONSTRAINT appointment_products_appointment_tenant_fk
      FOREIGN KEY (appointment_id, appointment_company_key)
      REFERENCES public.appointments (id, user_id) ON DELETE CASCADE NOT VALID;
  END IF;
END;
$$;

COMMIT;
