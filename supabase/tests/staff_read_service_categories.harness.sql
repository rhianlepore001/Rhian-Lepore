-- Harness mínimo (Postgres local descartável) para a migration
-- 20260928160000_staff_read_service_categories. Policies e get_auth_company_id
-- copiadas de prod (pg_policies / pg_get_functiondef em 2026-09-28).
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

CREATE TABLE public.profiles (id text PRIMARY KEY, role text, company_id text);
CREATE TABLE public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own categories" ON public.service_categories FOR SELECT TO public USING (user_id = (auth.uid())::text);
CREATE POLICY "Users can manage their own categories" ON public.service_categories FOR ALL TO public USING (user_id = (auth.uid())::text) WITH CHECK (user_id = (auth.uid())::text);
-- grants de prod (Supabase padrão)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;

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

-- Dados: empresa A (dono a0, staff a1), empresa B (dono b0, staff b1)
INSERT INTO public.profiles VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'owner', NULL),
  ('00000000-0000-0000-0000-0000000000a1', 'staff', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000b0', 'owner', NULL),
  ('00000000-0000-0000-0000-0000000000b1', 'staff', '00000000-0000-0000-0000-0000000000b0');
INSERT INTO public.service_categories (user_id, name, display_order) VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'Cortes', 1),
  ('00000000-0000-0000-0000-0000000000a0', 'Barba', 2),
  ('00000000-0000-0000-0000-0000000000a0', 'Combos', 3),
  ('00000000-0000-0000-0000-0000000000b0', 'Outra loja', 1);
