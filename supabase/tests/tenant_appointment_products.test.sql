CREATE DATABASE tenant_appointment_products;
\connect tenant_appointment_products

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
    CREATE ROLE authenticated;
  END IF;
END;
$$;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;

CREATE FUNCTION public.get_auth_company_id() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT auth.uid()::text
$$;
CREATE FUNCTION public.get_auth_role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN auth.uid() IS NOT NULL THEN 'owner' END
$$;

CREATE TABLE public.appointments (id uuid PRIMARY KEY, user_id :company_key_type NOT NULL);
CREATE TABLE public.clients (id uuid PRIMARY KEY);
CREATE TABLE public.team_members (id uuid PRIMARY KEY);
CREATE TABLE public.finance_records (id uuid PRIMARY KEY);
CREATE TABLE public.business_settings (user_id text PRIMARY KEY);
CREATE TABLE public.public_bookings (id uuid PRIMARY KEY, business_id text NOT NULL);

\ir ../migrations/20260603_products_v1.sql
\ir ../migrations/20260802000001_products_v2.sql

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_product_lines TO anon, authenticated;

INSERT INTO public.appointments (id, user_id) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002');
INSERT INTO public.products (id, company_id, name, sale_price, cost_price, stock_quantity) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Produto A', 20, 10, 5),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Produto B', 30, 12, 5);
INSERT INTO public.appointment_product_lines (company_id, appointment_id, product_id, quantity, unit_sale_price) VALUES
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 1, 30);

\ir ../migrations/20261120131418_require_same_tenant_appointment_products.sql

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

DO $$
BEGIN
  IF EXISTS (SELECT FROM public.appointment_product_lines) THEN
    RAISE EXCEPTION 'Linhas de outra empresa ficaram visíveis';
  END IF;

  INSERT INTO public.appointment_product_lines (company_id, appointment_id, product_id, quantity, unit_sale_price)
  VALUES ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 20);

  BEGIN
    UPDATE public.appointment_product_lines SET product_id = '20000000-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'A alteração aceitou um produto de outra empresa';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.appointment_product_lines (company_id, appointment_id, product_id, quantity, unit_sale_price)
    VALUES ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 1, 20);
    RAISE EXCEPTION 'A inserção aceitou um agendamento de outra empresa';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  IF (SELECT count(*) FROM public.appointment_product_lines) <> 1 THEN
    RAISE EXCEPTION 'O acesso às linhas da própria empresa mudou';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);
SET ROLE anon;

DO $$
BEGIN
  IF EXISTS (SELECT FROM public.appointment_product_lines) THEN
    RAISE EXCEPTION 'Acesso anônimo às linhas internas';
  END IF;
END;
$$;

RESET ROLE;

INSERT INTO public.public_bookings (id, business_id, product_lines)
VALUES (
  '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '[{"product_id":"20000000-0000-0000-0000-000000000001","quantity":1}]'
);

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
SELECT public.copy_booking_products_to_appointment(
  '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'
);

DO $$
BEGIN
  IF (SELECT quantity FROM public.appointment_product_lines) IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'A cópia do produto de um pedido para a agenda mudou';
  END IF;
END;
$$;

RESET ROLE;
DELETE FROM public.appointments WHERE id = '10000000-0000-0000-0000-000000000002';
DO $$
BEGIN
  IF EXISTS (SELECT FROM public.appointment_product_lines WHERE company_id = '00000000-0000-0000-0000-000000000002') THEN
    RAISE EXCEPTION 'A exclusão do agendamento deixou órfã a linha de produto';
  END IF;
END;
$$;

\ir ../../docs/rollbacks/20261120131418_require_same_tenant_appointment_products.rollback.sql

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_constraint WHERE conname IN ('appointment_products_appointment_tenant_fk', 'appointment_products_product_tenant_fk')
  ) OR to_regclass('public.appointment_products_appointments_tenant_key') IS NOT NULL
    OR to_regclass('public.appointment_products_products_tenant_key') IS NOT NULL
    OR EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointment_product_lines' AND column_name = 'appointment_company_key')
    OR (SELECT count(*) FROM public.appointment_product_lines) <> 1 THEN
    RAISE EXCEPTION 'Rollback não preservou o esquema e as linhas originais';
  END IF;
END;
$$;

\connect postgres
DROP DATABASE tenant_appointment_products;
