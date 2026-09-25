-- Testes: falta (NoShow) libera o horário. Rodar após harness + baseline
-- (+ migration). Uso: scripts/test-sql-noshow-slots.sh
\set ON_ERROR_STOP on
\set QUIET on

-- Dados ------------------------------------------------------------------------
-- Empresa L (Europe/Lisbon) e S (America/Sao_Paulo). Dia D = hoje + 14 (aberto
-- 09:00–18:00 todos os dias); D2 = D + 1 tem só o bloco 10:00–10:30.
CREATE TEMP TABLE ctx AS SELECT (current_date + 14)::date AS d, (current_date + 15)::date AS d2;
GRANT SELECT ON ctx TO PUBLIC;

INSERT INTO public.profiles (id, role, company_id, region) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'owner', NULL, 'PT'),
  ('00000000-0000-0000-0000-00000000001a', 'staff', '00000000-0000-0000-0000-00000000000a', 'PT'),
  ('00000000-0000-0000-0000-00000000000b', 'owner', NULL, 'BR');

DO $$
DECLARE v_hours jsonb := '{}'::jsonb; v_day text; v_d2 text;
BEGIN
  FOREACH v_day IN ARRAY ARRAY['sun','mon','tue','wed','thu','fri','sat'] LOOP
    v_hours := v_hours || jsonb_build_object(v_day, '{"isOpen": true, "blocks": [{"start": "09:00", "end": "18:00"}]}'::jsonb);
  END LOOP;
  v_d2 := (ARRAY['sun','mon','tue','wed','thu','fri','sat'])[extract(dow from (SELECT d2 FROM ctx))::int + 1];
  v_hours := v_hours || jsonb_build_object(v_d2, '{"isOpen": true, "blocks": [{"start": "10:00", "end": "10:30"}]}'::jsonb);
  INSERT INTO public.business_settings (user_id, business_hours, timezone) VALUES
    ('00000000-0000-0000-0000-00000000000a', v_hours, 'Europe/Lisbon'),
    ('00000000-0000-0000-0000-00000000000b', v_hours, 'America/Sao_Paulo');
END $$;

INSERT INTO public.team_members (id, user_id, name, staff_user_id) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'P1', NULL),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'P2', '00000000-0000-0000-0000-00000000001a'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'PB', NULL);
INSERT INTO public.services VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Corte', 45, 30);
INSERT INTO public.clients VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Aline', '351600000001'),
  ('30000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Bia', '5511900000001');

-- hora local -> instante
CREATE FUNCTION pg_temp.at_l(p_day date, p_hm text) RETURNS timestamptz LANGUAGE sql AS $$ SELECT (p_day::text || ' ' || p_hm)::timestamp AT TIME ZONE 'Europe/Lisbon' $$;
CREATE FUNCTION pg_temp.at_s(p_day date, p_hm text) RETURNS timestamptz LANGUAGE sql AS $$ SELECT (p_day::text || ' ' || p_hm)::timestamp AT TIME ZONE 'America/Sao_Paulo' $$;

-- Agendamentos do P1 no dia D (hora de Lisboa)
INSERT INTO public.appointments (id, user_id, client_id, professional_id, appointment_time, status, updated_at)
SELECT v.id::uuid, '00000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-000000000001', v.pro::uuid, pg_temp.at_l(d, v.hm), v.st, '2026-01-01 00:00+00'
FROM ctx, (VALUES
  ('40000000-0000-0000-0000-000000001000', '10000000-0000-0000-0000-000000000001', '10:00', 'NoShow'),
  ('40000000-0000-0000-0000-000000001100', '10000000-0000-0000-0000-000000000001', '11:00', 'Confirmed'),
  ('40000000-0000-0000-0000-000000001200', '10000000-0000-0000-0000-000000000001', '12:00', 'Pending'),
  ('40000000-0000-0000-0000-000000001300', '10000000-0000-0000-0000-000000000001', '13:00', 'Completed'),
  ('40000000-0000-0000-0000-000000001400', '10000000-0000-0000-0000-000000000001', '14:00', 'Cancelled'),
  ('40000000-0000-0000-0000-000000001600', '10000000-0000-0000-0000-000000000001', '16:00', 'NoShow'),
  ('40000000-0000-0000-0000-000000001630', '10000000-0000-0000-0000-000000000001', '16:30', 'Confirmed'),
  ('40000000-0000-0000-0000-000000000930', '10000000-0000-0000-0000-000000000001', '09:30', 'Cancelled'),
  ('40000000-0000-0000-0000-000000000900', '10000000-0000-0000-0000-000000000001', '09:00', 'NoShow')
) AS v(id, pro, hm, st);
-- Pedidos online (public_bookings) no dia D
INSERT INTO public.public_bookings (business_id, professional_id, appointment_time, status)
SELECT '00000000-0000-0000-0000-00000000000a', v.pro::uuid, pg_temp.at_l(d, v.hm), v.st
FROM ctx, (VALUES
  ('10000000-0000-0000-0000-000000000001', '15:00', 'pending'),    -- pendente: bloqueia sempre
  ('10000000-0000-0000-0000-000000000001', '16:00', 'confirmed'),  -- aceito -> agendamento virou NoShow
  ('10000000-0000-0000-0000-000000000001', '16:30', 'confirmed'),  -- aceito -> agendamento ativo
  ('10000000-0000-0000-0000-000000000001', '17:00', 'confirmed'),  -- legado sem agendamento: bloqueia
  ('10000000-0000-0000-0000-000000000001', '09:30', 'confirmed'),  -- aceito -> agendamento Cancelled
  (NULL,                                   '09:00', 'confirmed')   -- sem profissional -> agendamento NoShow do P1
) AS v(pro, hm, st);
-- D2: só 10:00–10:30. P1 tem NoShow às 10:00; P2 tem Confirmed às 10:00.
INSERT INTO public.appointments (user_id, client_id, professional_id, appointment_time, status)
SELECT '00000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-000000000001', v.pro::uuid, pg_temp.at_l(d2, '10:00'), v.st
FROM ctx, (VALUES ('10000000-0000-0000-0000-000000000001', 'NoShow'), ('10000000-0000-0000-0000-000000000002', 'Confirmed')) AS v(pro, st);
-- Empresa S (São Paulo): Confirmed 10:00 e NoShow 11:00 (hora de SP)
INSERT INTO public.appointments (user_id, client_id, professional_id, appointment_time, status)
SELECT '00000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', pg_temp.at_s(d, v.hm), v.st
FROM ctx, (VALUES ('10:00', 'Confirmed'), ('11:00', 'NoShow')) AS v(hm, st);

-- Falta marcada DEPOIS do horário (caso real: cliente das 14:00 não veio, marcado às 14:15):
-- P2 hoje, NoShow começou há 20 min; Confirmed 30 min depois do início da falta.
INSERT INTO public.clients VALUES ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Carla', '351600000002');
CREATE TEMP TABLE past_slot AS SELECT date_trunc('minute', now() - interval '20 minutes') AS t;
GRANT SELECT ON past_slot TO PUBLIC;
INSERT INTO public.appointments (id, user_id, client_id, professional_id, appointment_time, status, updated_at)
SELECT v.id::uuid, '00000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', t + v.off, v.st, '2026-01-01 00:00+00'
FROM past_slot, (VALUES
  ('40000000-0000-0000-0000-00000000a000', interval '0 minutes', 'NoShow'),
  ('40000000-0000-0000-0000-00000000a030', interval '30 minutes', 'Confirmed')
) AS v(id, off, st);

CREATE TEMP TABLE noshow_before AS SELECT id, status, updated_at, appointment_time FROM public.appointments WHERE status = 'NoShow';

-- Helpers ------------------------------------------------------------------------
CREATE FUNCTION pg_temp.slots(p_biz text, p_day date, p_pro text, p_is_pro boolean DEFAULT false) RETURNS text[] LANGUAGE sql AS $$
  SELECT ARRAY(SELECT json_array_elements_text(public.get_available_slots(p_biz::uuid, p_day, p_pro::uuid, 30, p_is_pro)->'slots'))
$$;
CREATE FUNCTION pg_temp.has(p_arr text[], p_hm text) RETURNS text LANGUAGE sql AS $$ SELECT CASE WHEN p_hm = ANY(p_arr) THEN 'free' ELSE 'busy' END $$;
-- Executa como papel (anon/authenticated) com sub no JWT; devolve texto do resultado ou erro
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
GRANT EXECUTE ON FUNCTION pg_temp.run_as(text, text, text) TO PUBLIC;

CREATE TEMP TABLE results (name text, got text, expected text);
CREATE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$ INSERT INTO results VALUES (p_name, p_got, p_expected) $$;

\set L '''00000000-0000-0000-0000-00000000000a'''
\set S '''00000000-0000-0000-0000-00000000000b'''
\set P1 '''10000000-0000-0000-0000-000000000001'''
\set P2 '''10000000-0000-0000-0000-000000000002'''
\set STAFF '''00000000-0000-0000-0000-00000000001a'''

\o /dev/null
-- get_available_slots (booking online; hora local de Lisboa) -----------------------
SELECT pg_temp.check('online P1: NoShow 10:00 -> free', pg_temp.has(pg_temp.slots(:L, d, :P1), '10:00'), 'free') FROM ctx;
SELECT pg_temp.check('online P1: Confirmed 11:00 -> busy', pg_temp.has(pg_temp.slots(:L, d, :P1), '11:00'), 'busy') FROM ctx;
SELECT pg_temp.check('online P1: Pending 12:00 -> busy', pg_temp.has(pg_temp.slots(:L, d, :P1), '12:00'), 'busy') FROM ctx;
SELECT pg_temp.check('online P1: Completed 13:00 -> busy', pg_temp.has(pg_temp.slots(:L, d, :P1), '13:00'), 'busy') FROM ctx;
SELECT pg_temp.check('online P1: Cancelled 14:00 -> free', pg_temp.has(pg_temp.slots(:L, d, :P1), '14:00'), 'free') FROM ctx;
SELECT pg_temp.check('online P1: pending request 15:00 -> busy', pg_temp.has(pg_temp.slots(:L, d, :P1), '15:00'), 'busy') FROM ctx;
SELECT pg_temp.check('online P1: confirmed request whose appt is NoShow 16:00 -> free', pg_temp.has(pg_temp.slots(:L, d, :P1), '16:00'), 'free') FROM ctx;
SELECT pg_temp.check('online P1: confirmed request whose appt is active 16:30 -> busy', pg_temp.has(pg_temp.slots(:L, d, :P1), '16:30'), 'busy') FROM ctx;
SELECT pg_temp.check('online P1: confirmed request without appt (legacy) 17:00 -> busy', pg_temp.has(pg_temp.slots(:L, d, :P1), '17:00'), 'busy') FROM ctx;
SELECT pg_temp.check('online P1: confirmed request whose appt is Cancelled 09:30 -> free', pg_temp.has(pg_temp.slots(:L, d, :P1), '09:30'), 'free') FROM ctx;
SELECT pg_temp.check('online any-pro: NoShow 10:00 -> free', pg_temp.has(pg_temp.slots(:L, d, NULL), '10:00'), 'free') FROM ctx;
SELECT pg_temp.check('online any-pro: pro-less confirmed request + NoShow 09:00 -> free', pg_temp.has(pg_temp.slots(:L, d, NULL), '09:00'), 'free') FROM ctx;
SELECT pg_temp.check('online any-pro: Confirmed 11:00 -> busy', pg_temp.has(pg_temp.slots(:L, d, NULL), '11:00'), 'busy') FROM ctx;
SELECT pg_temp.check('online P2 (no appts): 11:00 free (isolation by pro)', pg_temp.has(pg_temp.slots(:L, d, :P2), '11:00'), 'free') FROM ctx;
SELECT pg_temp.check('professional mode (p_is_professional): NoShow 10:00 -> free', pg_temp.has(pg_temp.slots(:L, d, :P1, true), '10:00'), 'free') FROM ctx;
SELECT pg_temp.check('professional mode: Confirmed 11:00 -> busy', pg_temp.has(pg_temp.slots(:L, d, :P1, true), '11:00'), 'busy') FROM ctx;
SELECT pg_temp.check('timezone #93 (São Paulo): Confirmed 10:00 SP -> busy', pg_temp.has(pg_temp.slots(:S, d, NULL), '10:00'), 'busy') FROM ctx;
SELECT pg_temp.check('timezone #93 (São Paulo): NoShow 11:00 SP -> free', pg_temp.has(pg_temp.slots(:S, d, NULL), '11:00'), 'free') FROM ctx;

-- get_full_dates (calendário do booking online) ---------------------------------
SELECT pg_temp.check('full dates P1: D2 only slot is a NoShow -> not full', (SELECT array_length(public.get_full_dates(:L::uuid, d2, d2, :P1::uuid, 30), 1))::text, NULL) FROM ctx;
SELECT pg_temp.check('full dates P2: D2 only slot is Confirmed -> full', (SELECT array_length(public.get_full_dates(:L::uuid, d2, d2, :P2::uuid, 30), 1))::text, '1') FROM ctx;

-- public_booking_slot_busy (checagem atômica) -------------------------------------
SELECT pg_temp.check('slot_busy P1 10:00 NoShow -> false', public.public_booking_slot_busy(:L, pg_temp.at_l(d, '10:00'), 30, :P1::uuid)::text, 'false') FROM ctx;
SELECT pg_temp.check('slot_busy P1 11:00 Confirmed -> true', public.public_booking_slot_busy(:L, pg_temp.at_l(d, '11:00'), 30, :P1::uuid)::text, 'true') FROM ctx;
SELECT pg_temp.check('slot_busy P1 13:00 Completed -> true', public.public_booking_slot_busy(:L, pg_temp.at_l(d, '13:00'), 30, :P1::uuid)::text, 'true') FROM ctx;
SELECT pg_temp.check('slot_busy P1 14:00 Cancelled -> false', public.public_booking_slot_busy(:L, pg_temp.at_l(d, '14:00'), 30, :P1::uuid)::text, 'false') FROM ctx;
SELECT pg_temp.check('slot_busy P1 16:00 confirmed request + NoShow -> false', public.public_booking_slot_busy(:L, pg_temp.at_l(d, '16:00'), 30, :P1::uuid)::text, 'false') FROM ctx;
SELECT pg_temp.check('slot_busy P1 17:00 legacy confirmed request -> true', public.public_booking_slot_busy(:L, pg_temp.at_l(d, '17:00'), 30, :P1::uuid)::text, 'true') FROM ctx;
SELECT pg_temp.check('slot_busy any-pro 11:00 -> true', public.public_booking_slot_busy(:L, pg_temp.at_l(d, '11:00'), 30, NULL)::text, 'true') FROM ctx;

-- create_public_booking como anon (booking online real) ------------------------
SELECT pg_temp.check('anon create_public_booking P1 at NoShow 10:00 -> booked',
  pg_temp.run_as('anon', NULL, format($q$SELECT status FROM public.create_public_booking(%L, 'Cliente Novo', '351600000009', ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], %L::uuid, %L::timestamptz, 45, 30)$q$, :L, :P1, pg_temp.at_l(d, '10:00'))), 'pending') FROM ctx;
SELECT pg_temp.check('anon create_public_booking P1 at Confirmed 11:00 -> slot_unavailable',
  pg_temp.run_as('anon', NULL, format($q$SELECT status FROM public.create_public_booking(%L, 'Cliente Novo', '351600000009', ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], %L::uuid, %L::timestamptz, 45, 30)$q$, :L, :P1, pg_temp.at_l(d, '11:00'))), 'error:slot_unavailable') FROM ctx;
SELECT pg_temp.check('the new online request now blocks 10:00 again', pg_temp.has(pg_temp.slots(:L, d, :P1), '10:00'), 'busy') FROM ctx;

-- create_secure_booking (agenda interna: dono e colaborador) -------------------
SELECT pg_temp.check('owner wizard: new appt at NoShow 16:00 -> success',
  pg_temp.run_as('authenticated', :L, format($q$SELECT (public.create_secure_booking(%L::uuid, %L::uuid, 'Aline', NULL, NULL, %L::timestamptz, ARRAY['20000000-0000-0000-0000-000000000001'], 45, 30, 'Confirmed', '30000000-0000-0000-0000-000000000001'::uuid, 'Reagendamento'))->>'success'$q$, :L, :P1, pg_temp.at_l(d, '16:00'))), 'true') FROM ctx;
SELECT pg_temp.check('owner wizard: new appt at Confirmed 11:00 -> refused',
  pg_temp.run_as('authenticated', :L, format($q$SELECT (public.create_secure_booking(%L::uuid, %L::uuid, 'Aline', NULL, NULL, %L::timestamptz, ARRAY['20000000-0000-0000-0000-000000000001'], 45, 30, 'Confirmed', '30000000-0000-0000-0000-000000000001'::uuid))->>'success'$q$, :L, :P1, pg_temp.at_l(d, '11:00'))), 'false') FROM ctx;
SELECT pg_temp.check('owner wizard: new appt at Completed 13:00 -> refused',
  pg_temp.run_as('authenticated', :L, format($q$SELECT (public.create_secure_booking(%L::uuid, %L::uuid, 'Aline', NULL, NULL, %L::timestamptz, ARRAY['20000000-0000-0000-0000-000000000001'], 45, 30, 'Confirmed', '30000000-0000-0000-0000-000000000001'::uuid))->>'success'$q$, :L, :P1, pg_temp.at_l(d, '13:00'))), 'false') FROM ctx;
SELECT pg_temp.check('staff wizard: new appt at NoShow 09:00 (pro-less confirmed request) -> success',
  pg_temp.run_as('authenticated', :STAFF, format($q$SELECT (public.create_secure_booking(%L::uuid, %L::uuid, 'Aline', NULL, NULL, %L::timestamptz, ARRAY['20000000-0000-0000-0000-000000000001'], 45, 30, 'Confirmed', '30000000-0000-0000-0000-000000000001'::uuid))->>'success'$q$, :L, :P1, pg_temp.at_l(d, '09:00'))), 'true') FROM ctx;
SELECT pg_temp.check('staff wizard: new appt at Cancelled 14:00 -> success (as before)',
  pg_temp.run_as('authenticated', :STAFF, format($q$SELECT (public.create_secure_booking(%L::uuid, %L::uuid, 'Aline', NULL, NULL, %L::timestamptz, ARRAY['20000000-0000-0000-0000-000000000001'], 45, 30, 'Confirmed', '30000000-0000-0000-0000-000000000001'::uuid))->>'success'$q$, :L, :P1, pg_temp.at_l(d, '14:00'))), 'true') FROM ctx;
SELECT pg_temp.check('other tenant cannot book into L', left(pg_temp.run_as('authenticated', :S, format($q$SELECT (public.create_secure_booking(%L::uuid, %L::uuid, 'X', NULL, NULL, %L::timestamptz, ARRAY[]::text[], 0, 30, 'Confirmed', NULL))->>'success'$q$, :L, :P1, pg_temp.at_l(d, '10:00'))), 6), 'error:') FROM ctx;
SELECT pg_temp.check('rebooked NoShow slot 16:00 is busy again', pg_temp.has(pg_temp.slots(:L, d, :P1), '16:00'), 'busy') FROM ctx;

-- Reaproveitar horário de falta já passado (mesmo dia), outro cliente ----------------
SELECT pg_temp.check('past NoShow slot: 60-min service overlapping next appt -> refused',
  pg_temp.run_as('authenticated', :STAFF, format($q$SELECT (public.create_secure_booking(%L::uuid, %L::uuid, 'Carla', NULL, NULL, %L::timestamptz, ARRAY['20000000-0000-0000-0000-000000000001'], 70, 60, 'Confirmed', '30000000-0000-0000-0000-000000000002'::uuid))->>'message'$q$, :L, :P2, t)), 'Desculpe, este horário acabou de ser ocupado. Por favor, escolha outro.') FROM past_slot;
SELECT pg_temp.check('past NoShow slot (started 20 min ago): staff books a DIFFERENT client -> success',
  pg_temp.run_as('authenticated', :STAFF, format($q$SELECT (public.create_secure_booking(%L::uuid, %L::uuid, 'Carla', NULL, NULL, %L::timestamptz, ARRAY['20000000-0000-0000-0000-000000000001'], 45, 30, 'Confirmed', '30000000-0000-0000-0000-000000000002'::uuid))->>'success'$q$, :L, :P2, t)), 'true') FROM past_slot;
SELECT pg_temp.check('past NoShow slot: new row is Carla at the NoShow start, NoShow row kept',
  (SELECT string_agg(c.name || ':' || a.status, ',' ORDER BY a.status) FROM public.appointments a JOIN public.clients c ON c.id = a.client_id, past_slot
    WHERE a.professional_id = '10000000-0000-0000-0000-000000000002' AND a.appointment_time = past_slot.t), 'Carla:Confirmed,Aline:NoShow');

-- As faltas nunca são tocadas ----------------------------------------------------
SELECT pg_temp.check('NoShow rows unchanged (status, updated_at, time)',
  (SELECT count(*)::text FROM noshow_before nb JOIN public.appointments a USING (id) WHERE a.status = nb.status AND a.updated_at = nb.updated_at AND a.appointment_time = nb.appointment_time),
  (SELECT count(*)::text FROM noshow_before));
SELECT pg_temp.check('new appointments created as new rows (2 at the NoShow slots)',
  (SELECT count(*)::text FROM public.appointments a, ctx WHERE a.status = 'Confirmed' AND a.appointment_time IN (pg_temp.at_l(d, '16:00'), pg_temp.at_l(d, '09:00')) AND a.id NOT IN (SELECT id FROM noshow_before) AND a.id <> '40000000-0000-0000-0000-000000001630'), '2');

-- ACL / auxiliar -------------------------------------------------------------------
SELECT pg_temp.check('anon cannot call confirmed_booking_slot_released',
  (SELECT CASE WHEN to_regprocedure('public.confirmed_booking_slot_released(text,timestamptz,uuid)') IS NULL THEN 'missing'
               WHEN has_function_privilege('anon', 'public.confirmed_booking_slot_released(text,timestamptz,uuid)', 'EXECUTE') THEN 'yes' ELSE 'no' END), 'no');
SELECT pg_temp.check('authenticated cannot call confirmed_booking_slot_released',
  (SELECT CASE WHEN to_regprocedure('public.confirmed_booking_slot_released(text,timestamptz,uuid)') IS NULL THEN 'missing'
               WHEN has_function_privilege('authenticated', 'public.confirmed_booking_slot_released(text,timestamptz,uuid)', 'EXECUTE') THEN 'yes' ELSE 'no' END), 'no');
SELECT pg_temp.check('anon still cannot call public_booking_slot_busy (prod ACL kept)',
  has_function_privilege('anon', 'public.public_booking_slot_busy(text,timestamptz,integer,uuid)', 'EXECUTE')::text, 'false');
SELECT pg_temp.check('anon still can call get_available_slots (prod ACL kept)',
  has_function_privilege('anon', 'public.get_available_slots(uuid,date,uuid,integer,boolean)', 'EXECUTE')::text, 'true');
SELECT pg_temp.check('anon still cannot call create_secure_booking (prod ACL kept)',
  has_function_privilege('anon', 'public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text)', 'EXECUTE')::text, 'false');
SELECT pg_temp.check('authenticated still can call create_secure_booking (staff/owner wizard)',
  has_function_privilege('authenticated', 'public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text)', 'EXECUTE')::text, 'true');
SELECT pg_temp.check('anon still can call create_public_booking (online booking)',
  (SELECT bool_or(has_function_privilege('anon', p.oid, 'EXECUTE'))::text FROM pg_proc p WHERE p.proname = 'create_public_booking' AND p.pronamespace = 'public'::regnamespace), 'true');
\o

\set QUIET off
SELECT name, got, expected, CASE WHEN got IS NOT DISTINCT FROM expected THEN 'PASS' ELSE 'FAIL' END AS result FROM results;
SELECT count(*) FILTER (WHERE got IS DISTINCT FROM expected) AS failures, count(*) AS total FROM results \gset
\echo 'SQL tests:' :total 'total,' :failures 'failures'
SELECT CASE WHEN :failures > 0 THEN 1/0 END;
