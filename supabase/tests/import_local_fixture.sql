CREATE TABLE public.profiles (id text PRIMARY KEY, role text NOT NULL, company_id text);
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, name text NOT NULL,
  phone text, email text, birth_date date, notes text, source text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, phone)
);
CREATE TABLE public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, name text NOT NULL,
  display_order integer DEFAULT 0
);
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, name text NOT NULL,
  category_id uuid REFERENCES public.service_categories(id) ON DELETE SET NULL,
  price numeric NOT NULL, duration_minutes integer NOT NULL, active boolean DEFAULT true
);
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE
);
CREATE FUNCTION public.get_auth_company_id() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
  AS $$ SELECT COALESCE(NULLIF(btrim(company_id), ''), id) FROM public.profiles WHERE id = auth.uid()::text $$;
CREATE FUNCTION public.get_auth_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
  AS $$ SELECT role FROM public.profiles WHERE id = auth.uid()::text $$;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile owner" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid()::text);
CREATE POLICY "client owner" ON public.clients FOR ALL TO authenticated USING (user_id = public.get_auth_company_id()) WITH CHECK (user_id = public.get_auth_company_id());
CREATE POLICY "service owner" ON public.services FOR ALL TO authenticated USING (user_id = public.get_auth_company_id()) WITH CHECK (user_id = public.get_auth_company_id());
CREATE POLICY "category owner" ON public.service_categories FOR ALL TO authenticated USING (user_id = public.get_auth_company_id()) WITH CHECK (user_id = public.get_auth_company_id());
CREATE POLICY "appointment owner" ON public.appointments FOR ALL TO authenticated USING (user_id = public.get_auth_company_id()) WITH CHECK (user_id = public.get_auth_company_id());
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients, public.services, public.service_categories, public.appointments TO authenticated;
