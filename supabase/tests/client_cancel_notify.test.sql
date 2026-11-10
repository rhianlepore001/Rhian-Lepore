-- Prova: cliente cancela (link público / Minha Área) -> dono e profissional com acesso recebem
-- "Cliente cancelou: ..." e o "Novo pedido" daquele pedido fica resolvido (lido). Dados fictícios.
SET TIMEZONE = 'UTC';
SET client_min_messages = notice;
CREATE TEMP TABLE pg_result (n serial, name text, ok boolean, detail text);
CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_exp text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO pg_result(name, ok, detail)
  VALUES (p_name, p_got IS NOT DISTINCT FROM p_exp, 'got=' || COALESCE(p_got, 'NULL') || ' expected=' || COALESCE(p_exp, 'NULL'));
END;
$$;
CREATE OR REPLACE FUNCTION pg_temp.notif(p_uid text, p_key text) RETURNS text LANGUAGE sql AS $$
  SELECT string_agg(type || '|' || read::text || '|' || COALESCE(title, '') || '|' || COALESCE(message, '') || '|' || COALESCE(link, ''), ' ; ')
    FROM public.notifications WHERE user_id = p_uid AND event_key = p_key
$$;

-- 1. Pedido manual pendente cancelado pelo cliente
DO $$
DECLARE r text; b uuid; v_when text;
  owner text := 'ce000000-0000-0000-0000-0000000000a0'; staff text := 'ce000000-0000-0000-0000-0000000000a9';
BEGIN
  r := public.ccn_book(owner, '351910000501', public.ccn_slot(6, 10));
  b := split_part(r, '|', 2)::uuid;
  v_when := public.format_booking_notification_when(public.ccn_slot(6, 10), owner);
  PERFORM pg_temp.check('1 pedido pendente gera Novo pedido não lido', split_part(pg_temp.notif(owner, 'new:' || b), '|', 2), 'false');
  PERFORM pg_temp.check('1 cliente cancela', public.ccn_cancel(b, '+351 910 000 501'), 'true');
  PERFORM pg_temp.check('1 dono recebe aviso de cancelamento',
    pg_temp.notif(owner, 'cancel:' || b), 'warning|false|Cancelado pelo cliente|Cliente cancelou: Cliente Fictício 01, Corte, ' || v_when || '|/agenda');
  PERFORM pg_temp.check('1 profissional com acesso recebe o aviso', split_part(pg_temp.notif(staff, 'cancel:' || b), '|', 4),
    'Cliente cancelou: Cliente Fictício 01, Corte, ' || v_when);
  PERFORM pg_temp.check('1 Novo pedido do dono fica resolvido (lido)', split_part(pg_temp.notif(owner, 'new:' || b), '|', 2), 'true');
  PERFORM pg_temp.check('1 Novo pedido do profissional fica resolvido (lido)', split_part(pg_temp.notif(staff, 'new:' || b), '|', 2), 'true');
  PERFORM pg_temp.check('1 sino do dono: só o aviso de cancelamento não lido',
    (SELECT string_agg(event_key, ',') FROM public.notifications WHERE user_id = owner AND read = false), 'cancel:' || b);
END $$;

-- 2. Agendamento confirmado automaticamente cancelado pelo cliente (janela de 15 min)
DO $$
DECLARE r text; b uuid; owner text := 'ce000000-0000-0000-0000-0000000000b0';
BEGIN
  r := public.ccn_book(owner, '351910000502', public.ccn_slot(1, 9));
  b := split_part(r, '|', 2)::uuid;
  PERFORM pg_temp.check('2 automático confirma', split_part(r, '|', 1), 'confirmed');
  PERFORM pg_temp.check('2 cliente cancela', public.ccn_cancel(b, '351910000502'), 'true');
  PERFORM pg_temp.check('2 dono recebe aviso com o serviço do salão',
    (COALESCE(split_part(pg_temp.notif(owner, 'cancel:' || b), '|', 4), '') LIKE 'Cliente cancelou: Cliente Fictício 02, Escova, %')::text, 'true');
  PERFORM pg_temp.check('2 Novo agendamento fica resolvido', split_part(pg_temp.notif(owner, 'new:' || b), '|', 2), 'true');
  PERFORM pg_temp.check('2 agendamento liberado', (SELECT status FROM public.appointments WHERE public_booking_id = b), 'Cancelled');
END $$;

-- 3. Recusa pelo dono não gera aviso de cancelamento do cliente
DO $$
DECLARE r text; b uuid; owner text := 'ce000000-0000-0000-0000-0000000000a0';
BEGIN
  r := public.ccn_book(owner, '351910000503', public.ccn_slot(6, 12));
  b := split_part(r, '|', 2)::uuid;
  r := public.ccn_run_as('authenticated', owner, format('SELECT public.reject_public_booking_v2(%L)::text', b));
  PERFORM pg_temp.check('3 recusa sem erro', (r LIKE 'error:%')::text, 'false');
  PERFORM pg_temp.check('3 recusa não gera aviso de cancelamento',
    (SELECT count(*)::text FROM public.notifications WHERE event_key = 'cancel:' || b), '0');
END $$;

-- 4. Falha no aviso não impede o cancelamento
DO $$
DECLARE r text; b uuid; owner text := 'ce000000-0000-0000-0000-0000000000a0';
BEGIN
  r := public.ccn_book(owner, '351910000504', public.ccn_slot(6, 14));
  b := split_part(r, '|', 2)::uuid;
  PERFORM set_config('agendix.fail_booking_notifications', 'on', false);
  PERFORM pg_temp.check('4 cancela mesmo com aviso falhando', public.ccn_cancel(b, '351910000504'), 'true');
  PERFORM set_config('agendix.fail_booking_notifications', 'off', false);
  PERFORM pg_temp.check('4 pedido ficou cancelado', (SELECT status FROM public.public_bookings WHERE id = b), 'cancelled');
END $$;

-- 5. Telefone errado continua recusado e sem aviso
DO $$
DECLARE r text; b uuid; owner text := 'ce000000-0000-0000-0000-0000000000a0';
BEGIN
  r := public.ccn_book(owner, '351910000505', public.ccn_slot(6, 16));
  b := split_part(r, '|', 2)::uuid;
  PERFORM pg_temp.check('5 telefone errado não cancela', (public.ccn_cancel(b, '351910009999') LIKE 'error:%booking_not_found%')::text, 'true');
  PERFORM pg_temp.check('5 sem aviso', (SELECT count(*)::text FROM public.notifications WHERE event_key = 'cancel:' || b), '0');
END $$;

-- 6. Permissões
SELECT pg_temp.check('6 anon não executa a função de aviso',
  (to_regprocedure('public.notify_booking_cancelled_by_client(public.public_bookings,boolean)') IS NOT NULL
   AND NOT has_function_privilege('anon', 'public.notify_booking_cancelled_by_client(public.public_bookings,boolean)', 'EXECUTE')
   AND NOT has_function_privilege('authenticated', 'public.notify_booking_cancelled_by_client(public.public_bookings,boolean)', 'EXECUTE'))::text, 'true');
SELECT pg_temp.check('6 anon continua executando o cancelamento do cliente',
  has_function_privilege('anon', 'public.cancel_public_booking_by_client_v2(uuid,text)', 'EXECUTE')::text, 'true');

DO $$
DECLARE r record; n_fail int; n_total int;
BEGIN
  FOR r IN SELECT * FROM pg_result ORDER BY n LOOP
    IF r.ok THEN RAISE NOTICE 'PASS  %', r.name; ELSE RAISE NOTICE 'FAIL  % (%)', r.name, r.detail; END IF;
  END LOOP;
  SELECT count(*) FILTER (WHERE NOT ok), count(*) INTO n_fail, n_total FROM pg_result;
  IF n_fail > 0 THEN RAISE EXCEPTION 'client_cancel_notify: % de % checks falharam', n_fail, n_total; END IF;
  RAISE NOTICE 'client_cancel_notify: % checks ok', n_total;
END $$;
