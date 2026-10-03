-- Testes de bloqueio de agenda. Uso: scripts/test-sql-agenda-blocks.sh
\set ON_ERROR_STOP on
\set QUIET on

CREATE TEMP TABLE results (name text, got text, expected text);
CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_name, p_got, p_expected);
$$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(p_uid text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), false);
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
    false,
    NULL
  )->>'code'),
  'forbidden');
SELECT pg_temp.check('B-16 texto',
  (public.create_agenda_block(
    '10000000-0000-0000-0000-000000000001'::uuid,
    pg_temp.at_l((SELECT d FROM ctx), '10:00'),
    pg_temp.at_l((SELECT d FROM ctx), '11:00'),
    false,
    NULL
  )->>'message'),
  'Você não tem permissão para bloquear esta agenda.');
SELECT pg_temp.as_user(:'OWNER');
SELECT pg_temp.check('B-17 texto',
  (public.create_agenda_block(
    '10000000-0000-0000-0000-000000000001'::uuid,
    pg_temp.at_l((SELECT d FROM ctx), '12:00'),
    pg_temp.at_l((SELECT d FROM ctx), '11:00'),
    false,
    NULL
  )->>'message'),
  'O fim do bloqueio precisa ser depois do início.');
SELECT pg_temp.as_user(:'STAFF');

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
  'professional_blocked');

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
    true,
    ARRAY(SELECT id FROM appointments
      WHERE professional_id = '10000000-0000-0000-0000-000000000001'
        AND appointment_time = pg_temp.at_l((SELECT d FROM ctx), '10:00'))
  )->>'success') || ':' || (SELECT count(*)::text FROM appointments WHERE status = 'Confirmed' AND professional_id = '10000000-0000-0000-0000-000000000001')),
  'true:1');

SELECT pg_temp.check('appointment trigger definer',
  (SELECT prosecdef::text FROM pg_proc
    WHERE proname = 'enforce_agenda_block_on_appointments'
      AND pronamespace = 'public'::regnamespace),
  'true');

-- B-30: aumentar a duração de quem já está no bloqueio volta a checar o intervalo.
DO $$
BEGIN
  UPDATE public.appointments
     SET duration_minutes = 45
   WHERE professional_id = '10000000-0000-0000-0000-000000000001'
     AND status = 'Confirmed'
     AND appointment_time = pg_temp.at_l((SELECT d FROM ctx), '10:00');
  INSERT INTO results VALUES ('update existing overlapping apt', 'allowed', 'blocked');
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM ILIKE '%Horário bloqueado na agenda%' THEN
    INSERT INTO results VALUES ('update existing overlapping apt', 'blocked', 'blocked');
  ELSE
    INSERT INTO results VALUES ('update existing overlapping apt', SQLERRM, 'blocked');
  END IF;
END $$;

DO $$
BEGIN
  UPDATE public.appointments
     SET status = 'Cancelled'
   WHERE professional_id = '10000000-0000-0000-0000-000000000001'
     AND status = 'Confirmed'
     AND appointment_time = pg_temp.at_l((SELECT d FROM ctx), '10:00');
  INSERT INTO results VALUES ('cancel overlapping apt', 'allowed', 'allowed');
EXCEPTION WHEN OTHERS THEN
  INSERT INTO results VALUES ('cancel overlapping apt', SQLERRM, 'allowed');
END $$;

DO $$
BEGIN
  UPDATE public.appointments
     SET status = 'Confirmed'
   WHERE professional_id = '10000000-0000-0000-0000-000000000001'
     AND status = 'Cancelled'
     AND appointment_time = pg_temp.at_l((SELECT d FROM ctx), '10:00');
  INSERT INTO results VALUES ('reactivate into block', 'allowed', 'blocked');
EXCEPTION WHEN insufficient_privilege THEN
  INSERT INTO results VALUES ('reactivate into block', 'blocked', 'blocked');
WHEN OTHERS THEN
  IF SQLERRM ILIKE '%Horário bloqueado na agenda%' THEN
    INSERT INTO results VALUES ('reactivate into block', 'blocked', 'blocked');
  ELSE
    INSERT INTO results VALUES ('reactivate into block', SQLERRM, 'blocked');
  END IF;
END $$;

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
  IF SQLERRM ILIKE '%Horário bloqueado na agenda%' THEN
    INSERT INTO results VALUES ('update into block', 'blocked', 'blocked');
  ELSE
    INSERT INTO results VALUES ('update into block', SQLERRM, 'blocked');
  END IF;
END $$;

-- Papéis reais (PostgREST): authenticated / anon ----------------------------
CREATE FUNCTION pg_temp.run_as(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
    EXECUTE 'RESET ROLE';
    RETURN v;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    RETURN 'error:' || SQLERRM;
  END;
END $$;

SELECT pg_temp.check('authenticated direct insert outside block (Agenda sem RPC)',
  pg_temp.run_as('authenticated', :'OWNER', format($q$INSERT INTO public.appointments (user_id, client_id, professional_id, service, appointment_time, status, duration_minutes) VALUES ('00000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Corte', %L, 'Confirmed', 30) RETURNING status$q$, pg_temp.at_l((SELECT d FROM ctx), '15:00'))),
  'Confirmed');

SELECT pg_temp.check('authenticated direct insert into block',
  pg_temp.run_as('authenticated', :'OWNER', format($q$INSERT INTO public.appointments (user_id, client_id, professional_id, service, appointment_time, status, duration_minutes) VALUES ('00000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Corte', %L, 'Confirmed', 30) RETURNING status$q$, pg_temp.at_l((SELECT d FROM ctx), '10:00'))),
  'error:Horário bloqueado na agenda de P1. Para agendar, remova o bloqueio primeiro.');

SELECT pg_temp.check('anon create_public_booking into block',
  pg_temp.run_as('anon', NULL, format($q$SELECT status FROM public.create_public_booking('00000000-0000-0000-0000-00000000000a', 'Cliente Novo', '351600000009', ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], '10000000-0000-0000-0000-000000000002'::uuid, %L::timestamptz, 45, 30)$q$, pg_temp.at_l((SELECT d FROM ctx), '15:00'))),
  'error:slot_unavailable');

SELECT pg_temp.check('anon create_public_booking outside block',
  pg_temp.run_as('anon', NULL, format($q$SELECT status FROM public.create_public_booking('00000000-0000-0000-0000-00000000000a', 'Cliente Novo', '351600000009', ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], '10000000-0000-0000-0000-000000000002'::uuid, %L::timestamptz, 45, 30)$q$, pg_temp.at_l((SELECT d FROM ctx), '11:00'))),
  'pending');

SELECT pg_temp.check('any pro: um bloqueado, outro livre -> livre',
  public.public_booking_slot_busy('00000000-0000-0000-0000-00000000000a', pg_temp.at_l((SELECT d FROM ctx), '14:30'), 30, NULL)::text,
  'false');

INSERT INTO agenda_blocks (user_id, professional_id, starts_at, ends_at)
VALUES ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001',
        pg_temp.at_l((SELECT d FROM ctx), '14:00'), pg_temp.at_l((SELECT d FROM ctx), '15:00'));
SELECT pg_temp.check('any pro: todos bloqueados -> ocupado',
  public.public_booking_slot_busy('00000000-0000-0000-0000-00000000000a', pg_temp.at_l((SELECT d FROM ctx), '14:30'), 30, NULL)::text,
  'true');

INSERT INTO agenda_blocks (user_id, professional_id, starts_at, ends_at)
VALUES ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001',
        pg_temp.at_l((SELECT d FROM ctx) + 1, '00:00'), pg_temp.at_l((SELECT d FROM ctx) + 2, '00:00'));
SELECT pg_temp.check('get_full_dates (live) herda bloqueio de dia inteiro',
  array_length(public.get_full_dates('00000000-0000-0000-0000-00000000000a'::uuid, (SELECT d FROM ctx) + 1, (SELECT d FROM ctx) + 1, '10000000-0000-0000-0000-000000000001'::uuid, 30), 1)::text,
  '1');
SELECT pg_temp.check('get_full_dates outro profissional não fica cheio',
  array_length(public.get_full_dates('00000000-0000-0000-0000-00000000000a'::uuid, (SELECT d FROM ctx) + 1, (SELECT d FROM ctx) + 1, '10000000-0000-0000-0000-000000000002'::uuid, 30), 1)::text,
  NULL);

SELECT pg_temp.check('anon sem EXECUTE em create_agenda_block',
  has_function_privilege('anon', 'public.create_agenda_block(uuid,timestamptz,timestamptz,boolean,uuid[])', 'EXECUTE')::text, 'false');
SELECT pg_temp.check('authenticated sem EXECUTE no helper',
  has_function_privilege('authenticated', 'public.agenda_interval_blocked(text,uuid,timestamptz,timestamptz)', 'EXECUTE')::text, 'false');
SELECT pg_temp.check('anon sem SELECT em agenda_blocks',
  has_table_privilege('anon', 'public.agenda_blocks', 'SELECT')::text, 'false');
SELECT pg_temp.check('authenticated sem INSERT direto em agenda_blocks',
  has_table_privilege('authenticated', 'public.agenda_blocks', 'INSERT')::text, 'false');

SELECT pg_temp.check('staff não remove bloqueio de outro profissional',
  pg_temp.run_as('authenticated', :'STAFF', format($q$SELECT public.delete_agenda_block(%L::uuid)->>'code'$q$,
    (SELECT id FROM agenda_blocks WHERE professional_id = '10000000-0000-0000-0000-000000000001' ORDER BY starts_at DESC LIMIT 1))),
  'forbidden');

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
