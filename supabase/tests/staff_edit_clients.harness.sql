CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE public.profiles (id text PRIMARY KEY, role text, company_id text);
CREATE TABLE public.clients (id uuid PRIMARY KEY, user_id text, name text);
CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text UNIQUE,
  cancellation_policy text DEFAULT 'flexible', timezone text
);
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.get_auth_role()
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid()::text;
  RETURN v_role;
END;
$function$;

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self" ON public.profiles FOR SELECT USING (id = auth.uid()::text);
-- business_settings: policies de prod
CREATE POLICY "Owner can manage business_settings" ON public.business_settings FOR ALL TO public
  USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "Settings: company read" ON public.business_settings FOR SELECT TO authenticated
  USING (user_id = get_auth_company_id());
CREATE POLICY "Settings: owner update" ON public.business_settings FOR UPDATE TO authenticated
  USING ((user_id = get_auth_company_id()) AND (get_auth_role() = 'owner'::text))
  WITH CHECK ((user_id = get_auth_company_id()) AND (get_auth_role() = 'owner'::text));

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;


ALTER TABLE public.clients
 ADD COLUMN email text, ADD COLUMN phone text, ADD COLUMN created_at timestamptz DEFAULT now(),
 ADD COLUMN loyalty_tier text, ADD COLUMN last_visit timestamptz, ADD COLUMN total_visits integer DEFAULT 0,
 ADD COLUMN notes text, ADD COLUMN next_prediction timestamptz, ADD COLUMN photo_url text,
 ADD COLUMN rating numeric, ADD COLUMN is_active boolean DEFAULT true, ADD COLUMN source text,
 ADD COLUMN birth_date date;
CREATE POLICY "Users can manage their own clients" ON public.clients FOR ALL
 USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT
 USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Clients: company isolation" ON public.clients;

-- 2) Staff: leitura da base da empresa (Agenda / seleção de cliente)
DROP POLICY IF EXISTS "Staff can read company clients" ON public.clients;
CREATE POLICY "Staff can select company clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    get_auth_role() = 'staff'
    AND user_id = get_auth_company_id()
  );

-- 3) Staff: criar cliente na Agenda (sem editar notes/birth_date/LTV depois)
DROP POLICY IF EXISTS "Staff can insert company clients" ON public.clients;
CREATE POLICY "Staff can insert company clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_auth_role() = 'staff'
    AND user_id = get_auth_company_id()
  );

-- 4) Dono: gerenciar clientes do tenant (além da policy user_id = auth.uid())
DROP POLICY IF EXISTS "Owners manage company clients" ON public.clients;
CREATE POLICY "Owners manage company clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (
    COALESCE(get_auth_role(), 'owner') = 'owner'
    AND user_id = get_auth_company_id()
  )
  WITH CHECK (
    COALESCE(get_auth_role(), 'owner') = 'owner'
    AND user_id = get_auth_company_id()
  );

INSERT INTO public.profiles VALUES
 ('00000000-0000-0000-0000-0000000000a0', 'owner', NULL),
 ('00000000-0000-0000-0000-0000000000a1', 'staff', '00000000-0000-0000-0000-0000000000a0'),
 ('00000000-0000-0000-0000-0000000000b0', 'owner', NULL),
 ('00000000-0000-0000-0000-0000000000b1', 'staff', '00000000-0000-0000-0000-0000000000b0');
INSERT INTO public.business_settings(user_id) VALUES
 ('00000000-0000-0000-0000-0000000000a0'), ('00000000-0000-0000-0000-0000000000b0');
INSERT INTO public.clients(id,user_id,name) VALUES
 ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a0','Cliente fictício A'),
 ('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000b0','Cliente fictício B');
