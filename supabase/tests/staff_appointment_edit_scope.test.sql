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
$$;

CREATE OR REPLACE FUNCTION pg_temp.set_scope(p text) RETURNS void LANGUAGE sql AS $$
  UPDATE public.business_settings SET staff_appointment_edit_scope = p WHERE user_id = '00000000-0000-0000-0000-0000000000a0';
$$;

-- Executa SQL como um usuário (role authenticated + sub no JWT) e devolve
-- 'ok:<linhas>' | 'forbidden' | 'error:<sqlstate>'.
CREATE OR REPLACE FUNCTION pg_temp.try_as(p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_uid, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
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

-- isolamento entre empresas continua (RLS) -------------------------------------
SELECT pg_temp.check('other company owner sees 0 rows', pg_temp.try_as('00000000-0000-0000-0000-0000000000b0', $q$UPDATE appointments SET notes = 'hack'$q$), 'ok:0');

-- anon não chama a função de regra
SELECT pg_temp.check('anon cannot execute staff_can_modify_appointment',
  (SELECT CASE WHEN to_regprocedure('public.staff_can_modify_appointment(text,uuid,uuid)') IS NULL THEN 'missing'
               WHEN has_function_privilege('anon', 'public.staff_can_modify_appointment(text,uuid,uuid)', 'EXECUTE') THEN 'yes' ELSE 'no' END), 'no');
COMMIT;
\o

\set QUIET off
SELECT name, got, expected, CASE WHEN got = expected THEN 'PASS' ELSE 'FAIL' END AS result FROM results;
SELECT count(*) FILTER (WHERE got <> expected) AS failures, count(*) AS total FROM results \gset
\echo 'SQL tests:' :total 'total,' :failures 'failures'
SELECT CASE WHEN :failures > 0 THEN 1/0 END;
