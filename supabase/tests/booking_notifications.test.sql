-- Provas PR-7: notificações de pedido online + aceite/recusa por profissional.
-- Roda DEPOIS da migration 20261004112214. Falha antes dela (trigger/colunas ausentes).

CREATE TEMP TABLE pr7_fail (msg text);

CREATE OR REPLACE FUNCTION pg_temp.fail(p_msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO pr7_fail VALUES (p_msg);
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
    RETURN COALESCE(v, 'ok');
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
  v_owner text := '00000000-0000-0000-0000-0000000000a0';
  v_x uuid := '10000000-0000-0000-0000-0000000000a1';
  v_y uuid := '10000000-0000-0000-0000-0000000000a2';
  v_inact uuid := '10000000-0000-0000-0000-0000000000a3';
  v_uid_x text := '00000000-0000-0000-0000-0000000000b1';
  v_uid_y text := '00000000-0000-0000-0000-0000000000b2';
  v_uid_inact text := '00000000-0000-0000-0000-0000000000b3';
  v_svc uuid := '20000000-0000-0000-0000-000000000001';
  v_phone text := '351912345678';
  v_at timestamptz := timestamptz '2027-10-03 17:00:00+00';
  v_at2 timestamptz := timestamptz '2027-10-03 19:00:00+00';
  v_when text := 'dom., 03/10 às 14:00';
  v_when2 text := 'dom., 03/10 às 16:00';
  v_bk uuid;
  v_bk2 uuid;
  v_cnt int;
  v_msg text;
  v_got text;
  v_id uuid;
BEGIN
  PERFORM set_config('TIMEZONE', 'UTC', true);

  IF to_regprocedure('public.notify_public_booking_requests()') IS NULL THEN
    PERFORM pg_temp.fail('notify_public_booking_requests deveria existir após a migration');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'notify_public_booking_requests_trg'
  ) THEN
    PERFORM pg_temp.fail('faltou trigger notify_public_booking_requests_trg');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'link'
  ) THEN
    PERFORM pg_temp.fail('faltou notifications.link');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'booking_id'
  ) THEN
    PERFORM pg_temp.fail('faltou notifications.booking_id');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'event_key'
  ) THEN
    PERFORM pg_temp.fail('faltou notifications.event_key');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    PERFORM pg_temp.fail('notifications fora da publication supabase_realtime');
  END IF;

  DELETE FROM public.notifications;
  DELETE FROM public.public_bookings;

  -- Pedido com profissional X: dono + X
  INSERT INTO public.public_bookings (
    business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    v_biz, v_phone, 'Ana', ARRAY[v_svc], v_x, v_at, 35, 'pending', 30, false
  ) RETURNING id INTO v_bk;

  SELECT count(*) INTO v_cnt FROM public.notifications WHERE booking_id = v_bk;
  PERFORM pg_temp.check('novo pedido X: 2 destinatários', v_cnt::text, '2');

  SELECT message INTO v_msg
  FROM public.notifications
  WHERE booking_id = v_bk AND user_id = v_owner;
  PERFORM pg_temp.check('copy novo pedido dono', v_msg,
    'Novo pedido: Ana, Corte, ' || v_when);

  SELECT message INTO v_msg
  FROM public.notifications
  WHERE booking_id = v_bk AND user_id = v_uid_x;
  PERFORM pg_temp.check('copy novo pedido X', v_msg,
    'Novo pedido: Ana, Corte, ' || v_when);

  SELECT count(*) INTO v_cnt
  FROM public.notifications
  WHERE booking_id = v_bk AND user_id IN (v_uid_y, v_uid_inact);
  PERFORM pg_temp.check('Y e inativo não notificados no pedido de X', v_cnt::text, '0');

  -- Pedido "qualquer profissional": só dono
  INSERT INTO public.public_bookings (
    business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    v_biz, v_phone, 'Ana', ARRAY[v_svc], NULL, v_at2, 35, 'pending', 30, false
  ) RETURNING id INTO v_bk2;

  SELECT count(*) INTO v_cnt FROM public.notifications WHERE booking_id = v_bk2;
  PERFORM pg_temp.check('pedido qualquer: só dono', v_cnt::text, '1');
  PERFORM pg_temp.check('pedido qualquer: user_id dono',
    (SELECT user_id FROM public.notifications WHERE booking_id = v_bk2), v_owner);

  -- Pedido de profissional inativo: só dono
  INSERT INTO public.public_bookings (
    business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    v_biz, v_phone, 'Ana', ARRAY[v_svc], v_inact, v_at, 35, 'pending', 30, false
  ) RETURNING id INTO v_id;
  SELECT count(*) INTO v_cnt FROM public.notifications WHERE booking_id = v_id AND user_id = v_uid_inact;
  PERFORM pg_temp.check('inativo não notificado', v_cnt::text, '0');
  SELECT count(*) INTO v_cnt FROM public.notifications WHERE booking_id = v_id AND user_id = v_owner;
  PERFORM pg_temp.check('inativo: dono notificado', v_cnt::text, '1');

  -- Pedido de alteração: dono + profissional
  UPDATE public.public_bookings
     SET status = 'pending',
         is_edit = true,
         original_appointment_time = appointment_time,
         original_professional_id = professional_id,
         appointment_time = v_at2
   WHERE id = v_bk;

  SELECT message INTO v_msg
  FROM public.notifications
  WHERE booking_id = v_bk AND user_id = v_owner AND event_key = 'edit:' || v_bk::text;
  PERFORM pg_temp.check('copy alteração dono', v_msg,
    'Pedido de alteração: Ana, de ' || v_when || ' para ' || v_when2);

  SELECT count(*) INTO v_cnt
  FROM public.notifications
  WHERE booking_id = v_bk AND event_key = 'edit:' || v_bk::text;
  PERFORM pg_temp.check('alteração: dono + X', v_cnt::text, '2');

  -- Dedupe: substituir a alteração não spam
  UPDATE public.public_bookings
     SET appointment_time = v_at2
   WHERE id = v_bk;
  SELECT count(*) INTO v_cnt
  FROM public.notifications
  WHERE booking_id = v_bk AND event_key = 'edit:' || v_bk::text AND read = false;
  PERFORM pg_temp.check('dedupe alteração unread', v_cnt::text, '2');

  -- Troca de profissional: notifica X (antigo) e Y (novo) + dono
  UPDATE public.public_bookings
     SET professional_id = v_y
   WHERE id = v_bk;
  SELECT count(*) INTO v_cnt
  FROM public.notifications
  WHERE booking_id = v_bk AND event_key = 'edit:' || v_bk::text AND user_id = v_uid_x;
  PERFORM pg_temp.check('troca pro: X antigo notificado', v_cnt::text, '1');
  SELECT count(*) INTO v_cnt
  FROM public.notifications
  WHERE booking_id = v_bk AND event_key = 'edit:' || v_bk::text AND user_id = v_uid_y;
  PERFORM pg_temp.check('troca pro: Y novo notificado', v_cnt::text, '1');
  SELECT count(*) INTO v_cnt
  FROM public.notifications
  WHERE booking_id = v_bk AND event_key = 'edit:' || v_bk::text AND user_id = v_owner;
  PERFORM pg_temp.check('troca pro: dono sem spam', v_cnt::text, '1');

  -- RLS: Y não lê notificações de X
  v_got := pg_temp.run_as('authenticated', v_uid_y,
    format('SELECT count(*)::text FROM public.notifications WHERE user_id = %L', v_uid_x));
  PERFORM pg_temp.check('RLS Y não lê X', v_got, '0');
  v_got := pg_temp.run_as('authenticated', v_uid_x,
    format('SELECT count(*)::text FROM public.notifications WHERE user_id = %L', v_uid_x));
  IF v_got IS NULL OR v_got = 'error:' OR v_got LIKE 'error:%' THEN
    PERFORM pg_temp.fail('RLS X deveria ler as próprias: ' || COALESCE(v_got, 'NULL'));
  END IF;
  PERFORM pg_temp.check('RLS X lê as próprias (n>0)', (v_got::int > 0)::text, 'true');

  -- Grants: authenticated não INSERT/DELETE; só UPDATE(read) na própria linha
  SELECT id INTO v_id FROM public.notifications WHERE user_id = v_uid_x LIMIT 1;
  v_got := pg_temp.run_as('authenticated', v_uid_x,
    format('INSERT INTO public.notifications (user_id, title, message) VALUES (%L, ''x'', ''y'') RETURNING id::text', v_uid_x));
  PERFORM pg_temp.check('auth não INSERT notification', (v_got LIKE 'error:%')::text, 'true');

  v_got := pg_temp.run_as('authenticated', v_uid_x,
    format('DELETE FROM public.notifications WHERE id = %L::uuid RETURNING id::text', v_id));
  PERFORM pg_temp.check('auth não DELETE notification', (v_got LIKE 'error:%')::text, 'true');
  PERFORM pg_temp.check('DELETE não removeu',
    (SELECT count(*)::text FROM public.notifications WHERE id = v_id), '1');

  v_got := pg_temp.run_as('authenticated', v_uid_x,
    format('UPDATE public.notifications SET title = ''hack'' WHERE id = %L::uuid RETURNING title', v_id));
  PERFORM pg_temp.check('auth não UPDATE title', (v_got LIKE 'error:%')::text, 'true');

  v_got := pg_temp.run_as('authenticated', v_uid_x,
    format('UPDATE public.notifications SET user_id = %L WHERE id = %L::uuid RETURNING user_id', v_uid_y, v_id));
  PERFORM pg_temp.check('auth não UPDATE user_id', (v_got LIKE 'error:%')::text, 'true');

  v_got := pg_temp.run_as('authenticated', v_uid_x,
    format('UPDATE public.notifications SET read = true WHERE id = %L::uuid RETURNING read::text', v_id));
  PERFORM pg_temp.check('auth UPDATE read próprio', v_got, 'true');
  UPDATE public.notifications SET read = false WHERE id = v_id;

  v_got := pg_temp.run_as('authenticated', v_uid_y,
    format('UPDATE public.notifications SET read = true WHERE id = %L::uuid RETURNING read::text', v_id));
  PERFORM pg_temp.check('auth não UPDATE read de outro', (v_got IS DISTINCT FROM 'true')::text, 'true');
  PERFORM pg_temp.check('read do outro intacto',
    (SELECT read::text FROM public.notifications WHERE id = v_id), 'false');

  PERFORM pg_temp.check('auth sem execute caller_can_act',
    has_function_privilege(
      'authenticated',
      'public.caller_can_act_on_public_booking(public.public_bookings)',
      'EXECUTE'
    )::text,
    'false');
  v_got := pg_temp.run_as('authenticated', v_uid_x,
    'SELECT public.caller_can_act_on_public_booking((SELECT p FROM public.public_bookings p LIMIT 1))::text');
  PERFORM pg_temp.check('auth não chama caller_can_act', (v_got LIKE 'error:%')::text, 'true');

  -- Aceite/recusa: dono, X, Y, Y com scope all
  UPDATE public.business_settings
     SET staff_appointment_edit_scope = 'none'
   WHERE user_id = v_biz;

  DELETE FROM public.public_bookings;
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01',
    v_biz, v_phone, 'Ana', ARRAY[v_svc], v_x, v_at, 35, 'pending', 30, false
  );
  v_got := pg_temp.run_as('authenticated', v_owner,
    'SELECT (public.accept_public_booking_v2(''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01''::uuid)->>''booking_id'')');
  PERFORM pg_temp.check('dono aceita X', (v_got NOT LIKE 'error:%')::text, 'true');

  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02',
    v_biz, v_phone, 'Ana', ARRAY[v_svc], v_x, v_at, 35, 'pending', 30, false
  );
  v_got := pg_temp.run_as('authenticated', v_uid_x,
    'SELECT (public.accept_public_booking_v2(''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02''::uuid)->>''booking_id'')');
  PERFORM pg_temp.check('X aceita o próprio', (v_got NOT LIKE 'error:%')::text, 'true');

  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03',
    v_biz, v_phone, 'Ana', ARRAY[v_svc], v_x, v_at, 35, 'pending', 30, false
  );
  v_got := pg_temp.run_as('authenticated', v_uid_y,
    'SELECT public.accept_public_booking_v2(''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03''::uuid)::text');
  PERFORM pg_temp.check('Y recusado no pedido de X',
    (v_got LIKE '%not_allowed_for_booking%')::text, 'true');

  v_got := pg_temp.run_as('authenticated', v_uid_y,
    'SELECT public.reject_public_booking_v2(''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03''::uuid)::text');
  PERFORM pg_temp.check('Y recusa recusada no pedido de X',
    (v_got LIKE '%not_allowed_for_booking%')::text, 'true');

  UPDATE public.business_settings SET staff_appointment_edit_scope = 'all' WHERE user_id = v_biz;
  v_got := pg_temp.run_as('authenticated', v_uid_y,
    'SELECT (public.reject_public_booking_v2(''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03''::uuid)::text)');
  PERFORM pg_temp.check('Y com scope all recusa X', (v_got NOT LIKE 'error:%')::text, 'true');

  -- Pedido sem profissional: Y sem all não age; com all age
  UPDATE public.business_settings SET staff_appointment_edit_scope = 'none' WHERE user_id = v_biz;
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa04',
    v_biz, v_phone, 'Ana', ARRAY[v_svc], NULL, v_at, 35, 'pending', 30, false
  );
  v_got := pg_temp.run_as('authenticated', v_uid_y,
    'SELECT public.accept_public_booking_v2(''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa04''::uuid)::text');
  PERFORM pg_temp.check('Y não aceita pedido qualquer',
    (v_got LIKE '%not_allowed_for_booking%')::text, 'true');
  v_got := pg_temp.run_as('authenticated', v_owner,
    'SELECT (public.accept_public_booking_v2(''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa04''::uuid)->>''booking_id'')');
  PERFORM pg_temp.check('dono aceita pedido qualquer', (v_got NOT LIKE 'error:%')::text, 'true');

  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa05',
    v_biz, v_phone, 'Ana', ARRAY[v_svc], NULL, v_at, 35, 'pending', 30, false
  );
  UPDATE public.business_settings SET staff_appointment_edit_scope = 'all' WHERE user_id = v_biz;
  v_got := pg_temp.run_as('authenticated', v_uid_y,
    'SELECT (public.accept_public_booking_v2(''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa05''::uuid)->>''booking_id'')');
  PERFORM pg_temp.check('Y com all aceita pedido qualquer', (v_got NOT LIKE 'error:%')::text, 'true');

  -- Inativo não age
  UPDATE public.business_settings SET staff_appointment_edit_scope = 'all' WHERE user_id = v_biz;
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa06',
    v_biz, v_phone, 'Ana', ARRAY[v_svc], v_x, v_at, 35, 'pending', 30, false
  );
  v_got := pg_temp.run_as('authenticated', v_uid_inact,
    'SELECT public.accept_public_booking_v2(''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa06''::uuid)::text');
  PERFORM pg_temp.check('inativo não aceita mesmo com all',
    (v_got LIKE '%not_allowed_for_booking%')::text, 'true');

  -- Falha da notificação não quebra o insert
  PERFORM set_config('agendix.fail_booking_notifications', 'on', false);
  INSERT INTO public.public_bookings (
    business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status, duration_minutes, is_edit
  ) VALUES (
    v_biz, v_phone, 'Ana', ARRAY[v_svc], v_x, v_at, 35, 'pending', 30, false
  ) RETURNING id INTO v_id;
  PERFORM pg_temp.check('insert sobrevive falha de notificação',
    (SELECT status FROM public.public_bookings WHERE id = v_id), 'pending');
  PERFORM set_config('agendix.fail_booking_notifications', 'off', false);

  -- Grants v2 intactos
  PERFORM pg_temp.check('anon sem accept v2',
    has_function_privilege('anon', 'public.accept_public_booking_v2(uuid)', 'EXECUTE')::text, 'false');
  PERFORM pg_temp.check('anon sem reject v2',
    has_function_privilege('anon', 'public.reject_public_booking_v2(uuid)', 'EXECUTE')::text, 'false');
  PERFORM pg_temp.check('auth tem accept v2',
    has_function_privilege('authenticated', 'public.accept_public_booking_v2(uuid)', 'EXECUTE')::text, 'true');
  PERFORM pg_temp.check('auth tem reject v2',
    has_function_privilege('authenticated', 'public.reject_public_booking_v2(uuid)', 'EXECUTE')::text, 'true');
END;
$$;
