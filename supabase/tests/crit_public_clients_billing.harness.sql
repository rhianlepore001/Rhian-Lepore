-- Harness local: public_clients + profiles billing = prod 2026-10-13 (só SELECT).
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
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    CASE WHEN current_user IN ('authenticated','anon','service_role') THEN current_user ELSE 'anon' END
  )
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE auth.users (
  instance_id uuid, id uuid PRIMARY KEY, aud varchar(255), role varchar(255),
  email varchar(255), encrypted_password varchar(255), email_confirmed_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz
);

CREATE TABLE public.profiles (
  id text PRIMARY KEY,
  full_name text, business_name text, phone text, email text,
  business_slug text UNIQUE,
  role text DEFAULT 'owner'::text CHECK (role = ANY (ARRAY['owner'::text, 'staff'::text])),
  company_id text,
  subscription_status text DEFAULT 'trial'::text,
  subscription_plan text,
  trial_ends_at timestamptz DEFAULT (now() + interval '20 days'),
  stripe_customer_id text,
  updated_at timestamptz DEFAULT now(),
  user_type text DEFAULT 'barber',
  region text DEFAULT 'BR',
  tutorial_completed boolean DEFAULT false,
  aios_enabled boolean DEFAULT true
);

CREATE TABLE public.public_clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id text NOT NULL,
  name varchar NOT NULL,
  email varchar,
  phone varchar,
  photo_url text,
  google_id text,
  created_at timestamptz DEFAULT now(),
  last_booking_at timestamptz
);

CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL UNIQUE
);

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  name text NOT NULL,
  role text DEFAULT 'barber',
  active boolean DEFAULT true,
  is_owner boolean DEFAULT false,
  staff_user_id uuid,
  deleted_at timestamptz
);

CREATE OR REPLACE FUNCTION public.get_auth_company_id()
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_company_id TEXT;
BEGIN
  SELECT COALESCE(NULLIF(btrim(company_id), ''), id) INTO v_company_id
  FROM public.profiles WHERE id = auth.uid()::text;
  RETURN v_company_id;
END;
$function$;
CREATE OR REPLACE FUNCTION public.get_auth_role()
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid()::text;
  RETURN v_role;
END;
$function$;
CREATE OR REPLACE FUNCTION public.business_exists(p_business_id text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_business_id);
$function$;
CREATE OR REPLACE FUNCTION public.phones_match(p_a text, p_b text)
 RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN regexp_replace(COALESCE(p_a, ''), '\D', '', 'g') = '' THEN false
    WHEN regexp_replace(COALESCE(p_b, ''), '\D', '', 'g') = '' THEN false
    WHEN regexp_replace(p_a, '\D', '', 'g') = regexp_replace(p_b, '\D', '', 'g') THEN true
    ELSE (
      length(regexp_replace(p_a, '\D', '', 'g')) >= 8
      AND length(regexp_replace(p_b, '\D', '', 'g')) >= 8
      AND right(regexp_replace(p_a, '\D', '', 'g'), 8) = right(regexp_replace(p_b, '\D', '', 'g'), 8)
    )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_client_by_phone(p_business_id uuid, p_phone text)
 RETURNS TABLE(id uuid, name character varying, email character varying, phone character varying, photo_url text, business_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.email, c.phone, c.photo_url, c.business_id::TEXT
  FROM public.public_clients c
  WHERE c.business_id::TEXT = p_business_id::TEXT
    AND public.phones_match(c.phone, p_phone)
  ORDER BY c.last_booking_at DESC NULLS LAST, c.created_at ASC
  LIMIT 1;
END;
$function$
;

REVOKE ALL ON FUNCTION public.get_public_client_by_phone(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_client_by_phone(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.upsert_public_client(p_business_id uuid, p_name text, p_phone text, p_photo_url text DEFAULT NULL::text, p_email text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, name character varying, email character varying, phone character varying, photo_url text, business_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id UUID;
BEGIN
  IF p_business_id IS NULL OR NULLIF(trim(p_phone), '') IS NULL THEN
    RAISE EXCEPTION 'Estabelecimento e telefone sao obrigatorios.';
  END IF;

  SELECT c.id INTO v_existing_id
  FROM public.public_clients c
  WHERE c.business_id::TEXT = p_business_id::TEXT
    AND public.phones_match(c.phone, p_phone)
  ORDER BY c.last_booking_at DESC NULLS LAST, c.created_at ASC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.public_clients AS pc
    SET
      name = COALESCE(NULLIF(trim(p_name), ''), pc.name),
      photo_url = COALESCE(p_photo_url, pc.photo_url),
      email = COALESCE(p_email, pc.email),
      last_booking_at = NOW()
    WHERE pc.id = v_existing_id;
  ELSE
    IF NULLIF(trim(p_name), '') IS NULL THEN
      RAISE EXCEPTION 'Nome obrigatorio para novo cliente.';
    END IF;

    INSERT INTO public.public_clients AS pc (business_id, name, phone, photo_url, email, last_booking_at)
    VALUES (p_business_id, trim(p_name), p_phone, p_photo_url, p_email, NOW())
    RETURNING pc.id INTO v_existing_id;
  END IF;

  RETURN QUERY
  SELECT c.id, c.name, c.email, c.phone, c.photo_url, c.business_id::TEXT
  FROM public.public_clients c
  WHERE c.id = v_existing_id;
END;
$function$
;

REVOKE ALL ON FUNCTION public.upsert_public_client(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_public_client(uuid, text, text, text, text) TO anon, authenticated;

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

GRANT SELECT, UPDATE, TRUNCATE, REFERENCES, TRIGGER ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.public_clients TO anon, authenticated, service_role;
GRANT ALL ON public.business_settings, public.team_members TO anon, authenticated, service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles: own update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (auth.uid())::text) WITH CHECK (id = (auth.uid())::text);
CREATE POLICY "Profiles: company isolation" ON public.profiles
  FOR SELECT TO authenticated
  USING ((id = (auth.uid())::text) OR (company_id = public.get_auth_company_id()) OR (id = public.get_auth_company_id()));

CREATE POLICY "Owner can manage public_clients" ON public.public_clients
  FOR ALL TO public
  USING (((auth.uid())::text = business_id))
  WITH CHECK (((auth.uid())::text = business_id));
CREATE POLICY "Public can register as client" ON public.public_clients
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can select client data" ON public.public_clients
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can update client data" ON public.public_clients
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER protect_profile_identity
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_identity();

REVOKE ALL ON FUNCTION public.get_auth_company_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_auth_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.business_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_company_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.business_exists(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.phones_match(text, text) TO anon, authenticated, service_role;
