-- Testes da permissão da equipe (rodar após harness + migration).
-- Uso: scripts/test-sql-staff-edit-scope.sh
\set ON_ERROR_STOP on
\set QUIET on

-- Helpers ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.reset_data() RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.appointments;
  INSERT INTO public.appointments (id, user_id, professional_id, status, notes) VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a1', 'Confirmed', 'do staff 1'),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a2', 'Confirmed', 'do staff 2'),
    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a0', 'Pending',   'do dono');
  -- finalizados (do staff 1 e do staff 2)
  INSERT INTO public.appointments (id, user_id, professional_id, status, notes, price) VALUES
    ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a1', 'Completed', 'fin s1', 45),
    ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a1', 'NoShow',    'fin s1', 45),
    ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a1', 'Cancelled', 'fin s1', 45),
    ('20000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a2', 'Completed', 'fin s2', 45),
    ('20000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a2', 'NoShow',    'fin s2', 45),
    ('20000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a2', 'Cancelled', 'fin s2', 45);
  -- cliente 2 (FK ON DELETE CASCADE) e staff 3 (FK ON DELETE SET NULL)
  INSERT INTO public.clients VALUES ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a0', 'Cliente 2') ON CONFLICT DO NOTHING;
  INSERT INTO public.team_members VALUES ('10000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a0', 'Staff 3 (sem login)', NULL, NULL) ON CONFLICT DO NOTHING;
  INSERT INTO public.appointments (id, user_id, client_id, professional_id, status, received_by, completed_by) VALUES
    ('20000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-0000000000a2', 'Completed', NULL, NULL),
    ('20000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-0000000000a2', 'Confirmed', NULL, NULL),
    ('20000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000a1', 'Completed',
     '10000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-0000000000a3');
$$;

CREATE OR REPLACE FUNCTION pg_temp.set_scope(p text) RETURNS void LANGUAGE sql AS $$
  UPDATE public.business_settings SET staff_appointment_edit_scope = p WHERE user_id = '00000000-0000-0000-0000-0000000000a0';
$$;

-- Executa SQL como um usuário (role authenticated + sub no JWT) e devolve
-- 'ok:<linhas>' | 'forbidden' | 'error:<sqlstate>'.
CREATE OR REPLACE FUNCTION pg_temp.try_as_role(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    EXECUTE 'RESET ROLE';
    RETURN 'ok:' || n;
  EXCEPTION WHEN insufficient_privilege THEN
    EXECUTE 'RESET ROLE';
    RETURN CASE WHEN SQLERRM LIKE '%staff_appointment_edit_forbidden%' THEN 'forbidden' ELSE 'denied:' || SQLERRM END;
  WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    RETURN 'error:' || SQLSTATE;
  END;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.try_as(p_uid text, p_sql text) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.try_as_role('authenticated', p_uid, p_sql);
$$;

CREATE TEMP TABLE results (name text, got text, expected text);
CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_name, p_got, p_expected);
$$;

\set OWNER '''00000000-0000-0000-0000-0000000000a0'''
\set STAFF1 '''00000000-0000-0000-0000-0000000000a1'''

\o /dev/null
BEGIN;
-- Coluna / default / CHECK ------------------------------------------------------
SELECT pg_temp.check('default scope = none', (SELECT staff_appointment_edit_scope FROM business_settings WHERE user_id = '00000000-0000-0000-0000-0000000000a0'), 'none');
SELECT pg_temp.check('check constraint rejects invalid',
  (SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_settings_staff_appointment_edit_scope_check') THEN 'present' ELSE 'absent' END), 'present');

-- none (padrão) -----------------------------------------------------------------
SELECT pg_temp.reset_data(); SELECT pg_temp.set_scope('none');
SELECT pg_temp.check('none: staff edits own -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET notes = 'x' WHERE id = '20000000-0000-0000-0000-000000000001'$q$), 'forbidden');
SELECT pg_temp.check('none: staff reschedules other -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET appointment_time = now() + interval '2 days' WHERE id = '20000000-0000-0000-0000-000000000002'$q$), 'forbidden');
SELECT pg_temp.check('none: staff cancels -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET status = 'Cancelled' WHERE id = '20000000-0000-0000-0000-000000000002'$q$), 'forbidden');
SELECT pg_temp.check('none: staff deletes -> forbidden', pg_temp.try_as(:STAFF1, $q$DELETE FROM appointments WHERE id = '20000000-0000-0000-0000-000000000001'$q$), 'forbidden');
SELECT pg_temp.check('none: staff no-show on other (status only) -> ok', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET status = 'NoShow' WHERE id = '20000000-0000-0000-0000-000000000002'$q$), 'ok:1');
SELECT pg_temp.check('none: staff no-show + other change -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET status = 'NoShow', price = 1 WHERE id = '20000000-0000-0000-0000-000000000003'$q$), 'forbidden');
SELECT pg_temp.check('none: staff completes via SECURITY DEFINER rpc -> ok', pg_temp.try_as(:STAFF1, $q$SELECT test_complete_appointment('20000000-0000-0000-0000-000000000001')$q$), 'ok:1');
SELECT pg_temp.check('none: staff creates (insert) -> ok', pg_temp.try_as(:STAFF1, $q$INSERT INTO appointments (user_id, professional_id, status) VALUES ('00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a2', 'Confirmed')$q$), 'ok:1');
SELECT pg_temp.check('none: owner edits any -> ok', pg_temp.try_as(:OWNER, $q$UPDATE appointments SET notes = 'dono', professional_id = '10000000-0000-0000-0000-0000000000a1' WHERE id = '20000000-0000-0000-0000-000000000002'$q$), 'ok:1');
SELECT pg_temp.check('none: owner cancels -> ok', pg_temp.try_as(:OWNER, $q$UPDATE appointments SET status = 'Cancelled' WHERE id = '20000000-0000-0000-0000-000000000003'$q$), 'ok:1');
SELECT pg_temp.check('none: owner deletes -> ok', pg_temp.try_as(:OWNER, $q$DELETE FROM appointments WHERE id = '20000000-0000-0000-0000-000000000003'$q$), 'ok:1');
SELECT pg_temp.check('staff cannot change the scope (RLS filters, 0 rows)', pg_temp.try_as(:STAFF1, $q$UPDATE business_settings SET staff_appointment_edit_scope = 'all' WHERE user_id = '00000000-0000-0000-0000-0000000000a0'$q$), 'ok:0');
SELECT pg_temp.check('owner changes the scope -> ok', pg_temp.try_as(:OWNER, $q$UPDATE business_settings SET staff_appointment_edit_scope = 'own' WHERE user_id = '00000000-0000-0000-0000-0000000000a0'$q$), 'ok:1');
SELECT pg_temp.check('owner cannot set invalid scope', pg_temp.try_as(:OWNER, $q$UPDATE business_settings SET staff_appointment_edit_scope = 'everything' WHERE user_id = '00000000-0000-0000-0000-0000000000a0'$q$), 'error:23514');

-- own ---------------------------------------------------------------------------
SELECT pg_temp.reset_data(); SELECT pg_temp.set_scope('own');
SELECT pg_temp.check('own: staff edits own -> ok', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET notes = 'x', appointment_time = now() + interval '3 days' WHERE id = '20000000-0000-0000-0000-000000000001'$q$), 'ok:1');
SELECT pg_temp.check('own: staff cancels own -> ok', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET status = 'Cancelled' WHERE id = '20000000-0000-0000-0000-000000000001'$q$), 'ok:1');
SELECT pg_temp.check('own: staff edits other -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET notes = 'x' WHERE id = '20000000-0000-0000-0000-000000000002'$q$), 'forbidden');
SELECT pg_temp.check('own: staff takes other''s appt -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET professional_id = '10000000-0000-0000-0000-0000000000a1' WHERE id = '20000000-0000-0000-0000-000000000002'$q$), 'forbidden');
SELECT pg_temp.reset_data();
SELECT pg_temp.check('own: staff hands own appt to other -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET professional_id = '10000000-0000-0000-0000-0000000000a2' WHERE id = '20000000-0000-0000-0000-000000000001'$q$), 'forbidden');
SELECT pg_temp.check('own: staff deletes own -> ok', pg_temp.try_as(:STAFF1, $q$DELETE FROM appointments WHERE id = '20000000-0000-0000-0000-000000000001'$q$), 'ok:1');
SELECT pg_temp.check('own: staff deletes other -> forbidden', pg_temp.try_as(:STAFF1, $q$DELETE FROM appointments WHERE id = '20000000-0000-0000-0000-000000000002'$q$), 'forbidden');
SELECT pg_temp.check('own: staff no-show on other -> ok', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET status = 'NoShow' WHERE id = '20000000-0000-0000-0000-000000000002'$q$), 'ok:1');
SELECT pg_temp.check('own: owner edits any -> ok', pg_temp.try_as(:OWNER, $q$UPDATE appointments SET notes = 'dono' WHERE id = '20000000-0000-0000-0000-000000000003'$q$), 'ok:1');

-- all ---------------------------------------------------------------------------
SELECT pg_temp.reset_data(); SELECT pg_temp.set_scope('all');
SELECT pg_temp.check('all: staff edits other -> ok', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET notes = 'x', professional_id = '10000000-0000-0000-0000-0000000000a1' WHERE id = '20000000-0000-0000-0000-000000000002'$q$), 'ok:1');
SELECT pg_temp.check('all: staff cancels other -> ok', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET status = 'Cancelled' WHERE id = '20000000-0000-0000-0000-000000000003'$q$), 'ok:1');

-- finalizados (Completed/NoShow/Cancelled): colaborador nunca altera/exclui ------
SELECT pg_temp.reset_data(); SELECT pg_temp.set_scope('own');
SELECT pg_temp.check('own: staff edits price of own Completed -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET price = 1 WHERE id = '20000000-0000-0000-0000-000000000004'$q$), 'forbidden');
SELECT pg_temp.check('own: staff deletes own Completed -> forbidden', pg_temp.try_as(:STAFF1, $q$DELETE FROM appointments WHERE id = '20000000-0000-0000-0000-000000000004'$q$), 'forbidden');
SELECT pg_temp.check('own: staff edits own NoShow -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET notes = 'x' WHERE id = '20000000-0000-0000-0000-000000000005'$q$), 'forbidden');
SELECT pg_temp.check('own: staff deletes own NoShow -> forbidden', pg_temp.try_as(:STAFF1, $q$DELETE FROM appointments WHERE id = '20000000-0000-0000-0000-000000000005'$q$), 'forbidden');
SELECT pg_temp.check('own: staff reopens own Cancelled -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET status = 'Confirmed' WHERE id = '20000000-0000-0000-0000-000000000006'$q$), 'forbidden');
SELECT pg_temp.check('own: staff deletes own Cancelled -> forbidden', pg_temp.try_as(:STAFF1, $q$DELETE FROM appointments WHERE id = '20000000-0000-0000-0000-000000000006'$q$), 'forbidden');
SELECT pg_temp.check('own: staff completes own via rpc -> ok', pg_temp.try_as(:STAFF1, $q$SELECT test_complete_appointment('20000000-0000-0000-0000-000000000001')$q$), 'ok:1');
SELECT pg_temp.check('own: after checkout, staff edits price -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET price = 1 WHERE id = '20000000-0000-0000-0000-000000000001'$q$), 'forbidden');

SELECT pg_temp.reset_data(); SELECT pg_temp.set_scope('all');
SELECT pg_temp.check('all: staff edits price of Completed -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET price = 1 WHERE id = '20000000-0000-0000-0000-000000000014'$q$), 'forbidden');
SELECT pg_temp.check('all: staff deletes Completed -> forbidden', pg_temp.try_as(:STAFF1, $q$DELETE FROM appointments WHERE id = '20000000-0000-0000-0000-000000000014'$q$), 'forbidden');
SELECT pg_temp.check('all: staff edits NoShow -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET notes = 'x' WHERE id = '20000000-0000-0000-0000-000000000015'$q$), 'forbidden');
SELECT pg_temp.check('all: staff deletes NoShow -> forbidden', pg_temp.try_as(:STAFF1, $q$DELETE FROM appointments WHERE id = '20000000-0000-0000-0000-000000000015'$q$), 'forbidden');
SELECT pg_temp.check('all: staff reopens Cancelled -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET status = 'Confirmed' WHERE id = '20000000-0000-0000-0000-000000000016'$q$), 'forbidden');
SELECT pg_temp.check('all: staff deletes Cancelled -> forbidden', pg_temp.try_as(:STAFF1, $q$DELETE FROM appointments WHERE id = '20000000-0000-0000-0000-000000000016'$q$), 'forbidden');
SELECT pg_temp.check('all: staff Completed -> NoShow (not an open appt) -> forbidden', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET status = 'NoShow' WHERE id = '20000000-0000-0000-0000-000000000014'$q$), 'forbidden');
SELECT pg_temp.check('all: staff completes other via rpc -> ok', pg_temp.try_as(:STAFF1, $q$SELECT test_complete_appointment('20000000-0000-0000-0000-000000000002')$q$), 'ok:1');
SELECT pg_temp.check('all: staff no-show on open (status only) -> ok', pg_temp.try_as(:STAFF1, $q$UPDATE appointments SET status = 'NoShow' WHERE id = '20000000-0000-0000-0000-000000000003'$q$), 'ok:1');
SELECT pg_temp.check('all: owner edits price of Completed -> ok', pg_temp.try_as(:OWNER, $q$UPDATE appointments SET price = 50 WHERE id = '20000000-0000-0000-0000-000000000014'$q$), 'ok:1');
SELECT pg_temp.check('all: owner reopens Cancelled -> ok', pg_temp.try_as(:OWNER, $q$UPDATE appointments SET status = 'Confirmed' WHERE id = '20000000-0000-0000-0000-000000000016'$q$), 'ok:1');
SELECT pg_temp.check('all: owner deletes NoShow -> ok', pg_temp.try_as(:OWNER, $q$DELETE FROM appointments WHERE id = '20000000-0000-0000-0000-000000000015'$q$), 'ok:1');
SELECT pg_temp.check('all: owner deletes Completed -> ok', pg_temp.try_as(:OWNER, $q$DELETE FROM appointments WHERE id = '20000000-0000-0000-0000-000000000004'$q$), 'ok:1');

-- FK em cascata, service_role e anon não passam pela regra ----------------------
SELECT pg_temp.reset_data(); SELECT pg_temp.set_scope('none');
SELECT pg_temp.check('none: staff deletes client -> cascade deletes its appts (incl. Completed)', pg_temp.try_as(:STAFF1, $q$DELETE FROM clients WHERE id = '30000000-0000-0000-0000-000000000002'$q$), 'ok:1');
SELECT pg_temp.check('cascade removed both appts of client 2', (SELECT count(*)::text FROM appointments WHERE id IN ('20000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000022')), '0');
SELECT pg_temp.check('none: staff deletes team member -> ON DELETE SET NULL on Completed appt', pg_temp.try_as(:STAFF1, $q$DELETE FROM team_members WHERE id = '10000000-0000-0000-0000-0000000000a3'$q$), 'ok:1');
SELECT pg_temp.check('SET NULL applied to received_by/completed_by', (SELECT (received_by IS NULL AND completed_by IS NULL)::text FROM appointments WHERE id = '20000000-0000-0000-0000-000000000023'), 'true');
SELECT pg_temp.check('service_role edits price of Completed -> ok', pg_temp.try_as_role('service_role', :STAFF1, $q$UPDATE appointments SET price = 2 WHERE id = '20000000-0000-0000-0000-000000000004'$q$), 'ok:1');
SELECT pg_temp.check('service_role deletes Completed -> ok', pg_temp.try_as_role('service_role', NULL, $q$DELETE FROM appointments WHERE id = '20000000-0000-0000-0000-000000000014'$q$), 'ok:1');
SELECT pg_temp.check('service_role cancels open appt -> ok', pg_temp.try_as_role('service_role', NULL, $q$UPDATE appointments SET status = 'Cancelled' WHERE id = '20000000-0000-0000-0000-000000000002'$q$), 'ok:1');
SELECT pg_temp.check('anon update -> 0 rows (RLS), not trigger', pg_temp.try_as_role('anon', NULL, $q$UPDATE appointments SET notes = 'anon'$q$), 'ok:0');

-- isolamento entre empresas continua (RLS) -------------------------------------
SELECT pg_temp.check('other company owner sees 0 rows', pg_temp.try_as('00000000-0000-0000-0000-0000000000b0', $q$UPDATE appointments SET notes = 'hack'$q$), 'ok:0');

-- anon não chama a função de regra
SELECT pg_temp.check('anon cannot execute staff_can_modify_appointment',
  (SELECT CASE WHEN to_regprocedure('public.staff_can_modify_appointment(text,uuid,uuid,text)') IS NULL THEN 'missing'
               WHEN has_function_privilege('anon', 'public.staff_can_modify_appointment(text,uuid,uuid,text)', 'EXECUTE') THEN 'yes' ELSE 'no' END), 'no');
COMMIT;
\o

\set QUIET off
SELECT name, got, expected, CASE WHEN got = expected THEN 'PASS' ELSE 'FAIL' END AS result FROM results;
SELECT count(*) FILTER (WHERE got <> expected) AS failures, count(*) AS total FROM results \gset
\echo 'SQL tests:' :total 'total,' :failures 'failures'
SELECT CASE WHEN :failures > 0 THEN 1/0 END;
