-- Provas de 20261012074447_fix_get_public_booking_by_id_type.
-- Roda na cadeia de test-sql-public-bookings-security.sh + migração #144 (= prod).
-- Antes da migração: toda chamada de get_public_booking_by_id falha (42804) → checks FALHAM.
SET TIMEZONE = 'UTC';
SET client_min_messages = notice;
CREATE TEMP TABLE bsp_result (n serial, name text, ok boolean, detail text);
CREATE TEMP TABLE bsp_ids (k text PRIMARY KEY, id uuid);

CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_exp text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO bsp_result(name, ok, detail) VALUES (p_name, p_got IS NOT DISTINCT FROM p_exp,
    'got=' || COALESCE(p_got, 'NULL') || ' expected=' || COALESCE(p_exp, 'NULL'));
END $$;

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
END $$;

-- A = manual (dono a0), B = automático (dono b0)
INSERT INTO public.profiles (id, role, company_id) VALUES
  ('5b000000-0000-0000-0000-0000000000a0', 'owner', '5b000000-0000-0000-0000-0000000000a0'),
  ('5b000000-0000-0000-0000-0000000000b0', 'owner', '5b000000-0000-0000-0000-0000000000b0');
INSERT INTO public.team_members (id, user_id, name, is_owner, active, display_order, created_at) VALUES
  ('5b000000-0000-0000-0001-0000000000a0', '5b000000-0000-0000-0000-0000000000a0', 'Dono A', true, true, 0, now() - interval '3 days'),
  ('5b000000-0000-0000-0001-0000000000b0', '5b000000-0000-0000-0000-0000000000b0', 'Dono B', true, true, 0, now() - interval '3 days');
INSERT INTO public.services (id, user_id, name, price, duration_minutes) VALUES
  ('5b000000-0000-0000-0002-0000000000a0', '5b000000-0000-0000-0000-0000000000a0', 'Corte A', 40, 30),
  ('5b000000-0000-0000-0002-0000000000b0', '5b000000-0000-0000-0000-0000000000b0', 'Corte B', 40, 30);
INSERT INTO public.business_settings (user_id) VALUES ('5b000000-0000-0000-0000-0000000000a0');
INSERT INTO public.business_settings (user_id, online_booking_requires_approval) VALUES ('5b000000-0000-0000-0000-0000000000b0', false);

CREATE OR REPLACE FUNCTION pg_temp.book(p_biz text, p_phone text, p_days int) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  v := pg_temp.run_as('anon', NULL, format(
    'SELECT id::text FROM public.create_public_booking(%L, %L, %L, ARRAY[%L]::uuid[], %L::uuid, %L::timestamptz, 40, 30, ''[]''::jsonb)',
    p_biz, 'Cliente Poll', p_phone, '5b000000-0000-0000-0002-' || right(p_biz, 12), '5b000000-0000-0000-0001-' || right(p_biz, 12),
    date_trunc('day', now()) + make_interval(days => p_days, hours => 10)));
  RETURN v::uuid;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.poll(p_id uuid, p_biz text, p_phone text) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.run_as('anon', NULL, format(
    'SELECT COALESCE(string_agg(status || ''|'' || business_id::text || ''|'' || id::text, '',''), ''none'') FROM public.get_public_booking_by_id(%L::uuid, %L::uuid, %L)',
    p_id, p_biz, p_phone))
$$;

DO $$
DECLARE a uuid; b uuid; v text;
  biz_a text := '5b000000-0000-0000-0000-0000000000a0';
  biz_b text := '5b000000-0000-0000-0000-0000000000b0';
BEGIN
  a := pg_temp.book(biz_a, '+351 910 000 101', 9);
  b := pg_temp.book(biz_b, '351910000102', 9);
  PERFORM pg_temp.check('0 pedidos criados pela RPC', (a IS NOT NULL AND b IS NOT NULL)::text, 'true');

  PERFORM pg_temp.check('1 anon: pedido manual recém-criado = pending',
    pg_temp.poll(a, biz_a, '351910000101'), 'pending|' || biz_a || '|' || a);
  PERFORM pg_temp.check('1 telefone em outro formato (phones_match) também acha',
    pg_temp.poll(a, biz_a, '910 000 101'), 'pending|' || biz_a || '|' || a);

  v := pg_temp.run_as('authenticated', biz_a, format($q$SELECT (public.accept_public_booking_v2(%L::uuid))->>'appointment_id'$q$, a));
  PERFORM pg_temp.check('2 dono aceitou (appointment criado)', (v NOT LIKE 'error:%' AND v IS NOT NULL)::text, 'true');
  PERFORM pg_temp.check('2 anon: depois do aceite o polling devolve confirmed',
    pg_temp.poll(a, biz_a, '351910000101'), 'confirmed|' || biz_a || '|' || a);

  PERFORM pg_temp.check('3 auto-confirmado = confirmed',
    pg_temp.poll(b, biz_b, '351910000102'), 'confirmed|' || biz_b || '|' || b);

  PERFORM pg_temp.check('4 telefone errado: nada', pg_temp.poll(a, biz_a, '351999999999'), 'none');
  PERFORM pg_temp.check('4 id certo + negócio errado: nada', pg_temp.poll(a, biz_b, '351910000101'), 'none');
  PERFORM pg_temp.check('4 id de outro pedido com o telefone deste: nada', pg_temp.poll(b, biz_a, '351910000101'), 'none');
  PERFORM pg_temp.check('4 id inventado: nada', pg_temp.poll(gen_random_uuid(), biz_a, '351910000101'), 'none');

  PERFORM pg_temp.check('5 retorno inalterado',
    pg_get_function_result('public.get_public_booking_by_id(uuid,uuid,text)'::regprocedure),
    'TABLE(id uuid, customer_name text, customer_phone text, appointment_time timestamp with time zone, service_ids uuid[], status text, business_id uuid, professional_id uuid, total_price numeric, duration_minutes integer)');
  PERFORM pg_temp.check('5 ACL/definer/search_path inalterados',
    (SELECT proacl::text || ' ' || prosecdef::text || ' ' || array_to_string(proconfig, ',') || ' ' || pg_get_userbyid(proowner)
     FROM pg_proc WHERE oid = 'public.get_public_booking_by_id(uuid,uuid,text)'::regprocedure),
    '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres} true search_path=public postgres');
  PERFORM pg_temp.check('6 anon continua sem ler a tabela direto (#144)',
    pg_temp.run_as('anon', NULL, 'SELECT count(*)::text FROM public.public_bookings'), '0');
END $$;

DO $$
DECLARE r record; n_fail int; n_ok int;
BEGIN
  FOR r IN SELECT * FROM bsp_result ORDER BY n LOOP
    RAISE NOTICE '%  %  (%)', CASE WHEN r.ok THEN 'PASS' ELSE 'FAIL' END, r.name, r.detail;
  END LOOP;
  SELECT count(*) FILTER (WHERE NOT ok), count(*) FILTER (WHERE ok) INTO n_fail, n_ok FROM bsp_result;
  IF n_fail > 0 THEN RAISE EXCEPTION 'booking_status_poll: % checks falharam (% ok)', n_fail, n_ok; END IF;
  RAISE NOTICE 'booking_status_poll: % checks ok', n_ok;
END $$;
