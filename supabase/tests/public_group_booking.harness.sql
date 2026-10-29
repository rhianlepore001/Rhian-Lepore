-- Preparação do teste de agendamento em grupo (online e interno): o que a cadeia de
-- confirmação automática ainda não cria (padrão do harness de dependentes).
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notes text, ADD COLUMN IF NOT EXISTS payment_method text, ADD COLUMN IF NOT EXISTS service text, ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients, public.appointments TO authenticated;
DROP POLICY IF EXISTS "Owners manage company clients" ON public.clients;
CREATE POLICY "Owners manage company clients" ON public.clients FOR ALL TO authenticated
 USING (get_auth_role() = 'owner' AND user_id = get_auth_company_id()) WITH CHECK (get_auth_role() = 'owner' AND user_id = get_auth_company_id());
DROP POLICY IF EXISTS "Staff can select company clients" ON public.clients;
CREATE POLICY "Staff can select company clients" ON public.clients FOR SELECT TO authenticated
 USING (get_auth_role() = 'staff' AND user_id = get_auth_company_id());
DROP POLICY IF EXISTS "Appointments: company isolation" ON public.appointments;
CREATE POLICY "Appointments: company isolation" ON public.appointments FOR ALL TO authenticated
 USING (user_id = get_auth_company_id()) WITH CHECK (user_id = get_auth_company_id());
