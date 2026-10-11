-- Provas de 20261011202904_public_bookings_anon_lockdown.
-- Roda na cadeia do auto-confirm + public_bookings_security.harness.sql (= prod).
-- [S] = segurança: FALHA antes da migration, passa depois.
-- [F] = fluxo que tem que continuar igual: passa antes E depois.
-- Cada check grava em pbs_result; no fim, RAISE se algum falhou.

SET TIMEZONE = 'UTC';
SET client_min_messages = notice;
CREATE TEMP TABLE pbs_result (n serial, name text, ok boolean, detail text);
GRANT ALL ON pbs_result TO PUBLIC;
GRANT ALL ON SEQUENCE pbs_result_n_seq TO PUBLIC;

CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_exp text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO pbs_result(name, ok, detail)
  VALUES (p_name, p_got IS NOT DISTINCT FROM p_exp,
          'got=' || COALESCE(p_got, 'NULL') || ' expected=' || COALESCE(p_exp, 'NULL'));
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.check_like(p_name text, p_got text, p_pattern text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO pbs_result(name, ok, detail)
  VALUES (p_name, COALESCE(p_got LIKE p_pattern, false),
          'got=' || COALESCE(p_got, 'NULL') || ' like=' || p_pattern);
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.run_as(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), false);
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

-- IDs: A = negócio manual (dono a0, colaborador a1), B = negócio automático (dono b0).
--   eb000000-0000-0000-0001-… team_members, -0002-… services
CREATE OR REPLACE FUNCTION pg_temp.book(p_biz text, p_phone text, p_at timestamptz) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  RETURN pg_temp.run_as('anon', NULL, format(
    'SELECT status || ''|'' || id FROM public.create_public_booking(%L, %L, %L, ARRAY[%L]::uuid[], %L::uuid, %L::timestamptz, 40, 30, ''[]''::jsonb)',
    p_biz, 'Cliente Seg', p_phone,
    'eb000000-0000-0000-0002-' || right(p_biz, 12),
    'eb000000-0000-0000-0001-' || right(p_biz, 12),
    p_at));
END;
$$;
CREATE OR REPLACE FUNCTION pg_temp.bid(p_res text) RETURNS uuid LANGUAGE sql AS $$
  SELECT CASE WHEN p_res LIKE '%|%' THEN split_part(p_res, '|', 2)::uuid END
$$;
CREATE OR REPLACE FUNCTION pg_temp.slot(p_days int, p_hour int) RETURNS timestamptz LANGUAGE sql AS $$
  SELECT date_trunc('day', now()) + make_interval(days => p_days, hours => p_hour)
$$;

INSERT INTO public.profiles (id, role, company_id) VALUES
  ('eb000000-0000-0000-0000-0000000000a0', 'owner', 'eb000000-0000-0000-0000-0000000000a0'),
  ('eb000000-0000-0000-0000-0000000000a1', 'staff', 'eb000000-0000-0000-0000-0000000000a0'),
  ('eb000000-0000-0000-0000-0000000000b0', 'owner', 'eb000000-0000-0000-0000-0000000000b0');
INSERT INTO public.team_members (id, user_id, name, staff_user_id, is_owner, active, display_order, created_at) VALUES
  ('eb000000-0000-0000-0001-0000000000a0', 'eb000000-0000-0000-0000-0000000000a0', 'Dono A', NULL, true, true, 0, now() - interval '3 days'),
  ('eb000000-0000-0000-0001-0000000000a1', 'eb000000-0000-0000-0000-0000000000a0', 'Pro A1', 'eb000000-0000-0000-0000-0000000000a1', false, true, 1, now() - interval '2 days'),
  ('eb000000-0000-0000-0001-0000000000b0', 'eb000000-0000-0000-0000-0000000000b0', 'Dono B', NULL, true, true, 0, now() - interval '3 days');
INSERT INTO public.services (id, user_id, name, price, duration_minutes) VALUES
  ('eb000000-0000-0000-0002-0000000000a0', 'eb000000-0000-0000-0000-0000000000a0', 'Corte A', 40, 30),
  ('eb000000-0000-0000-0002-0000000000b0', 'eb000000-0000-0000-0000-0000000000b0', 'Corte B', 40, 30);
INSERT INTO public.business_settings (user_id) VALUES ('eb000000-0000-0000-0000-0000000000a0');
INSERT INTO public.business_settings (user_id, online_booking_requires_approval) VALUES ('eb000000-0000-0000-0000-0000000000b0', false);

CREATE TEMP TABLE pbs_ids (k text PRIMARY KEY, id uuid, phone text);
GRANT ALL ON pbs_ids TO PUBLIC;

-- [F] criação pública pelas RPCs (como a tela faz) ------------------------------------
DO $$
DECLARE v text;
BEGIN
  v := pg_temp.book('eb000000-0000-0000-0000-0000000000a0', '5511900001001', pg_temp.slot(10, 10));
  PERFORM pg_temp.check_like('F1 anon create_public_booking manual -> pending', v, 'pending|%');
  INSERT INTO pbs_ids VALUES ('manual', pg_temp.bid(v), '5511900001001');
  v := pg_temp.book('eb000000-0000-0000-0000-0000000000a0', '5511900001002', pg_temp.slot(10, 12));
  INSERT INTO pbs_ids VALUES ('manual2', pg_temp.bid(v), '5511900001002');
  v := pg_temp.book('eb000000-0000-0000-0000-0000000000a0', '5511900001004', pg_temp.slot(10, 14));
  INSERT INTO pbs_ids VALUES ('manual3', pg_temp.bid(v), '5511900001004');
  v := pg_temp.book('eb000000-0000-0000-0000-0000000000b0', '5511900001003', pg_temp.slot(10, 10));
  PERFORM pg_temp.check_like('F2 anon create_public_booking automático -> confirmed', v, 'confirmed|%');
  INSERT INTO pbs_ids VALUES ('auto', pg_temp.bid(v), '5511900001003');
  PERFORM pg_temp.check('F2 automático criou 1 appointment',
    (SELECT count(*)::text FROM public.appointments WHERE public_booking_id = (SELECT id FROM pbs_ids WHERE k = 'auto')), '1');
  PERFORM pg_temp.check('F3 notificações do pedido manual (dono + profissional)',
    (SELECT (count(*) > 0)::text FROM public.notifications WHERE booking_id = (SELECT id FROM pbs_ids WHERE k = 'manual')), 'true');
  v := pg_temp.book('eb000000-0000-0000-0000-0000000000b0', '5511900001009', pg_temp.slot(10, 10));
  PERFORM pg_temp.check_like('F4 mesmo horário pela RPC continua recusado', v, 'error:%slot_unavailable%');
END $$;

-- [S] anon não lista nem insere direto -------------------------------------------------
DO $$
DECLARE v text;
BEGIN
  v := pg_temp.run_as('anon', NULL, 'SELECT count(*)::text FROM public.public_bookings');
  PERFORM pg_temp.check('S1 anon SELECT em public_bookings -> 0 linhas', v, '0');
  v := pg_temp.run_as('anon', NULL, $q$SELECT count(*)::text FROM public.public_bookings WHERE business_id = 'eb000000-0000-0000-0000-0000000000a0' AND customer_phone IS NOT NULL$q$);
  PERFORM pg_temp.check('S2 anon SELECT filtrando por negócio (nome/telefone) -> 0 linhas', v, '0');
  v := pg_temp.run_as('anon', NULL, $q$INSERT INTO public.public_bookings (business_id, customer_name, customer_phone, service_ids, professional_id, appointment_time, total_price, status, duration_minutes)
       VALUES ('eb000000-0000-0000-0000-0000000000a0', 'Direto', '5511900009999', ARRAY['eb000000-0000-0000-0002-0000000000a0']::uuid[], 'eb000000-0000-0000-0001-0000000000a0', date_trunc('day', now()) + interval '10 days 10 hours', 1, 'pending', 30) RETURNING 'inserted'$q$);
  PERFORM pg_temp.check_like('S3 anon INSERT direto (mesmo horário ocupado) -> negado', v, 'error:%');
  v := pg_temp.run_as('anon', NULL, $q$INSERT INTO public.public_bookings (business_id, customer_name, customer_phone, service_ids, appointment_time, total_price, status)
       VALUES ('eb000000-0000-0000-0000-0000000000a0', 'Direto', '5511900009998', ARRAY['eb000000-0000-0000-0002-0000000000a0']::uuid[], date_trunc('day', now()) + interval '11 days 10 hours', 1, 'pending') RETURNING 'inserted'$q$);
  PERFORM pg_temp.check_like('S4 anon INSERT direto (horário livre) -> negado', v, 'error:%');
  v := pg_temp.run_as('authenticated', 'eb000000-0000-0000-0000-0000000000b0', $q$INSERT INTO public.public_bookings (business_id, customer_name, customer_phone, service_ids, appointment_time, total_price, status)
       VALUES ('eb000000-0000-0000-0000-0000000000a0', 'Outro dono', '5511900009997', ARRAY['eb000000-0000-0000-0002-0000000000a0']::uuid[], date_trunc('day', now()) + interval '12 days 10 hours', 1, 'pending') RETURNING 'inserted'$q$);
  PERFORM pg_temp.check_like('S5 logado de outro negócio INSERT direto no negócio A -> negado', v, 'error:%');
  PERFORM pg_temp.check('S6 anon sem privilégio INSERT na tabela',
    has_table_privilege('anon', 'public.public_bookings', 'INSERT')::text, 'false');
  PERFORM pg_temp.check('S7 nenhuma policy de public_bookings para anon',
    (SELECT count(*)::text FROM pg_policy WHERE polrelid = 'public.public_bookings'::regclass AND 'anon'::regrole::oid = ANY(polroles)), '0');
  PERFORM pg_temp.check('S8 nenhuma linha inserida direto',
    (SELECT count(*)::text FROM public.public_bookings WHERE customer_name IN ('Direto', 'Outro dono')), '0');
  v := pg_temp.run_as('anon', NULL, $q$WITH u AS (UPDATE public.public_bookings SET customer_name = 'x' RETURNING 1) SELECT count(*)::text FROM u$q$);
  PERFORM pg_temp.check_like('S9 anon UPDATE direto -> negado', v, 'error:%');
  v := pg_temp.run_as('anon', NULL, $q$WITH d AS (DELETE FROM public.public_bookings RETURNING 1) SELECT count(*)::text FROM d$q$);
  PERFORM pg_temp.check_like('S10 anon DELETE direto -> negado', v, 'error:%');
END $$;

-- [F] RPCs públicas da tela de sucesso / Minha Área -----------------------------------
DO $$
DECLARE v text; b uuid; ph text;
BEGIN
  SELECT id, phone INTO b, ph FROM pbs_ids WHERE k = 'manual';
  v := pg_temp.run_as('anon', NULL, format('SELECT id::text FROM public.get_active_booking_by_phone(%L, %L::uuid)', ph, 'eb000000-0000-0000-0000-0000000000a0'));
  PERFORM pg_temp.check('F5 anon get_active_booking_by_phone devolve o pedido', v, b::text);
  v := pg_temp.run_as('anon', NULL, format('SELECT count(*)::text FROM public.get_booking_by_id_v2(%L::uuid, %L)', b, ph));
  PERFORM pg_temp.check('F6 anon get_booking_by_id_v2 devolve o pedido', v, '1');
  v := pg_temp.run_as('anon', NULL, format('SELECT count(*)::text FROM public.get_booking_by_id_v2(%L::uuid, %L)', b, '5511999999999'));
  PERFORM pg_temp.check('F6 get_booking_by_id_v2 com outro telefone não devolve', v, '0');
  v := pg_temp.run_as('anon', NULL, format('SELECT (count(*) >= 1)::text FROM public.get_client_bookings_history_v2(%L, %L::uuid)', ph, 'eb000000-0000-0000-0000-0000000000a0'));
  PERFORM pg_temp.check('F7 anon get_client_bookings_history_v2 (Minha Área)', v, 'true');
  v := pg_temp.run_as('anon', NULL, format('SELECT count(*)::text FROM public.get_client_booking_cancellations(%L, %L::uuid)', ph, 'eb000000-0000-0000-0000-0000000000a0'));
  PERFORM pg_temp.check_like('F8 anon get_client_booking_cancellations roda', v, '%');
  PERFORM pg_temp.check_like('F8 get_client_booking_cancellations sem erro', v, '0');
  -- Já quebrada em prod antes desta correção (business_id text x uuid); fica igual.
  v := pg_temp.run_as('anon', NULL, format('SELECT count(*)::text FROM public.get_public_booking_by_id(%L::uuid, %L::uuid, %L)', b, 'eb000000-0000-0000-0000-0000000000a0', ph));
  PERFORM pg_temp.check_like('F9 get_public_booking_by_id: erro pré-existente de tipo, igual a prod', v, 'error:structure of query does not match function result type%');
  -- Alteração pelo cliente (link de edição)
  SELECT id, phone INTO b, ph FROM pbs_ids WHERE k = 'manual3';
  v := pg_temp.run_as('anon', NULL, format(
    'SELECT status FROM public.update_public_booking_by_client_v2(%L::uuid, %L, ARRAY[%L]::uuid[], %L::uuid, %L::timestamptz, %L::timestamptz, %L, %L, 40, 30, ''[]''::jsonb)',
    b, ph, 'eb000000-0000-0000-0002-0000000000a0', 'eb000000-0000-0000-0001-0000000000a0', pg_temp.slot(10, 16), pg_temp.slot(10, 14), 'Cliente Seg', ph));
  PERFORM pg_temp.check('F10 anon update_public_booking_by_client_v2 (editar pedido)', v, 'pending');
  -- Cancelamento em 15 min do auto-confirmado
  SELECT id, phone INTO b, ph FROM pbs_ids WHERE k = 'auto';
  v := pg_temp.run_as('anon', NULL, format('SELECT public.cancel_public_booking_by_client_v2(%L::uuid, %L)::text', b, ph));
  PERFORM pg_temp.check('F11 anon cancela auto-confirmado em até 15 min', v, 'true');
  PERFORM pg_temp.check('F11 pedido/appointment cancelados',
    (SELECT status FROM public.public_bookings WHERE id = b) || '|' || (SELECT status FROM public.appointments WHERE public_booking_id = b), 'cancelled|Cancelled');
END $$;

-- [F] dono / colaborador (authenticated) ----------------------------------------------
DO $$
DECLARE v text; b uuid;
BEGIN
  v := pg_temp.run_as('authenticated', 'eb000000-0000-0000-0000-0000000000a0', $q$SELECT count(*)::text FROM public.public_bookings WHERE customer_name = 'Cliente Seg'$q$);
  PERFORM pg_temp.check('F12 dono A vê só os 3 pedidos do negócio A', v, '3');
  v := pg_temp.run_as('authenticated', 'eb000000-0000-0000-0000-0000000000a1', $q$SELECT count(*)::text FROM public.public_bookings WHERE customer_name = 'Cliente Seg'$q$);
  PERFORM pg_temp.check('F13 colaborador A vê os pedidos da empresa', v, '3');
  v := pg_temp.run_as('authenticated', 'eb000000-0000-0000-0000-0000000000a0', $q$SELECT count(*)::text FROM public.list_company_pending_public_bookings() WHERE customer_name = 'Cliente Seg'$q$);
  PERFORM pg_temp.check('F14 dono A list_company_pending_public_bookings', v, '3');
  b := (SELECT id FROM pbs_ids WHERE k = 'manual');
  v := pg_temp.run_as('authenticated', 'eb000000-0000-0000-0000-0000000000a0', format($q$SELECT ((public.accept_public_booking_v2(%L::uuid))->>'appointment_id' IS NOT NULL)::text$q$, b));
  PERFORM pg_temp.check('F15 dono aceita pedido (accept_public_booking_v2)', v, 'true');
  PERFORM pg_temp.check('F15 pedido aceito = confirmed', (SELECT status FROM public.public_bookings WHERE id = b), 'confirmed');
  b := (SELECT id FROM pbs_ids WHERE k = 'manual2');
  v := pg_temp.run_as('authenticated', 'eb000000-0000-0000-0000-0000000000a0', format('SELECT public.reject_public_booking_v2(%L::uuid)::text', b));
  PERFORM pg_temp.check_like('F16 dono recusa pedido (reject_public_booking_v2)', v, '%');
  PERFORM pg_temp.check('F16 pedido recusado = cancelled', (SELECT status FROM public.public_bookings WHERE id = b), 'cancelled');
  b := (SELECT id FROM pbs_ids WHERE k = 'manual3');
  v := pg_temp.run_as('authenticated', 'eb000000-0000-0000-0000-0000000000a1', format($q$WITH u AS (UPDATE public.public_bookings SET notes = 'staff' WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, b));
  PERFORM pg_temp.check('F17 colaborador UPDATE direto no pedido da empresa (policy company update)', v, '1');
  v := pg_temp.run_as('authenticated', 'eb000000-0000-0000-0000-0000000000b0', $q$SELECT count(*)::text FROM public.public_bookings WHERE business_id = 'eb000000-0000-0000-0000-0000000000a0'$q$);
  PERFORM pg_temp.check('F18 dono B não vê pedidos de A', v, '0');
END $$;

-- Resultado ---------------------------------------------------------------------------
DO $$
DECLARE r record; n_fail int; n_ok int;
BEGIN
  FOR r IN SELECT * FROM pbs_result ORDER BY n LOOP
    RAISE NOTICE '%  %  (%)', CASE WHEN r.ok THEN 'PASS' ELSE 'FAIL' END, r.name, r.detail;
  END LOOP;
  SELECT count(*) FILTER (WHERE NOT ok), count(*) FILTER (WHERE ok) INTO n_fail, n_ok FROM pbs_result;
  IF n_fail > 0 THEN
    RAISE EXCEPTION 'public_bookings_security: % checks falharam (% ok)', n_fail, n_ok;
  END IF;
  RAISE NOTICE 'public_bookings_security: % checks ok', n_ok;
END $$;
