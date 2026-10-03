-- H1: empilha o trigger de antecedência (#121) se a função existir.
-- Não edita a migration do #121. Skip só quando o trigger/função está ausente.
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
  EXECUTE 'RESET ROLE';
  RETURN 'ok:' || COALESCE(v_json->>'success', 'null');
EXCEPTION WHEN undefined_function THEN
  EXECUTE 'RESET ROLE';
  RETURN 'error:missing_rpc';
WHEN insufficient_privilege THEN
  GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT, v_hint = PG_EXCEPTION_HINT;
  EXECUTE 'RESET ROLE';
  RETURN 'error:' || COALESCE(NULLIF(v_hint, ''), 'denied') || '|' || v_msg;
WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT, v_hint = PG_EXCEPTION_HINT;
  EXECUTE 'RESET ROLE';
  RETURN 'error:' || COALESCE(NULLIF(v_hint, ''), 'nohint') || '|' || v_msg;
END $$;

DO $$
DECLARE
  v_has_trigger boolean;
  v_owner text := '00000000-0000-0000-0000-00000000000a';
  v_staff text := '00000000-0000-0000-0000-00000000001a';
  v_exstaff text := '00000000-0000-0000-0000-0000000000ee';
  v_inactive text := '00000000-0000-0000-0000-00000000002a';
  v_pro text := '10000000-0000-0000-0000-000000000001';
  v_pro_staff text := '10000000-0000-0000-0000-000000000002';
  v_pro_inact text := '10000000-0000-0000-0000-0000000000c1';
  v_pro_ex text := '10000000-0000-0000-0000-0000000000ee';
  v_client text := '30000000-0000-0000-0000-000000000001';
  v_svc text := '20000000-0000-0000-0000-000000000001';
  v_apt uuid := '50000000-0000-0000-0000-0000000000c9';
  v_pb uuid := '70000000-0000-0000-0000-0000000000c9';
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
    PERFORM pg_temp.check('H1 owner now+30min', 'skip', 'skip');
    PERFORM pg_temp.check('H1 owner passado', 'skip', 'skip');
    PERFORM pg_temp.check('H1 staff now+30min', 'skip', 'skip');
    PERFORM pg_temp.check('H1 staff passado', 'skip', 'skip');
    PERFORM pg_temp.check('H1 ex-staff recusa', 'skip', 'skip');
    PERFORM pg_temp.check('H1 staff inativo recusa', 'skip', 'skip');
    RETURN;
  END IF;

  PERFORM pg_temp.check('H1 trigger #121', 'present', 'present');

  INSERT INTO public.profiles (id, role, company_id, region) VALUES
    (v_owner, 'owner', v_owner, 'PT'),
    (v_staff, 'staff', v_owner, 'PT'),
    (v_exstaff, 'staff', v_owner, 'PT'),
    (v_inactive, 'staff', v_owner, 'PT')
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, company_id = EXCLUDED.company_id, region = 'PT';

  INSERT INTO public.team_members (id, user_id, name, staff_user_id, active, is_owner, deleted_at) VALUES
    (v_pro, v_owner, 'Diego', NULL, true, true, NULL),
    (v_pro_staff, v_owner, 'Bruna', v_staff::uuid, true, false, NULL),
    (v_pro_inact, v_owner, 'Inativo', v_inactive::uuid, false, false, NULL),
    (v_pro_ex, v_owner, 'Ex', v_exstaff::uuid, true, false, now())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    staff_user_id = EXCLUDED.staff_user_id,
    active = EXCLUDED.active,
    deleted_at = EXCLUDED.deleted_at;

  INSERT INTO public.business_settings (user_id, timezone, staff_appointment_edit_scope)
  VALUES (v_owner, 'Europe/Lisbon', 'all')
  ON CONFLICT (user_id) DO UPDATE SET staff_appointment_edit_scope = 'all', timezone = 'Europe/Lisbon';

  INSERT INTO public.clients (id, user_id, name, phone)
  VALUES (v_client::uuid, v_owner, 'Aline', '351600000001')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.services VALUES (v_svc::uuid, v_owner, 'Corte', 45, 30) ON CONFLICT (id) DO NOTHING;

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

  PERFORM set_config('request.jwt.claim.sub', v_owner, false);
  v_got := pg_temp.reschedule(v_apt, now() + interval '30 minutes', v_pro::uuid);
  PERFORM pg_temp.check('H1 owner now+30min', v_got, 'ok:true');

  v_got := pg_temp.reschedule(v_apt, now() - interval '45 minutes', v_pro::uuid);
  PERFORM pg_temp.check('H1 owner passado', v_got, 'ok:true');

  UPDATE public.appointments SET appointment_time = now() + interval '2 days', professional_id = v_pro::uuid WHERE id = v_apt;
  UPDATE public.public_bookings SET appointment_time = now() + interval '2 days', professional_id = v_pro::uuid, status = 'confirmed' WHERE id = v_pb;

  PERFORM set_config('request.jwt.claim.sub', v_staff, false);
  v_got := pg_temp.reschedule(v_apt, now() + interval '30 minutes', v_pro::uuid);
  PERFORM pg_temp.check('H1 staff now+30min', v_got, 'ok:true');

  v_got := pg_temp.reschedule(v_apt, now() - interval '45 minutes', v_pro::uuid);
  PERFORM pg_temp.check('H1 staff passado', v_got, 'ok:true');

  UPDATE public.appointments SET appointment_time = now() + interval '2 days', professional_id = v_pro::uuid WHERE id = v_apt;
  UPDATE public.public_bookings SET appointment_time = now() + interval '2 days', professional_id = v_pro::uuid, status = 'confirmed' WHERE id = v_pb;

  PERFORM set_config('request.jwt.claim.sub', v_exstaff, false);
  v_got := pg_temp.reschedule(v_apt, now() + interval '30 minutes', v_pro::uuid);
  PERFORM pg_temp.check('H1 ex-staff recusa',
    CASE WHEN v_got LIKE 'error:staff_appointment_edit_forbidden%' THEN 'error:staff_appointment_edit_forbidden' ELSE v_got END,
    'error:staff_appointment_edit_forbidden');

  PERFORM set_config('request.jwt.claim.sub', v_inactive, false);
  v_got := pg_temp.reschedule(v_apt, now() + interval '30 minutes', v_pro::uuid);
  PERFORM pg_temp.check('H1 staff inativo recusa',
    CASE WHEN v_got LIKE 'error:staff_appointment_edit_forbidden%' THEN 'error:staff_appointment_edit_forbidden' ELSE v_got END,
    'error:staff_appointment_edit_forbidden');
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
