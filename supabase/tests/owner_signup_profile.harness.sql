-- Harness local para 20261012130000_owner_signup_profile (Postgres descartável; não toca prod).
-- Colunas, defaults, constraints, grants, RLS e triggers copiados de prod (lcqwrngscsziysyfhpfj,
-- 2026-10-12, só SELECT). Funções com o corpo exato de pg_get_functiondef de prod; o script
-- confere o md5 de cada uma antes de testar. Confirmação de e-mail desligada como em prod:
-- o "GoTrue" do teste insere em auth.users com email_confirmed_at NULL e confirma em seguida.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE auth.users (
  instance_id uuid,
  id uuid PRIMARY KEY,
  aud varchar(255),
  role varchar(255),
  email varchar(255),
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  confirmation_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE public.profiles (
  id text PRIMARY KEY,
  user_type text,
  region text,
  full_name text,
  business_name text,
  phone text,
  updated_at timestamptz DEFAULT now(),
  business_slug text CONSTRAINT profiles_business_slug_key UNIQUE,
  photo_url text,
  public_booking_enabled boolean DEFAULT true,
  email text,
  monthly_goal numeric DEFAULT 15000,
  tutorial_completed boolean DEFAULT false,
  trial_ends_at timestamptz DEFAULT (now() + '7 days'::interval),
  subscription_status text DEFAULT 'trial'::text,
  aios_enabled boolean DEFAULT false,
  aios_features jsonb DEFAULT '{}'::jsonb,
  role text DEFAULT 'owner'::text CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['owner'::text, 'staff'::text])),
  company_id text,
  activation_completed boolean DEFAULT false,
  birth_date date
);
CREATE TABLE public.business_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id text NOT NULL CONSTRAINT business_settings_user_id_key UNIQUE,
  business_hours jsonb DEFAULT '{}'::jsonb,
  cancellation_policy text DEFAULT 'flexible'::text,
  onboarding_completed boolean DEFAULT false,
  onboarding_step integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  public_booking_enabled boolean DEFAULT true,
  lead_time_hours integer DEFAULT 2,
  queue_mode text NOT NULL DEFAULT 'shared'::text,
  staff_appointment_edit_scope text NOT NULL DEFAULT 'none'::text,
  staff_can_block_agenda boolean NOT NULL DEFAULT true,
  client_cancel_cutoff_hours integer NOT NULL DEFAULT 2,
  staff_agenda_block_scope text NOT NULL DEFAULT 'own'::text,
  online_booking_requires_approval boolean NOT NULL DEFAULT true
);
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id text NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  active boolean DEFAULT true,
  is_owner boolean DEFAULT false,
  staff_user_id uuid,
  deleted_at timestamptz
);

-- Grants como em prod: profiles sem INSERT/DELETE para anon/authenticated (rwDxtm).
GRANT SELECT, UPDATE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.business_settings, public.team_members TO anon, authenticated, service_role;

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
$function$
;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles: company isolation" ON public.profiles FOR SELECT TO authenticated
  USING ((id = (auth.uid())::text) OR (company_id = get_auth_company_id()) OR (id = get_auth_company_id()));
CREATE POLICY "Profiles: own update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = (auth.uid())::text) WITH CHECK (id = (auth.uid())::text);
CREATE POLICY "Profiles: users cant delete" ON public.profiles FOR DELETE TO authenticated USING (false);
CREATE POLICY "Profiles: users cant insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (false);
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can manage business_settings" ON public.business_settings
  USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Funções de prod (corpo exato) -------------------------------------------------------------


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
$function$
;

CREATE OR REPLACE FUNCTION public.check_email_confirmed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Cast TEXT id to UUID for comparison with auth.users
    IF (SELECT email_confirmed_at FROM auth.users WHERE id = NEW.id::uuid) IS NULL THEN
        RAISE EXCEPTION 'Email not confirmed. Please check your inbox.';
    END IF;
    RETURN NEW;
END;
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.sync_staff_agenda_block_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Front antigo grava só o booleano (scope fica no padrão 'own').
    IF NEW.staff_can_block_agenda IS FALSE AND NEW.staff_agenda_block_scope = 'own' THEN
      NEW.staff_agenda_block_scope := 'none';
    ELSE
      NEW.staff_can_block_agenda := (NEW.staff_agenda_block_scope <> 'none');
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.staff_agenda_block_scope IS DISTINCT FROM OLD.staff_agenda_block_scope THEN
    NEW.staff_can_block_agenda := (NEW.staff_agenda_block_scope <> 'none');
  ELSIF NEW.staff_can_block_agenda IS DISTINCT FROM OLD.staff_can_block_agenda THEN
    IF NEW.staff_can_block_agenda IS FALSE THEN
      NEW.staff_agenda_block_scope := 'none';
    ELSIF OLD.staff_agenda_block_scope = 'none' THEN
      NEW.staff_agenda_block_scope := 'own';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

REVOKE ALL ON FUNCTION public.handle_new_user(), public.check_email_confirmed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user(), public.check_email_confirmed() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.protect_profile_identity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_profile_identity() TO anon, authenticated, service_role;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER ensure_email_confirmed BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION check_email_confirmed();
CREATE TRIGGER protect_profile_identity BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION protect_profile_identity();
CREATE TRIGGER sync_staff_agenda_block_scope BEFORE INSERT OR UPDATE OF staff_agenda_block_scope, staff_can_block_agenda ON public.business_settings FOR EACH ROW EXECUTE FUNCTION sync_staff_agenda_block_scope();
