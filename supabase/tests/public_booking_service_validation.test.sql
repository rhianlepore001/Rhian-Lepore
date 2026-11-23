\ir booking_completed_noshow.harness.sql
\ir ../migrations/20261004072408_public_booking_completed_noshow.sql
\ir booking_cancel_cutoff.harness.sql
\ir ../migrations/20261004082633_client_cancel_cutoff.sql
\ir booking_edit_request.harness.sql
\ir ../migrations/20261004101021_client_edit_request.sql
\ir booking_notifications.harness.sql
\ir ../migrations/20261004112214_booking_notifications.sql
\ir ../migrations/20261006082806_notifications_type_check_allow_used_types.sql
\ir auto_confirm_online_bookings.harness.sql
\ir ../migrations/20261011161117_auto_confirm_online_bookings.sql

ALTER TABLE public.services ADD COLUMN active boolean DEFAULT true;

CREATE TEMP TABLE booking_validation_baseline AS
SELECT oid, pg_get_functiondef(oid) AS definition, proacl
FROM pg_proc
WHERE oid IN (
  'public.create_public_booking(text,text,text,uuid[],uuid,timestamptz,numeric,integer,jsonb)'::regprocedure,
  'public.update_public_booking_by_client_v2(uuid,text,uuid[],uuid,timestamptz,timestamptz,text,text,numeric,integer,jsonb)'::regprocedure
);

INSERT INTO public.profiles (id, role) VALUES
  ('ba000000-0000-4000-8000-000000000001', 'owner'),
  ('ba000000-0000-4000-8000-000000000002', 'owner');

INSERT INTO public.business_settings (user_id, online_booking_requires_approval) VALUES
  ('ba000000-0000-4000-8000-000000000001', true),
  ('ba000000-0000-4000-8000-000000000002', false);

INSERT INTO public.team_members (id, user_id, name) VALUES
  ('fa000000-0000-4000-8000-000000000001', 'ba000000-0000-4000-8000-000000000001', 'Profissional A'),
  ('fa000000-0000-4000-8000-000000000002', 'ba000000-0000-4000-8000-000000000002', 'Profissional B');

INSERT INTO public.services (id, user_id, name, price, duration_minutes, active) VALUES
  ('ca000000-0000-4000-8000-000000000001', 'ba000000-0000-4000-8000-000000000001', 'Serviço A', 45, 30, true),
  ('ca000000-0000-4000-8000-000000000002', 'ba000000-0000-4000-8000-000000000002', 'Serviço B', 100, 60, true),
  ('ca000000-0000-4000-8000-000000000003', 'ba000000-0000-4000-8000-000000000001', 'Serviço oculto', 20, 15, false),
  ('ca000000-0000-4000-8000-000000000004', 'ba000000-0000-4000-8000-000000000001', 'Adicional A', 30, 15, true);

\ir ../migrations/20261120131906_public_booking_service_validation.sql

SET ROLE anon;

DO $$
DECLARE
  v_a text := 'ba000000-0000-4000-8000-000000000001';
  v_b text := 'ba000000-0000-4000-8000-000000000002';
  v_pro_a uuid := 'fa000000-0000-4000-8000-000000000001';
  v_pro_b uuid := 'fa000000-0000-4000-8000-000000000002';
  v_service_a uuid := 'ca000000-0000-4000-8000-000000000001';
  v_service_b uuid := 'ca000000-0000-4000-8000-000000000002';
  v_hidden uuid := 'ca000000-0000-4000-8000-000000000003';
  v_extra uuid := 'ca000000-0000-4000-8000-000000000004';
  v_phone text := '11900000001';
  v_when timestamptz := now() + interval '2 days';
  v_pending public.public_bookings;
  v_result public.public_bookings;
BEGIN
  SELECT * INTO STRICT v_pending
  FROM public.create_public_booking(v_a, 'Cliente A', v_phone, ARRAY[v_service_a, v_extra],
    v_pro_a, v_when, 70, 30);

  IF v_pending.total_price <> 75 OR v_pending.duration_minutes <> 45 OR v_pending.status <> 'pending' THEN
    RAISE EXCEPTION 'pending booking must use the company catalog';
  END IF;

  BEGIN
    PERFORM public.create_public_booking(v_a, 'Cliente A', v_phone, ARRAY[v_service_a],
      v_pro_a, v_when + interval '35 minutes', 45, 30);
    RAISE EXCEPTION 'expected a slot conflict from catalog duration';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'slot_unavailable' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.create_public_booking(v_a, 'Cliente A', v_phone, ARRAY[v_service_b],
      v_pro_a, v_when + interval '2 hours', 100, 60);
    RAISE EXCEPTION 'expected service from another company to be denied';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'invalid_services' THEN RAISE; END IF;
  END;

  SELECT * INTO STRICT v_result
  FROM public.create_public_booking(v_b, 'Cliente B', '11900000002', ARRAY[v_service_b],
    v_pro_b, v_when, 95, 50);

  IF v_result.total_price <> 100 OR v_result.duration_minutes <> 60 OR v_result.status <> 'confirmed' THEN
    RAISE EXCEPTION 'automatic confirmation must use the company catalog';
  END IF;

  BEGIN
    PERFORM public.update_public_booking_by_client_v2(v_pending.id, v_phone, ARRAY[v_hidden], v_pro_a,
      v_when, v_when, 'Cliente A', v_phone, 20, 15);
    RAISE EXCEPTION 'expected inactive service to be denied';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'invalid_services' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.update_public_booking_by_client_v2(v_pending.id, v_phone, ARRAY[v_service_a], v_pro_b,
      v_when, v_when, 'Cliente A', v_phone, 45, 30);
    RAISE EXCEPTION 'expected professional from another company to be denied';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'invalid_professional' THEN RAISE; END IF;
  END;

  SELECT * INTO STRICT v_result
  FROM public.update_public_booking_by_client_v2(v_pending.id, v_phone, ARRAY[v_service_a], v_pro_a,
    v_when + interval '1 hour', v_when, 'Cliente A', v_phone, 40, 20);

  IF v_result.total_price <> 45 OR v_result.duration_minutes <> 30 OR v_result.status <> 'pending' THEN
    RAISE EXCEPTION 'an edited booking must use the company catalog';
  END IF;
END;
$$;

RESET ROLE;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.get_public_booking_service_quote(text,uuid[])', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.get_public_booking_service_quote(text,uuid[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'public roles can invoke an internal catalog function';
  END IF;
END;
$$;

\ir ../../docs/rollbacks/20261120131906_public_booking_service_validation.rollback.sql

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM booking_validation_baseline b
    LEFT JOIN pg_proc p ON p.oid = b.oid
    WHERE b.definition IS DISTINCT FROM pg_get_functiondef(p.oid)
      OR b.proacl IS DISTINCT FROM p.proacl
  ) OR to_regprocedure('public.get_public_booking_service_quote(text,uuid[])') IS NOT NULL THEN
    RAISE EXCEPTION 'rollback must restore the prior definitions and grants';
  END IF;
END;
$$;
