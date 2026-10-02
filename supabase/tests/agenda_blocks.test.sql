-- Testes de bloqueio de agenda. Uso: scripts/test-sql-agenda-blocks.sh
\set ON_ERROR_STOP on
\set QUIET on

CREATE TEMP TABLE results (name text, got text, expected text);
CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_name, p_got, p_expected);
$$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(p_uid text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), true);
END $$;

\set OWNER '00000000-0000-0000-0000-00000000000a'
\set STAFF '00000000-0000-0000-0000-00000000001a'
\set PRO1 '10000000-0000-0000-0000-000000000001'
\set PRO2 '10000000-0000-0000-0000-000000000002'

CREATE TEMP TABLE ctx AS SELECT (current_date + 14)::date AS d;
CREATE FUNCTION pg_temp.at_l(p_day date, p_hm text) RETURNS timestamptz LANGUAGE sql AS $$
  SELECT (p_day::text || ' ' || p_hm)::timestamp AT TIME ZONE 'Europe/Lisbon'
$$;

-- Dados (reusa IDs do noshow se já existirem)
INSERT INTO public.profiles (id, role, company_id, region) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'owner', NULL, 'PT'),
  ('00000000-0000-0000-0000-00000000001a', 'staff', '00000000-0000-0000-0000-00000000000a', 'PT')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, company_id = EXCLUDED.company_id;

INSERT INTO public.business_settings (user_id, timezone, staff_can_block_agenda)
VALUES ('00000000-0000-0000-0000-00000000000a', 'Europe/Lisbon', true)
ON CONFLICT (user_id) DO UPDATE SET staff_can_block_agenda = true, timezone = 'Europe/Lisbon';

UPDATE public.business_settings
SET business_hours = (
  SELECT jsonb_object_agg(d, '{"isOpen": true, "blocks": [{"start": "09:00", "end": "18:00"}]}'::jsonb)
  FROM unnest(ARRAY['sun','mon','tue','wed','thu','fri','sat']) AS d
)
WHERE user_id = '00000000-0000-0000-0000-00000000000a';

INSERT INTO public.team_members (id, user_id, name, staff_user_id, active) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'P1', NULL, true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'P2', '00000000-0000-0000-0000-00000000001a', true)
ON CONFLICT (id) DO UPDATE SET staff_user_id = EXCLUDED.staff_user_id;

INSERT INTO public.services VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Corte', 45, 30)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.clients VALUES ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Aline', '351600000001')
ON CONFLICT (id) DO NOTHING;

-- Coluna default
SELECT pg_temp.check('flag default true',
  (SELECT staff_can_block_agenda::text FROM business_settings WHERE user_id = '00000000-0000-0000-0000-00000000000a'),
  'true');

SELECT pg_temp.check('sem coluna motivo',
  (SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agenda_blocks' AND column_name IN ('reason', 'motivo', 'notes')
  ) THEN 'has_reason' ELSE 'ok' END),
  'ok');

-- Helper overlap
SELECT pg_temp.as_user(:'OWNER');
DELETE FROM agenda_blocks;
INSERT INTO agenda_blocks (user_id, professional_id, starts_at, ends_at)
VALUES (
  '00000000-0000-0000-0000-00000000000a',
  '10000000-0000-0000-0000-000000000001',
  pg_temp.at_l((SELECT d FROM ctx), '12:00'),
  pg_temp.at_l((SELECT d FROM ctx), '13:00')
);

SELECT pg_temp.check('helper 12:00-12:30 blocked',
  public.agenda_interval_blocked(
    '00000000-0000-0000-0000-00000000000a',
    '10000000-0000-0000-0000-000000000001',
    pg_temp.at_l((SELECT d FROM ctx), '12:00'),
    pg_temp.at_l((SELECT d FROM ctx), '12:30')
  )::text,
  'true');

SELECT pg_temp.check('helper 13:00-13:30 livre',
  public.agenda_interval_blocked(
    '00000000-0000-0000-0000-00000000000a',
    '10000000-0000-0000-0000-000000000001',
    pg_temp.at_l((SELECT d FROM ctx), '13:00'),
    pg_temp.at_l((SELECT d FROM ctx), '13:30')
  )::text,
  'false');

SELECT pg_temp.check('helper outro profissional livre',
  public.agenda_interval_blocked(
    '00000000-0000-0000-0000-00000000000a',
    '10000000-0000-0000-0000-000000000002',
    pg_temp.at_l((SELECT d FROM ctx), '12:00'),
    pg_temp.at_l((SELECT d FROM ctx), '12:30')
  )::text,
  'false');

-- get_available_slots omite 12:00
SELECT pg_temp.check('slots omit 12:00',
  (
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM json_array_elements_text(public.get_available_slots(
        '00000000-0000-0000-0000-00000000000a'::uuid,
        (SELECT d FROM ctx),
        '10000000-0000-0000-0000-000000000001'::uuid,
        30,
        true
      )->'slots') s WHERE s = '12:00'
    ) THEN 'present' ELSE 'omitted' END
  ),
  'omitted');

SELECT pg_temp.check('slots keep 13:00',
  (
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM json_array_elements_text(public.get_available_slots(
        '00000000-0000-0000-0000-00000000000a'::uuid,
        (SELECT d FROM ctx),
        '10000000-0000-0000-0000-000000000001'::uuid,
        30,
        true
      )->'slots') s WHERE s = '13:00'
    ) THEN 'present' ELSE 'omitted' END
  ),
  'present');

SELECT pg_temp.check('slot_busy 12:00',
  public.public_booking_slot_busy(
    '00000000-0000-0000-0000-00000000000a',
    pg_temp.at_l((SELECT d FROM ctx), '12:00'),
    30,
    '10000000-0000-0000-0000-000000000001'
  )::text,
  'true');

-- Dono cria bloqueio via RPC (limpa o insert direto)
DELETE FROM agenda_blocks;
SELECT pg_temp.as_user(:'OWNER');
SELECT pg_temp.check('owner create ok',
  (public.create_agenda_block(
    '10000000-0000-0000-0000-000000000002'::uuid,
    pg_temp.at_l((SELECT d FROM ctx), '14:00'),
    pg_temp.at_l((SELECT d FROM ctx), '16:00'),
    false
  )->>'success'),
  'true');

-- Staff cria na própria
SELECT pg_temp.as_user(:'STAFF');
SELECT pg_temp.check('staff create own',
  (public.create_agenda_block(
    '10000000-0000-0000-0000-000000000002'::uuid,
    pg_temp.at_l((SELECT d FROM ctx), '16:00'),
    pg_temp.at_l((SELECT d FROM ctx), '17:00'),
    false
  )->>'success'),
  'true');

SELECT pg_temp.check('staff cannot create other',
  (public.create_agenda_block(
    '10000000-0000-0000-0000-000000000001'::uuid,
    pg_temp.at_l((SELECT d FROM ctx), '10:00'),
    pg_temp.at_l((SELECT d FROM ctx), '11:00'),
    false
  )->>'code'),
  'forbidden');

-- Flag off
SELECT pg_temp.as_user(:'OWNER');
UPDATE business_settings SET staff_can_block_agenda = false WHERE user_id = '00000000-0000-0000-0000-00000000000a';
SELECT pg_temp.as_user(:'STAFF');
SELECT pg_temp.check('staff flag off cannot create',
  (public.create_agenda_block(
    '10000000-0000-0000-0000-000000000002'::uuid,
    pg_temp.at_l((SELECT d FROM ctx), '17:00'),
    pg_temp.at_l((SELECT d FROM ctx), '18:00'),
    false
  )->>'code'),
  'forbidden');

-- Bloqueio existente continua (helper)
SELECT pg_temp.check('existing block still valid after flag off',
  public.agenda_interval_blocked(
    '00000000-0000-0000-0000-00000000000a',
    '10000000-0000-0000-0000-000000000002',
    pg_temp.at_l((SELECT d FROM ctx), '14:30'),
    pg_temp.at_l((SELECT d FROM ctx), '15:00')
  )::text,
  'true');

-- create_secure_booking recusa (dono)
SELECT pg_temp.as_user(:'OWNER');
SELECT pg_temp.check('secure booking blocked',
  (public.create_secure_booking(
    '00000000-0000-0000-0000-00000000000a'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    'Aline', '351', NULL,
    pg_temp.at_l((SELECT d FROM ctx), '14:00'),
    ARRAY['20000000-0000-0000-0000-000000000001'],
    45, 30, 'Confirmed',
    '30000000-0000-0000-0000-000000000001'::uuid
  )->>'code'),
  'agenda_blocked');

-- Conflitos: appointment + create sem ack
INSERT INTO appointments (user_id, client_id, professional_id, service, appointment_time, status, duration_minutes)
VALUES (
  '00000000-0000-0000-0000-00000000000a',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Corte',
  pg_temp.at_l((SELECT d FROM ctx), '10:00'),
  'Confirmed',
  30
);
SELECT pg_temp.check('conflicts without ack',
  (public.create_agenda_block(
    '10000000-0000-0000-0000-000000000001'::uuid,
    pg_temp.at_l((SELECT d FROM ctx), '09:30'),
    pg_temp.at_l((SELECT d FROM ctx), '10:30'),
    false
  )->>'code'),
  'conflicts');

SELECT pg_temp.check('ack creates and keeps appointment',
  (SELECT (public.create_agenda_block(
    '10000000-0000-0000-0000-000000000001'::uuid,
    pg_temp.at_l((SELECT d FROM ctx), '09:30'),
    pg_temp.at_l((SELECT d FROM ctx), '10:30'),
    true
  )->>'success') || ':' || (SELECT count(*)::text FROM appointments WHERE status = 'Confirmed' AND professional_id = '10000000-0000-0000-0000-000000000001')),
  'true:1');

-- Trigger: UPDATE horário para o bloqueio 14:00 P2
INSERT INTO appointments (id, user_id, client_id, professional_id, service, appointment_time, status, duration_minutes)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-00000000000a',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Corte',
  pg_temp.at_l((SELECT d FROM ctx), '09:00'),
  'Confirmed',
  30
);
SELECT pg_temp.check('update into block fails',
  (SELECT CASE WHEN public.agenda_interval_blocked(
      '00000000-0000-0000-0000-00000000000a',
      '10000000-0000-0000-0000-000000000002',
      pg_temp.at_l((SELECT d FROM ctx), '14:00'),
      pg_temp.at_l((SELECT d FROM ctx), '14:30')
    ) THEN
      (SELECT EXISTS (
        SELECT 1 FROM appointments WHERE id = '40000000-0000-0000-0000-000000000001'
      )::text)
    ELSE 'no-block' END),
  'true');

DO $$
BEGIN
  UPDATE public.appointments
     SET appointment_time = pg_temp.at_l((SELECT d FROM ctx), '14:00')
   WHERE id = '40000000-0000-0000-0000-000000000001';
  INSERT INTO results VALUES ('update into block', 'allowed', 'blocked');
EXCEPTION WHEN insufficient_privilege THEN
  INSERT INTO results VALUES ('update into block', 'blocked', 'blocked');
WHEN OTHERS THEN
  IF SQLERRM ILIKE '%agenda_blocked%' THEN
    INSERT INTO results VALUES ('update into block', 'blocked', 'blocked');
  ELSE
    INSERT INTO results VALUES ('update into block', SQLERRM, 'blocked');
  END IF;
END $$;

-- Relatório
SELECT name, got, expected,
       CASE WHEN got IS NOT DISTINCT FROM expected THEN 'ok' ELSE 'FAIL' END AS status
FROM results
ORDER BY name;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM results WHERE got IS DISTINCT FROM expected) THEN
    RAISE EXCEPTION 'agenda_blocks tests failed';
  END IF;
END $$;
