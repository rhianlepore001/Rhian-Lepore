-- Extrações do harness de staff_performance + colunas/tabelas que a migration de ciclos precisa.
-- Carregar DEPOIS de staff_performance.harness.sql e 20261003110000.

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS commission_payment_frequency text,
  ADD COLUMN IF NOT EXISTS commission_payment_day int;

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text,
  message text,
  type text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  link text,
  booking_id uuid,
  event_key text
);

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 2 negócios + 8 colaboradores weekly/biweekly (simulando o estado de prod ignorado)
INSERT INTO public.profiles VALUES
  ('b0000000-0000-0000-0000-0000000000b0', 'owner', 'b0000000-0000-0000-0000-0000000000b0', 'BR'),
  ('c0000000-0000-0000-0000-0000000000c0', 'owner', 'c0000000-0000-0000-0000-0000000000c0', 'PT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.business_settings (user_id, timezone, commission_settlement_day_of_month)
VALUES
  ('b0000000-0000-0000-0000-0000000000b0', 'America/Sao_Paulo', 1),
  ('c0000000-0000-0000-0000-0000000000c0', 'Europe/Lisbon', 5);

INSERT INTO public.team_members (
  id, user_id, name, role, is_owner, active, commission_rate, staff_user_id, deleted_at,
  commission_payment_frequency, commission_payment_day)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-0000000000b0', 'B1', 'Staff', false, true, 40, NULL, NULL, 'weekly', 1),
  ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-0000000000b0', 'B2', 'Staff', false, true, 40, NULL, NULL, 'weekly', 2),
  ('b1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-0000000000b0', 'B3', 'Staff', false, true, 40, NULL, NULL, 'biweekly', 5),
  ('b1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-0000000000b0', 'B4', 'Staff', false, true, 40, NULL, NULL, 'biweekly', 1),
  ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000c0', 'C1', 'Staff', false, true, 40, NULL, NULL, 'weekly', 3),
  ('c1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-0000000000c0', 'C2', 'Staff', false, true, 40, NULL, NULL, 'weekly', 4),
  ('c1000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-0000000000c0', 'C3', 'Staff', false, true, 40, NULL, NULL, 'biweekly', 10),
  ('c1000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-0000000000c0', 'C4', 'Staff', false, true, 40, NULL, NULL, 'biweekly', 2);

-- Espelho de prod (lido em 2026-10-04): CHECK do dia de acerto, índice único parcial do
-- sino (PR #126) e os grants padrão do Supabase em tabelas novas do schema public.
ALTER TABLE public.business_settings
  ADD CONSTRAINT business_settings_commission_settlement_day_check
  CHECK (commission_settlement_day_of_month >= 1 AND commission_settlement_day_of_month <= 28);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unread_event_key_uid_idx
  ON public.notifications (user_id, event_key) WHERE read = false AND event_key IS NOT NULL;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- Paridade: negócios com acerto dia 1 e dia 28 (com movimento), além do A (dia 5).
INSERT INTO public.profiles VALUES
  ('d1000000-0000-0000-0000-0000000000d1', 'owner', 'd1000000-0000-0000-0000-0000000000d1', 'BR'),
  ('d2800000-0000-0000-0000-0000000000d2', 'owner', 'd2800000-0000-0000-0000-0000000000d2', 'PT'),
  ('e0000000-0000-0000-0000-0000000000e0', 'owner', 'e0000000-0000-0000-0000-0000000000e0', 'BR'),
  ('f0000000-0000-0000-0000-0000000000f0', 'owner', 'f0000000-0000-0000-0000-0000000000f0', 'BR')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.business_settings (user_id, timezone, commission_settlement_day_of_month) VALUES
  ('d1000000-0000-0000-0000-0000000000d1', 'America/Sao_Paulo', 1),
  ('d2800000-0000-0000-0000-0000000000d2', 'Europe/Lisbon', 28),
  ('e0000000-0000-0000-0000-0000000000e0', 'America/Sao_Paulo', 20),
  ('f0000000-0000-0000-0000-0000000000f0', 'America/Sao_Paulo', 5);
INSERT INTO public.team_members (id, user_id, name, role, is_owner, active, commission_rate) VALUES
  ('d1100000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-0000000000d1', 'D1a', 'Staff', false, true, 40),
  ('d2900000-0000-0000-0000-000000000001', 'd2800000-0000-0000-0000-0000000000d2', 'D28a', 'Staff', false, true, 40),
  ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-0000000000f0', 'F semanal', 'Staff', false, true, 40),
  ('f1000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-0000000000f0', 'F regra', 'Staff', false, true, 40);
-- 1 lançamento por dia (12:00 local, e 23:30 local nos dias 1, 5, 28) de 2024-12 a 2027-02
INSERT INTO public.finance_records (user_id, professional_id, revenue, commission_value, created_at, commission_paid, type)
SELECT t.uid, t.pro, 100, 10 + (extract(day FROM d)::int % 7),
       (d + time '12:00') AT TIME ZONE t.tz, d < DATE '2025-06-01', 'revenue'
FROM (VALUES
  ('d1000000-0000-0000-0000-0000000000d1', 'd1100000-0000-0000-0000-000000000001'::uuid, 'America/Sao_Paulo'),
  ('d2800000-0000-0000-0000-0000000000d2', 'd2900000-0000-0000-0000-000000000001'::uuid, 'Europe/Lisbon')) t(uid, pro, tz)
CROSS JOIN generate_series(DATE '2024-12-01', DATE '2027-02-28', interval '1 day') g(d0)
CROSS JOIN LATERAL (SELECT g.d0::date AS d) x
UNION ALL
SELECT t.uid, t.pro, 100, 3, (d + time '23:30') AT TIME ZONE t.tz, false, 'revenue'
FROM (VALUES
  ('d1000000-0000-0000-0000-0000000000d1', 'd1100000-0000-0000-0000-000000000001'::uuid, 'America/Sao_Paulo'),
  ('d2800000-0000-0000-0000-0000000000d2', 'd2900000-0000-0000-0000-000000000001'::uuid, 'Europe/Lisbon')) t(uid, pro, tz)
CROSS JOIN generate_series(DATE '2024-12-01', DATE '2027-02-28', interval '1 day') g(d0)
CROSS JOIN LATERAL (SELECT g.d0::date AS d) x
WHERE extract(day FROM x.d) IN (1, 5, 28);
INSERT INTO public.commission_payments (user_id, professional_id, payment_date, amount, start_date, end_date, status, paid_at)
VALUES
  ('d1000000-0000-0000-0000-0000000000d1', 'd1100000-0000-0000-0000-000000000001', '2025-05-02', 10, '2025-04-02', '2025-05-01', 'paid', '2025-05-02 15:00Z'),
  ('d2800000-0000-0000-0000-0000000000d2', 'd2900000-0000-0000-0000-000000000001', '2025-05-29', 10, '2025-04-29', '2025-05-28', 'paid', '2025-05-29 15:00Z');
