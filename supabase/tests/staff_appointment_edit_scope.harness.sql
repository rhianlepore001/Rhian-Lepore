-- Harness mínimo que reproduz o que importa de prod para testar a migration
-- 20260925140000_staff_appointment_edit_scope num Postgres descartável (local).
-- Definições de get_auth_company_id/get_auth_role e das policies copiadas de
-- prod (pg_get_functiondef / pg_policies em 2026-09-25). Nada aqui toca prod.

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
  id uuid PRIMARY KEY, user_id text, name text, staff_user_id uuid, deleted_at timestamptz
);
CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text UNIQUE,
  cancellation_policy text DEFAULT 'flexible', timezone text
);
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  client_id uuid NOT NULL DEFAULT gen_random_uuid(),
  service text NOT NULL DEFAULT 'Corte',
  appointment_time timestamptz NOT NULL DEFAULT now() + interval '1 day',
  status text NOT NULL DEFAULT 'Pending',
  price numeric,
  professional_id uuid,
  notes text,
  payment_method text,
  edited_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now()
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

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self" ON public.profiles FOR SELECT USING (id = auth.uid()::text);
CREATE POLICY "Tenant can view team members" ON public.team_members FOR SELECT TO authenticated USING (user_id = get_auth_company_id());

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

-- business_settings: policies de prod
CREATE POLICY "Owner can manage business_settings" ON public.business_settings FOR ALL TO public
  USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "Settings: company read" ON public.business_settings FOR SELECT TO authenticated
  USING (user_id = get_auth_company_id());
CREATE POLICY "Settings: owner update" ON public.business_settings FOR UPDATE TO authenticated
  USING ((user_id = get_auth_company_id()) AND (get_auth_role() = 'owner'::text))
  WITH CHECK ((user_id = get_auth_company_id()) AND (get_auth_role() = 'owner'::text));

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- RPC SECURITY DEFINER no mesmo padrão de complete_appointment (checagem de tenant própria).
CREATE FUNCTION public.test_complete_appointment(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.appointments SET status = 'Completed', completed_at = now(), price = 99
  WHERE id = p_id AND user_id = get_auth_company_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.test_complete_appointment(uuid) TO authenticated;

-- Dados: empresa A (dono + 2 colaboradores), empresa B (dono)
INSERT INTO public.profiles VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'owner', NULL),
  ('00000000-0000-0000-0000-0000000000a1', 'staff', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000a2', 'staff', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000b0', 'owner', NULL);
INSERT INTO public.team_members VALUES
  ('10000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000000a0', 'Dono A', NULL, NULL),
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a0', 'Staff 1', '00000000-0000-0000-0000-0000000000a1', NULL),
  ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a0', 'Staff 2', '00000000-0000-0000-0000-0000000000a2', NULL);
INSERT INTO public.business_settings (user_id) VALUES
  ('00000000-0000-0000-0000-0000000000a0'), ('00000000-0000-0000-0000-0000000000b0');
