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
