-- Harness (Postgres local descartável) para 20261116120000_staff_invite_hardening.
-- Autônomo: schema + helpers + relink de produção (sem o #105), depois as
-- 5 funções copiadas de prod em 16/11/2026 (md5 idênticos aos de 29/09) e
-- os dados do convite.
-- md5(pg_get_functiondef):
--   complete_staff_invite            a5809f9a449e6acdf373538ee31bd27c
--   accept_staff_invite              1d4a305c3109970f0e004e26fa8ad025
--   get_team_member_for_invite       344eaa113c0f5cdc29c763a5ac926c8c
--   handle_new_user                  75b03967cb6677fe891bf1d784572f30
--   release_staff_email_for_reinvite b06c5aa6c727be241fb73372ebd4635d
--   relink_staff_if_unbound          dc16b8a430cb52bd154736a642d46104
-- pgcrypto no schema extensions, como no Supabase. ACLs iguais às de prod.

-- ---------------------------------------------------------------------------
-- Base de schema (auth, RLS, relink de produção, dados A/B, helper _as)
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- Funções de convite (estado atual de prod) + dados extras do convite
-- ---------------------------------------------------------------------------
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

ALTER TABLE auth.users ADD COLUMN email text, ADD COLUMN phone text;
CREATE TABLE auth.identities (user_id uuid, provider_id text, identity_data jsonb);
CREATE TABLE auth.sessions (user_id uuid);
CREATE TABLE auth.refresh_tokens (user_id uuid);
UPDATE auth.users SET email = 'u-' || right(id::text, 4) || '@teste.local';

ALTER TABLE public.profiles
  ADD COLUMN email text, ADD COLUMN phone text, ADD COLUMN user_type text, ADD COLUMN region text,
  ADD COLUMN business_slug text, ADD COLUMN subscription_status text, ADD COLUMN trial_ends_at timestamptz,
  ADD COLUMN birth_date date, ADD COLUMN tutorial_completed boolean DEFAULT false,
  ADD COLUMN updated_at timestamptz DEFAULT now();
ALTER TABLE public.team_members ADD COLUMN role text NOT NULL DEFAULT 'Profissional';
CREATE TABLE public.business_settings (user_id uuid PRIMARY KEY);
GRANT SELECT ON public.business_settings TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       NEW.id IS DISTINCT FROM OLD.id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
     )
     AND lower(COALESCE(current_setting('agendix.allow_profile_identity', true), 'off'))
         IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'PROFILE_IDENTITY_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.purge_staff_auth_user(p_staff_user_id uuid, p_company_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_company_id text;
  v_purged_email text;
BEGIN
  IF p_staff_user_id IS NULL OR p_company_id IS NULL OR btrim(p_company_id) = '' THEN
    RETURN;
  END IF;

  IF p_staff_user_id::text = p_company_id THEN
    RETURN;
  END IF;

  IF auth.uid() IS NOT NULL
     AND p_staff_user_id = auth.uid()
     AND lower(COALESCE(current_setting('agendix.allow_orphan_reinvite_purge', true), 'off'))
         IS DISTINCT FROM 'on' THEN
    RETURN;
  END IF;

  SELECT role::text, company_id::text
  INTO v_role, v_company_id
  FROM public.profiles
  WHERE id = p_staff_user_id::text;

  IF FOUND THEN
    IF v_role IS DISTINCT FROM 'staff' THEN
      RETURN;
    END IF;
    IF v_company_id IS DISTINCT FROM p_company_id THEN
      RETURN;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE staff_user_id = p_staff_user_id
      AND deleted_at IS NULL
  ) THEN
    RETURN;
  END IF;

  UPDATE public.team_members
  SET staff_user_id = NULL,
      updated_at = now()
  WHERE staff_user_id = p_staff_user_id;

  DELETE FROM public.profiles
  WHERE id = p_staff_user_id::text
    AND role = 'staff';

  v_purged_email := 'deleted-' || p_staff_user_id::text || '@purged.invalid';

  BEGIN
    DELETE FROM auth.identities WHERE user_id = p_staff_user_id;
    DELETE FROM auth.sessions WHERE user_id = p_staff_user_id;
    DELETE FROM auth.refresh_tokens WHERE user_id = p_staff_user_id;
    DELETE FROM auth.users WHERE id = p_staff_user_id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE auth.users
    SET
      email = v_purged_email,
      phone = NULL,
      raw_user_meta_data = '{}'::jsonb
    WHERE id = p_staff_user_id;

    UPDATE auth.identities
    SET
      provider_id = v_purged_email,
      identity_data = jsonb_set(
        COALESCE(identity_data, '{}'::jsonb),
        '{email}',
        to_jsonb(v_purged_email)
      )
    WHERE user_id = p_staff_user_id;

    DELETE FROM auth.sessions WHERE user_id = p_staff_user_id;
    DELETE FROM auth.refresh_tokens WHERE user_id = p_staff_user_id;
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_staff_invite(p_company_id text, p_member_id uuid, p_birth_date date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_member public.team_members%ROWTYPE;
  v_owner_ok boolean;
  v_is_tenant_owner boolean;
BEGIN
  PERFORM set_config('agendix.allow_profile_identity', 'on', true);

  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_company_id IS NULL OR btrim(p_company_id) = '' OR p_member_id IS NULL THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  IF v_uid::text = p_company_id THEN
    RAISE EXCEPTION 'owner_cannot_claim_staff_invite';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid::text
      AND COALESCE(role, 'owner') = 'owner'
      AND company_id = id
  ) INTO v_is_tenant_owner;

  IF v_is_tenant_owner THEN
    RAISE EXCEPTION 'owner_cannot_claim_staff_invite';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE staff_user_id = v_uid
      AND deleted_at IS NULL
      AND id IS DISTINCT FROM p_member_id
  ) THEN
    RAISE EXCEPTION 'invite_already_used';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_company_id
      AND COALESCE(role, 'owner') = 'owner'
  ) INTO v_owner_ok;

  IF NOT v_owner_ok THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  SELECT * INTO v_member
  FROM public.team_members
  WHERE id = p_member_id
    AND user_id::text = p_company_id
    AND COALESCE(is_owner, false) = false
    AND deleted_at IS NULL
    AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  IF v_member.staff_user_id IS NOT NULL AND v_member.staff_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'invite_already_used';
  END IF;

  UPDATE public.profiles
  SET
    role = 'staff',
    company_id = p_company_id,
    full_name = COALESCE(NULLIF(btrim(v_member.name), ''), full_name),
    business_name = COALESCE(business_name, ''),
    birth_date = COALESCE(p_birth_date, birth_date),
    tutorial_completed = false,
    updated_at = now()
  WHERE id = v_uid::text;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      id, role, company_id, full_name, birth_date, tutorial_completed
    ) VALUES (
      v_uid::text, 'staff', p_company_id, v_member.name, p_birth_date, false
    );
  END IF;

  UPDATE public.team_members
  SET
    staff_user_id = v_uid,
    updated_at = now()
  WHERE id = p_member_id
    AND user_id::text = p_company_id
    AND (staff_user_id IS NULL OR staff_user_id = v_uid);

  RETURN p_member_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_staff_invite(p_company_id text, p_member_id uuid)
 RETURNS TABLE(id uuid, name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida para aceitar o convite.';
  END IF;

  RETURN QUERY
  SELECT tm.id, tm.name
  FROM public.team_members tm
  WHERE tm.id = p_member_id
    AND tm.user_id = p_company_id
    AND tm.deleted_at IS NULL
    AND COALESCE(tm.active, true) = true
    AND tm.staff_user_id = v_uid
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.team_members tm
  SET
    staff_user_id = v_uid,
    updated_at = NOW()
  WHERE tm.id = p_member_id
    AND tm.user_id = p_company_id
    AND tm.deleted_at IS NULL
    AND COALESCE(tm.active, true) = true
    AND tm.staff_user_id IS NULL
  RETURNING tm.id, tm.name;

  IF NOT FOUND THEN
    IF EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.id = p_member_id
        AND tm.user_id = p_company_id
        AND tm.staff_user_id IS NOT NULL
        AND tm.staff_user_id <> v_uid
    ) THEN
      RAISE EXCEPTION 'Este convite já foi utilizado.';
    END IF;

    RAISE EXCEPTION 'Convite inválido ou profissional não encontrado.';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_team_member_for_invite(p_company_id text, p_member_id uuid)
 RETURNS TABLE(id uuid, name text, role text, staff_user_id uuid, business_name text, user_type text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    tm.id,
    tm.name,
    tm.role,
    tm.staff_user_id,
    p.business_name,
    p.user_type
  FROM public.team_members tm
  LEFT JOIN public.profiles p ON p.id = tm.user_id
  WHERE tm.id = p_member_id
    AND tm.user_id::text = p_company_id
    AND COALESCE(tm.is_owner, false) = false
    AND COALESCE(tm.active, true) = true
    AND tm.deleted_at IS NULL
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_company_id text;
  v_member_id uuid;
  v_invite_ok boolean;
BEGIN
  PERFORM set_config('agendix.allow_profile_identity', 'on', true);

  v_role := COALESCE(new.raw_user_meta_data->>'role', 'owner');
  IF v_role NOT IN ('owner', 'staff') THEN
    v_role := 'owner';
  END IF;

  v_company_id := COALESCE(NULLIF(btrim(new.raw_user_meta_data->>'company_id'), ''), new.id::text);

  BEGIN
    v_member_id := NULLIF(btrim(COALESCE(new.raw_user_meta_data->>'member_id', '')), '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_member_id := NULL;
  END;

  IF v_role = 'staff' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.id = v_member_id
        AND tm.user_id::text = v_company_id
        AND COALESCE(tm.is_owner, false) = false
        AND tm.deleted_at IS NULL
        AND tm.active = true
        AND tm.staff_user_id IS NULL
    ) INTO v_invite_ok;

    IF v_member_id IS NULL OR v_company_id = new.id::text OR NOT COALESCE(v_invite_ok, false) THEN
      v_role := 'owner';
      v_company_id := new.id::text;
    END IF;
  ELSE
    v_company_id := new.id::text;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, business_name, phone, user_type, region, business_slug, role, company_id, subscription_status, trial_ends_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'business_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'type', 'barber'),
    COALESCE(new.raw_user_meta_data->>'region', 'BR'),
    LOWER(REGEXP_REPLACE(COALESCE(new.raw_user_meta_data->>'business_name', 'business'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(new.id::text, 1, 8),
    v_role,
    v_company_id,
    'trial',
    now() + interval '20 days'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    business_name = COALESCE(NULLIF(EXCLUDED.business_name, ''), public.profiles.business_name);

  IF v_role IS DISTINCT FROM 'staff' THEN
    INSERT INTO public.business_settings (user_id)
    VALUES (new.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Trigger error: %', SQLERRM;
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_staff_email_for_reinvite(p_company_id text, p_member_id uuid, p_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_caller_email text;
  v_is_owner boolean;
  v_is_orphan_claimant boolean;
  v_invite_ok boolean;
  v_auth_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  IF p_email IS NULL OR btrim(p_email) = ''
     OR p_company_id IS NULL OR btrim(p_company_id) = ''
     OR p_member_id IS NULL THEN
    RETURN false;
  END IF;

  v_is_owner := (v_uid::text = p_company_id);

  SELECT lower(email) INTO v_caller_email
  FROM auth.users
  WHERE id = v_uid;

  v_is_orphan_claimant := (
    NOT v_is_owner
    AND v_caller_email IS NOT NULL
    AND v_caller_email = lower(btrim(p_email))
  );

  IF NOT v_is_owner AND NOT v_is_orphan_claimant THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.id = p_member_id
      AND tm.user_id::text = p_company_id
      AND COALESCE(tm.is_owner, false) = false
      AND tm.deleted_at IS NULL
      AND tm.active = true
      AND tm.staff_user_id IS NULL
  ) INTO v_invite_ok;

  IF NOT v_invite_ok THEN
    RETURN false;
  END IF;

  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE lower(email) = lower(btrim(p_email))
  LIMIT 1;

  IF v_auth_id IS NULL THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE staff_user_id = v_auth_id
      AND deleted_at IS NULL
  ) THEN
    RETURN false;
  END IF;

  IF v_is_orphan_claimant AND v_auth_id IS DISTINCT FROM v_uid THEN
    RETURN false;
  END IF;

  PERFORM set_config('agendix.allow_orphan_reinvite_purge', 'on', true);
  PERFORM public.purge_staff_auth_user(v_auth_id, p_company_id);

  RETURN NOT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(btrim(p_email))
  );
END;
$function$;

CREATE TRIGGER protect_profile_identity BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_identity();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ACLs de prod (proacl em 29/09/2026)
REVOKE ALL ON FUNCTION public.purge_staff_auth_user(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_staff_auth_user(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.complete_staff_invite(text, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_staff_invite(text, uuid, date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.accept_staff_invite(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_staff_invite(text, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_team_member_for_invite(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_member_for_invite(text, uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) TO authenticated, service_role;

-- Default privileges do Supabase: tabela nova nasce com ALL para anon/authenticated
-- e função nova com EXECUTE (pessimista: inclui anon). A migration tem que revogar.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- Dados do convite (empresa A = ...a0, B = ...b0). Cadastros livres (ativos, sem login):
--  d1..d9, dc na A; e1 na B. da inativo na A; f1 excluído na A.
INSERT INTO public.team_members (id, user_id, staff_user_id, name, active, is_owner, deleted_at) VALUES
  ('20000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a0', NULL, 'Convite D1', true, false, NULL),
  ('20000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000a0', NULL, 'Convite D2', true, false, NULL),
  ('20000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000a0', NULL, 'Convite D3', true, false, NULL),
  ('20000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000a0', NULL, 'Convite D4', true, false, NULL),
  ('20000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000a0', NULL, 'Convite D5', true, false, NULL),
  ('20000000-0000-0000-0000-0000000000d6', '00000000-0000-0000-0000-0000000000a0', NULL, 'Convite D6', true, false, NULL),
  ('20000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000a0', NULL, 'Convite D7', true, false, NULL),
  ('20000000-0000-0000-0000-0000000000d8', '00000000-0000-0000-0000-0000000000a0', NULL, 'Convite D8', true, false, NULL),
  ('20000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000a0', NULL, 'Convite D9', true, false, NULL),
  ('20000000-0000-0000-0000-0000000000dc', '00000000-0000-0000-0000-0000000000a0', NULL, 'Convite DC', true, false, NULL),
  ('20000000-0000-0000-0000-0000000000da', '00000000-0000-0000-0000-0000000000a0', NULL, 'Inativo DA', false, false, NULL),
  ('20000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b0', NULL, 'Convite E1', true, false, NULL),
  ('20000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a0', NULL, 'Excluído F1', true, false, now() - interval '1 day');

-- Contas novas sem perfil (cadastro recém-criado, antes de qualquer vínculo).
-- Inseridas com o trigger desligado para simular "conta sem perfil".
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
INSERT INTO auth.users (id, created_at, email, raw_user_meta_data) VALUES
  ('30000000-0000-0000-0000-0000000000c1', now() - interval '2 minutes', 'nova1@teste.local', '{}'),
  ('30000000-0000-0000-0000-0000000000c2', now() - interval '2 minutes', 'nova2@teste.local', '{}'),
  ('30000000-0000-0000-0000-0000000000c3', now() - interval '2 minutes', 'nova3@teste.local', '{}'),
  ('30000000-0000-0000-0000-0000000000c4', now() - interval '2 minutes', 'nova4@teste.local', '{}'),
  ('30000000-0000-0000-0000-0000000000c5', now() - interval '2 minutes', 'nova5@teste.local', '{}'),
  ('30000000-0000-0000-0000-0000000000cb', now() - interval '2 minutes', 'novab@teste.local', '{}'),
  ('30000000-0000-0000-0000-0000000000cc', now() - interval '2 minutes', 'novac@teste.local', '{}'),
  ('30000000-0000-0000-0000-0000000000cd', now() - interval '2 minutes', 'novad@teste.local', '{}'),
  ('30000000-0000-0000-0000-0000000000ce', now() - interval '2 minutes', 'novae@teste.local', '{}');
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

