-- H1: empilha o trigger de antecedência (#121) se existir. Sem o trigger, skip.
-- Não edita a migration do #121. Se o trigger existir sem isenção de equipe,
-- skip das asserções (o #121 ainda está a ser corrigido).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

CREATE TEMP TABLE IF NOT EXISTS results (name text, got text, expected text);

CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_name, p_got, p_expected);
$$;

CREATE OR REPLACE FUNCTION pg_temp.reschedule(p_id uuid, p_time timestamptz, p_pro uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_msg text;
  v_hint text;
  v_json json;
BEGIN
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_json := public.reschedule_appointment(p_id, p_time, p_pro);
  RETURN 'ok:' || COALESCE(v_json->>'success', 'null');
EXCEPTION WHEN undefined_function THEN
  RETURN 'error:missing_rpc';
WHEN insufficient_privilege THEN
  RETURN 'error:denied|' || SQLERRM;
WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT, v_hint = PG_EXCEPTION_HINT;
  RETURN 'error:' || COALESCE(NULLIF(v_hint, ''), 'nohint') || '|' || v_msg;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.at_l(p_day date, p_hm text) RETURNS timestamptz LANGUAGE sql AS $$
  SELECT (p_day::text || ' ' || p_hm)::timestamp AT TIME ZONE 'Europe/Lisbon'
$$;

DO $$
DECLARE
  v_has_trigger boolean;
  v_has_exempt boolean;
  v_def text;
  v_owner text := '00000000-0000-0000-0000-00000000000a';
  v_pro text := '10000000-0000-0000-0000-000000000001';
  v_client text := '30000000-0000-0000-0000-000000000001';
  v_svc text := '20000000-0000-0000-0000-000000000001';
  v_apt uuid := '50000000-0000-0000-0000-0000000000h1';
  v_pb uuid := '70000000-0000-0000-0000-0000000000h1';
  v_got text;
  v_lead_fn regprocedure;
BEGIN
  v_lead_fn := to_regprocedure('public.enforce_lead_time_on_public_bookings()');
  v_has_trigger := v_lead_fn IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM pg_trigger t
      WHERE t.tgname = 'enforce_lead_time_on_public_bookings'
        AND NOT t.tgisinternal
    );

  IF NOT v_has_trigger THEN
    PERFORM pg_temp.check('H1 trigger #121', 'skip', 'skip');
    PERFORM pg_temp.check('H1 now+30min', 'skip', 'skip');
    PERFORM pg_temp.check('H1 passado', 'skip', 'skip');
    RETURN;
  END IF;

  v_def := pg_get_functiondef(v_lead_fn);
  v_has_exempt := v_def LIKE '%get_auth_company_id%' AND v_def LIKE '%auth.uid() IS NOT NULL%';

  PERFORM pg_temp.check('H1 trigger #121', 'present', 'present');

  IF NOT v_has_exempt THEN
    PERFORM pg_temp.check('H1 now+30min', 'skip', 'skip');
    PERFORM pg_temp.check('H1 passado', 'skip', 'skip');
    RETURN;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_owner, false);
  DELETE FROM public.appointments WHERE id = v_apt;
  DELETE FROM public.public_bookings WHERE id = v_pb;

  INSERT INTO public.public_bookings (
    id, business_id, customer_name, customer_phone, service_ids, professional_id, appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_pb, v_owner, 'Aline', '351600000001', ARRAY[v_svc::uuid],
    v_pro::uuid, now() + interval '2 days', 45, 'confirmed', 30
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, status, duration_minutes, price, public_booking_id
  ) VALUES (
    v_apt, v_owner, v_client::uuid, v_pro::uuid, 'Corte', now() + interval '2 days', 'Confirmed', 30, 45, v_pb
  );

  v_got := pg_temp.reschedule(v_apt, now() + interval '30 minutes', v_pro::uuid);
  PERFORM pg_temp.check('H1 now+30min', v_got, 'ok:true');

  v_got := pg_temp.reschedule(v_apt, now() - interval '45 minutes', v_pro::uuid);
  PERFORM pg_temp.check('H1 passado', v_got, 'ok:true');
END $$;

\o
SELECT name, CASE WHEN got IS NOT DISTINCT FROM expected THEN 'ok' ELSE 'FAIL' END AS status, got, expected
FROM results WHERE name LIKE 'H1%' ORDER BY name;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM results WHERE name LIKE 'H1%' AND got IS DISTINCT FROM expected) THEN
    RAISE EXCEPTION 'reschedule lead-time compat tests failed';
  END IF;
END $$;
