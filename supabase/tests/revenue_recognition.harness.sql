-- Fixture para 20261110150000_revenue_recognized_on_completion (Postgres local descartável).
-- Tenant isolado (UTC) com: atendimento de data futura concluído hoje, atendimento legado sem
-- completed_at e atendimento confirmado para testar o trigger.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_goal numeric;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, created_at timestamptz DEFAULT now());
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_visit timestamptz;
CREATE TABLE IF NOT EXISTS public.aios_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, action_type text, content jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.public_bookings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id text, status text);
INSERT INTO public.profiles(id, role, company_id, region) VALUES ('7e000000-0000-0000-0000-000000000001','owner','7e000000-0000-0000-0000-000000000001','BR');
INSERT INTO public.business_settings(user_id, timezone) VALUES ('7e000000-0000-0000-0000-000000000001','UTC');
INSERT INTO public.team_members(id, user_id, name, role, is_owner, active, commission_rate)
VALUES ('7e000000-0000-0000-0000-0000000000a1','7e000000-0000-0000-0000-000000000001','Ana','Barbeira',false,true,40);
INSERT INTO public.clients(id, user_id, name) VALUES ('7e000000-0000-0000-0000-0000000000c1','7e000000-0000-0000-0000-000000000001','Cliente');
-- F: marcado para o mês que vem, concluído agora (checkout antecipado).
INSERT INTO public.appointments(id, user_id, client_id, service, appointment_time, status, price, professional_id, completed_at, duration_minutes)
VALUES ('7e000000-0000-0000-0000-0000000000f1','7e000000-0000-0000-0000-000000000001','7e000000-0000-0000-0000-0000000000c1','Corte',
        date_trunc('month', now()) + interval '1 month 10 days 15 hours','Completed',40,'7e000000-0000-0000-0000-0000000000a1', now(), 30);
INSERT INTO public.finance_records(user_id, professional_id, appointment_id, type, revenue, commission_rate, commission_value, created_at)
VALUES ('7e000000-0000-0000-0000-000000000001','7e000000-0000-0000-0000-0000000000a1','7e000000-0000-0000-0000-0000000000f1','revenue',40,40,16, now());
-- L: legado, concluído hoje sem completed_at (fica na data marcada).
INSERT INTO public.appointments(id, user_id, client_id, service, appointment_time, status, price, completed_at)
VALUES ('7e000000-0000-0000-0000-0000000000b1','7e000000-0000-0000-0000-000000000001','7e000000-0000-0000-0000-0000000000c1','Barba',
        date_trunc('day', now()),'Completed',25, NULL);
-- C: confirmado para daqui a 3 dias (vai ser concluído no teste do trigger).
INSERT INTO public.appointments(id, user_id, client_id, service, appointment_time, status, price)
VALUES ('7e000000-0000-0000-0000-0000000000c2','7e000000-0000-0000-0000-000000000001','7e000000-0000-0000-0000-0000000000c1','Corte',
        now() + interval '3 days','Confirmed',30);
