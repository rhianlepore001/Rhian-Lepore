-- PR-2 antecedência mínima. Falha antes de 20261003160000; passa depois.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

CREATE TEMP TABLE results (name text, got text, expected text);
GRANT ALL ON TABLE results TO PUBLIC;
CREATE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_name, p_got, p_expected);
$$;
GRANT EXECUTE ON FUNCTION pg_temp.check(text, text, text) TO PUBLIC;
CREATE FUNCTION pg_temp.try(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RETURN 'ok';
EXCEPTION WHEN OTHERS THEN
  RETURN 'error:' || SQLERRM;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.try(text) TO PUBLIC;

\set OWNER '00000000-0000-0000-0000-00000000000a'
\set STAFF '00000000-0000-0000-0000-00000000000b'
\set EXSTAFF '00000000-0000-0000-0000-00000000000c'
\set PRO1 '10000000-0000-0000-0000-000000000001'
\set STAFFPRO '10000000-0000-0000-0000-00000000000b'
\set EXPRO '10000000-0000-0000-0000-00000000000c'
\set CLIENT '30000000-0000-0000-0000-000000000001'
\set SVC '20000000-0000-0000-0000-000000000001'
\set BK1 '70000000-0000-0000-0000-0000000000aa'
\set BK2 '70000000-0000-0000-0000-0000000000bb'
\set BK3 '70000000-0000-0000-0000-0000000000cc'

INSERT INTO public.profiles (id, role, region, booking_lead_time_hours)
VALUES (:'OWNER', 'owner', 'PT', 2)
ON CONFLICT (id) DO UPDATE SET role = 'owner', region = 'PT', booking_lead_time_hours = EXCLUDED.booking_lead_time_hours;
INSERT INTO public.profiles (id, role, company_id, region, booking_lead_time_hours)
VALUES (:'STAFF', 'staff', :'OWNER', 'PT', 2)
ON CONFLICT (id) DO UPDATE SET role = 'staff', company_id = EXCLUDED.company_id, booking_lead_time_hours = 2;
INSERT INTO public.profiles (id, role, company_id, region, booking_lead_time_hours)
VALUES (:'EXSTAFF', 'staff', :'OWNER', 'PT', 2)
ON CONFLICT (id) DO UPDATE SET role = 'staff', company_id = EXCLUDED.company_id, booking_lead_time_hours = 2;
INSERT INTO public.team_members (id, user_id, name, active, is_owner, display_order, staff_user_id) VALUES
  (:'PRO1', :'OWNER', 'Diego', true, true, 0, :'OWNER'::uuid)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = true, deleted_at = NULL, staff_user_id = EXCLUDED.staff_user_id;
INSERT INTO public.team_members (id, user_id, name, active, is_owner, display_order, staff_user_id, deleted_at) VALUES
  (:'STAFFPRO', :'OWNER', 'Mario', true, false, 1, :'STAFF'::uuid, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = true, deleted_at = NULL, staff_user_id = EXCLUDED.staff_user_id;
INSERT INTO public.team_members (id, user_id, name, active, is_owner, display_order, staff_user_id, deleted_at) VALUES
  (:'EXPRO', :'OWNER', 'Ex', false, false, 2, :'EXSTAFF'::uuid, now())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = false, deleted_at = now(), staff_user_id = EXCLUDED.staff_user_id;
INSERT INTO public.services VALUES (:'SVC', :'OWNER', 'Corte', 45, 30) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.clients (id, user_id, name, phone) VALUES (:'CLIENT', :'OWNER', 'Aline', '351600000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.business_settings (user_id, timezone, business_hours) VALUES (
  :'OWNER',
  'Europe/Lisbon',
  jsonb_build_object(
    'sun', jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '20:00'))),
    'mon', jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '20:00'))),
    'tue', jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '20:00'))),
    'wed', jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '20:00'))),
    'thu', jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '20:00'))),
    'fri', jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '20:00'))),
    'sat', jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '20:00')))
  )
)
ON CONFLICT (user_id) DO UPDATE SET
  timezone = 'Europe/Lisbon',
  business_hours = EXCLUDED.business_hours;

DELETE FROM public.public_bookings;
DELETE FROM public.appointments;
DELETE FROM public.agenda_blocks;

SELECT pg_temp.check('v2 existe',
  (SELECT (to_regprocedure('public.get_available_slots_v2(uuid,date,uuid,integer,boolean)') IS NOT NULL)::text),
  'true');
SELECT pg_temp.check('full_dates v2 existe',
  (SELECT (to_regprocedure('public.get_full_dates_v2(uuid,date,date,uuid,integer)') IS NOT NULL)::text),
  'true');
SELECT pg_temp.check('trigger existe',
  (SELECT count(*)::text FROM pg_trigger WHERE tgname = 'enforce_lead_time_on_public_bookings'),
  '1');
SELECT pg_temp.check('constraint 0-720',
  (SELECT count(*)::text FROM pg_constraint WHERE conname = 'booking_lead_time_hours_range'),
  '1');
SELECT pg_temp.check('anon executa v2',
  has_function_privilege('anon', 'public.get_available_slots_v2(uuid,date,uuid,integer,boolean)', 'EXECUTE')::text,
  'true');
SELECT pg_temp.check('anon não executa o helper',
  has_function_privilege('anon', 'public.public_booking_lead_time_hours(text)', 'EXECUTE')::text,
  'false');

-- Link público: anon sem JWT (auth.uid nulo)
SELECT set_config('request.jwt.claim.sub', '', false);
SET ROLE anon;
SELECT pg_temp.check('insert direto dentro da janela',
  pg_temp.try(format($q$INSERT INTO public.public_bookings (business_id, customer_name, customer_phone, service_ids, professional_id, appointment_time, total_price, status, duration_minutes) VALUES (%L, 'Ana', '351600000010', ARRAY[%L]::uuid[], %L, now() + interval '30 minutes', 45, 'pending', 30)$q$, :'OWNER', :'SVC', :'PRO1')),
  'error:lead_time_violation');
SELECT pg_temp.check('anon INSERT status NULL +10min',
  pg_temp.try(format($q$INSERT INTO public.public_bookings (business_id, customer_name, customer_phone, service_ids, professional_id, appointment_time, total_price, status, duration_minutes) VALUES (%L, 'Nula', '351600000014', ARRAY[%L]::uuid[], %L, now() + interval '10 minutes', 45, NULL, 30)$q$, :'OWNER', :'SVC', :'PRO1')),
  'error:lead_time_violation');
SELECT pg_temp.check('RPC dentro da janela',
  pg_temp.try(format($q$SELECT public.create_public_booking(%L, 'Ana', '351600000011', ARRAY[%L]::uuid[], %L::uuid, now() + interval '45 minutes', 45, 30)$q$, :'OWNER', :'SVC', :'PRO1')),
  'error:lead_time_violation');
SELECT pg_temp.check('insert direto fora da janela',
  pg_temp.try(format($q$INSERT INTO public.public_bookings (id, business_id, customer_name, customer_phone, service_ids, professional_id, appointment_time, total_price, status, duration_minutes) VALUES (%L, %L, 'Ana', '351600000012', ARRAY[%L]::uuid[], %L, now() + interval '3 hours', 45, 'pending', 30)$q$, :'BK1', :'OWNER', :'SVC', :'PRO1')),
  'ok');
SELECT pg_temp.check('RPC fora da janela',
  (SELECT status FROM public.create_public_booking(
    :'OWNER', 'Bruno', '351600000013', ARRAY[:'SVC']::uuid[], :'PRO1'::uuid,
    now() + interval '5 hours', 45, 30)),
  'pending');

SELECT pg_temp.check('edição para dentro da janela',
  pg_temp.try($q$SELECT public.update_public_booking_by_client(
    '70000000-0000-0000-0000-0000000000aa'::uuid, '351600000012',
    ARRAY['20000000-0000-0000-0000-000000000001']::uuid[],
    '10000000-0000-0000-0000-000000000001'::uuid,
    now() + interval '20 minutes', now() + interval '3 hours',
    'Ana', '351600000012', 45, 30)$q$),
  'error:lead_time_violation');
SELECT pg_temp.check('anon client edit +30min',
  pg_temp.try($q$SELECT public.update_public_booking_by_client(
    '70000000-0000-0000-0000-0000000000aa'::uuid, '351600000012',
    ARRAY['20000000-0000-0000-0000-000000000001']::uuid[],
    '10000000-0000-0000-0000-000000000001'::uuid,
    now() + interval '30 minutes', now() + interval '3 hours',
    'Ana', '351600000012', 45, 30)$q$),
  'error:lead_time_violation');
SELECT pg_temp.check('edição para fora da janela',
  pg_temp.try($q$SELECT public.update_public_booking_by_client(
    '70000000-0000-0000-0000-0000000000aa'::uuid, '351600000012',
    ARRAY['20000000-0000-0000-0000-000000000001']::uuid[],
    '10000000-0000-0000-0000-000000000001'::uuid,
    now() + interval '10 hours', now() + interval '3 hours',
    'Ana', '351600000012', 45, 30)$q$),
  'ok');
RESET ROLE;

-- Cancelado não aplica; reabrir para pending dentro da janela aplica
SELECT set_config('request.jwt.claim.sub', '', false);
SET ROLE anon;
SELECT pg_temp.check('insert cancelled perto',
  pg_temp.try(format($q$INSERT INTO public.public_bookings (id, business_id, customer_name, customer_phone, service_ids, professional_id, appointment_time, total_price, status, duration_minutes) VALUES (%L, %L, 'X', '351600000021', ARRAY[%L]::uuid[], %L, now() + interval '10 minutes', 45, 'cancelled', 30)$q$, :'BK2', :'OWNER', :'SVC', :'PRO1')),
  'ok');
SELECT pg_temp.check('cancelled->pending na janela',
  pg_temp.try(format($q$UPDATE public.public_bookings SET status = 'pending' WHERE id = %L$q$, :'BK2')),
  'error:lead_time_violation');
RESET ROLE;

-- Staff autenticado: trigger não aplica (HIGH 1) — Remarcar #120 e create_secure_booking
SELECT set_config('request.jwt.claim.sub', :'STAFF', false);
SET ROLE authenticated;
SELECT pg_temp.check('staff UPDATE confirmed +45min',
  pg_temp.try(format($q$UPDATE public.public_bookings SET appointment_time = now() + interval '45 minutes', status = 'confirmed' WHERE id = %L$q$, :'BK1')),
  'ok');
SELECT pg_temp.check('reschedule #120 UPDATE linked booking +30min',
  pg_temp.try(format($q$
    INSERT INTO public.appointments (user_id, client_id, professional_id, appointment_time, status, duration_minutes, public_booking_id)
    VALUES (%L, %L, %L, now() + interval '3 hours', 'Confirmed', 30, %L);
    UPDATE public.public_bookings SET appointment_time = now() + interval '30 minutes'
    WHERE id = %L
  $q$, :'OWNER', :'CLIENT', :'PRO1', :'BK1', :'BK1')),
  'ok');
SELECT pg_temp.check('afasta BK1 para não colidir',
  pg_temp.try(format($q$UPDATE public.public_bookings SET appointment_time = now() + interval '8 hours' WHERE id = %L$q$, :'BK1')),
  'ok');
SELECT pg_temp.check('staff create_secure_booking status/client null +40min',
  (SELECT public.create_secure_booking(
    :'OWNER'::uuid, :'PRO1'::uuid, 'Encaixe', '351600000040', NULL,
    now() + interval '40 minutes', ARRAY[:'SVC'], 45, 30, NULL, NULL
  )->>'success'),
  'true');
RESET ROLE;

-- Ex-staff: company_id órfão NÃO isenta (sem team_members ativo)
SELECT set_config('request.jwt.claim.sub', :'EXSTAFF', false);
SET ROLE authenticated;
SELECT pg_temp.check('ex-staff UPDATE +30min',
  pg_temp.try(format($q$UPDATE public.public_bookings SET appointment_time = now() + interval '30 minutes' WHERE id = %L$q$, :'BK1')),
  'error:lead_time_violation');
RESET ROLE;

-- C4: Agenda / encaixe no passado NÃO usa o trigger (appointments)
SELECT set_config('request.jwt.claim.sub', :'OWNER', false);
SET ROLE authenticated;
SELECT pg_temp.check('agenda no passado',
  pg_temp.try(format($q$INSERT INTO public.appointments (user_id, client_id, professional_id, appointment_time, status, duration_minutes) VALUES (%L, %L, %L, now() - interval '2 hours', 'Confirmed', 30)$q$, :'OWNER', :'CLIENT', :'PRO1')),
  'ok');
SELECT pg_temp.check('create_secure_booking no passado',
  (SELECT public.create_secure_booking(
    :'OWNER'::uuid, :'PRO1'::uuid, 'Aline', NULL, NULL,
    now() - interval '90 minutes', ARRAY[:'SVC'], 45, 30, 'Confirmed', :'CLIENT'::uuid
  )->>'success'),
  'true');
RESET ROLE;

-- Sem mínimo (0) aceita horário logo à frente (> now) — como anon
UPDATE public.profiles SET booking_lead_time_hours = 0 WHERE id = :'OWNER';
SELECT set_config('request.jwt.claim.sub', '', false);
SET ROLE anon;
SELECT pg_temp.check('sem mínimo aceita 20 min',
  pg_temp.try(format($q$INSERT INTO public.public_bookings (business_id, customer_name, customer_phone, service_ids, professional_id, appointment_time, total_price, status, duration_minutes) VALUES (%L, 'Zero', '351600000020', ARRAY[%L]::uuid[], %L, now() + interval '20 minutes', 45, 'pending', 30)$q$, :'OWNER', :'SVC', :'PRO1')),
  'ok');
RESET ROLE;
UPDATE public.profiles SET booking_lead_time_hours = 2 WHERE id = :'OWNER';

-- C2 / C6: v2 filtra lead; profissional não; fuso do negócio
UPDATE public.profiles SET booking_lead_time_hours = 8 WHERE id = :'OWNER';

SELECT pg_temp.check('v2 lead 8h só devolve slot ≥ now+8h (hoje e amanhã)',
  (
    WITH days AS (
      SELECT (timezone('Europe/Lisbon', now()))::date + offs AS day
      FROM generate_series(0, 1) AS offs
    ),
    v2 AS (
      SELECT d.day, json_array_elements_text(
        public.get_available_slots_v2(:'OWNER'::uuid, d.day, :'PRO1'::uuid, 30, false)->'slots'
      ) AS slot
      FROM days d
    )
    SELECT (NOT EXISTS (
      SELECT 1 FROM v2
      WHERE ((v2.day::text || ' ' || v2.slot)::timestamp AT TIME ZONE 'Europe/Lisbon')
            < now() + interval '8 hours'
    ))::text
  ),
  'true');

UPDATE public.profiles SET booking_lead_time_hours = 48 WHERE id = :'OWNER';
SELECT pg_temp.check('v2 48h esvazia amanhã com lead_time',
  (SELECT public.get_available_slots_v2(
      :'OWNER'::uuid,
      ((timezone('Europe/Lisbon', now()))::date + 1),
      :'PRO1'::uuid, 30, false
    )->>'empty_reason'),
  'lead_time');

SELECT pg_temp.check('v2 profissional ignora antecedência (passado incluso)',
  (
    SELECT (COALESCE(json_array_length(public.get_available_slots_v2(
      :'OWNER'::uuid,
      (timezone('Europe/Lisbon', now()))::date,
      :'PRO1'::uuid, 30, true
    )->'slots'), 0) > 0)::text
  ),
  'true');

UPDATE public.profiles SET booking_lead_time_hours = 2 WHERE id = :'OWNER';

SELECT pg_temp.check('full_dates v2 cap 62 dias',
  (
    SELECT (cardinality(public.get_full_dates_v2(
      :'OWNER'::uuid,
      (timezone('Europe/Lisbon', now()))::date,
      ((timezone('Europe/Lisbon', now()))::date + 120),
      :'PRO1'::uuid,
      30
    )) <= 62)::text
  ),
  'true');

\o
SELECT name, CASE WHEN got IS NOT DISTINCT FROM expected THEN 'ok' ELSE 'FAIL' END AS status, got, expected
FROM results ORDER BY name;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM results WHERE got IS DISTINCT FROM expected) THEN
    RAISE EXCEPTION 'booking lead time tests failed';
  END IF;
END $$;
