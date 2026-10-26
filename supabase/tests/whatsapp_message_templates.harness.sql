CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated;
CREATE TABLE public.profiles (id text PRIMARY KEY, role text, company_id text, business_slug text UNIQUE);
CREATE FUNCTION public.get_auth_company_id() RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company_id text;
BEGIN
  SELECT COALESCE(NULLIF(btrim(company_id), ''), id) INTO v_company_id FROM public.profiles WHERE id = auth.uid()::text;
  RETURN v_company_id;
END;
$$;
CREATE FUNCTION public.get_auth_role() RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid()::text;
  RETURN v_role;
END;
$$;
INSERT INTO public.profiles VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'owner', NULL, 'negocio-a'),
  ('00000000-0000-0000-0000-0000000000a1', 'staff', '00000000-0000-0000-0000-0000000000a0', NULL),
  ('00000000-0000-0000-0000-0000000000b0', 'owner', NULL, 'negocio-b');
