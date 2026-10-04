-- Harness (Postgres local descartável) para delete_finance_transaction.
-- A função NÃO existe em prod: este schema reproduz FKs e colunas reais usadas pela RPC.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

CREATE TABLE public.profiles (
  id text PRIMARY KEY,
  role text,
  company_id text
);

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  staff_user_id uuid,
  active boolean DEFAULT true,
  deleted_at timestamptz
);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  name text
);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  professional_id uuid REFERENCES public.team_members(id),
  service text DEFAULT 'Corte',
  status text NOT NULL DEFAULT 'Pending',
  appointment_time timestamptz NOT NULL DEFAULT now(),
  price numeric DEFAULT 0
);

CREATE TABLE public.finance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  professional_id uuid,
  appointment_id uuid REFERENCES public.appointments(id),
  type text DEFAULT 'revenue',
  revenue numeric DEFAULT 0,
  commission_rate numeric DEFAULT 0,
  commission_value numeric DEFAULT 0,
  commission_paid boolean DEFAULT false,
  commission_paid_at timestamptz,
  barber_name text,
  client_name text,
  service_name text,
  description text,
  status text DEFAULT 'paid',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  stock_quantity integer NOT NULL DEFAULT 0
);

CREATE TABLE public.product_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  finance_record_id uuid REFERENCES public.finance_records(id) ON DELETE SET NULL,
  professional_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.appointment_product_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1
);

CREATE TABLE public.appointment_reschedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id text,
  old_appointment_time timestamptz,
  new_appointment_time timestamptz
);

CREATE TABLE public.commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  professional_id uuid,
  payment_date date NOT NULL DEFAULT current_date,
  amount numeric NOT NULL,
  start_date date NOT NULL DEFAULT current_date,
  end_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'paid',
  paid_at timestamptz,
  net_amount numeric DEFAULT 0,
  commission_percent numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT;
BEGIN
  SELECT COALESCE(NULLIF(btrim(company_id), ''), id)
    INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid()::text;
  RETURN v_company_id;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_auth_company_id() TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
