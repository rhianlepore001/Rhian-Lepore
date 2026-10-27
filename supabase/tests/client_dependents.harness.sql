ALTER TABLE public.services ADD COLUMN active boolean NOT NULL DEFAULT true;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients, public.appointments TO authenticated;
CREATE POLICY "Owners manage company clients" ON public.clients FOR ALL TO authenticated
 USING (get_auth_role() = 'owner' AND user_id = get_auth_company_id()) WITH CHECK (get_auth_role() = 'owner' AND user_id = get_auth_company_id());
CREATE POLICY "Staff can select company clients" ON public.clients FOR SELECT TO authenticated
 USING (get_auth_role() = 'staff' AND user_id = get_auth_company_id());
CREATE POLICY "Staff can insert company clients" ON public.clients FOR INSERT TO authenticated
 WITH CHECK (get_auth_role() = 'staff' AND user_id = get_auth_company_id());
DROP POLICY IF EXISTS "Appointments: company isolation" ON public.appointments;
CREATE POLICY "Appointments: company isolation" ON public.appointments FOR ALL TO authenticated
 USING (user_id = get_auth_company_id()) WITH CHECK (user_id = get_auth_company_id());
INSERT INTO public.profiles(id, role, company_id) VALUES
 ('00000000-0000-0000-0000-0000000000a0', 'owner', NULL),
 ('00000000-0000-0000-0000-0000000000a1', 'staff', '00000000-0000-0000-0000-0000000000a0'),
 ('00000000-0000-0000-0000-0000000000b0', 'owner', NULL);
INSERT INTO public.clients(id, user_id, name) VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a0','Titular Fictício A'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a0','Titular Fictício A2'),
 ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000b0','Titular Fictício B');
INSERT INTO public.team_members(id,user_id,name) VALUES
 ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a0','Profissional Fictício A');
INSERT INTO public.services(id,user_id,name,price,duration_minutes) VALUES
 ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a0','Serviço Fictício A',30,20),
 ('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000b0','Serviço Fictício B',40,30);
CREATE FUNCTION public.test_assert(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; RAISE NOTICE 'ok: %',label; END $$;
CREATE FUNCTION public.test_denied(statement text, expected_code text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE statement;
 EXCEPTION WHEN OTHERS THEN
   IF SQLSTATE = expected_code THEN RAISE NOTICE 'ok: %', label; RETURN; END IF;
   RAISE EXCEPTION 'FAIL: % expected %, got %: %',label,expected_code,SQLSTATE,SQLERRM;
 END;
 RAISE EXCEPTION 'FAIL: % allowed', label;
END $$;
