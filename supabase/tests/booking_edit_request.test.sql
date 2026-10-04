-- Provas PR-6: pedido de alteração do cliente (sem duplicar agendamento).
-- Roda DEPOIS da migration 20261004084454. Falha antes dela (v2 ausente).

CREATE TEMP TABLE pr6_fail (msg text);

CREATE OR REPLACE FUNCTION pg_temp.fail(p_msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO pr6_fail VALUES (p_msg);
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

CREATE OR REPLACE FUNCTION pg_temp.run_as(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  IF p_uid IS NOT NULL AND btrim(p_uid) <> '' THEN
    PERFORM set_config('request.jwt.claim.sub', p_uid, false);
  ELSE
    PERFORM set_config('request.jwt.claim.sub', '', false);
  END IF;
  EXECUTE format('SET ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', false);
    RETURN v;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', false);
    RETURN 'error:' || SQLERRM;
  END;
END;
$$;

DO $$
DECLARE
  v_biz text := '00000000-0000-0000-0000-0000000000a0';
  v_pro uuid := '10000000-0000-0000-0000-0000000000a0';
  v_pro2 uuid := '10000000-0000-0000-0000-0000000000a1';
  v_cli uuid := '30000000-0000-0000-0000-000000000001';
  v_svc uuid := '20000000-0000-0000-0000-000000000001';
  v_svc2 uuid := '20000000-0000-0000-0000-000000000002';
  v_phone text := '351912345678';
  v_owner text := '00000000-0000-0000-0000-0000000000a0';
  v_bk uuid;
  v_apt uuid;
  v_apt2 uuid;
  v_time timestamptz;
  v_new timestamptz;
  v_got text;
  v_slot int;
  v_cnt int;
  v_status text;
  v_json jsonb;
  v_now timestamptz := now();
  v1_def text;
  v_payload jsonb;
BEGIN
  PERFORM set_config('TIMEZONE', 'UTC', true);

  IF to_regprocedure('public.update_public_booking_by_client_v2(uuid,text,uuid[],uuid,timestamptz,timestamptz,text,text,numeric,integer,jsonb)') IS NULL THEN
    PERFORM pg_temp.fail('update_public_booking_by_client_v2 deveria existir após a migration');
  END IF;
  IF to_regprocedure('public.accept_public_booking_v2(uuid)') IS NULL THEN
    PERFORM pg_temp.fail('accept_public_booking_v2 deveria existir após a migration');
  END IF;
  IF to_regprocedure('public.reject_public_booking_v2(uuid)') IS NULL THEN
    PERFORM pg_temp.fail('reject_public_booking_v2 deveria existir após a migration');
  END IF;
  IF to_regprocedure('public.get_booking_by_id_v2(uuid,text)') IS NULL THEN
    PERFORM pg_temp.fail('get_booking_by_id_v2 deveria existir após a migration');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_settings'
      AND column_name = 'service_only_edit_skip_acceptance'
  ) THEN
    PERFORM pg_temp.fail('faltou service_only_edit_skip_acceptance');
  END IF;
  PERFORM pg_temp.check('skip default false',
    (SELECT service_only_edit_skip_acceptance::text FROM public.business_settings WHERE user_id = v_biz),
    'false');

  SELECT public.get_public_business_settings_json(v_biz::uuid)::jsonb INTO v_json;
  PERFORM pg_temp.check('json não vaza skip', (v_json ? 'service_only_edit_skip_acceptance')::text, 'false');
  PERFORM pg_temp.check('json não vaza original_professional', (v_json ? 'original_professional_id')::text, 'false');

  PERFORM pg_temp.check('anon sem accept v2',
    has_function_privilege('anon', 'public.accept_public_booking_v2(uuid)', 'EXECUTE')::text, 'false');
  PERFORM pg_temp.check('anon sem reject v2',
    has_function_privilege('anon', 'public.reject_public_booking_v2(uuid)', 'EXECUTE')::text, 'false');
  PERFORM pg_temp.check('anon pode update v2',
    has_function_privilege('anon', 'public.update_public_booking_by_client_v2(uuid,text,uuid[],uuid,timestamptz,timestamptz,text,text,numeric,integer,jsonb)', 'EXECUTE')::text, 'true');

  -- Grants v1 intactos após CREATE OR REPLACE (prod: PUBLIC em update/get; accept/reject autenticado)
  PERFORM pg_temp.check('v1 update PUBLIC EXECUTE',
    EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      CROSS JOIN LATERAL aclexplode(p.proacl) a
      WHERE n.nspname = 'public'
        AND p.proname = 'update_public_booking_by_client'
        AND a.grantee = 0
        AND a.privilege_type = 'EXECUTE'
    )::text, 'true');
  PERFORM pg_temp.check('v1 get_booking PUBLIC EXECUTE',
    EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      CROSS JOIN LATERAL aclexplode(p.proacl) a
      WHERE n.nspname = 'public'
        AND p.proname = 'get_booking_by_id'
        AND a.grantee = 0
        AND a.privilege_type = 'EXECUTE'
    )::text, 'true');
  PERFORM pg_temp.check('v1 accept not PUBLIC',
    EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
      WHERE n.nspname = 'public'
        AND p.proname = 'accept_public_booking'
        AND a.grantee = 0
        AND a.privilege_type = 'EXECUTE'
    )::text, 'false');
  PERFORM pg_temp.check('v1 reject not PUBLIC',
    EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
      WHERE n.nspname = 'public'
        AND p.proname = 'reject_public_booking'
        AND a.grantee = 0
        AND a.privilege_type = 'EXECUTE'
    )::text, 'false');
  PERFORM pg_temp.check('v1 accept not anon',
    has_function_privilege('anon', 'public.accept_public_booking(uuid)', 'EXECUTE')::text, 'false');
  PERFORM pg_temp.check('v1 reject not anon',
    has_function_privilege('anon', 'public.reject_public_booking(uuid)', 'EXECUTE')::text, 'false');
  PERFORM pg_temp.check('v1 accept authenticated',
    has_function_privilege('authenticated', 'public.accept_public_booking(uuid)', 'EXECUTE')::text, 'true');
  PERFORM pg_temp.check('v1 reject authenticated',
    has_function_privilege('authenticated', 'public.reject_public_booking(uuid)', 'EXECUTE')::text, 'true');
  PERFORM pg_temp.check('v1 accept service_role',
    has_function_privilege('service_role', 'public.accept_public_booking(uuid)', 'EXECUTE')::text, 'true');
  PERFORM pg_temp.check('v1 reject service_role',
    has_function_privilege('service_role', 'public.reject_public_booking(uuid)', 'EXECUTE')::text, 'true');

  UPDATE public.business_settings
     SET enable_self_rescheduling = true,
         client_cancel_cutoff_hours = 2,
         service_only_edit_skip_acceptance = false
   WHERE user_id = v_biz;
  UPDATE public.profiles SET booking_lead_time_hours = 2 WHERE id = v_biz;

  -- 1) confirmed: pedido de alteração, original reservado, novo slot preso
  v_bk := '61000000-0000-0000-0000-000000000001';
  v_apt := '71000000-0000-0000-0000-000000000001';
  v_time := date_trunc('hour', v_now + interval '3 days');
  v_new := v_time + interval '2 hours';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );

  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT status || '|' || is_edit::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro2, v_new, v_time, v_phone));
  PERFORM pg_temp.check('edit confirmed → pending is_edit', v_got, 'pending|true');
  PERFORM pg_temp.check('original time snapshot',
    (SELECT original_appointment_time = v_time FROM public.public_bookings WHERE id = v_bk)::text, 'true');
  PERFORM pg_temp.check('original professional snapshot',
    (SELECT original_professional_id = v_pro FROM public.public_bookings WHERE id = v_bk)::text, 'true');
  PERFORM pg_temp.check('appointment intact after edit',
    (SELECT status || '|' || appointment_time::text FROM public.appointments WHERE id = v_apt),
    'Confirmed|' || v_time::text);
  SELECT count(*) INTO v_slot FROM public.get_available_slots(v_biz::uuid, v_time::date, v_pro, 30, false)
    WHERE slot_time = v_time;
  PERFORM pg_temp.check('original slot occupied', v_slot::text, '0');
  SELECT count(*) INTO v_slot FROM public.get_available_slots(v_biz::uuid, v_new::date, v_pro2, 30, false)
    WHERE slot_time = v_new;
  PERFORM pg_temp.check('new slot held', v_slot::text, '0');

  -- broadcast mínimo (sem campos privados novos)
  SELECT payload INTO v_payload FROM realtime.send_log ORDER BY ctid DESC LIMIT 1;
  PERFORM pg_temp.check('broadcast keys', (
    SELECT string_agg(k, ',' ORDER BY k)
    FROM jsonb_object_keys(v_payload) k
  ), 'appointment_time,at,id,op,status');

  -- 2) segunda edição substitui o pedido; original permanece
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT appointment_time::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro2, v_new + interval '30 minutes', v_time, v_phone));
  PERFORM pg_temp.check('segunda edição substitui', v_got, (v_new + interval '30 minutes')::text);
  PERFORM pg_temp.check('original intacto na 2ª edição',
    (SELECT original_appointment_time = v_time AND original_professional_id = v_pro
     FROM public.public_bookings WHERE id = v_bk)::text, 'true');
  PERFORM pg_temp.check('appointment still original after 2nd edit',
    (SELECT appointment_time = v_time AND status = 'Confirmed' FROM public.appointments WHERE id = v_apt)::text, 'true');

  -- 3) accept move o MESMO appointment
  SELECT count(*) INTO v_cnt FROM public.appointments WHERE public_booking_id = v_bk;
  PERFORM pg_temp.check('um appointment antes do accept', v_cnt::text, '1');
  v_got := pg_temp.run_as('authenticated', v_owner, format(
    $q$SELECT public.accept_public_booking_v2(%L)->>'appointment_id'$q$, v_bk));
  PERFORM pg_temp.check('accept devolve o mesmo id', v_got, v_apt::text);
  SELECT count(*) INTO v_cnt FROM public.appointments WHERE public_booking_id = v_bk;
  PERFORM pg_temp.check('ainda um appointment depois do accept', v_cnt::text, '1');
  PERFORM pg_temp.check('appointment movido',
    (SELECT appointment_time = (v_new + interval '30 minutes')
        AND professional_id = v_pro2
        AND status = 'Confirmed'
     FROM public.appointments WHERE id = v_apt)::text, 'true');
  PERFORM pg_temp.check('booking confirmado no novo horário',
    (SELECT status || '|' || is_edit::text || '|' || (appointment_time = v_new + interval '30 minutes')::text
     FROM public.public_bookings WHERE id = v_bk),
    'confirmed|false|true');
  PERFORM pg_temp.check('originais limpos após accept',
    (SELECT (original_appointment_time IS NULL AND original_professional_id IS NULL)::text
     FROM public.public_bookings WHERE id = v_bk), 'true');

  -- 4) reject restaura (não cancela)
  v_bk := '61000000-0000-0000-0000-000000000002';
  v_apt := '71000000-0000-0000-0000-000000000002';
  v_time := date_trunc('hour', v_now + interval '4 days');
  v_new := v_time + interval '3 hours';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );
  PERFORM pg_temp.run_as('anon', NULL, format(
    $q$SELECT status FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 40, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro2, v_new, v_time, v_phone));
  v_got := pg_temp.run_as('authenticated', v_owner, format(
    $q$SELECT public.reject_public_booking_v2(%L)::text$q$, v_bk));
  PERFORM pg_temp.check('reject ok', v_got, 'true');
  PERFORM pg_temp.check('reject volta confirmed original',
    (SELECT status || '|' || is_edit::text || '|' || (appointment_time = v_time)::text
        || '|' || (professional_id = v_pro)::text
     FROM public.public_bookings WHERE id = v_bk),
    'confirmed|false|true|true');
  PERFORM pg_temp.check('reject não cancela appointment',
    (SELECT status || '|' || (appointment_time = v_time)::text FROM public.appointments WHERE id = v_apt),
    'Confirmed|true');

  -- 5) reject perto do horário original não dispara lead_time
  v_bk := '61000000-0000-0000-0000-000000000003';
  v_apt := '71000000-0000-0000-0000-000000000003';
  v_time := v_now + interval '5 hours';
  v_new := date_trunc('hour', v_now + interval '5 days');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT status FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro, v_new, v_time, v_phone));
  PERFORM pg_temp.check('edit 5h original para daqui a 5d', v_got, 'pending');
  UPDATE public.public_bookings
     SET original_appointment_time = v_now + interval '30 minutes'
   WHERE id = v_bk;
  v_got := pg_temp.run_as('authenticated', v_owner, format(
    $q$SELECT public.reject_public_booking_v2(%L)::text$q$, v_bk));
  PERFORM pg_temp.check('reject não dispara lead_time', v_got, 'true');
  PERFORM pg_temp.check('reject restore status',
    (SELECT status FROM public.public_bookings WHERE id = v_bk), 'confirmed');

  -- 6) pending (Aguardando) substitui direto, sem is_edit
  v_bk := '61000000-0000-0000-0000-000000000004';
  v_time := date_trunc('hour', v_now + interval '6 days');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'pending', 30
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT status || '|' || is_edit::text || '|' || (original_appointment_time IS NULL)::text
       FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro, v_time + interval '1 hour', v_time, v_phone));
  PERFORM pg_temp.check('pending replace direto', v_got, 'pending|false|true');

  -- 7) múltiplos serviços
  v_bk := '61000000-0000-0000-0000-000000000005';
  v_apt := '71000000-0000-0000-0000-000000000005';
  v_time := date_trunc('hour', v_now + interval '7 days');
  v_new := v_time + interval '2 hours';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc, v_svc2], v_pro, v_time, 60, 'confirmed', 50
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte, Barba', v_time, 60, 'Confirmed', 50, v_bk
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT array_length(service_ids,1)::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L,%L]::uuid[], %L, %L, %L, 'Ana', %L, 60, 50, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_svc2, v_pro2, v_new, v_time, v_phone));
  PERFORM pg_temp.check('multi-serviço pedido', v_got, '2');
  v_got := pg_temp.run_as('authenticated', v_owner, format(
    $q$SELECT public.accept_public_booking_v2(%L)->>'appointment_id'$q$, v_bk));
  PERFORM pg_temp.check('accept multi mesmo apt', v_got, v_apt::text);

  -- 8) telefone last-8 não basta
  v_bk := '61000000-0000-0000-0000-000000000006';
  v_time := date_trunc('hour', v_now + interval '8 days');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT count(*)::text FROM public.update_public_booking_by_client_v2(
      %L, '000912345678', ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', '000912345678', 35, 30, '[]'::jsonb)$q$,
    v_bk, v_svc, v_pro, v_time + interval '1 hour', v_time));
  PERFORM pg_temp.check('last-8 diferente → booking_not_found', v_got, 'error:booking_not_found');
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT count(*)::text FROM public.get_booking_by_id_v2(%L, '000912345678')$q$, v_bk));
  PERFORM pg_temp.check('get last-8 vazio', v_got, '0');

  -- 9) self-rescheduling off
  UPDATE public.business_settings SET enable_self_rescheduling = false WHERE user_id = v_biz;
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT count(*)::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro, v_time + interval '1 hour', v_time, v_phone));
  PERFORM pg_temp.check('self-rescheduling off', v_got, 'error:self_rescheduling_disabled');
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT count(*)::text FROM public.get_booking_by_id_v2(%L, %L)$q$, v_bk, v_phone));
  PERFORM pg_temp.check('get self-rescheduling off vazio', v_got, '0');
  UPDATE public.business_settings SET enable_self_rescheduling = true WHERE user_id = v_biz;

  -- 10) cutoff closed (1h restante, cutoff 2). Lead 0 para o INSERT não ser recusado.
  UPDATE public.profiles SET booking_lead_time_hours = 0 WHERE id = v_biz;
  v_bk := '61000000-0000-0000-0000-000000000007';
  v_time := v_now + interval '1 hour';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT count(*)::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro, date_trunc('hour', v_now + interval '9 days'), v_time, v_phone));
  PERFORM pg_temp.check('cutoff closed', v_got, 'error:cancel_window_closed');

  -- cutoff 0
  UPDATE public.business_settings SET client_cancel_cutoff_hours = 0 WHERE user_id = v_biz;
  v_bk := '61000000-0000-0000-0000-000000000008';
  v_time := date_trunc('hour', v_now + interval '10 days');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT count(*)::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro, v_time + interval '1 hour', v_time, v_phone));
  PERFORM pg_temp.check('cutoff 0', v_got, 'error:cancel_window_closed');
  UPDATE public.business_settings SET client_cancel_cutoff_hours = 2 WHERE user_id = v_biz;
  UPDATE public.profiles SET booking_lead_time_hours = 2 WHERE id = v_biz;

  -- 11) lead time no NOVO horário
  v_bk := '61000000-0000-0000-0000-000000000009';
  v_time := date_trunc('hour', v_now + interval '11 days');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT count(*)::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro, v_now + interval '90 minutes', v_time, v_phone));
  IF v_got NOT LIKE '%lead_time_violation%' THEN
    PERFORM pg_temp.fail('lead time no novo slot: got=' || v_got);
  END IF;
  RAISE NOTICE 'PASS  lead time no novo slot';

  -- 12) slot bloqueado
  v_bk := '61000000-0000-0000-0000-00000000000a';
  v_time := date_trunc('hour', v_now + interval '12 days');
  v_new := v_time + interval '4 hours';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  INSERT INTO public.agenda_blocks (user_id, professional_id, starts_at, ends_at)
  VALUES (v_biz, v_pro, v_new, v_new + interval '1 hour');
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT count(*)::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro, v_new, v_time, v_phone));
  PERFORM pg_temp.check('blocked slot', v_got, 'error:slot_unavailable');

  -- 13) v1 encaminha (last-8 recusado)
  v_bk := '61000000-0000-0000-0000-00000000000b';
  v_time := date_trunc('hour', v_now + interval '13 days');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT count(*)::text FROM public.update_public_booking_by_client(
      %L, '000912345678', ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', '000912345678', 35, 30, '[]'::jsonb)$q$,
    v_bk, v_svc, v_pro, v_time + interval '1 hour', v_time));
  PERFORM pg_temp.check('v1 last-8 → booking_not_found', v_got, 'error:booking_not_found');
  SELECT pg_get_functiondef('public.update_public_booking_by_client(uuid,text,uuid[],uuid,timestamptz,timestamptz,text,text,numeric,integer,jsonb)'::regprocedure) INTO v1_def;
  IF v1_def NOT ILIKE '%update_public_booking_by_client_v2%' THEN
    PERFORM pg_temp.fail('v1 update deveria encaminhar para v2');
  END IF;
  RAISE NOTICE 'PASS  v1 update encaminha v2';
  SELECT pg_get_functiondef('public.accept_public_booking(uuid)'::regprocedure) INTO v1_def;
  IF v1_def NOT ILIKE '%accept_public_booking_v2%' THEN
    PERFORM pg_temp.fail('v1 accept deveria encaminhar para v2');
  END IF;
  RAISE NOTICE 'PASS  v1 accept encaminha v2';
  SELECT pg_get_functiondef('public.reject_public_booking(uuid)'::regprocedure) INTO v1_def;
  IF v1_def NOT ILIKE '%reject_public_booking_v2%' THEN
    PERFORM pg_temp.fail('v1 reject deveria encaminhar para v2');
  END IF;
  RAISE NOTICE 'PASS  v1 reject encaminha v2';
  SELECT pg_get_functiondef('public.get_booking_by_id(uuid,text)'::regprocedure) INTO v1_def;
  IF v1_def NOT ILIKE '%get_booking_by_id_v2%' THEN
    PERFORM pg_temp.fail('v1 get_booking deveria encaminhar para v2');
  END IF;
  RAISE NOTICE 'PASS  v1 get_booking encaminha v2';

  -- 14) service-only skip OFF → pedido
  v_bk := '61000000-0000-0000-0000-00000000000c';
  v_apt := '71000000-0000-0000-0000-00000000000c';
  v_time := date_trunc('hour', v_now + interval '14 days');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT status || '|' || is_edit::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 25, 20, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc2, v_pro, v_time, v_time, v_phone));
  PERFORM pg_temp.check('service-only skip off → pedido', v_got, 'pending|true');
  PERFORM pg_temp.check('service-only skip off appointment intact',
    (SELECT status FROM public.appointments WHERE id = v_apt), 'Confirmed');

  -- 15) service-only skip ON + cabe → grava direto
  UPDATE public.business_settings SET service_only_edit_skip_acceptance = true WHERE user_id = v_biz;
  v_bk := '61000000-0000-0000-0000-00000000000d';
  v_apt := '71000000-0000-0000-0000-00000000000d';
  v_time := date_trunc('hour', v_now + interval '15 days');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT status || '|' || is_edit::text || '|' || duration_minutes::text
       FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 25, 20, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc2, v_pro, v_time, v_time, v_phone));
  PERFORM pg_temp.check('service-only skip on direto', v_got, 'confirmed|false|20');
  PERFORM pg_temp.check('service-only skip on appointment duration',
    (SELECT duration_minutes::text FROM public.appointments WHERE id = v_apt), '20');

  -- 16) service-only skip ON + não cabe → pedido
  v_bk := '61000000-0000-0000-0000-00000000000e';
  v_apt := '71000000-0000-0000-0000-00000000000e';
  v_apt2 := '71000000-0000-0000-0000-0000000000ee';
  v_time := date_trunc('hour', v_now + interval '16 days');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes
  ) VALUES (
    v_apt2, v_biz, v_cli, v_pro, 'Outro', v_time + interval '30 minutes', 35, 'Confirmed', 30
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT status || '|' || is_edit::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 60, 60, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro, v_time, v_time, v_phone));
  PERFORM pg_temp.check('service-only skip on overlap recusa', v_got, 'error:slot_unavailable');
  UPDATE public.business_settings SET service_only_edit_skip_acceptance = false WHERE user_id = v_biz;

  -- 17) history v2 expõe is_edit + original_appointment_time
  PERFORM pg_temp.check('history v2 tem is_edit',
    (SELECT is_edit::text FROM public.get_client_bookings_history_v2(v_phone, v_biz::uuid)
     WHERE id = '61000000-0000-0000-0000-00000000000c'::uuid), 'true');

  -- 18) v1 reject de edição NÃO cancela (encaminha v2)
  v_bk := '61000000-0000-0000-0000-00000000000f';
  v_apt := '71000000-0000-0000-0000-00000000000f';
  v_time := date_trunc('hour', v_now + interval '17 days');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );
  PERFORM pg_temp.run_as('anon', NULL, format(
    $q$SELECT status FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro2, v_time + interval '2 hours', v_time, v_phone));
  v_got := pg_temp.run_as('authenticated', v_owner, format(
    $q$SELECT public.reject_public_booking(%L)::text$q$, v_bk));
  PERFORM pg_temp.check('v1 reject edit restaura', v_got, 'true');
  PERFORM pg_temp.check('v1 reject não cancelou',
    (SELECT status FROM public.public_bookings WHERE id = v_bk), 'confirmed');

  -- 19) confirmed + is_edit stale: snapshot fresco, não trata como edit em curso
  v_bk := '61000000-0000-0000-0000-000000000010';
  v_apt := '71000000-0000-0000-0000-000000000010';
  v_time := date_trunc('hour', v_now + interval '18 days');
  v_new := v_time + interval '2 hours';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, original_appointment_time, original_professional_id,
    total_price, status, duration_minutes, is_edit
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time,
    v_time - interval '3 hours', v_pro2, 35, 'confirmed', 30, true
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT status || '|' || is_edit::text || '|' || (original_appointment_time = %L)::text
         || '|' || (original_professional_id = %L)::text
       FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_time, v_pro, v_bk, v_phone, v_svc, v_pro2, v_new, v_time, v_phone));
  PERFORM pg_temp.check('stale is_edit snapshot fresco', v_got, 'pending|true|true|true');
  PERFORM pg_temp.check('history v2 após pedido is_edit=true',
    (SELECT is_edit::text FROM public.get_client_bookings_history_v2(v_phone, v_biz::uuid)
     WHERE id = v_bk), 'true');
  -- após o pedido, status=pending então history is_edit=true; checar um confirmed stale separado
  v_bk := '61000000-0000-0000-0000-000000000011';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, original_appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro,
    date_trunc('hour', v_now + interval '19 days'),
    date_trunc('hour', v_now + interval '19 days') - interval '2 hours',
    35, 'confirmed', 30, true
  );
  PERFORM pg_temp.check('history v2 confirmed+is_edit não é pending-edit',
    (SELECT is_edit::text FROM public.get_client_bookings_history_v2(v_phone, v_biz::uuid)
     WHERE id = v_bk), 'false');

  -- 20) cancel v2: edit-pending aplica cutoff no horário original
  UPDATE public.profiles SET booking_lead_time_hours = 0 WHERE id = v_biz;
  v_bk := '61000000-0000-0000-0000-000000000012';
  v_apt := '71000000-0000-0000-0000-000000000012';
  v_time := v_now + interval '1 hour';
  v_new := date_trunc('hour', v_now + interval '20 days');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, original_appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_new, v_time, 35, 'pending', 30, true
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text$q$, v_bk, v_phone));
  PERFORM pg_temp.check('cancel edit-pending cutoff original', v_got, 'error:cancel_window_closed');
  PERFORM pg_temp.check('cancel recusado não mexeu status',
    (SELECT status FROM public.public_bookings WHERE id = v_bk), 'pending');
  PERFORM pg_temp.check('cancel recusado appointment intacto',
    (SELECT status FROM public.appointments WHERE id = v_apt), 'Confirmed');

  -- cancel edit-pending fora da janela (original daqui a 3d) ok
  v_bk := '61000000-0000-0000-0000-000000000013';
  v_apt := '71000000-0000-0000-0000-000000000013';
  v_time := date_trunc('hour', v_now + interval '21 days');
  v_new := v_time + interval '2 hours';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, original_appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_new, v_time, 35, 'pending', 30, true
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text$q$, v_bk, v_phone));
  PERFORM pg_temp.check('cancel edit-pending fora da janela', v_got, 'true');
  PERFORM pg_temp.check('cancel edit-pending marcou cancelled',
    (SELECT status FROM public.public_bookings WHERE id = v_bk), 'cancelled');
  UPDATE public.profiles SET booking_lead_time_hours = 2 WHERE id = v_biz;

  -- 21) mesmo profissional +30 min não conflita com o próprio original
  v_bk := '61000000-0000-0000-0000-000000000014';
  v_apt := '71000000-0000-0000-0000-000000000014';
  v_time := date_trunc('hour', v_now + interval '22 days');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT status || '|' || is_edit::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro, v_time + interval '30 minutes', v_time, v_phone));
  PERFORM pg_temp.check('mesmo pro +30min sem auto-conflito', v_got, 'pending|true');

  -- 22) accept recusa Completed e não move o appointment
  v_bk := '61000000-0000-0000-0000-000000000015';
  v_apt := '71000000-0000-0000-0000-000000000015';
  v_time := date_trunc('hour', v_now + interval '23 days');
  v_new := v_time + interval '2 hours';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, original_appointment_time, original_professional_id,
    total_price, status, duration_minutes, is_edit
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_new, v_time, v_pro, 35, 'pending', 30, true
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );
  ALTER TABLE public.appointments DISABLE TRIGGER USER;
  UPDATE public.appointments SET status = 'Completed' WHERE id = v_apt;
  ALTER TABLE public.appointments ENABLE TRIGGER USER;
  v_got := pg_temp.run_as('authenticated', v_owner, format(
    $q$SELECT public.accept_public_booking_v2(%L)::text$q$, v_bk));
  PERFORM pg_temp.check('accept Completed → booking_not_pending', v_got, 'error:booking_not_pending');
  PERFORM pg_temp.check('accept Completed não moveu',
    (SELECT status || '|' || (appointment_time = v_time)::text FROM public.appointments WHERE id = v_apt),
    'Completed|true');
  PERFORM pg_temp.check('accept Completed booking ainda pending',
    (SELECT status FROM public.public_bookings WHERE id = v_bk), 'pending');

  -- request também recusa confirmed com appointment Completed
  v_bk := '61000000-0000-0000-0000-000000000016';
  v_apt := '71000000-0000-0000-0000-000000000016';
  v_time := date_trunc('hour', v_now + interval '24 days');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );
  ALTER TABLE public.appointments DISABLE TRIGGER USER;
  UPDATE public.appointments SET status = 'Completed' WHERE id = v_apt;
  ALTER TABLE public.appointments ENABLE TRIGGER USER;
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT count(*)::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro, v_time + interval '2 hours', v_time, v_phone));
  PERFORM pg_temp.check('request Completed → booking_not_editable', v_got, 'error:booking_not_editable');

  -- 23) accept recusa NoShow
  v_bk := '61000000-0000-0000-0000-000000000017';
  v_apt := '71000000-0000-0000-0000-000000000017';
  v_time := date_trunc('hour', v_now + interval '25 days');
  v_new := v_time + interval '2 hours';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, original_appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_new, v_time, 35, 'pending', 30, true
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );
  ALTER TABLE public.appointments DISABLE TRIGGER USER;
  UPDATE public.appointments SET status = 'NoShow' WHERE id = v_apt;
  ALTER TABLE public.appointments ENABLE TRIGGER USER;
  v_got := pg_temp.run_as('authenticated', v_owner, format(
    $q$SELECT public.accept_public_booking_v2(%L)::text$q$, v_bk));
  PERFORM pg_temp.check('accept NoShow → booking_not_pending', v_got, 'error:booking_not_pending');
  PERFORM pg_temp.check('accept NoShow não moveu',
    (SELECT status || '|' || (appointment_time = v_time)::text FROM public.appointments WHERE id = v_apt),
    'NoShow|true');
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT count(*)::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro, v_new + interval '1 hour', v_time, v_phone));
  PERFORM pg_temp.check('request NoShow pending-edit → booking_not_editable', v_got, 'error:booking_not_editable');

  -- 24) original já passou: accept recusa; request recusa
  UPDATE public.profiles SET booking_lead_time_hours = 0 WHERE id = v_biz;
  v_bk := '61000000-0000-0000-0000-000000000018';
  v_apt := '71000000-0000-0000-0000-000000000018';
  v_time := v_now - interval '30 minutes';
  v_new := date_trunc('hour', v_now + interval '26 days');
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, original_appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_new, v_time, 35, 'pending', 30, true
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_apt, v_biz, v_cli, v_pro, 'Corte', v_time, 35, 'Confirmed', 30, v_bk
  );
  v_got := pg_temp.run_as('authenticated', v_owner, format(
    $q$SELECT public.accept_public_booking_v2(%L)::text$q$, v_bk));
  PERFORM pg_temp.check('accept original passado → booking_not_pending', v_got, 'error:booking_not_pending');
  PERFORM pg_temp.check('accept original passado não moveu',
    (SELECT status || '|' || (appointment_time = v_time)::text FROM public.appointments WHERE id = v_apt),
    'Confirmed|true');
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT count(*)::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro, v_new + interval '1 hour', v_time, v_phone));
  PERFORM pg_temp.check('request original passado → booking_not_editable', v_got, 'error:booking_not_editable');

  v_bk := '61000000-0000-0000-0000-000000000019';
  v_time := v_now - interval '15 minutes';
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, v_time, 35, 'confirmed', 30
  );
  PERFORM set_config('request.jwt.claim.sub', '', true);
  v_got := pg_temp.run_as('anon', NULL, format(
    $q$SELECT count(*)::text FROM public.update_public_booking_by_client_v2(
      %L, %L, ARRAY[%L]::uuid[], %L, %L, %L, 'Ana', %L, 35, 30, '[]'::jsonb)$q$,
    v_bk, v_phone, v_svc, v_pro, date_trunc('hour', v_now + interval '27 days'), v_time, v_phone));
  PERFORM pg_temp.check('request confirmed passado → booking_not_editable', v_got, 'error:booking_not_editable');
  UPDATE public.profiles SET booking_lead_time_hours = 2 WHERE id = v_biz;
END;
$$;
