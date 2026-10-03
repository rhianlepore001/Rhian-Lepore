-- Remarcar horário (T-R01..T-R08). Falha sem 20261003150000; passa depois.
-- T-R09 (concorrência) vive em scripts/test-sql-reschedule.sh (2 conexões).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

CREATE TEMP TABLE results (name text, got text, expected text);
CREATE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_name, p_got, p_expected);
$$;

CREATE FUNCTION pg_temp.try(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RETURN 'ok';
EXCEPTION WHEN OTHERS THEN
  RETURN 'error:' || SQLERRM;
END $$;

CREATE FUNCTION pg_temp.reschedule(p_id uuid, p_time timestamptz, p_pro uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_msg text;
  v_hint text;
  v_json json;
BEGIN
  v_json := public.reschedule_appointment(p_id, p_time, p_pro);
  RETURN 'ok:' || COALESCE(v_json->>'success', 'null');
EXCEPTION WHEN undefined_function THEN
  RETURN 'error:missing_rpc';
WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT, v_hint = PG_EXCEPTION_HINT;
  RETURN 'error:' || COALESCE(NULLIF(v_hint, ''), 'nohint') || '|' || v_msg;
END $$;

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

CREATE FUNCTION pg_temp.at_l(p_day date, p_hm text) RETURNS timestamptz LANGUAGE sql AS $$
  SELECT (p_day::text || ' ' || p_hm)::timestamp AT TIME ZONE 'Europe/Lisbon'
$$;

\set OWNER '00000000-0000-0000-0000-00000000000a'
\set STAFF '00000000-0000-0000-0000-00000000001a'
\set STAFF2 '00000000-0000-0000-0000-00000000002a'
\set PRO1 '10000000-0000-0000-0000-000000000001'
\set PRO2 '10000000-0000-0000-0000-000000000002'
\set PRO_INACT '10000000-0000-0000-0000-000000000099'
\set CLIENT '30000000-0000-0000-0000-000000000001'
\set SVC '20000000-0000-0000-0000-000000000001'
\set APT1 '50000000-0000-0000-0000-000000000001'
\set APT2 '50000000-0000-0000-0000-000000000002'
\set APT3 '50000000-0000-0000-0000-000000000003'
\set APT_OWN '50000000-0000-0000-0000-000000000004'
\set APT_OTHER '50000000-0000-0000-0000-000000000005'
\set APT_DONE '50000000-0000-0000-0000-000000000006'
\set APT_PB '50000000-0000-0000-0000-000000000007'
\set APT_NOPRO '50000000-0000-0000-0000-000000000008'
\set PB1 '70000000-0000-0000-0000-000000000001'

CREATE TEMP TABLE ctx AS SELECT (current_date + 14)::date AS d;

INSERT INTO public.profiles (id, role, company_id, region) VALUES
  (:'OWNER', 'owner', NULL, 'PT'),
  (:'STAFF', 'staff', :'OWNER', 'PT'),
  (:'STAFF2', 'staff', :'OWNER', 'PT')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, company_id = EXCLUDED.company_id, region = 'PT';

INSERT INTO public.business_settings (user_id, timezone, staff_can_block_agenda, staff_appointment_edit_scope)
VALUES (:'OWNER', 'Europe/Lisbon', true, 'none')
ON CONFLICT (user_id) DO UPDATE SET
  timezone = 'Europe/Lisbon',
  staff_can_block_agenda = true,
  staff_appointment_edit_scope = 'none';

INSERT INTO public.team_members (id, user_id, name, staff_user_id, active, is_owner) VALUES
  (:'PRO1', :'OWNER', 'Diego', NULL, true, true),
  (:'PRO2', :'OWNER', 'Bruna', :'STAFF', true, false),
  (:'PRO_INACT', :'OWNER', 'Inativo', NULL, false, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, staff_user_id = EXCLUDED.staff_user_id, active = EXCLUDED.active, deleted_at = NULL;

INSERT INTO public.services VALUES (:'SVC', :'OWNER', 'Corte', 45, 30) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.clients (id, user_id, name, phone) VALUES (:'CLIENT', :'OWNER', 'Aline', '351600000001')
ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, name = EXCLUDED.name;

SELECT pg_temp.check('rpc existe',
  COALESCE(to_regprocedure('public.reschedule_appointment(uuid,timestamptz,uuid)')::text, 'missing'),
  'reschedule_appointment(uuid,timestamp with time zone,uuid)');

SELECT pg_temp.check('tabela existe',
  COALESCE(to_regclass('public.appointment_reschedules')::text, 'missing'),
  'appointment_reschedules');

SELECT pg_temp.check('coluna source default staff',
  (SELECT COALESCE(column_default, 'missing') FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointment_reschedules' AND column_name = 'source'),
  '''staff''::text');

SELECT pg_temp.check('anon sem EXECUTE',
  COALESCE(has_function_privilege('anon', 'public.reschedule_appointment(uuid,timestamptz,uuid)', 'EXECUTE')::text, 'missing'),
  'false');
SELECT pg_temp.check('authenticated com EXECUTE',
  COALESCE(has_function_privilege('authenticated', 'public.reschedule_appointment(uuid,timestamptz,uuid)', 'EXECUTE')::text, 'missing'),
  'true');
SELECT pg_temp.check('authenticated sem INSERT no histórico',
  CASE WHEN to_regclass('public.appointment_reschedules') IS NULL THEN 'missing'
       ELSE has_table_privilege('authenticated', 'public.appointment_reschedules', 'INSERT')::text END,
  'false');
SELECT pg_temp.check('authenticated lê histórico',
  CASE WHEN to_regclass('public.appointment_reschedules') IS NULL THEN 'missing'
       ELSE has_table_privilege('authenticated', 'public.appointment_reschedules', 'SELECT')::text END,
  'true');

SELECT set_config('request.jwt.claim.sub', :'OWNER', false);
DELETE FROM public.appointment_reschedules;
DELETE FROM public.appointments;
DELETE FROM public.public_bookings;
DELETE FROM public.agenda_blocks;

INSERT INTO public.appointments (
  id, user_id, client_id, professional_id, service, appointment_time, status, duration_minutes, price, notes, payment_method, origin
) VALUES
  (:'APT1', :'OWNER', :'CLIENT', :'PRO1', 'Corte', pg_temp.at_l((SELECT d FROM ctx), '10:00'), 'Confirmed', 30, 45, 'obs', 'cash', 'agenda'),
  (:'APT2', :'OWNER', :'CLIENT', :'PRO1', 'Corte', pg_temp.at_l((SELECT d FROM ctx), '11:00'), 'Pending', 30, 45, NULL, NULL, 'agenda'),
  (:'APT3', :'OWNER', :'CLIENT', :'PRO1', 'Corte', pg_temp.at_l((SELECT d FROM ctx), '16:00'), 'Confirmed', 60, 80, NULL, NULL, 'agenda'),
  (:'APT_OWN', :'OWNER', :'CLIENT', :'PRO2', 'Corte', pg_temp.at_l((SELECT d FROM ctx), '09:00'), 'Confirmed', 30, 45, NULL, NULL, 'agenda'),
  (:'APT_OTHER', :'OWNER', :'CLIENT', :'PRO1', 'Corte', pg_temp.at_l((SELECT d FROM ctx), '09:30'), 'Confirmed', 30, 45, NULL, NULL, 'agenda'),
  (:'APT_DONE', :'OWNER', :'CLIENT', :'PRO1', 'Corte', pg_temp.at_l((SELECT d FROM ctx), '08:00'), 'Completed', 30, 45, NULL, NULL, 'agenda'),
  (:'APT_NOPRO', :'OWNER', :'CLIENT', NULL, 'Corte', pg_temp.at_l((SELECT d FROM ctx), '18:00'), 'Confirmed', 30, 45, NULL, NULL, 'agenda');

-- T-R01 status
SELECT pg_temp.check('T-R01 Completed recusa',
  pg_temp.reschedule(:'APT_DONE'::uuid, pg_temp.at_l((SELECT d FROM ctx), '12:00'), :'PRO1'::uuid),
  'error:reschedule_status_invalid|Só dá para remarcar atendimentos pendentes ou confirmados.');

UPDATE public.appointments SET status = 'Cancelled' WHERE id = :'APT_DONE';
SELECT pg_temp.check('T-R01 Cancelled recusa',
  pg_temp.reschedule(:'APT_DONE'::uuid, pg_temp.at_l((SELECT d FROM ctx), '12:00'), :'PRO1'::uuid),
  'error:reschedule_status_invalid|Só dá para remarcar atendimentos pendentes ou confirmados.');
UPDATE public.appointments SET status = 'NoShow' WHERE id = :'APT_DONE';
SELECT pg_temp.check('T-R01 NoShow recusa',
  pg_temp.reschedule(:'APT_DONE'::uuid, pg_temp.at_l((SELECT d FROM ctx), '12:00'), :'PRO1'::uuid),
  'error:reschedule_status_invalid|Só dá para remarcar atendimentos pendentes ou confirmados.');
UPDATE public.appointments SET status = 'Completed' WHERE id = :'APT_DONE';

-- T-R01 staff none
UPDATE public.business_settings SET staff_appointment_edit_scope = 'none' WHERE user_id = :'OWNER';
SELECT set_config('request.jwt.claim.sub', :'STAFF', false);
SELECT pg_temp.check('T-R01 staff none recusa',
  pg_temp.reschedule(:'APT_OWN'::uuid, pg_temp.at_l((SELECT d FROM ctx), '12:00'), :'PRO2'::uuid),
  'error:staff_appointment_edit_forbidden|Sua permissão não permite alterar este agendamento. Fale com o dono.');

-- T-R01 / C-R03 staff own: próprio ok, outro recusa, trocar profissional recusa
UPDATE public.business_settings SET staff_appointment_edit_scope = 'own' WHERE user_id = :'OWNER';
SELECT pg_temp.check('T-R01 staff own remarca o próprio',
  pg_temp.reschedule(:'APT_OWN'::uuid, pg_temp.at_l((SELECT d FROM ctx), '12:00'), :'PRO2'::uuid),
  'ok:true');
SELECT pg_temp.check('T-R01 staff own não remarca o de outro',
  pg_temp.reschedule(:'APT_OTHER'::uuid, pg_temp.at_l((SELECT d FROM ctx), '12:30'), :'PRO1'::uuid),
  'error:staff_appointment_edit_forbidden|Sua permissão não permite alterar este agendamento. Fale com o dono.');
-- volta o próprio para 09:00 e tenta trocar o profissional
SELECT set_config('request.jwt.claim.sub', :'OWNER', false);
SELECT pg_temp.reschedule(:'APT_OWN'::uuid, pg_temp.at_l((SELECT d FROM ctx), '09:00'), :'PRO2'::uuid);
SELECT set_config('request.jwt.claim.sub', :'STAFF', false);
SELECT pg_temp.check('C-R03 own não troca profissional',
  pg_temp.reschedule(:'APT_OWN'::uuid, pg_temp.at_l((SELECT d FROM ctx), '12:00'), :'PRO1'::uuid),
  'error:staff_appointment_edit_forbidden|Sua permissão não permite alterar este agendamento. Fale com o dono.');

-- T-R01 / C-R04 staff all
UPDATE public.business_settings SET staff_appointment_edit_scope = 'all' WHERE user_id = :'OWNER';
SELECT pg_temp.check('C-R04 staff all remarca o de outro',
  pg_temp.reschedule(:'APT_OTHER'::uuid, pg_temp.at_l((SELECT d FROM ctx), '13:00'), :'PRO1'::uuid),
  'ok:true');
SELECT pg_temp.check('C-R04 staff all troca profissional',
  pg_temp.reschedule(:'APT_OTHER'::uuid, pg_temp.at_l((SELECT d FROM ctx), '13:00'), :'PRO2'::uuid),
  'ok:true');
-- devolve APT_OTHER para Diego 09:30
SELECT set_config('request.jwt.claim.sub', :'OWNER', false);
SELECT pg_temp.reschedule(:'APT_OTHER'::uuid, pg_temp.at_l((SELECT d FROM ctx), '09:30'), :'PRO1'::uuid);
SELECT pg_temp.reschedule(:'APT_OWN'::uuid, pg_temp.at_l((SELECT d FROM ctx), '09:00'), :'PRO2'::uuid);

-- T-R02 mesmo id e campos preservados
SELECT pg_temp.check('T-R02 remarca horário livre',
  pg_temp.reschedule(:'APT1'::uuid, pg_temp.at_l((SELECT d FROM ctx), '14:00'), :'PRO1'::uuid),
  'ok:true');
SELECT pg_temp.check('T-R02 mesmo id',
  (SELECT id::text FROM public.appointments WHERE id = :'APT1'),
  :'APT1');
SELECT pg_temp.check('T-R02 cliente igual',
  (SELECT client_id::text FROM public.appointments WHERE id = :'APT1'),
  :'CLIENT');
SELECT pg_temp.check('T-R02 serviço igual',
  (SELECT service FROM public.appointments WHERE id = :'APT1'),
  'Corte');
SELECT pg_temp.check('T-R02 preço igual',
  (SELECT price::text FROM public.appointments WHERE id = :'APT1'),
  '45');
SELECT pg_temp.check('T-R02 duração igual',
  (SELECT duration_minutes::text FROM public.appointments WHERE id = :'APT1'),
  '30');
SELECT pg_temp.check('T-R02 notas iguais',
  (SELECT notes FROM public.appointments WHERE id = :'APT1'),
  'obs');
SELECT pg_temp.check('T-R02 pagamento igual',
  (SELECT payment_method FROM public.appointments WHERE id = :'APT1'),
  'cash');
SELECT pg_temp.check('T-R02 origem igual',
  (SELECT origin FROM public.appointments WHERE id = :'APT1'),
  'agenda');
SELECT pg_temp.check('T-R02 horário novo',
  (SELECT appointment_time = pg_temp.at_l((SELECT d FROM ctx), '14:00') FROM public.appointments WHERE id = :'APT1')::text,
  'true');
SELECT pg_temp.check('T-R02 edited_at preenchido',
  (SELECT (edited_at IS NOT NULL)::text FROM public.appointments WHERE id = :'APT1'),
  'true');

-- T-R03 conflito com outro; próprio 14:00→14:15 60 min não conta
INSERT INTO public.appointments (
  id, user_id, client_id, professional_id, service, appointment_time, status, duration_minutes, price
) VALUES (
  '50000000-0000-0000-0000-0000000000c1', :'OWNER', :'CLIENT', :'PRO1', 'Corte',
  pg_temp.at_l((SELECT d FROM ctx), '15:00'), 'Confirmed', 30, 45
);
SELECT pg_temp.check('T-R03 conflito com outro',
  pg_temp.reschedule(:'APT1'::uuid, pg_temp.at_l((SELECT d FROM ctx), '15:00'), :'PRO1'::uuid),
  'error:reschedule_slot_busy|Esse horário já está ocupado na agenda de Diego. Escolha outro.');
UPDATE public.appointments SET duration_minutes = 60, appointment_time = pg_temp.at_l((SELECT d FROM ctx), '14:00') WHERE id = :'APT1';
SELECT pg_temp.check('T-R03 próprio 14:00→14:15 60min ok',
  pg_temp.reschedule(:'APT1'::uuid, pg_temp.at_l((SELECT d FROM ctx), '14:15'), :'PRO1'::uuid),
  'ok:true');
UPDATE public.appointments SET duration_minutes = 30, appointment_time = pg_temp.at_l((SELECT d FROM ctx), '14:00') WHERE id = :'APT1';

-- pedido pending no mesmo profissional segura o horário
INSERT INTO public.public_bookings (
  id, business_id, customer_name, customer_phone, service_ids, professional_id, appointment_time, total_price, status, duration_minutes
) VALUES (
  '70000000-0000-0000-0000-0000000000c2', :'OWNER', 'Carla', '351600000099', ARRAY[:'SVC']::uuid[],
  :'PRO1', pg_temp.at_l((SELECT d FROM ctx), '17:00'), 45, 'pending', 30
);
SELECT pg_temp.check('T-R03 conflito com pedido pending',
  pg_temp.reschedule(:'APT2'::uuid, pg_temp.at_l((SELECT d FROM ctx), '17:00'), :'PRO1'::uuid),
  'error:reschedule_slot_busy|Esse horário já está ocupado na agenda de Diego. Escolha outro.');

-- T-R04 bloqueio (M1); nada muda
SELECT public.create_agenda_block(
  :'PRO1'::uuid,
  pg_temp.at_l((SELECT d FROM ctx) + 1, '10:00'),
  pg_temp.at_l((SELECT d FROM ctx) + 1, '12:00'),
  true,
  ARRAY[]::uuid[]
);
SELECT pg_temp.check('T-R04 bloqueio M1',
  pg_temp.reschedule(:'APT1'::uuid, pg_temp.at_l((SELECT d FROM ctx) + 1, '10:30'), :'PRO1'::uuid),
  'error:professional_blocked|Horário bloqueado na agenda de Diego. Para agendar, remova o bloqueio primeiro.');
SELECT pg_temp.check('T-R04 nada muda no bloqueio',
  (SELECT appointment_time = pg_temp.at_l((SELECT d FROM ctx), '14:00') FROM public.appointments WHERE id = :'APT1')::text,
  'true');

-- T-R05 passado, sem mudança, profissional inativo
SELECT pg_temp.check('T-R05 passado dono',
  pg_temp.reschedule(:'APT1'::uuid, now() - interval '3 hours', :'PRO1'::uuid),
  'ok:true');
SELECT pg_temp.check('T-R05 sem mudança',
  pg_temp.reschedule(:'APT2'::uuid, pg_temp.at_l((SELECT d FROM ctx), '11:00'), :'PRO1'::uuid),
  'error:reschedule_unchanged|Escolha um horário ou profissional diferente do atual.');
SELECT pg_temp.check('T-R05 profissional inativo',
  pg_temp.reschedule(:'APT2'::uuid, pg_temp.at_l((SELECT d FROM ctx), '12:00'), :'PRO_INACT'::uuid),
  'error:reschedule_professional_unavailable|Esse profissional não está disponível para agendamentos.');
SELECT pg_temp.check('T-R05 sem profissional exige escolher',
  pg_temp.reschedule(:'APT_NOPRO'::uuid, pg_temp.at_l((SELECT d FROM ctx), '18:30'), NULL),
  'error:reschedule_professional_unavailable|Esse profissional não está disponível para agendamentos.');
SELECT pg_temp.check('T-R05 sem profissional escolhe um',
  pg_temp.reschedule(:'APT_NOPRO'::uuid, pg_temp.at_l((SELECT d FROM ctx), '18:30'), :'PRO2'::uuid),
  'ok:true');

UPDATE public.business_settings SET staff_appointment_edit_scope = 'all' WHERE user_id = :'OWNER';
SELECT set_config('request.jwt.claim.sub', :'STAFF', false);
SELECT pg_temp.check('T-R05 passado colaborador',
  pg_temp.reschedule(:'APT2'::uuid, now() - interval '90 minutes', :'PRO1'::uuid),
  'ok:true');

-- T-R06 sync pedido online
SELECT set_config('request.jwt.claim.sub', :'OWNER', false);
INSERT INTO public.public_bookings (
  id, business_id, customer_name, customer_phone, service_ids, professional_id, appointment_time, total_price, status, duration_minutes
) VALUES (
  :'PB1', :'OWNER', 'Aline', '351600000001', ARRAY[:'SVC']::uuid[],
  :'PRO1', pg_temp.at_l((SELECT d FROM ctx) + 2, '10:00'), 45, 'confirmed', 30
);
INSERT INTO public.appointments (
  id, user_id, client_id, professional_id, service, appointment_time, status, duration_minutes, price, public_booking_id
) VALUES (
  :'APT_PB', :'OWNER', :'CLIENT', :'PRO1', 'Corte', pg_temp.at_l((SELECT d FROM ctx) + 2, '10:00'), 'Confirmed', 30, 45, :'PB1'
);
SELECT pg_temp.check('T-R06 remarca pedido ligado',
  pg_temp.reschedule(:'APT_PB'::uuid, pg_temp.at_l((SELECT d FROM ctx) + 2, '11:30'), :'PRO2'::uuid),
  'ok:true');
SELECT pg_temp.check('T-R06 pedido horário novo',
  (SELECT appointment_time = pg_temp.at_l((SELECT d FROM ctx) + 2, '11:30') FROM public.public_bookings WHERE id = :'PB1')::text,
  'true');
SELECT pg_temp.check('T-R06 pedido profissional novo',
  (SELECT professional_id::text FROM public.public_bookings WHERE id = :'PB1'),
  :'PRO2');
SELECT pg_temp.check('T-R06 original_appointment_time',
  (SELECT original_appointment_time = pg_temp.at_l((SELECT d FROM ctx) + 2, '10:00') FROM public.public_bookings WHERE id = :'PB1')::text,
  'true');
SELECT pg_temp.check('T-R06 status continua confirmed',
  (SELECT status FROM public.public_bookings WHERE id = :'PB1'),
  'confirmed');
SELECT pg_temp.check('T-R06 cliente vê horário novo',
  (SELECT appointment_time = pg_temp.at_l((SELECT d FROM ctx) + 2, '11:30')
     FROM public.get_client_bookings_history('351600000001', :'OWNER'::uuid)
    WHERE id = :'PB1')::text,
  'true');
SELECT pg_temp.check('T-R06 horário antigo livre',
  public.public_booking_slot_busy(:'OWNER', pg_temp.at_l((SELECT d FROM ctx) + 2, '10:00'), 30, :'PRO1'::uuid)::text,
  'false');

-- T-R07 histórico
SELECT pg_temp.check('T-R07 uma linha por remarcação do pedido',
  (SELECT count(*)::text FROM public.appointment_reschedules WHERE appointment_id = :'APT_PB'),
  '1');
SELECT pg_temp.check('T-R07 source staff',
  (SELECT source FROM public.appointment_reschedules WHERE appointment_id = :'APT_PB'),
  'staff');
SELECT pg_temp.check('T-R07 quem fez',
  (SELECT created_by::text FROM public.appointment_reschedules WHERE appointment_id = :'APT_PB'),
  :'OWNER');
SELECT pg_temp.check('T-R07 profissional antigo/novo',
  (SELECT old_professional_id::text || '>' || new_professional_id::text FROM public.appointment_reschedules WHERE appointment_id = :'APT_PB'),
  :'PRO1' || '>' || :'PRO2');

-- T-R08 atomicidade: falha no histórico não muda o agendamento
CREATE FUNCTION pg_temp.fail_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.fail_reschedule_history', true) = '1' THEN
    RAISE EXCEPTION 'forced_history_fail';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS appointment_reschedules_fail_history ON public.appointment_reschedules;
CREATE TRIGGER appointment_reschedules_fail_history
  BEFORE INSERT ON public.appointment_reschedules
  FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_history();

SELECT set_config('app.fail_reschedule_history', '1', false);
SELECT pg_temp.check('T-R08 histórico falha',
  pg_temp.reschedule(:'APT3'::uuid, pg_temp.at_l((SELECT d FROM ctx), '19:00'), :'PRO1'::uuid),
  'error:nohint|forced_history_fail');
SELECT pg_temp.check('T-R08 horário intacto',
  (SELECT appointment_time = pg_temp.at_l((SELECT d FROM ctx), '16:00') FROM public.appointments WHERE id = :'APT3')::text,
  'true');
SELECT set_config('app.fail_reschedule_history', '0', false);
DROP TRIGGER IF EXISTS appointment_reschedules_fail_history ON public.appointment_reschedules;

-- staff lê o histórico da empresa
SELECT pg_temp.check('T-R07 staff lê histórico',
  pg_temp.run_as('authenticated', :'STAFF', $q$SELECT count(*)::text FROM public.appointment_reschedules$q$),
  (SELECT count(*)::text FROM public.appointment_reschedules));

\o
SELECT name, CASE WHEN got IS NOT DISTINCT FROM expected THEN 'ok' ELSE 'FAIL' END AS status, got, expected
FROM results ORDER BY name;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM results WHERE got IS DISTINCT FROM expected) THEN
    RAISE EXCEPTION 'reschedule_appointment tests failed';
  END IF;
END $$;
