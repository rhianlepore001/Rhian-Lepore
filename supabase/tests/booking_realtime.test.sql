-- Provas do broadcast de public_bookings. Rodar depois da migration.

DO $$
DECLARE
  v_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_id2 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_keys text[];
  v_forbidden int;
  v_count int;
  v_topic text;
  v_event text;
  v_private boolean;
  v_op text;
BEGIN
  DELETE FROM realtime.send_log;
  DELETE FROM public.public_bookings;

  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, appointment_time, total_price, status, notes
  ) VALUES (
    v_id, 'biz-1', '11999998888', 'Maria Silva', '2026-10-10 14:00:00+00', 80, 'pending', 'segredo'
  );

  SELECT count(*) INTO v_count FROM realtime.send_log;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL insert deveria emitir 1 broadcast, veio %', v_count;
  END IF;

  SELECT
    ARRAY(SELECT jsonb_object_keys(payload) ORDER BY 1),
    topic,
    event,
    private,
    payload->>'op'
  INTO v_keys, v_topic, v_event, v_private, v_op
  FROM realtime.send_log
  ORDER BY 1
  LIMIT 1;

  IF v_keys <> ARRAY['appointment_time','at','id','op','status']::text[] THEN
    RAISE EXCEPTION 'FAIL chaves do payload = %, esperado appointment_time,at,id,op,status', v_keys;
  END IF;

  SELECT count(*) INTO v_forbidden
  FROM realtime.send_log
  WHERE payload ? 'customer_name'
     OR payload ? 'customer_phone'
     OR payload ? 'total_price'
     OR payload ? 'notes'
     OR payload ? 'business_id'
     OR payload ? 'phone'
     OR payload ? 'name'
     OR payload ? 'price';
  IF v_forbidden <> 0 THEN
    RAISE EXCEPTION 'FAIL payload carregou dado pessoal/preço';
  END IF;

  IF v_topic <> 'booking:' || v_id::text THEN
    RAISE EXCEPTION 'FAIL topic = %', v_topic;
  END IF;
  IF v_event <> 'booking_status' THEN
    RAISE EXCEPTION 'FAIL event = %', v_event;
  END IF;
  IF v_private IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL private deveria ser true';
  END IF;
  IF v_op <> 'INSERT' THEN
    RAISE EXCEPTION 'FAIL op insert = %', v_op;
  END IF;

  DELETE FROM realtime.send_log;
  UPDATE public.public_bookings SET notes = 'outro' WHERE id = v_id;
  SELECT count(*) INTO v_count FROM realtime.send_log;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL update irrelevante não deveria emitir, veio %', v_count;
  END IF;

  UPDATE public.public_bookings SET status = status WHERE id = v_id;
  SELECT count(*) INTO v_count FROM realtime.send_log;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL update de status idêntico não deveria emitir, veio %', v_count;
  END IF;

  UPDATE public.public_bookings SET status = 'confirmed' WHERE id = v_id;
  SELECT count(*) INTO v_count FROM realtime.send_log;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL update de status deveria emitir 1, veio %', v_count;
  END IF;
  IF (SELECT payload->>'status' FROM realtime.send_log LIMIT 1) <> 'confirmed' THEN
    RAISE EXCEPTION 'FAIL status confirmado não chegou no payload';
  END IF;
  IF (SELECT payload->>'op' FROM realtime.send_log LIMIT 1) <> 'UPDATE' THEN
    RAISE EXCEPTION 'FAIL op update ausente';
  END IF;

  DELETE FROM realtime.send_log;
  UPDATE public.public_bookings
  SET appointment_time = appointment_time + interval '1 hour'
  WHERE id = v_id;
  SELECT count(*) INTO v_count FROM realtime.send_log;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL update de horário deveria emitir 1, veio %', v_count;
  END IF;

  DELETE FROM realtime.send_log;
  UPDATE public.public_bookings SET status = 'cancelled' WHERE id = v_id;
  IF (SELECT payload->>'status' FROM realtime.send_log LIMIT 1) <> 'cancelled' THEN
    RAISE EXCEPTION 'FAIL cancelamento não chegou';
  END IF;

  DELETE FROM realtime.send_log;
  UPDATE public.public_bookings SET status = 'completed' WHERE id = v_id;
  IF (SELECT payload->>'status' FROM realtime.send_log LIMIT 1) <> 'completed' THEN
    RAISE EXCEPTION 'FAIL completed (PR-4) não chegou';
  END IF;

  DELETE FROM realtime.send_log;
  UPDATE public.public_bookings SET status = 'no_show' WHERE id = v_id;
  IF (SELECT payload->>'status' FROM realtime.send_log LIMIT 1) <> 'no_show' THEN
    RAISE EXCEPTION 'FAIL no_show (PR-4) não chegou';
  END IF;

  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, appointment_time, total_price, status
  ) VALUES (
    v_id2, 'biz-1', '11988887777', 'João', '2026-10-11 15:00:00+00', 50, 'pending'
  );
  IF (SELECT topic FROM realtime.send_log ORDER BY 1 DESC LIMIT 1) <> 'booking:' || v_id2::text THEN
    RAISE EXCEPTION 'FAIL segundo booking deveria ter tópico próprio';
  END IF;

  PERFORM set_config('test.realtime_fail', 'on', false);
  UPDATE public.public_bookings SET status = 'pending' WHERE id = v_id;
  IF NOT EXISTS (SELECT 1 FROM public.public_bookings WHERE id = v_id AND status = 'pending') THEN
    RAISE EXCEPTION 'FAIL escrita deveria sobreviver a realtime.send quebrado';
  END IF;
  PERFORM set_config('test.realtime_fail', 'off', false);

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'public_bookings'
  ) THEN
    RAISE EXCEPTION 'FAIL public_bookings deveria estar na publication supabase_realtime';
  END IF;

  PERFORM set_config('test.realtime_topic', 'booking:' || v_id::text, false);
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'Booking topics are readable'
      AND polrelid = 'realtime.messages'::regclass
  ) THEN
    RAISE EXCEPTION 'FAIL policy Booking topics are readable ausente';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'Booking topics are readable'
      AND pg_get_expr(polqual, polrelid) ILIKE '%booking:%%'
  ) THEN
    RAISE EXCEPTION 'FAIL policy deveria filtrar topic booking:%%';
  END IF;

  RAISE NOTICE 'booking realtime tests ok';
END
$$;
