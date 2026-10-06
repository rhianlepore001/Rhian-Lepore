-- Testes do CHECK de notifications.type com o espelho de prod
-- (notifications_prod_fidelity.harness.sql). Rodar na cadeia do PR-7:
--   scripts/test-sql-notifications-type-check.sh
-- Antes da migration: FALHA (new/edit/commission_reminder rejeitados).
-- Depois: PASSA.
\set ON_ERROR_STOP on
\set QUIET on

CREATE TEMP TABLE results (name text, got text, expected text);
GRANT ALL ON results TO PUBLIC;
CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_name, COALESCE(p_got, '<null>'), p_expected);
$$;

-- Executa como um papel (anon/authenticated) com sub no JWT; devolve o valor ou 'error:<sqlstate>'.
CREATE OR REPLACE FUNCTION pg_temp.run_as(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', true);
    RETURN COALESCE(v, 'null');
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', true);
    RETURN 'error:' || SQLSTATE;
  END;
END $$;

-- INSERT direto (como o SECURITY DEFINER faz) em subtransação: 'ok' ou 'error:<sqlstate>'.
CREATE OR REPLACE FUNCTION pg_temp.try_insert(p_user text, p_type text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, event_key)
  VALUES (p_user, 't', 'm', p_type, 'test:' || COALESCE(p_type, 'null') || ':' || gen_random_uuid()::text);
  RETURN 'ok';
EXCEPTION WHEN OTHERS THEN
  RETURN 'error:' || SQLSTATE;
END $$;

\o /dev/null
DELETE FROM public.notifications;
DELETE FROM public.public_bookings;

-- 1) Cada tipo usado pelo código salva; tipos fora da lista continuam barrados ----
SELECT pg_temp.check('1 type info salva',                 pg_temp.try_insert('00000000-0000-0000-0000-0000000000a0', 'info'), 'ok');
SELECT pg_temp.check('1 type warning salva',              pg_temp.try_insert('00000000-0000-0000-0000-0000000000a0', 'warning'), 'ok');
SELECT pg_temp.check('1 type success salva',              pg_temp.try_insert('00000000-0000-0000-0000-0000000000a0', 'success'), 'ok');
SELECT pg_temp.check('1 type danger salva',               pg_temp.try_insert('00000000-0000-0000-0000-0000000000a0', 'danger'), 'ok');
SELECT pg_temp.check('1 type new (PR-7) salva',           pg_temp.try_insert('00000000-0000-0000-0000-0000000000a0', 'new'), 'ok');
SELECT pg_temp.check('1 type edit (PR-7) salva',          pg_temp.try_insert('00000000-0000-0000-0000-0000000000a0', 'edit'), 'ok');
SELECT pg_temp.check('1 type commission_reminder salva',  pg_temp.try_insert('00000000-0000-0000-0000-0000000000a0', 'commission_reminder'), 'ok');
SELECT pg_temp.check('1 type new p/ staff (FK profiles ok)', pg_temp.try_insert('00000000-0000-0000-0000-0000000000b1', 'new'), 'ok');
SELECT pg_temp.check('1 type fora da lista barrado',      pg_temp.try_insert('00000000-0000-0000-0000-0000000000a0', 'bogus'), 'error:23514');
SELECT pg_temp.check('1 type com caixa diferente barrado', pg_temp.try_insert('00000000-0000-0000-0000-0000000000a0', 'New'), 'error:23514');
SELECT pg_temp.check('1 type vazio barrado',              pg_temp.try_insert('00000000-0000-0000-0000-0000000000a0', ''), 'error:23514');
SELECT pg_temp.check('1 destinatário sem profile barrado (FK)', pg_temp.try_insert('99999999-9999-9999-9999-999999999999', 'new'), 'error:23503');
SELECT pg_temp.check('1 CHECK continua allow-list (constraint existe)',
  (SELECT count(*)::text FROM pg_constraint WHERE conrelid = 'public.notifications'::regclass AND conname = 'notifications_type_check' AND contype = 'c'), '1');
DELETE FROM public.notifications;

-- 2) Novo pedido online (INSERT pending em public_bookings dispara o trigger) ------
INSERT INTO public.public_bookings (
  id, business_id, customer_phone, customer_name, service_ids, professional_id,
  appointment_time, total_price, status, duration_minutes, is_edit
) VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', '351911111111', 'Bia',
  ARRAY['20000000-0000-0000-0000-000000000001'::uuid], '10000000-0000-0000-0000-0000000000a1',
  timestamptz '2027-11-10 15:00:00+00', 35, 'pending', 30, false
);
SELECT pg_temp.check('2 novo pedido: dono recebe type new',
  (SELECT string_agg(type || '|' || title || '|' || link, ',') FROM public.notifications
    WHERE booking_id = 'bbbbbbbb-0000-0000-0000-000000000001' AND user_id = '00000000-0000-0000-0000-0000000000a0'), 'new|Novo pedido|/agenda');
SELECT pg_temp.check('2 novo pedido: profissional atribuído (Aline) recebe type new',
  (SELECT string_agg(type || '|' || event_key, ',') FROM public.notifications
    WHERE booking_id = 'bbbbbbbb-0000-0000-0000-000000000001' AND user_id = '00000000-0000-0000-0000-0000000000b1'),
  'new|new:bbbbbbbb-0000-0000-0000-000000000001');
SELECT pg_temp.check('2 novo pedido: ninguém mais',
  (SELECT count(*)::text FROM public.notifications WHERE booking_id = 'bbbbbbbb-0000-0000-0000-000000000001'), '2');

-- 3) Pedido de alteração pelo cliente (mesma RPC do app, como anon) ----------------
-- O dono aceitou (confirmed); só então a mudança do cliente vira pedido de alteração.
UPDATE public.public_bookings SET status = 'confirmed' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';
SELECT pg_temp.check('3 aceite (confirmed) não gera notificação',
  (SELECT count(*)::text FROM public.notifications WHERE booking_id = 'bbbbbbbb-0000-0000-0000-000000000001'), '2');
SELECT pg_temp.check('3 cliente pede alteração via update_public_booking_by_client_v2 (anon)',
  pg_temp.run_as('anon', NULL, $q$SELECT (public.update_public_booking_by_client_v2(
      'bbbbbbbb-0000-0000-0000-000000000001'::uuid, '351911111111',
      ARRAY['20000000-0000-0000-0000-000000000001'::uuid], '10000000-0000-0000-0000-0000000000a1'::uuid,
      timestamptz '2027-11-10 17:00:00+00', timestamptz '2027-11-10 15:00:00+00',
      'Bia', '351911111111', 35, 30, '[]'::jsonb)).is_edit::text$q$), 'true');
SELECT pg_temp.check('3 alteração: dono recebe type edit',
  (SELECT string_agg(type || '|' || title, ',') FROM public.notifications
    WHERE booking_id = 'bbbbbbbb-0000-0000-0000-000000000001' AND user_id = '00000000-0000-0000-0000-0000000000a0'
      AND event_key = 'edit:bbbbbbbb-0000-0000-0000-000000000001'), 'edit|Pedido de alteração');
SELECT pg_temp.check('3 alteração: profissional recebe type edit',
  (SELECT count(*)::text FROM public.notifications
    WHERE booking_id = 'bbbbbbbb-0000-0000-0000-000000000001' AND user_id = '00000000-0000-0000-0000-0000000000b1'
      AND type = 'edit'), '1');

-- 4) Quem lê o quê (RLS + grants de prod; mesma query do sino: user_id = user.id) --
SELECT pg_temp.check('4 dono lê as próprias no sino (new + edit)',
  pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000a0',
    $q$SELECT string_agg(type, ',' ORDER BY type) FROM public.notifications WHERE user_id = '00000000-0000-0000-0000-0000000000a0'$q$), 'edit,new');
SELECT pg_temp.check('4 staff atribuído lê as próprias no sino (new + edit)',
  pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000b1',
    $q$SELECT string_agg(type, ',' ORDER BY type) FROM public.notifications WHERE user_id = '00000000-0000-0000-0000-0000000000b1'$q$), 'edit,new');
SELECT pg_temp.check('4 staff não lê as do dono',
  pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000b1',
    $q$SELECT count(*)::text FROM public.notifications WHERE user_id = '00000000-0000-0000-0000-0000000000a0'$q$), '0');
SELECT pg_temp.check('4 outro staff (Yago) não lê nada',
  pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000b2',
    $q$SELECT count(*)::text FROM public.notifications$q$), '0');
SELECT pg_temp.check('4 dono não lê as do staff',
  pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000a0',
    $q$SELECT count(*)::text FROM public.notifications WHERE user_id = '00000000-0000-0000-0000-0000000000b1'$q$), '0');
SELECT pg_temp.check('4 anon sem acesso',
  pg_temp.run_as('anon', NULL, $q$SELECT count(*)::text FROM public.notifications$q$), 'error:42501');
SELECT pg_temp.check('4 staff marca a própria como lida',
  pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000b1',
    $q$WITH u AS (UPDATE public.notifications SET read = true WHERE user_id = '00000000-0000-0000-0000-0000000000b1' AND type = 'new' RETURNING 1) SELECT count(*)::text FROM u$q$), '1');
SELECT pg_temp.check('4 authenticated não insere notificação',
  pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000b1',
    $q$INSERT INTO public.notifications (user_id, title, message, type) VALUES ('00000000-0000-0000-0000-0000000000b1', 'x', 'y', 'new') RETURNING id::text$q$), 'error:42501');

\o
SELECT CASE WHEN got = expected THEN 'PASS' ELSE 'FAIL' END AS status, name, got, expected FROM results;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM results WHERE got IS DISTINCT FROM expected;
  IF n > 0 THEN
    RAISE EXCEPTION '% teste(s) FAIL', n;
  END IF;
  RAISE NOTICE 'todos os % testes PASS', (SELECT count(*) FROM results);
END $$;
