-- Harness (Postgres local descartável) para 20260929090000_ex_staff_access.
-- Funções e policies copiadas de prod (pg_get_functiondef / pg_policies em 29/09/2026).
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE SCHEMA auth;
-- Mesma definição do Supabase: claim.sub OU claims->>'sub'
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- auth.users (só o que o relink lê). raw_user_meta_data é editável pelo próprio
-- usuário (auth.updateUser); created_at não.
CREATE TABLE auth.users (id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(), raw_user_meta_data jsonb DEFAULT '{}'::jsonb);

CREATE TABLE public.profiles (id text PRIMARY KEY, role text, company_id text, full_name text, business_name text);
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  staff_user_id uuid,
  name text NOT NULL,
  active boolean DEFAULT true,
  is_owner boolean DEFAULT false,
  deleted_at timestamptz,
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_team_members_staff_user_id ON public.team_members USING btree (staff_user_id) WHERE (staff_user_id IS NOT NULL);
CREATE TABLE public.appointments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, professional_id uuid, status text DEFAULT 'Confirmed');
CREATE TABLE public.services (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, name text);
CREATE TABLE public.clients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, name text);
CREATE TABLE public.finance_records (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, professional_id uuid, amount numeric);
CREATE TABLE public.public_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id text NOT NULL, status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(), customer_name text
);

-- Funções de prod
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

CREATE OR REPLACE FUNCTION public.business_exists(p_business_id text) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_business_id) $$;

CREATE OR REPLACE FUNCTION public.relink_staff_if_unbound()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_company_id text;
  v_name text;
  v_role text;
  v_member_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role, company_id, full_name
    INTO v_role, v_company_id, v_name
  FROM public.profiles
  WHERE id = v_uid::text;

  IF v_role IS DISTINCT FROM 'staff' OR v_company_id IS NULL OR btrim(COALESCE(v_name, '')) = '' THEN
    RETURN NULL;
  END IF;

  SELECT tm.id INTO v_member_id
  FROM public.team_members tm
  WHERE tm.staff_user_id = v_uid
    AND tm.user_id::text = v_company_id
    AND tm.deleted_at IS NULL
  LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    RETURN v_member_id;
  END IF;

  SELECT tm.id INTO v_member_id
  FROM public.team_members tm
  WHERE tm.user_id::text = v_company_id
    AND COALESCE(tm.is_owner, false) = false
    AND tm.deleted_at IS NULL
    AND tm.active = true
    AND tm.staff_user_id IS NULL
    AND lower(btrim(tm.name)) = lower(btrim(v_name))
  LIMIT 2;

  IF v_member_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF (
    SELECT count(*) FROM public.team_members tm
    WHERE tm.user_id::text = v_company_id
      AND COALESCE(tm.is_owner, false) = false
      AND tm.deleted_at IS NULL
      AND tm.active = true
      AND tm.staff_user_id IS NULL
      AND lower(btrim(tm.name)) = lower(btrim(v_name))
  ) <> 1 THEN
    RETURN NULL;
  END IF;

  UPDATE public.team_members
  SET staff_user_id = v_uid, updated_at = now()
  WHERE id = v_member_id
    AND staff_user_id IS NULL;

  RETURN v_member_id;
END;
$function$;

-- RLS + policies de prod
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles: company isolation" ON public.profiles FOR SELECT TO authenticated USING (((id = (auth.uid())::text) OR (company_id = get_auth_company_id()) OR (id = get_auth_company_id())));
CREATE POLICY "Profiles: own update" ON public.profiles FOR UPDATE TO authenticated USING ((id = (auth.uid())::text));

CREATE POLICY "Appointments: company isolation" ON public.appointments FOR ALL TO authenticated USING ((user_id = get_auth_company_id())) WITH CHECK ((user_id = get_auth_company_id()));
CREATE POLICY "Staff can read company appointments" ON public.appointments FOR SELECT TO public USING (((user_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (auth.uid())::text) AND (profiles.role = 'staff'::text) AND (profiles.company_id = appointments.user_id))))));
CREATE POLICY "Staff insert company appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK ((user_id = get_auth_company_id()));
CREATE POLICY "Users can manage their own appointments" ON public.appointments FOR ALL TO public USING ((user_id = (auth.uid())::text));
CREATE POLICY "Users can only see their own appointments" ON public.appointments FOR SELECT TO public USING ((user_id = (auth.uid())::text));

CREATE POLICY "Owners can manage their own services" ON public.services FOR ALL TO public USING ((user_id = (auth.uid())::text));
CREATE POLICY "Services: company isolation" ON public.services FOR ALL TO authenticated USING ((user_id = get_auth_company_id())) WITH CHECK ((user_id = get_auth_company_id()));
CREATE POLICY "Staff can read company services" ON public.services FOR SELECT TO public USING (((user_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (auth.uid())::text) AND (profiles.role = 'staff'::text) AND (profiles.company_id = services.user_id))))));

CREATE POLICY "Owners manage company clients" ON public.clients FOR ALL TO authenticated USING (((COALESCE(get_auth_role(), 'owner'::text) = 'owner'::text) AND (user_id = get_auth_company_id()))) WITH CHECK (((COALESCE(get_auth_role(), 'owner'::text) = 'owner'::text) AND (user_id = get_auth_company_id())));
CREATE POLICY "Staff can insert company clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (((get_auth_role() = 'staff'::text) AND (user_id = get_auth_company_id())));
CREATE POLICY "Staff can select company clients" ON public.clients FOR SELECT TO authenticated USING (((get_auth_role() = 'staff'::text) AND (user_id = get_auth_company_id())));
CREATE POLICY "Users can manage their own clients" ON public.clients FOR ALL TO public USING ((user_id = (auth.uid())::text));
CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT TO public USING ((user_id = (auth.uid())::text));

CREATE POLICY "Owner can manage finance_records" ON public.finance_records FOR ALL TO public USING (((auth.uid())::text = user_id)) WITH CHECK (((auth.uid())::text = user_id));
CREATE POLICY "Staff can view own commissions" ON public.finance_records FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.id = finance_records.professional_id) AND (tm.staff_user_id = auth.uid())))));
CREATE POLICY "Users can manage their own finance records" ON public.finance_records FOR ALL TO public USING ((user_id = (auth.uid())::text));
CREATE POLICY "Users can only see their own finance records" ON public.finance_records FOR SELECT TO public USING ((user_id = (auth.uid())::text));

CREATE POLICY "Owner can manage public_bookings" ON public.public_bookings FOR ALL TO authenticated USING (((auth.uid())::text = business_id)) WITH CHECK (((auth.uid())::text = business_id));
CREATE POLICY "Public bookings: company read" ON public.public_bookings FOR SELECT TO authenticated USING ((business_id = get_auth_company_id()));
CREATE POLICY "Public bookings: company update" ON public.public_bookings FOR UPDATE TO authenticated USING ((business_id = get_auth_company_id())) WITH CHECK ((business_id = get_auth_company_id()));
CREATE POLICY "public_bookings_insert_anon" ON public.public_bookings FOR INSERT TO anon, authenticated WITH CHECK (((business_id IS NOT NULL) AND (btrim(business_id) <> ''::text) AND business_exists(business_id) AND (COALESCE(status, 'pending'::text) = 'pending'::text)));
CREATE POLICY "public_bookings_select_anon_fresh" ON public.public_bookings FOR SELECT TO anon USING (((status = 'pending'::text) AND (created_at IS NOT NULL) AND (created_at > (now() - '00:02:00'::interval))));

CREATE POLICY "Owner can manage team_members" ON public.team_members FOR ALL TO public USING (((auth.uid())::text = user_id)) WITH CHECK (((auth.uid())::text = user_id));
CREATE POLICY "Staff can read company team members" ON public.team_members FOR SELECT TO public USING (((user_id = (auth.uid())::text) OR (staff_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (auth.uid())::text) AND (profiles.role = 'staff'::text) AND (profiles.company_id = team_members.user_id))))));
CREATE POLICY "Tenant can view team members" ON public.team_members FOR SELECT TO authenticated USING ((user_id = get_auth_company_id()));
CREATE POLICY "Users can manage their own team members" ON public.team_members FOR ALL TO public USING ((user_id = (auth.uid())::text)) WITH CHECK ((user_id = (auth.uid())::text));
CREATE POLICY "Users can view their own team members" ON public.team_members FOR SELECT TO public USING ((user_id = (auth.uid())::text));

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
-- ACL de prod do relink (proacl em 29/09/2026: postgres, authenticated, service_role)
REVOKE ALL ON FUNCTION public.relink_staff_if_unbound() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relink_staff_if_unbound() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Dados. Empresa A (dono ...a0) e B (dono ...b0).
--  a1 staff vínculo ativo          a2 staff vínculo INATIVO (recepção)
--  a3 staff nunca vinculado        a4 staff excluído (delete_staff_collaborator: staff_user_id NULL)
--  a5 staff excluído legado (deleted_at, mas staff_user_id ainda aponta p/ ele)
--  a6 staff com perfil da A e vínculo só na B     a7 staff sem company_id (empresa = ele mesmo)
--  a8 staff recém-cadastrado ainda não vinculado (convite: metadata member_id = a8, conta de 1 h -> relink)
--  a9 cadastro livre 'Vaga Aberta' (ativo, sem login): alvo das tentativas de relink indevido
--  a11 conta nova (5 min) com metadata apontando para um cadastro livre da empresa B (b9)
-- ---------------------------------------------------------------------------
INSERT INTO public.profiles (id, role, company_id, full_name, business_name) VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'owner', NULL, 'Dono A', 'Barbearia A'),
  ('00000000-0000-0000-0000-0000000000b0', 'owner', NULL, 'Dono B', 'Salão B'),
  ('00000000-0000-0000-0000-0000000000c0', NULL,    '', 'Dono C sem role', 'Loja C'),
  ('00000000-0000-0000-0000-0000000000a1', 'staff', '00000000-0000-0000-0000-0000000000a0', 'Ana Ativa', NULL),
  ('00000000-0000-0000-0000-0000000000a2', 'staff', '00000000-0000-0000-0000-0000000000a0', 'Recepção', NULL),
  ('00000000-0000-0000-0000-0000000000a3', 'staff', '00000000-0000-0000-0000-0000000000a0', 'Nunca Vinculado', NULL),
  ('00000000-0000-0000-0000-0000000000a4', 'staff', '00000000-0000-0000-0000-0000000000a0', 'Excluído', NULL),
  ('00000000-0000-0000-0000-0000000000a5', 'staff', '00000000-0000-0000-0000-0000000000a0', 'Caique', NULL),
  ('00000000-0000-0000-0000-0000000000a6', 'staff', '00000000-0000-0000-0000-0000000000a0', 'Outra Empresa', NULL),
  ('00000000-0000-0000-0000-0000000000a7', 'staff', NULL, 'Sem Empresa', NULL),
  ('00000000-0000-0000-0000-0000000000a8', 'staff', '00000000-0000-0000-0000-0000000000a0', 'Novo Colaborador', NULL),
  ('00000000-0000-0000-0000-000000000a11', 'staff', '00000000-0000-0000-0000-0000000000a0', 'Conta Nova', NULL);

INSERT INTO auth.users (id, created_at, raw_user_meta_data)
SELECT p.id::uuid, now() - interval '30 days', '{}'::jsonb FROM public.profiles p;
UPDATE auth.users SET created_at = now() - interval '1 hour',
  raw_user_meta_data = '{"role":"staff","member_id":"10000000-0000-0000-0000-0000000000a8"}'
  WHERE id = '00000000-0000-0000-0000-0000000000a8';
UPDATE auth.users SET created_at = now() - interval '5 minutes',
  raw_user_meta_data = '{"role":"staff","member_id":"10000000-0000-0000-0000-0000000000b9"}'
  WHERE id = '00000000-0000-0000-0000-000000000a11';

INSERT INTO public.team_members (id, user_id, staff_user_id, name, active, is_owner, deleted_at) VALUES
  ('10000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000000a0', 'Dono A', true, true, NULL),
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000000a1', 'Ana Ativa', true, false, NULL),
  ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000000a2', 'Recepção', false, false, NULL),
  ('10000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a0', NULL, 'Excluído', false, false, now() - interval '10 days'),
  ('10000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000000a5', 'Caique', false, false, now() - interval '18 days'),
  ('10000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000a0', NULL, 'CAÍQUE', true, false, NULL),
  ('10000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a0', NULL, 'novo colaborador ', true, false, NULL),
  ('10000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000a0', NULL, 'Vaga Aberta', true, false, NULL),
  ('10000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-0000000000b0', NULL, 'Livre B', true, false, NULL),
  ('10000000-0000-0000-0000-0000000000b0', '00000000-0000-0000-0000-0000000000b0', '00000000-0000-0000-0000-0000000000b0', 'Dono B', true, true, NULL),
  ('10000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-0000000000b0', '00000000-0000-0000-0000-0000000000a6', 'Outra Empresa', true, false, NULL);

INSERT INTO public.appointments (user_id, professional_id) VALUES
  ('00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000b0', '10000000-0000-0000-0000-0000000000b0');
INSERT INTO public.services (user_id, name) VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'Corte'), ('00000000-0000-0000-0000-0000000000a0', 'Barba'),
  ('00000000-0000-0000-0000-0000000000b0', 'Escova');
INSERT INTO public.clients (user_id, name) VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'Cliente 1'), ('00000000-0000-0000-0000-0000000000a0', 'Cliente 2'),
  ('00000000-0000-0000-0000-0000000000b0', 'Cliente B');
INSERT INTO public.finance_records (user_id, professional_id, amount) VALUES
  ('00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a1', 10),
  ('00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a0', 20),
  ('00000000-0000-0000-0000-0000000000b0', '10000000-0000-0000-0000-0000000000b0', 30);
INSERT INTO public.public_bookings (business_id, status) VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'confirmed'),
  ('00000000-0000-0000-0000-0000000000b0', 'confirmed');

-- Helpers de teste
CREATE OR REPLACE FUNCTION public._as(p_uid text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), true);
  PERFORM set_config('request.jwt.claims', CASE WHEN p_uid IS NULL THEN '' ELSE json_build_object('sub', p_uid)::text END, true);
END $$;

-- "Impressão digital" do acesso de um usuário: empresa + contagens visíveis por tabela.
CREATE OR REPLACE FUNCTION public._fingerprint(p_role text, p_uid text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  PERFORM public._as(p_uid);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  SELECT concat_ws(' ',
    'company=' || COALESCE(public.get_auth_company_id(), 'NULL'),
    'appt=' || (SELECT count(*) FROM public.appointments),
    'cli=' || (SELECT count(*) FROM public.clients),
    'svc=' || (SELECT count(*) FROM public.services),
    'tm=' || (SELECT count(*) FROM public.team_members),
    'fin=' || (SELECT count(*) FROM public.finance_records),
    'pb=' || (SELECT count(*) FROM public.public_bookings),
    'prof=' || (SELECT count(*) FROM public.profiles)) INTO r;
  RESET ROLE;
  RETURN r;
END $$;

-- Baseline (estado de prod hoje), capturado ANTES da migration.
CREATE TABLE public._baseline (who text PRIMARY KEY, fp text);
