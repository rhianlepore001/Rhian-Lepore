-- Encaixe em horário passado. Rodar via scripts/test-sql-past-encaixe.sh
\set ON_ERROR_STOP on
\set QUIET on

INSERT INTO public.profiles (id, role, company_id, region) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'owner', NULL, 'PT'),
  ('00000000-0000-0000-0000-00000000001a', 'staff', '00000000-0000-0000-0000-00000000000a', 'PT');
INSERT INTO public.business_settings (user_id, business_hours, timezone) VALUES
  ('00000000-0000-0000-0000-00000000000a', '{"mon":{"isOpen":true,"blocks":[{"start":"09:00","end":"18:00"}]}}', 'Europe/Lisbon');
INSERT INTO public.team_members (id, user_id, name, staff_user_id) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'P1', '00000000-0000-0000-0000-00000000001a');
INSERT INTO public.services VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Corte', 45, 30);
INSERT INTO public.clients VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Aline', '351600000001'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Bruno', '351600000002');

-- Dia passado (3 dias atrás), hora de Lisboa
CREATE TEMP TABLE ctx AS SELECT (current_date - 3)::date AS d;
GRANT SELECT ON ctx TO PUBLIC;
CREATE FUNCTION pg_temp.at_l(p_day date, p_hm text) RETURNS timestamptz LANGUAGE sql AS $$ SELECT (p_day::text || ' ' || p_hm)::timestamp AT TIME ZONE 'Europe/Lisbon' $$;

INSERT INTO public.appointments (id, user_id, client_id, professional_id, appointment_time, status, updated_at)
SELECT v.id::uuid, '00000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', pg_temp.at_l(d, v.hm), v.st, '2026-01-01 00:00+00'
FROM ctx, (VALUES
  ('40000000-0000-0000-0000-000000001000', '10:00', 'NoShow'),
  ('40000000-0000-0000-0000-000000001100', '11:00', 'Cancelled'),
  ('40000000-0000-0000-0000-000000001200', '12:00', 'Completed')
) AS v(id, hm, st);
CREATE TEMP TABLE noshow_before AS SELECT id, status, updated_at, appointment_time, client_id FROM public.appointments WHERE status = 'NoShow';

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
CREATE FUNCTION pg_temp.book(p_uid text, p_at timestamptz, p_client text DEFAULT '30000000-0000-0000-0000-000000000002') RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.run_as('authenticated', p_uid, format($q$SELECT (public.create_secure_booking('00000000-0000-0000-0000-00000000000a'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Bruno', NULL, NULL, %L::timestamptz, ARRAY['20000000-0000-0000-0000-000000000001'], 45, 30, 'Confirmed', %L::uuid))->>'success'$q$, p_at, p_client))
$$;

CREATE TEMP TABLE results (name text, got text, expected text);
CREATE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$ INSERT INTO results VALUES (p_name, p_got, p_expected) $$;

\set OWNER '''00000000-0000-0000-0000-00000000000a'''
\set STAFF '''00000000-0000-0000-0000-00000000001a'''

\o /dev/null
SELECT pg_temp.check('owner: empty past slot (3 days ago 09:00) -> success', pg_temp.book(:OWNER, pg_temp.at_l(d, '09:00')), 'true') FROM ctx;
SELECT pg_temp.check('staff: empty past slot outside business hours (3 days ago 07:00) -> success', pg_temp.book(:STAFF, pg_temp.at_l(d, '07:00')), 'true') FROM ctx;
SELECT pg_temp.check('staff: past NoShow slot (ended days ago) -> success', pg_temp.book(:STAFF, pg_temp.at_l(d, '10:00')), 'true') FROM ctx;
SELECT pg_temp.check('owner: past Cancelled slot -> success', pg_temp.book(:OWNER, pg_temp.at_l(d, '11:00')), 'true') FROM ctx;
SELECT pg_temp.check('owner: past Completed slot -> still refused (conflict rule unchanged)', pg_temp.book(:OWNER, pg_temp.at_l(d, '12:00')), 'false') FROM ctx;
SELECT pg_temp.check('owner: past slot just booked (09:00) -> refused (no double booking in the past)', pg_temp.book(:OWNER, pg_temp.at_l(d, '09:00')), 'false') FROM ctx;
SELECT pg_temp.check('owner: earlier today (1 minute ago) -> success', pg_temp.book(:OWNER, date_trunc('minute', now()) - interval '1 minute'), 'true');
SELECT pg_temp.check('NoShow row untouched (status, updated_at, time, client)',
  (SELECT count(*)::text FROM noshow_before nb JOIN public.appointments a USING (id)
    WHERE a.status = nb.status AND a.updated_at = nb.updated_at AND a.appointment_time = nb.appointment_time AND a.client_id = nb.client_id), '1');
SELECT pg_temp.check('encaixe at the NoShow slot is a NEW Confirmed row',
  (SELECT string_agg(c.name || ':' || a.status, ',' ORDER BY a.status) FROM public.appointments a JOIN public.clients c ON c.id = a.client_id, ctx
    WHERE a.appointment_time = pg_temp.at_l(d, '10:00')), 'Bruno:Confirmed,Aline:NoShow');
\o

\set QUIET off
SELECT name, got, expected, CASE WHEN got IS NOT DISTINCT FROM expected THEN 'PASS' ELSE 'FAIL' END AS result FROM results;
SELECT count(*) FILTER (WHERE got IS DISTINCT FROM expected) AS failures, count(*) AS total FROM results \gset
\echo 'SQL tests:' :total 'total,' :failures 'failures'
SELECT CASE WHEN :failures > 0 THEN 1/0 END;
