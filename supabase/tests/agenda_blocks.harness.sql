-- Extras sobre o harness de noshow_slots: papéis, RLS, grants para testar
-- create_agenda_block / trigger autenticado.
CREATE OR REPLACE FUNCTION public.get_auth_role()
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid()::text;
  RETURN v_role;
END;
$function$;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles self" ON public.profiles;
CREATE POLICY "profiles self" ON public.profiles FOR SELECT USING (id = auth.uid()::text);

DROP POLICY IF EXISTS "Appointments: company isolation" ON public.appointments;
CREATE POLICY "Appointments: company isolation" ON public.appointments FOR ALL TO authenticated
  USING (user_id = get_auth_company_id()) WITH CHECK (user_id = get_auth_company_id());

DROP POLICY IF EXISTS "Owner can manage business_settings" ON public.business_settings;
CREATE POLICY "Owner can manage business_settings" ON public.business_settings FOR ALL TO public
  USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Settings: company read" ON public.business_settings;
CREATE POLICY "Settings: company read" ON public.business_settings FOR SELECT TO authenticated
  USING (user_id = get_auth_company_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
