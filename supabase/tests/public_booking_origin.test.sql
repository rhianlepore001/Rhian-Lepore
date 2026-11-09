-- Prova: agendamento vindo do link público grava origin='booking' (aceite manual, automático, grupo)
-- e o backfill corrige os antigos sem tocar internos/fila. Dados fictícios.
SET TIMEZONE = 'UTC';
SET client_min_messages = notice;
CREATE TEMP TABLE pg_result (n serial, name text, ok boolean, detail text);
CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_exp text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO pg_result(name, ok, detail)
  VALUES (p_name, p_got IS NOT DISTINCT FROM p_exp, 'got=' || COALESCE(p_got, 'NULL') || ' expected=' || COALESCE(p_exp, 'NULL'));
END;
$$;

-- 1. Backfill dos antigos
SELECT pg_temp.check('1 antigos do link viram booking',
  (SELECT string_agg(DISTINCT origin, ',') FROM public.appointments WHERE user_id LIKE 'ad000000-%' AND public_booking_id IS NOT NULL), 'booking');
SELECT pg_temp.check('1 antigos do link: 2 linhas',
  (SELECT count(*)::text FROM public.appointments WHERE user_id LIKE 'ad000000-%' AND public_booking_id IS NOT NULL), '2');
SELECT pg_temp.check('1 interno continua agenda',
  (SELECT origin FROM public.appointments WHERE user_id LIKE 'ad000000-%' AND service = 'Interno'), 'agenda');
SELECT pg_temp.check('1 fila continua queue',
  (SELECT origin FROM public.appointments WHERE user_id LIKE 'ad000000-%' AND service = 'Fila'), 'queue');

-- 2. Aceite manual novo
DO $$
DECLARE r text; b uuid;
BEGIN
  r := public.pbo_book('ad000000-0000-0000-0000-0000000000a0', '351910000201', public.pbo_slot(7, 9));
  b := split_part(r, '|', 2)::uuid;
  PERFORM pg_temp.check('2 pedido manual fica pendente', split_part(r, '|', 1), 'pending');
  r := public.pbo_run_as('authenticated', 'ad000000-0000-0000-0000-0000000000a0', format('SELECT public.accept_public_booking_v2(%L)::text', b));
  PERFORM pg_temp.check('2 aceite sem erro', (r LIKE 'error:%')::text, 'false');
  PERFORM pg_temp.check('2 aceite grava origin booking',
    (SELECT origin FROM public.appointments WHERE public_booking_id = b), 'booking');
END $$;

-- 3. Confirmação automática nova
DO $$
DECLARE r text; b uuid;
BEGIN
  r := public.pbo_book('ad000000-0000-0000-0000-0000000000b0', '351910000301', public.pbo_slot(7, 10));
  b := split_part(r, '|', 2)::uuid;
  PERFORM pg_temp.check('3 automático confirma', split_part(r, '|', 1), 'confirmed');
  PERFORM pg_temp.check('3 automático grava origin booking',
    (SELECT origin FROM public.appointments WHERE public_booking_id = b), 'booking');
END $$;

-- 4. Grupo automático (usa materialize_public_booking_appointment)
DO $$
DECLARE r text;
BEGIN
  r := public.pbo_run_as('anon', NULL, format(
    'SELECT string_agg(status, '','') FROM public.create_public_group_booking(%L, %L, %L, %L::timestamptz, %L::jsonb)',
    'ad000000-0000-0000-0000-0000000000b0', 'Titular Fictício', '351910000401', public.pbo_slot(8, 9),
    jsonb_build_array(
      jsonb_build_object('service_ids', jsonb_build_array('ad000000-0000-0000-0002-0000000000b0'), 'professional_id', 'ad000000-0000-0000-0001-0000000000b0'),
      jsonb_build_object('attendee_name', 'Acompanhante Fictício', 'service_ids', jsonb_build_array('ad000000-0000-0000-0002-0000000000b0'), 'professional_id', 'ad000000-0000-0000-0001-0000000000b0'))));
  PERFORM pg_temp.check('4 grupo sem erro', (r LIKE 'error:%')::text, 'false');
  PERFORM pg_temp.check('4 grupo grava origin booking em todos',
    (SELECT string_agg(DISTINCT a.origin, ',') || '/' || count(*)::text FROM public.appointments a
       JOIN public.public_bookings pb ON pb.id = a.public_booking_id
      WHERE pb.customer_phone = '351910000401'), 'booking/2');
END $$;

-- 5. Atributos de segurança preservados
SELECT pg_temp.check('5 accept: security definer + search_path',
  (SELECT prosecdef::text || ' ' || array_to_string(proconfig, ',') FROM pg_proc WHERE oid = 'public.accept_public_booking_v2(uuid)'::regprocedure), 'true search_path=public');
SELECT pg_temp.check('5 materialize: security definer + search_path',
  (SELECT prosecdef::text || ' ' || array_to_string(proconfig, ',') FROM pg_proc WHERE oid = 'public.materialize_public_booking_appointment(public.public_bookings)'::regprocedure), 'true search_path=public');
SELECT pg_temp.check('5 anon não executa materialize',
  has_function_privilege('anon', 'public.materialize_public_booking_appointment(public.public_bookings)', 'EXECUTE')::text, 'false');
SELECT pg_temp.check('5 anon não executa accept',
  has_function_privilege('anon', 'public.accept_public_booking_v2(uuid)', 'EXECUTE')::text, 'false');

DO $$
DECLARE r record; n_fail int; n_total int;
BEGIN
  FOR r IN SELECT * FROM pg_result ORDER BY n LOOP
    IF r.ok THEN RAISE NOTICE 'PASS  %', r.name; ELSE RAISE NOTICE 'FAIL  % (%)', r.name, r.detail; END IF;
  END LOOP;
  SELECT count(*) FILTER (WHERE NOT ok), count(*) INTO n_fail, n_total FROM pg_result;
  IF n_fail > 0 THEN RAISE EXCEPTION 'public_booking_origin: % de % checks falharam', n_fail, n_total; END IF;
  RAISE NOTICE 'public_booking_origin: % checks ok', n_total;
END $$;
