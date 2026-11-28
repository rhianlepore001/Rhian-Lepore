-- Harness isolado (dados fictícios). Nunca apontar para produção.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE public.profiles (id text PRIMARY KEY, role text, company_id text);
CREATE TABLE public.services (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  name text NOT NULL
);
CREATE TABLE public.service_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  service_id uuid NOT NULL REFERENCES public.services(id),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, service_id)
);

CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public AS $$
DECLARE v_company_id text;
BEGIN
  SELECT COALESCE(NULLIF(btrim(company_id), ''), id) INTO v_company_id FROM public.profiles WHERE id = auth.uid()::text;
  RETURN v_company_id;
END $$;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid()::text;
  RETURN v_role;
END $$;

ALTER TABLE public.service_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_costs_owner ON public.service_costs FOR ALL TO authenticated
  USING (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner')
  WITH CHECK (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_costs, public.services, public.profiles TO authenticated;

INSERT INTO public.profiles (id, role, company_id) VALUES
  ('10000000-0000-0000-0000-000000000001', 'owner', '10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-00000000000a', 'staff', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'owner', '20000000-0000-0000-0000-000000000002');

INSERT INTO public.services (id, user_id, name) VALUES
  ('93000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Corte'),
  ('93000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Sobrancelha'),
  ('93000000-0000-0000-0000-000000000099', '20000000-0000-0000-0000-000000000002', 'Corte B');
