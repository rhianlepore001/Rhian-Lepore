-- Harness local e descartável para 20260925170000_booking_cancel_sync.
-- Reproduz de prod (2026-09-25) o que importa para o ciclo do pedido online:
--   tabelas/colunas/FKs/CHECKs, policies de appointments e public_bookings,
--   get_auth_company_id/get_auth_role e a trigger do item 4
--   (20260925140000_staff_appointment_edit_scope). As RPCs de booking entram
--   pelo arquivo de rollback + supabase/tests/booking_cancel_sync.prod_fns.sql
--   (fontes com md5 de pg_get_functiondef IGUAL ao de prod). Nada aqui toca prod.

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
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY, user_id text, name text, staff_user_id uuid, deleted_at timestamptz,
  active boolean DEFAULT true, is_owner boolean DEFAULT false, display_order integer,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text, name text, phone text,
  email text, photo_url text
);
CREATE TABLE public.public_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid, name text, phone text,
  photo_url text, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.services (id uuid PRIMARY KEY, user_id text, name text, price numeric, duration_minutes integer);
CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text UNIQUE,
  cancellation_policy text DEFAULT 'flexible', timezone text
);
CREATE TABLE public.public_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id text NOT NULL REFERENCES public.profiles(id) ON UPDATE CASCADE,
  customer_phone text NOT NULL,
  customer_name text,
  customer_email text,
  service_ids uuid[] NOT NULL,
  professional_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  appointment_time timestamptz NOT NULL,
  total_price numeric NOT NULL,
  notes text,
  status text DEFAULT 'pending'
    CONSTRAINT public_bookings_status_check CHECK (status = ANY (ARRAY['pending','confirmed','cancelled','completed'])),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  duration_minutes integer DEFAULT 30,
  payment_method text,
  marketing_optin boolean DEFAULT false,
  is_edit boolean DEFAULT false,
  original_appointment_time timestamptz,
  product_lines jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES public.profiles(id) ON UPDATE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  service text,
  appointment_time timestamptz,
  status text,
  price numeric,
  created_at timestamptz DEFAULT now(),
  professional_id uuid REFERENCES public.team_members(id),
  duration_minutes integer,
  notes text,
  payment_method text,
  total_price numeric,
  public_booking_id uuid CONSTRAINT appointments_public_booking_id_fkey REFERENCES public.public_bookings(id),
  edited_at timestamptz,
  received_by uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  completed_by uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  origin text NOT NULL DEFAULT 'agenda' CHECK (origin = ANY (ARRAY['agenda','queue','booking']))
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

CREATE OR REPLACE FUNCTION public.get_auth_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()::text;
  RETURN v_role;
END;
$function$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self" ON public.profiles FOR SELECT USING (id = auth.uid()::text);
CREATE POLICY "Tenant can view team members" ON public.team_members FOR SELECT TO authenticated USING (user_id = get_auth_company_id());
CREATE POLICY "harness: company manage clients" ON public.clients FOR ALL TO authenticated
  USING (user_id = get_auth_company_id()) WITH CHECK (user_id = get_auth_company_id());

-- appointments: policies de prod
CREATE POLICY "Appointments: company isolation" ON public.appointments FOR ALL TO authenticated
  USING (user_id = get_auth_company_id()) WITH CHECK (user_id = get_auth_company_id());
CREATE POLICY "Users can manage their own appointments" ON public.appointments FOR ALL TO public
  USING (user_id = (auth.uid())::text);
CREATE POLICY "Staff insert company appointments" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (user_id = get_auth_company_id());
CREATE POLICY "Staff can read company appointments" ON public.appointments FOR SELECT TO public
  USING ((user_id = (auth.uid())::text) OR (EXISTS ( SELECT 1 FROM profiles
    WHERE ((profiles.id = (auth.uid())::text) AND (profiles.role = 'staff'::text) AND (profiles.company_id = appointments.user_id)))));
CREATE POLICY "Users can only see their own appointments" ON public.appointments FOR SELECT TO public
  USING (user_id = (auth.uid())::text);

-- public_bookings: policies de prod (pg_policy em 2026-09-25)
CREATE POLICY "Owner can manage public_bookings" ON public.public_bookings FOR ALL TO public
  USING ((auth.uid())::text = business_id);
CREATE POLICY "public_bookings_insert_anon" ON public.public_bookings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public_bookings_select_anon_fresh" ON public.public_bookings FOR SELECT TO public
  USING ((status = 'pending'::text) AND (created_at IS NOT NULL) AND (created_at > (now() - '00:02:00'::interval)));
CREATE POLICY "Public bookings: company read" ON public.public_bookings FOR SELECT TO public
  USING (business_id = get_auth_company_id());
CREATE POLICY "Public bookings: company update" ON public.public_bookings FOR UPDATE TO public
  USING (business_id = get_auth_company_id());

-- business_settings: policies de prod
CREATE POLICY "Owner can manage business_settings" ON public.business_settings FOR ALL TO public
  USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "Settings: company read" ON public.business_settings FOR SELECT TO authenticated
  USING (user_id = get_auth_company_id());
CREATE POLICY "Settings: owner update" ON public.business_settings FOR UPDATE TO authenticated
  USING ((user_id = get_auth_company_id()) AND (get_auth_role() = 'owner'::text))
  WITH CHECK ((user_id = get_auth_company_id()) AND (get_auth_role() = 'owner'::text));

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
