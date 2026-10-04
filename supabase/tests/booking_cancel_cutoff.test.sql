-- Provas PR-5: cutoff de cancelamento do cliente + libera agenda.
-- Roda DEPOIS da migration 20261004082633. Falha antes dela (v2 ausente).

CREATE TEMP TABLE pr5_fail (msg text);

CREATE OR REPLACE FUNCTION pg_temp.fail(p_msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO pr5_fail VALUES (p_msg);
  RAISE EXCEPTION 'FAIL %', p_msg;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_exp text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_got IS DISTINCT FROM p_exp THEN
    PERFORM pg_temp.fail(p_name || ': got=' || COALESCE(p_got, 'NULL') || ' expected=' || COALESCE(p_exp, 'NULL'));
  END IF;
  RAISE NOTICE 'PASS  %', p_name;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.run_as(p_role text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  EXECUTE format('SET ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
    EXECUTE 'RESET ROLE';
    RETURN v;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    RETURN 'error:' || SQLERRM;
  END;
END;
$$;

DO $$
DECLARE
  v_biz text := '00000000-0000-0000-0000-0000000000a0';
  v_pro uuid := '10000000-0000-0000-0000-0000000000a0';
  v_cli uuid := '30000000-0000-0000-0000-000000000001';
  v_svc uuid := '20000000-0000-0000-0000-000000000001';
  v_phone text := '351912345678';
  v_bk uuid;
  v_apt uuid;
  v_status text;
  v_appt_st text;
  v_slot int;
  v_json jsonb;
  v_now timestamptz := now();
  v_time timestamptz;
  v_got text;
  v1_def text;
BEGIN
  PERFORM set_config('TIMEZONE', 'UTC', true);
  IF to_regprocedure('public.cancel_public_booking_by_client_v2(uuid,text)') IS NULL THEN
    PERFORM pg_temp.fail('v2 deveria existir após a migration');
  END IF;

  -- Colunas + check
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_settings'
      AND column_name = 'client_cancel_cutoff_hours'
  ) THEN
    PERFORM pg_temp.fail('faltou client_cancel_cutoff_hours');
  END IF;
  PERFORM pg_temp.check('default cutoff 2',
    (SELECT client_cancel_cutoff_hours::text FROM public.business_settings WHERE user_id = v_biz),
    '2');

  BEGIN
    UPDATE public.business_settings SET client_cancel_cutoff_hours = 3 WHERE user_id = v_biz;
    PERFORM pg_temp.fail('CHECK deveria recusar 3h');
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS  CHECK recusa 3h';
  END;
  UPDATE public.business_settings SET client_cancel_cutoff_hours = 2 WHERE user_id = v_biz;

  BEGIN
    UPDATE public.business_settings SET client_cancel_note = repeat('x', 501) WHERE user_id = v_biz;
    PERFORM pg_temp.fail('CHECK deveria recusar nota > 500');
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS  CHECK recusa nota > 500';
  END;

  -- JSON público expõe só as chaves novas (além das já públicas)
  SELECT public.get_public_business_settings_json(v_biz::uuid)::jsonb INTO v_json;
  PERFORM pg_temp.check('json cutoff', v_json->>'client_cancel_cutoff_hours', '2');
  PERFORM pg_temp.check('json tem nota', (v_json ? 'client_cancel_note')::text, 'true');
  PERFORM pg_temp.check('json não vaza staff_can_block', (v_json ? 'staff_can_block_agenda')::text, 'false');

  -- pending a qualquer momento antes do horário (1h restante, cutoff 2)
  v_bk := '52000000-0000-0000-0000-000000000001';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_now + interval '1 hour', 35, 'pending'
  );
  v_got := pg_temp.run_as('anon', format(
    'SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', v_bk, v_phone));
  PERFORM pg_temp.check('pending 1h restante cancela', v_got, 'true');
  PERFORM pg_temp.check('pending virou cancelled',
    (SELECT status FROM public.public_bookings WHERE id = v_bk), 'cancelled');

  -- confirmed 3h restantes, cutoff 2 → ok + appointments Cancelled + slot livre
  UPDATE public.business_settings SET client_cancel_cutoff_hours = 2 WHERE user_id = v_biz;
  v_bk := '52000000-0000-0000-0000-000000000002';
  v_apt := '42000000-0000-0000-0000-000000000002';
  v_time := date_trunc('hour', v_now + interval '3 hours');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed'
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', v_bk
  );
  SELECT count(*) INTO v_slot
  FROM public.get_available_slots(v_biz::uuid, v_time::date, v_pro, 30, false)
  WHERE slot_time = v_time;
  PERFORM pg_temp.check('slot ocupado antes do cancel', v_slot::text, '0');

  v_got := pg_temp.run_as('anon', format(
    'SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', v_bk, v_phone));
  PERFORM pg_temp.check('confirmed 3h+ cancela', v_got, 'true');
  SELECT a.status INTO v_appt_st FROM public.appointments a WHERE a.id = v_apt;
  PERFORM pg_temp.check('appointment Cancelled', v_appt_st, 'Cancelled');
  PERFORM pg_temp.check('booking cancelled',
    (SELECT status FROM public.public_bookings WHERE id = v_bk), 'cancelled');
  SELECT count(*) INTO v_slot
  FROM public.get_available_slots(v_biz::uuid, v_time::date, v_pro, 30, false)
  WHERE slot_time = v_time;
  PERFORM pg_temp.check('slot livre depois do cancel', v_slot::text, '1');

  -- aplicar de novo → não cancellable
  v_got := pg_temp.run_as('anon', format(
    'SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', v_bk, v_phone));
  PERFORM pg_temp.check('segunda vez booking_not_cancellable', v_got, 'error:booking_not_cancellable');

  -- confirmed 1h restante, cutoff 2 → cancel_window_closed; agenda intacta
  v_bk := '52000000-0000-0000-0000-000000000003';
  v_apt := '42000000-0000-0000-0000-000000000003';
  v_time := v_now + interval '1 hour';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed'
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', v_bk
  );
  v_got := pg_temp.run_as('anon', format(
    'SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', v_bk, v_phone));
  PERFORM pg_temp.check('1h restante cancel_window_closed', v_got, 'error:cancel_window_closed');
  PERFORM pg_temp.check('1h booking segue confirmed',
    (SELECT status FROM public.public_bookings WHERE id = v_bk), 'confirmed');
  PERFORM pg_temp.check('1h appointment segue Confirmed',
    (SELECT status FROM public.appointments WHERE id = v_apt), 'Confirmed');

  -- limite exato: now() = appointment - cutoff → permitido
  v_bk := '52000000-0000-0000-0000-000000000004';
  v_time := v_now + interval '2 hours';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed'
  );
  v_got := pg_temp.run_as('anon', format(
    'SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', v_bk, v_phone));
  PERFORM pg_temp.check('limite exato permitido', v_got, 'true');

  -- 1us depois do limite → closed
  v_bk := '52000000-0000-0000-0000-000000000005';
  v_time := v_now + interval '2 hours' - interval '1 microsecond';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed'
  );
  v_got := pg_temp.run_as('anon', format(
    'SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', v_bk, v_phone));
  PERFORM pg_temp.check('1us após limite cancel_window_closed', v_got, 'error:cancel_window_closed');

  -- cutoff 0 = nunca online (confirmed)
  UPDATE public.business_settings SET client_cancel_cutoff_hours = 0 WHERE user_id = v_biz;
  v_bk := '52000000-0000-0000-0000-000000000006';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_now + interval '2 days', 35, 'confirmed'
  );
  v_got := pg_temp.run_as('anon', format(
    'SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', v_bk, v_phone));
  PERFORM pg_temp.check('cutoff 0 cancel_window_closed', v_got, 'error:cancel_window_closed');

  -- cutoff 0 mas pending ainda pode
  v_bk := '52000000-0000-0000-0000-000000000007';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_now + interval '30 minutes', 35, 'pending'
  );
  v_got := pg_temp.run_as('anon', format(
    'SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', v_bk, v_phone));
  PERFORM pg_temp.check('cutoff 0 pending ainda cancela', v_got, 'true');
  UPDATE public.business_settings SET client_cancel_cutoff_hours = 2 WHERE user_id = v_biz;

  -- passado
  v_bk := '52000000-0000-0000-0000-000000000008';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_now - interval '1 minute', 35, 'confirmed'
  );
  v_got := pg_temp.run_as('anon', format(
    'SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', v_bk, v_phone));
  PERFORM pg_temp.check('passado booking_not_cancellable', v_got, 'error:booking_not_cancellable');

  -- telefone errado (last-8 bateriam no phones_match; v2 exige dígitos iguais)
  v_bk := '52000000-0000-0000-0000-000000000009';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_now + interval '8 hours', 35, 'confirmed'
  );
  v_got := pg_temp.run_as('anon', format(
    'SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', v_bk, '000912345678'));
  PERFORM pg_temp.check('last-8 diferente → booking_not_found', v_got, 'error:booking_not_found');

  -- mesma identidade, formatação diferente
  UPDATE public.public_bookings
     SET customer_phone = '+351 912 345 678'
   WHERE id = v_bk;
  v_got := pg_temp.run_as('anon', format(
    'SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', v_bk, '351912345678'));
  PERFORM pg_temp.check('mesmo telefone formatado cancela', v_got, 'true');

  -- v1 encaminha para v2: 1h restante → cancel_window_closed
  UPDATE public.business_settings SET client_cancel_cutoff_hours = 2 WHERE user_id = v_biz;
  v_bk := '52000000-0000-0000-0000-00000000000a';
  v_apt := '42000000-0000-0000-0000-00000000000a';
  v_time := v_now + interval '1 hour';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed'
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', v_bk
  );
  v_got := pg_temp.run_as('anon', format(
    'SELECT public.cancel_public_booking_by_client(%L, %L)::text', v_bk, v_phone));
  PERFORM pg_temp.check('v1 1h restante cancel_window_closed', v_got, 'error:cancel_window_closed');
  PERFORM pg_temp.check('v1 1h booking intacto',
    (SELECT status FROM public.public_bookings WHERE id = v_bk), 'confirmed');
  PERFORM pg_temp.check('v1 1h appointment intacto',
    (SELECT status FROM public.appointments WHERE id = v_apt), 'Confirmed');

  -- v1 3h restantes → cancelled + appointments Cancelled
  v_bk := '52000000-0000-0000-0000-00000000000b';
  v_apt := '42000000-0000-0000-0000-00000000000b';
  v_time := date_trunc('hour', v_now + interval '3 hours');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed'
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', v_bk
  );
  v_got := pg_temp.run_as('anon', format(
    'SELECT public.cancel_public_booking_by_client(%L, %L)::text', v_bk, v_phone));
  PERFORM pg_temp.check('v1 3h cancela', v_got, 'true');
  PERFORM pg_temp.check('v1 3h booking cancelled',
    (SELECT status FROM public.public_bookings WHERE id = v_bk), 'cancelled');
  PERFORM pg_temp.check('v1 3h appointment Cancelled',
    (SELECT status FROM public.appointments WHERE id = v_apt), 'Cancelled');

  SELECT pg_get_functiondef('public.cancel_public_booking_by_client(uuid,text)'::regprocedure) INTO v1_def;
  IF v1_def NOT ILIKE '%cancel_public_booking_by_client_v2%' THEN
    PERFORM pg_temp.fail('v1 deveria encaminhar para v2');
  END IF;
  RAISE NOTICE 'PASS  v1 encaminha para v2';
END;
$$;
