-- Provas PR-4: completed / no_show / undo / cancel-after-complete /
-- multi-serviço / inferência legado / constraint / broadcast #122.

CREATE TEMP TABLE pr4_fail (msg text);

CREATE OR REPLACE FUNCTION pg_temp.fail(p_msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO pr4_fail VALUES (p_msg);
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

DO $$
DECLARE
  v_biz text := '00000000-0000-0000-0000-0000000000a0';
  v_pro uuid := '10000000-0000-0000-0000-0000000000a0';
  v_cli uuid := '30000000-0000-0000-0000-000000000001';
  v_svc uuid := '20000000-0000-0000-0000-000000000001';
  v_bk uuid;
  v_a1 uuid;
  v_a2 uuid;
  v_status text;
  v_hist text;
  v_bcast int;
  v_cons text;
  v_i int;
  v_fin int;
  v_pass int;
  v_phone text := '351912345678';
BEGIN
  -- Constraint: no_show ainda recusado antes da migration (este arquivo corre DEPOIS)
  SELECT pg_get_constraintdef(oid) INTO v_cons
  FROM pg_constraint
  WHERE conname = 'public_bookings_status_check'
    AND conrelid = 'public.public_bookings'::regclass;
  IF v_cons NOT ILIKE '%no_show%' THEN
    PERFORM pg_temp.fail('constraint deveria incluir no_show após a migration: ' || COALESCE(v_cons, 'NULL'));
  END IF;
  IF v_cons NOT ILIKE '%pending%' OR v_cons NOT ILIKE '%confirmed%'
     OR v_cons NOT ILIKE '%cancelled%' OR v_cons NOT ILIKE '%completed%' THEN
    PERFORM pg_temp.fail('constraint perdeu valores antigos: ' || v_cons);
  END IF;
  PERFORM pg_temp.check('constraint superset contém no_show + os 4 anteriores', 'ok', 'ok');

  -- 1) checkout Completed → booking completed + broadcast
  v_bk := '51000000-0000-0000-0000-000000000001';
  v_a1 := '41000000-0000-0000-0000-000000000001';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, now() + interval '2 hours', 35, 'confirmed'
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status, public_booking_id, origin
  ) VALUES (
    v_a1, v_biz, v_cli, v_pro, 'Corte', (SELECT appointment_time FROM public.public_bookings WHERE id = v_bk),
    35, 'Confirmed', v_bk, 'booking'
  );
  DELETE FROM realtime.send_log;
  UPDATE public.appointments SET status = 'Completed' WHERE id = v_a1;
  SELECT status INTO v_status FROM public.public_bookings WHERE id = v_bk;
  PERFORM pg_temp.check('checkout Completed espelha completed', v_status, 'completed');
  SELECT count(*) INTO v_bcast FROM realtime.send_log
   WHERE topic = 'booking:' || v_bk::text AND payload->>'status' = 'completed';
  PERFORM pg_temp.check('broadcast #122 no completed', v_bcast::text, '1');
  SELECT status INTO v_hist FROM public.get_client_bookings_history_v2(v_phone, v_biz::uuid) WHERE id = v_bk;
  PERFORM pg_temp.check('v2 lê completed', v_hist, 'completed');
  IF EXISTS (SELECT 1 FROM public.get_client_bookings_history(v_phone, v_biz::uuid) WHERE id = v_bk AND status = 'completed') THEN
    RAISE NOTICE 'PASS  v1 também vê a linha gravada completed';
  ELSE
    PERFORM pg_temp.fail('v1 deveria ver o status gravado (não é só v2)');
  END IF;

  -- 2) NoShow → no_show + broadcast
  v_bk := '51000000-0000-0000-0000-000000000002';
  v_a1 := '41000000-0000-0000-0000-000000000002';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, now() + interval '3 hours', 35, 'confirmed'
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status, public_booking_id
  ) VALUES (
    v_a1, v_biz, v_cli, v_pro, 'Corte', (SELECT appointment_time FROM public.public_bookings WHERE id = v_bk),
    35, 'Confirmed', v_bk
  );
  DELETE FROM realtime.send_log;
  UPDATE public.appointments SET status = 'NoShow' WHERE id = v_a1;
  SELECT status INTO v_status FROM public.public_bookings WHERE id = v_bk;
  PERFORM pg_temp.check('Faltou espelha no_show', v_status, 'no_show');
  SELECT count(*) INTO v_bcast FROM realtime.send_log
   WHERE topic = 'booking:' || v_bk::text AND payload->>'status' = 'no_show';
  PERFORM pg_temp.check('broadcast #122 no no_show', v_bcast::text, '1');

  -- 3) undo Faltou → confirmed + broadcast
  DELETE FROM realtime.send_log;
  UPDATE public.appointments SET status = 'Confirmed' WHERE id = v_a1;
  SELECT status INTO v_status FROM public.public_bookings WHERE id = v_bk;
  PERFORM pg_temp.check('desfazer Faltou volta confirmed', v_status, 'confirmed');
  SELECT count(*) INTO v_bcast FROM realtime.send_log
   WHERE payload->>'status' = 'confirmed';
  PERFORM pg_temp.check('broadcast #122 no undo no_show', v_bcast::text, '1');

  -- 4) cancel after complete
  v_bk := '51000000-0000-0000-0000-000000000003';
  v_a1 := '41000000-0000-0000-0000-000000000003';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, now() + interval '4 hours', 35, 'confirmed'
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status, public_booking_id
  ) VALUES (
    v_a1, v_biz, v_cli, v_pro, 'Corte', (SELECT appointment_time FROM public.public_bookings WHERE id = v_bk),
    35, 'Confirmed', v_bk
  );
  UPDATE public.appointments SET status = 'Completed' WHERE id = v_a1;
  DELETE FROM realtime.send_log;
  UPDATE public.appointments SET status = 'Cancelled' WHERE id = v_a1;
  SELECT status INTO v_status FROM public.public_bookings WHERE id = v_bk;
  PERFORM pg_temp.check('cancelar depois de Finalizado → cancelled', v_status, 'cancelled');
  SELECT count(*) INTO v_bcast FROM realtime.send_log
   WHERE payload->>'status' = 'cancelled';
  PERFORM pg_temp.check('broadcast #122 no cancel-after-complete', v_bcast::text, '1');

  -- 5) multi-serviço
  v_bk := '51000000-0000-0000-0000-000000000004';
  v_a1 := '41000000-0000-0000-0000-000000000041';
  v_a2 := '41000000-0000-0000-0000-000000000042';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, now() + interval '5 hours', 70, 'confirmed'
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status, public_booking_id
  ) VALUES
    (v_a1, v_biz, v_cli, v_pro, 'Corte', (SELECT appointment_time FROM public.public_bookings WHERE id = v_bk), 35, 'Confirmed', v_bk),
    (v_a2, v_biz, v_cli, v_pro, 'Barba', (SELECT appointment_time FROM public.public_bookings WHERE id = v_bk), 35, 'Confirmed', v_bk);
  UPDATE public.appointments SET status = 'Completed' WHERE id = v_a1;
  SELECT status INTO v_status FROM public.public_bookings WHERE id = v_bk;
  PERFORM pg_temp.check('multi: um Completed ainda confirmed', v_status, 'confirmed');
  UPDATE public.appointments SET status = 'Completed' WHERE id = v_a2;
  SELECT status INTO v_status FROM public.public_bookings WHERE id = v_bk;
  PERFORM pg_temp.check('multi: todos Completed → completed', v_status, 'completed');

  v_bk := '51000000-0000-0000-0000-000000000005';
  v_a1 := '41000000-0000-0000-0000-000000000051';
  v_a2 := '41000000-0000-0000-0000-000000000052';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, now() + interval '6 hours', 70, 'confirmed'
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status, public_booking_id
  ) VALUES
    (v_a1, v_biz, v_cli, v_pro, 'Corte', (SELECT appointment_time FROM public.public_bookings WHERE id = v_bk), 35, 'Confirmed', v_bk),
    (v_a2, v_biz, v_cli, v_pro, 'Barba', (SELECT appointment_time FROM public.public_bookings WHERE id = v_bk), 35, 'Confirmed', v_bk);
  UPDATE public.appointments SET status = 'NoShow' WHERE id = v_a1;
  SELECT status INTO v_status FROM public.public_bookings WHERE id = v_bk;
  PERFORM pg_temp.check('multi: um NoShow e nenhum Completed → no_show', v_status, 'no_show');
  UPDATE public.appointments SET status = 'Completed' WHERE id = v_a2;
  SELECT status INTO v_status FROM public.public_bookings WHERE id = v_bk;
  PERFORM pg_temp.check('multi: mistura Completed+NoShow volta a confirmed', v_status, 'confirmed');

  -- 6) fila INSERT Completed
  v_bk := '51000000-0000-0000-0000-000000000006';
  v_a1 := '41000000-0000-0000-0000-000000000006';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, now() + interval '7 hours', 35, 'confirmed'
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status, public_booking_id, origin
  ) VALUES (
    v_a1, v_biz, v_cli, v_pro, 'Corte', (SELECT appointment_time FROM public.public_bookings WHERE id = v_bk),
    35, 'Completed', v_bk, 'queue'
  );
  SELECT status INTO v_status FROM public.public_bookings WHERE id = v_bk;
  PERFORM pg_temp.check('fila INSERT Completed espelha completed', v_status, 'completed');

  -- 7) Inferência legado (sem public_booking_id): 43 confirmed passados.
  -- Simula prod: appointments Completed já existiam ANTES deste PR (trigger desligado).
  -- 21 com appointment Completed → v2 completed (Finalizado)
  -- 22 sem Completed → v2 confirmed (Horário passou)
  ALTER TABLE public.appointments DISABLE TRIGGER sync_public_booking_on_appointment_outcome;
  FOR v_i IN 1..43 LOOP
    INSERT INTO public.public_bookings (
      id, business_id, customer_phone, customer_name, service_ids, professional_id,
      appointment_time, total_price, status, created_at
    ) VALUES (
      ('52000000-0000-0000-0000-0000000000' || lpad(v_i::text, 2, '0'))::uuid,
      v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro,
      timestamptz '2026-09-01 14:00:00+00' + (v_i || ' minutes')::interval,
      35, 'confirmed', now() - interval '30 days'
    );
    IF v_i <= 21 THEN
      INSERT INTO public.appointments (
        id, user_id, client_id, professional_id, service, appointment_time, price, status
      ) VALUES (
        ('42000000-0000-0000-0000-0000000000' || lpad(v_i::text, 2, '0'))::uuid,
        v_biz, v_cli, v_pro, 'Corte',
        timestamptz '2026-09-01 14:00:00+00' + (v_i || ' minutes')::interval,
        35, 'Completed'
      );
    END IF;
  END LOOP;
  ALTER TABLE public.appointments ENABLE TRIGGER sync_public_booking_on_appointment_outcome;

  SELECT
    count(*) FILTER (WHERE h.status = 'completed'),
    count(*) FILTER (WHERE h.status = 'confirmed')
  INTO v_fin, v_pass
  FROM public.get_client_bookings_history_v2(v_phone, v_biz::uuid) h
  WHERE h.id::text LIKE '52000000-0000-0000-0000-0000000000%';

  PERFORM pg_temp.check('legado 43 confirmed: Finalizado (completed)', v_fin::text, '21');
  PERFORM pg_temp.check('legado 43 confirmed: Horário passou (confirmed)', v_pass::text, '22');
  IF EXISTS (
    SELECT 1 FROM public.public_bookings
    WHERE id::text LIKE '52000000-0000-0000-0000-0000000000%'
      AND status IS DISTINCT FROM 'confirmed'
  ) THEN
    PERFORM pg_temp.fail('inferência não pode reescrever public_bookings');
  END IF;
  PERFORM pg_temp.check('inferência é só leitura', 'ok', 'ok');

  -- v1 intacta: legado continua confirmed
  SELECT status INTO v_hist FROM public.get_client_bookings_history(v_phone, v_biz::uuid)
   WHERE id = '52000000-0000-0000-0000-000000000001';
  PERFORM pg_temp.check('v1 legado segue confirmed', v_hist, 'confirmed');

  -- pending não é tocado
  v_bk := '51000000-0000-0000-0000-000000000007';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, now() + interval '8 hours', 35, 'pending'
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status, public_booking_id
  ) VALUES (
    '41000000-0000-0000-0000-000000000007', v_biz, v_cli, v_pro, 'Corte',
    (SELECT appointment_time FROM public.public_bookings WHERE id = v_bk), 35, 'Completed', v_bk
  );
  SELECT status INTO v_status FROM public.public_bookings WHERE id = v_bk;
  PERFORM pg_temp.check('pending não é promovido', v_status, 'pending');

  -- 8) cancelled + appointment Confirmed atualizado NÃO ressuscita
  v_bk := '51000000-0000-0000-0000-000000000008';
  v_a1 := '41000000-0000-0000-0000-000000000008';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, now() + interval '9 hours', 35, 'cancelled'
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status, public_booking_id
  ) VALUES (
    v_a1, v_biz, v_cli, v_pro, 'Corte',
    (SELECT appointment_time FROM public.public_bookings WHERE id = v_bk), 35, 'Confirmed', v_bk
  );
  UPDATE public.appointments SET status = 'Confirmed' WHERE id = v_a1;
  SELECT status INTO v_status FROM public.public_bookings WHERE id = v_bk;
  PERFORM pg_temp.check('cancelled + Confirmed updated permanece cancelled', v_status, 'cancelled');

  -- 9) completed → appointment de volta a Confirmed → confirmed (undo ainda funciona)
  v_bk := '51000000-0000-0000-0000-000000000009';
  v_a1 := '41000000-0000-0000-0000-000000000009';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, v_phone, 'Ana', ARRAY[v_svc], v_pro, now() + interval '10 hours', 35, 'confirmed'
  );
  INSERT INTO public.appointments (
    id, user_id, client_id, professional_id, service, appointment_time, price, status, public_booking_id
  ) VALUES (
    v_a1, v_biz, v_cli, v_pro, 'Corte',
    (SELECT appointment_time FROM public.public_bookings WHERE id = v_bk), 35, 'Confirmed', v_bk
  );
  UPDATE public.appointments SET status = 'Completed' WHERE id = v_a1;
  SELECT status INTO v_status FROM public.public_bookings WHERE id = v_bk;
  PERFORM pg_temp.check('pre-undo completed', v_status, 'completed');
  UPDATE public.appointments SET status = 'Confirmed' WHERE id = v_a1;
  SELECT status INTO v_status FROM public.public_bookings WHERE id = v_bk;
  PERFORM pg_temp.check('completed → Confirmed volta confirmed', v_status, 'confirmed');

  -- 10) privacidade v2: igualdade de dígitos, não last-8
  v_bk := '54000000-0000-0000-0000-000000000001';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, '+55 11 98765-4321', 'Ana SP', ARRAY[v_svc], v_pro,
    now() + interval '11 hours', 35, 'confirmed'
  );

  SELECT count(*) INTO v_fin
  FROM public.get_client_bookings_history_v2('5511987654321', v_biz::uuid)
  WHERE id = v_bk;
  PERFORM pg_temp.check('v2 formatação compacta do mesmo número', v_fin::text, '1');

  SELECT count(*) INTO v_fin
  FROM public.get_client_bookings_history_v2('+55 (11) 98765-4321', v_biz::uuid)
  WHERE id = v_bk;
  PERFORM pg_temp.check('v2 formatação com parênteses do mesmo número', v_fin::text, '1');

  SELECT count(*) INTO v_fin
  FROM public.get_client_bookings_history_v2('55 11 98765-4321', v_biz::uuid)
  WHERE id = v_bk;
  PERFORM pg_temp.check('v2 espaços do mesmo número', v_fin::text, '1');

  SELECT count(*) INTO v_fin
  FROM public.get_client_bookings_history_v2('21 98765-4321', v_biz::uuid)
  WHERE id = v_bk;
  PERFORM pg_temp.check('v2 DDD 21 não vê cliente +55 11', v_fin::text, '0');

  SELECT count(*) INTO v_fin
  FROM public.get_client_bookings_history_v2('21987654321', v_biz::uuid)
  WHERE id = v_bk;
  PERFORM pg_temp.check('v2 last-8 do DDD 21 não vaza no +55 11', v_fin::text, '0');

  -- mesmo número local (sem DDI), compacto 11987654321-style
  v_bk := '54000000-0000-0000-0000-000000000002';
  INSERT INTO public.public_bookings (
    id, business_id, customer_phone, customer_name, service_ids, professional_id,
    appointment_time, total_price, status
  ) VALUES (
    v_bk, v_biz, '11 98765-4321', 'Ana local', ARRAY[v_svc], v_pro,
    now() + interval '12 hours', 35, 'confirmed'
  );
  SELECT count(*) INTO v_fin
  FROM public.get_client_bookings_history_v2('11987654321', v_biz::uuid)
  WHERE id = v_bk;
  PERFORM pg_temp.check('v2 11987654321 casa 11 98765-4321', v_fin::text, '1');
  SELECT count(*) INTO v_fin
  FROM public.get_client_bookings_history_v2('+55 11 98765-4321', v_biz::uuid)
  WHERE id = '54000000-0000-0000-0000-000000000001';
  PERFORM pg_temp.check('v2 +55 11 casa o pedido gravado com +55', v_fin::text, '1');
  SELECT count(*) INTO v_fin
  FROM public.get_client_bookings_history_v2('+55 11 98765-4321', v_biz::uuid)
  WHERE id = '54000000-0000-0000-0000-000000000002';
  PERFORM pg_temp.check('v2 +55 11 não vê o 11 local (dígitos diferentes)', v_fin::text, '0');
  SELECT count(*) INTO v_fin
  FROM public.get_client_bookings_history_v2('21 98765-4321', v_biz::uuid) h
  WHERE h.id IN (
    '54000000-0000-0000-0000-000000000001'::uuid,
    '54000000-0000-0000-0000-000000000002'::uuid
  );
  PERFORM pg_temp.check('v2 DDD 21 não vê nenhum pedido do 11', v_fin::text, '0');

  RAISE NOTICE 'booking completed/noshow tests ok';
END
$$;
