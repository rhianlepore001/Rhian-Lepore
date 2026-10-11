-- Provas da confirmação automática de agendamentos online.
-- Roda na cadeia booking_notifications + auto_confirm_online_bookings.harness.sql.
-- Antes da migration os cenários do modo automático FALHAM; o modo manual passa nos
-- dois momentos (prova de que o caminho de hoje não muda).
-- Cada check grava em ac_result; no fim, RAISE se algum falhou.

SET TIMEZONE = 'UTC';
SET client_min_messages = notice;
CREATE TEMP TABLE ac_result (n serial, name text, ok boolean, detail text);

CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_exp text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO ac_result(name, ok, detail)
  VALUES (p_name, p_got IS NOT DISTINCT FROM p_exp,
          'got=' || COALESCE(p_got, 'NULL') || ' expected=' || COALESCE(p_exp, 'NULL'));
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.scenario_error(p_name text, p_err text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO ac_result(name, ok, detail) VALUES (p_name || ' (cenário abortou)', false, p_err);
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

-- IDs (hex válido): negócio A = automático, M = manual (settings criada ANTES da
-- migration), N = sem linha em business_settings.
--   ac000000-0000-0000-0000-0000000000a0  negócio/dono A   (…a1 login do profissional AP)
--   ac000000-0000-0000-0000-0000000000b0  negócio/dono M   (…b1 login do profissional MP)
--   ac000000-0000-0000-0000-0000000000c0  negócio/dono N
--   ac000000-0000-0000-0001-…             team_members
--   ac000000-0000-0000-0002-…             services
--   ac000000-0000-0000-0003-…             products

-- Chamada anônima do link público; devolve "status|id" ou "error:...".
CREATE OR REPLACE FUNCTION pg_temp.book(p_biz text, p_phone text, p_pro uuid, p_at timestamptz,
                                         p_lines jsonb DEFAULT '[]'::jsonb, p_name text DEFAULT 'Cliente Teste')
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  RETURN pg_temp.run_as('anon', NULL, format(
    'SELECT status || ''|'' || id FROM public.create_public_booking(%L, %L, %L, ARRAY[%L]::uuid[], %L::uuid, %L::timestamptz, 40, 30, %L::jsonb)',
    p_biz, p_name, p_phone,
    'ac000000-0000-0000-0002-' || right(p_biz, 12),
    p_pro, p_at, p_lines));
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.bid(p_res text) RETURNS uuid LANGUAGE sql AS $$
  SELECT CASE WHEN p_res LIKE '%|%' THEN split_part(p_res, '|', 2)::uuid END
$$;

CREATE OR REPLACE FUNCTION pg_temp.slot(p_days int, p_hour int) RETURNS timestamptz LANGUAGE sql AS $$
  SELECT date_trunc('day', now()) + make_interval(days => p_days, hours => p_hour)
$$;

CREATE OR REPLACE FUNCTION pg_temp.state(p_biz text) RETURNS text LANGUAGE sql AS $$
  SELECT (SELECT count(*) FROM public.public_bookings WHERE business_id = p_biz)::text || '/' ||
         (SELECT count(*) FROM public.appointments WHERE user_id = p_biz)::text || '/' ||
         (SELECT count(*) FROM public.notifications WHERE booking_id IN
            (SELECT id FROM public.public_bookings WHERE business_id = p_biz))::text
$$;

INSERT INTO public.profiles (id, role, company_id) VALUES
  ('ac000000-0000-0000-0000-0000000000a0', 'owner', 'ac000000-0000-0000-0000-0000000000a0'),
  ('ac000000-0000-0000-0000-0000000000a1', 'staff', 'ac000000-0000-0000-0000-0000000000a0'),
  ('ac000000-0000-0000-0000-0000000000b0', 'owner', 'ac000000-0000-0000-0000-0000000000b0'),
  ('ac000000-0000-0000-0000-0000000000b1', 'staff', 'ac000000-0000-0000-0000-0000000000b0'),
  ('ac000000-0000-0000-0000-0000000000c0', 'owner', 'ac000000-0000-0000-0000-0000000000c0');
UPDATE public.profiles SET booking_lead_time_hours = 2 WHERE id LIKE 'ac000000-%';

INSERT INTO public.team_members (id, user_id, name, staff_user_id, is_owner, active, display_order, created_at) VALUES
  ('ac000000-0000-0000-0001-0000000000a0', 'ac000000-0000-0000-0000-0000000000a0', 'Dono A', NULL, true, true, 0, now() - interval '3 days'),
  ('ac000000-0000-0000-0001-0000000000a1', 'ac000000-0000-0000-0000-0000000000a0', 'Pro AP', 'ac000000-0000-0000-0000-0000000000a1', false, true, 1, now() - interval '2 days'),
  ('ac000000-0000-0000-0001-0000000000a2', 'ac000000-0000-0000-0000-0000000000a0', 'Pro AQ', NULL, false, true, 2, now() - interval '1 day'),
  ('ac000000-0000-0000-0001-0000000000b0', 'ac000000-0000-0000-0000-0000000000b0', 'Dono M', NULL, true, true, 0, now() - interval '3 days'),
  ('ac000000-0000-0000-0001-0000000000b1', 'ac000000-0000-0000-0000-0000000000b0', 'Pro MP', 'ac000000-0000-0000-0000-0000000000b1', false, true, 1, now() - interval '2 days'),
  ('ac000000-0000-0000-0001-0000000000c0', 'ac000000-0000-0000-0000-0000000000c0', 'Dono N', NULL, true, true, 0, now() - interval '3 days');

INSERT INTO public.services (id, user_id, name, price, duration_minutes) VALUES
  ('ac000000-0000-0000-0002-0000000000a0', 'ac000000-0000-0000-0000-0000000000a0', 'Corte A', 40, 30),
  ('ac000000-0000-0000-0002-0000000000b0', 'ac000000-0000-0000-0000-0000000000b0', 'Corte M', 40, 30),
  ('ac000000-0000-0000-0002-0000000000c0', 'ac000000-0000-0000-0000-0000000000c0', 'Corte N', 40, 30);

INSERT INTO public.products (id, company_id, name, sale_price, is_active) VALUES
  ('ac000000-0000-0000-0003-0000000000a1', 'ac000000-0000-0000-0000-0000000000a0', 'Pomada', 15.00, true),
  ('ac000000-0000-0000-0003-0000000000a2', 'ac000000-0000-0000-0000-0000000000a0', 'Inativo', 9.00, false),
  ('ac000000-0000-0000-0003-0000000000b1', 'ac000000-0000-0000-0000-0000000000b0', 'De outro negócio', 7.00, true);

-- Cliente já existente em A (o auto-confirmado precisa reaproveitar, como o aceite).
INSERT INTO public.clients (id, user_id, name, phone)
VALUES ('ac000000-0000-0000-0004-0000000000a1', 'ac000000-0000-0000-0000-0000000000a0', 'Cliente Antigo', '+55 (11) 98888-0001');
INSERT INTO public.public_clients (business_id, name, phone, photo_url)
VALUES ('ac000000-0000-0000-0000-0000000000a0', 'Nova', '5511988880002', 'https://foto/nova.jpg');

-- M já tinha linha antes da migration; A também (o dono desliga depois); N não tem.
INSERT INTO public.business_settings (user_id, client_cancel_cutoff_hours)
VALUES ('ac000000-0000-0000-0000-0000000000b0', 24), ('ac000000-0000-0000-0000-0000000000a0', 24);

-- 1. Metadados / segurança -------------------------------------------------------------
DO $$
DECLARE v text;
BEGIN
  SELECT data_type || '|' || is_nullable || '|' || COALESCE(column_default, '-') INTO v
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'business_settings' AND column_name = 'online_booking_requires_approval';
  PERFORM pg_temp.check('1 coluna online_booking_requires_approval boolean NOT NULL DEFAULT true', v, 'boolean|NO|true');
  SELECT string_agg(user_id || '=' || online_booking_requires_approval::text, ',' ORDER BY user_id) INTO v
  FROM public.business_settings WHERE user_id LIKE 'ac000000-%';
  PERFORM pg_temp.check('1 linhas existentes ficam true (manual)', v,
    'ac000000-0000-0000-0000-0000000000a0=true,ac000000-0000-0000-0000-0000000000b0=true');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('1 coluna', SQLERRM);
END $$;

DO $$
BEGIN
  PERFORM pg_temp.check('13 materialize não executável por anon',
    has_function_privilege('anon', 'public.materialize_public_booking_appointment(public.public_bookings)', 'EXECUTE')::text, 'false');
  PERFORM pg_temp.check('13 materialize não executável por authenticated',
    has_function_privilege('authenticated', 'public.materialize_public_booking_appointment(public.public_bookings)', 'EXECUTE')::text, 'false');
  PERFORM pg_temp.check('13 cópia interna de produtos não executável por anon',
    has_function_privilege('anon', 'public.copy_public_booking_products_internal(uuid,uuid)', 'EXECUTE')::text, 'false');
  PERFORM pg_temp.check('13 cópia interna de produtos não executável por authenticated',
    has_function_privilege('authenticated', 'public.copy_public_booking_products_internal(uuid,uuid)', 'EXECUTE')::text, 'false');
  PERFORM pg_temp.check('13 marca interna: anon sem SELECT/INSERT',
    (has_table_privilege('anon', 'public.public_booking_auto_confirmations', 'SELECT')
     OR has_table_privilege('anon', 'public.public_booking_auto_confirmations', 'INSERT'))::text, 'false');
  PERFORM pg_temp.check('13 marca interna: authenticated sem SELECT/INSERT/UPDATE',
    (has_table_privilege('authenticated', 'public.public_booking_auto_confirmations', 'SELECT')
     OR has_table_privilege('authenticated', 'public.public_booking_auto_confirmations', 'INSERT')
     OR has_table_privilege('authenticated', 'public.public_booking_auto_confirmations', 'UPDATE'))::text, 'false');
  PERFORM pg_temp.check('13 marca interna com RLS',
    (SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.public_booking_auto_confirmations'::regclass), 'true');
  PERFORM pg_temp.check('13 internas são SECURITY DEFINER + search_path=public',
    (SELECT string_agg(proname || ':' || prosecdef::text || ':' || array_to_string(proconfig, ','), ' ' ORDER BY proname)
     FROM pg_proc WHERE pronamespace = 'public'::regnamespace
       AND proname IN ('materialize_public_booking_appointment', 'copy_public_booking_products_internal')),
    'copy_public_booking_products_internal:true:search_path=public materialize_public_booking_appointment:true:search_path=public');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('13 internas', SQLERRM);
END $$;

DO $$
DECLARE v text;
BEGIN
  -- 14: assinatura/segurança de todas as funções substituídas iguais às de antes da migration.
  SELECT string_agg(f.sig || ' ' || f.attrs, E'\n' ORDER BY f.sig) INTO v FROM (
    SELECT p.oid::regprocedure::text sig,
           p.prosecdef::text || ' ' || COALESCE(array_to_string(p.proconfig, ','), '-') || ' ' ||
           pg_get_userbyid(p.proowner) || ' ' || COALESCE(p.proacl::text, 'NULL') || ' ' ||
           p.provolatile::text || ' ' || pg_get_function_result(p.oid) attrs
    FROM pg_proc p
    WHERE p.oid IN ('public.create_public_booking(text,text,text,uuid[],uuid,timestamptz,numeric,integer,jsonb)'::regprocedure,
                    'public.notify_booking_recipients(public.public_bookings,text,timestamptz,uuid[])'::regprocedure,
                    'public.cancel_public_booking_by_client_v2(uuid,text)'::regprocedure,
                    'public.get_public_business_settings_json(uuid)'::regprocedure)
  ) f;
  PERFORM pg_temp.check('14 SECURITY DEFINER/search_path/dono/ACL/volatilidade/retorno preservados', v,
    (SELECT string_agg(sig || ' ' || attrs, E'\n' ORDER BY sig) FROM ac_pre_sig));
  PERFORM pg_temp.check('19 caller_can_act_on_public_booking intocada (md5 prod)',
    md5(pg_get_functiondef('public.caller_can_act_on_public_booking(public.public_bookings)'::regprocedure)), '1dbe3b8245879c6dc3702cb7d3cf8ab9');
  PERFORM pg_temp.check('22 accept/reject/update v2 intocadas (md5 prod)',
    md5(pg_get_functiondef('public.accept_public_booking_v2(uuid)'::regprocedure)) || ' ' ||
    md5(pg_get_functiondef('public.reject_public_booking_v2(uuid)'::regprocedure)) || ' ' ||
    md5(pg_get_functiondef('public.update_public_booking_by_client_v2(uuid,text,uuid[],uuid,timestamptz,timestamptz,text,text,numeric,integer,jsonb)'::regprocedure)) || ' ' ||
    md5(pg_get_functiondef('public.public_booking_slot_busy(text,timestamptz,integer,uuid)'::regprocedure)),
    '8fdee6dbf99935532130810f5484333f 00b6b07e3c4fd635b24df0aa30445b2e d6519cfcd1cca72e423cfa114777ab58 aead583c4f271038916446139f56a6f8');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('14 assinatura', SQLERRM);
END $$;

-- 15. JSON público: só a chave nova.
DO $$
DECLARE v_keys text; v_pre text;
BEGIN
  SELECT string_agg(k, ',' ORDER BY k) INTO v_keys
  FROM json_object_keys(public.get_public_business_settings_json('ac000000-0000-0000-0000-0000000000b0')) k;
  SELECT keys INTO v_pre FROM ac_pre_json;
  PERFORM pg_temp.check('15 JSON público ganha só online_booking_auto_confirm', v_keys,
    (SELECT string_agg(k, ',' ORDER BY k) FROM unnest(string_to_array(v_pre || ',online_booking_auto_confirm', ',')) k));
  PERFORM pg_temp.check('15 manual → online_booking_auto_confirm=false',
    public.get_public_business_settings_json('ac000000-0000-0000-0000-0000000000b0')->>'online_booking_auto_confirm', 'false');
  PERFORM pg_temp.check('15 sem linha → JSON nulo (front cai no manual)',
    public.get_public_business_settings_json('ac000000-0000-0000-0000-0000000000c0')::text, NULL);
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('15 JSON', SQLERRM);
END $$;

-- 12. Só o dono grava o toggle.
DO $$
DECLARE v text;
BEGIN
  v := pg_temp.run_as('authenticated', 'ac000000-0000-0000-0000-0000000000a1',
    $q$WITH u AS (UPDATE public.business_settings SET online_booking_requires_approval = false
       WHERE user_id = 'ac000000-0000-0000-0000-0000000000a0' RETURNING 1) SELECT count(*)::text FROM u$q$);
  PERFORM pg_temp.check('12 colaborador não muda o toggle (0 linhas)', v, '0');
  v := pg_temp.run_as('anon', NULL,
    $q$WITH u AS (UPDATE public.business_settings SET online_booking_requires_approval = false
       WHERE user_id = 'ac000000-0000-0000-0000-0000000000a0' RETURNING 1) SELECT count(*)::text FROM u$q$);
  PERFORM pg_temp.check('12 anon não muda o toggle (0 linhas)', v, '0');
  v := pg_temp.run_as('authenticated', 'ac000000-0000-0000-0000-0000000000a1',
    $q$INSERT INTO public.business_settings (user_id, online_booking_requires_approval)
       VALUES ('ac000000-0000-0000-0000-0000000000a0', false)
       ON CONFLICT (user_id) DO UPDATE SET online_booking_requires_approval = EXCLUDED.online_booking_requires_approval
       RETURNING 'gravou'$q$);
  PERFORM pg_temp.check('12 colaborador: upsert do toggle bloqueado pela RLS', (v LIKE 'error:%')::text, 'true');
  v := pg_temp.run_as('authenticated', 'ac000000-0000-0000-0000-0000000000a0',
    $q$WITH u AS (UPDATE public.business_settings SET online_booking_requires_approval = false
       WHERE user_id = 'ac000000-0000-0000-0000-0000000000a0' RETURNING 1) SELECT count(*)::text FROM u$q$);
  PERFORM pg_temp.check('12 dono desliga a aprovação manual (1 linha)', v, '1');
  PERFORM pg_temp.check('12 valor gravado (A automático)',
    (SELECT online_booking_requires_approval::text FROM public.business_settings WHERE user_id = 'ac000000-0000-0000-0000-0000000000a0'), 'false');
  PERFORM pg_temp.check('15 automático → online_booking_auto_confirm=true',
    public.get_public_business_settings_json('ac000000-0000-0000-0000-0000000000a0')->>'online_booking_auto_confirm', 'true');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('12 toggle', SQLERRM);
END $$;

-- 3. Manual: idêntico a hoje.
DO $$
DECLARE r text; b uuid; v text;
BEGIN
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000b0', '5511977770001',
                    'ac000000-0000-0000-0001-0000000000b1', pg_temp.slot(10, 13),
                    '[{"product_id":"ac000000-0000-0000-0003-0000000000b1","quantity":1}]');
  b := pg_temp.bid(r);
  PERFORM pg_temp.check('3 manual: pedido pending', split_part(r, '|', 1), 'pending');
  PERFORM pg_temp.check('3 manual: nenhum appointment',
    (SELECT count(*)::text FROM public.appointments WHERE public_booking_id = b), '0');
  IF to_regclass('public.public_booking_auto_confirmations') IS NOT NULL THEN
    EXECUTE 'SELECT count(*)::text FROM public.public_booking_auto_confirmations WHERE booking_id = $1' INTO v USING b;
  ELSE
    v := '0';
  END IF;
  PERFORM pg_temp.check('3 manual: sem marca de auto-confirmação', v, '0');
  SELECT string_agg(n.user_id || ':' || n.title || ':' || n.type || ':' || n.event_key, ' ' ORDER BY n.user_id) INTO v
  FROM public.notifications n WHERE n.booking_id = b;
  PERFORM pg_temp.check('3 manual: "Novo pedido" para dono e profissional', v,
    'ac000000-0000-0000-0000-0000000000b0:Novo pedido:new:new:' || b || ' ac000000-0000-0000-0000-0000000000b1:Novo pedido:new:new:' || b);
  PERFORM pg_temp.check('3 manual: mensagem de hoje',
    (SELECT message LIKE 'Novo pedido: Cliente Teste, Corte M, %' FROM public.notifications WHERE booking_id = b AND user_id = 'ac000000-0000-0000-0000-0000000000b0')::text, 'true');
  PERFORM pg_temp.check('16 manual: broadcast com pending',
    (SELECT payload->>'status' FROM realtime.send_log WHERE topic = 'booking:' || b LIMIT 1), 'pending');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('3 manual', SQLERRM);
END $$;

-- 2. Sem linha em business_settings → manual.
DO $$
DECLARE r text;
BEGIN
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000c0', '5511977770002', NULL, pg_temp.slot(10, 13));
  PERFORM pg_temp.check('2 sem linha de settings: pedido pending', split_part(r, '|', 1), 'pending');
  PERFORM pg_temp.check('2 sem linha de settings: nenhum appointment',
    (SELECT count(*)::text FROM public.appointments WHERE user_id = 'ac000000-0000-0000-0000-0000000000c0'), '0');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('2 sem linha', SQLERRM);
END $$;

-- 4/9/16/11. Automático com profissional escolhido, cliente existente e produtos.
DO $$
DECLARE r text; b uuid; v text; a record; n_clients int;
BEGIN
  SELECT count(*) INTO n_clients FROM public.clients WHERE user_id = 'ac000000-0000-0000-0000-0000000000a0';
  -- Payload adulterado: preço/estado inventados nas linhas de produto não valem.
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '11 98888-0001',
                    'ac000000-0000-0000-0001-0000000000a1', pg_temp.slot(10, 13),
                    '[{"product_id":"ac000000-0000-0000-0003-0000000000a1","quantity":2,"unit_sale_price":0,"status":"pending"},
                      {"product_id":"ac000000-0000-0000-0003-0000000000a2","quantity":1},
                      {"product_id":"ac000000-0000-0000-0003-0000000000b1","quantity":1},
                      {"product_id":"ac000000-0000-0000-0003-0000000000a1","quantity":0}]');
  b := pg_temp.bid(r);
  PERFORM pg_temp.check('4 automático: pedido confirmed', split_part(r, '|', 1), 'confirmed');
  PERFORM pg_temp.check('4 automático: status gravado confirmed',
    (SELECT status FROM public.public_bookings WHERE id = b), 'confirmed');
  SELECT * INTO a FROM public.appointments WHERE public_booking_id = b;
  PERFORM pg_temp.check('4 automático: exatamente 1 appointment ligado',
    (SELECT count(*)::text FROM public.appointments WHERE public_booking_id = b), '1');
  PERFORM pg_temp.check('4 automático: appointment Confirmed, profissional, horário, serviço, preço, duração',
    a.status || '|' || a.professional_id || '|' || (a.appointment_time = pg_temp.slot(10, 13))::text || '|' || a.service || '|' || a.price::text || '|' || a.duration_minutes,
    'Confirmed|ac000000-0000-0000-0001-0000000000a1|true|Corte A|40|30');
  PERFORM pg_temp.check('4 automático: cliente existente reaproveitado (phones_match)',
    a.client_id::text || '|' || ((SELECT count(*) FROM public.clients WHERE user_id = 'ac000000-0000-0000-0000-0000000000a0') = n_clients)::text,
    'ac000000-0000-0000-0004-0000000000a1|true');
  SELECT string_agg(product_id || 'x' || quantity || '@' || unit_sale_price, ' ' ORDER BY product_id) INTO v
  FROM public.appointment_product_lines WHERE appointment_id = a.id;
  PERFORM pg_temp.check('4 automático: produtos copiados (só o ativo do negócio, preço do catálogo)', v,
    'ac000000-0000-0000-0003-0000000000a1x2@15.00');
  PERFORM pg_temp.check('4 automático: marca interna com o appointment',
    (SELECT (appointment_id = a.id)::text FROM public.public_booking_auto_confirmations WHERE booking_id = b), 'true');
  PERFORM pg_temp.check('4 automático: fora da lista de solicitações (nada pending)',
    (SELECT count(*)::text FROM public.public_bookings WHERE business_id = 'ac000000-0000-0000-0000-0000000000a0' AND status = 'pending'), '0');
  SELECT string_agg(n.user_id || ':' || n.title || ':' || n.type || ':' || n.event_key || ':' || n.link, ' ' ORDER BY n.user_id) INTO v
  FROM public.notifications n WHERE n.booking_id = b;
  PERFORM pg_temp.check('9 automático: "Novo agendamento" (type new) para dono e profissional', v,
    'ac000000-0000-0000-0000-0000000000a0:Novo agendamento:new:new:' || b || ':/agenda ac000000-0000-0000-0000-0000000000a1:Novo agendamento:new:new:' || b || ':/agenda');
  PERFORM pg_temp.check('9 automático: mensagem diz que já está na agenda',
    (SELECT message LIKE 'Novo agendamento online: Cliente Teste, Corte A, % — já está na agenda.' FROM public.notifications WHERE booking_id = b AND user_id = 'ac000000-0000-0000-0000-0000000000a0')::text, 'true');
  PERFORM pg_temp.check('16 automático: broadcast do INSERT com confirmed',
    (SELECT string_agg(payload->>'status' || ':' || (payload->>'op'), ',') FROM realtime.send_log WHERE topic = 'booking:' || b), 'confirmed:INSERT');
  PERFORM pg_temp.check('4 automático: trigger de outcome não mexe no status',
    (SELECT status FROM public.public_bookings WHERE id = b), 'confirmed');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('4 automático', SQLERRM);
END $$;

-- 5. Profissional "qualquer" → o mesmo que get_first_available_professional; cliente novo com foto.
DO $$
DECLARE r text; b uuid; v_exp uuid; a record;
BEGIN
  v_exp := public.get_first_available_professional('ac000000-0000-0000-0000-0000000000a0'::uuid, pg_temp.slot(10, 13), 30);
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511988880002', NULL, pg_temp.slot(10, 13), '[]', 'Nova');
  b := pg_temp.bid(r);
  SELECT * INTO a FROM public.appointments WHERE public_booking_id = b;
  PERFORM pg_temp.check('5 qualquer profissional: confirmado com o 1º livre (dono, AP já ocupado)',
    split_part(r, '|', 1) || '|' || a.professional_id::text || '|' || v_exp::text,
    'confirmed|ac000000-0000-0000-0001-0000000000a0|ac000000-0000-0000-0001-0000000000a0');
  PERFORM pg_temp.check('5 cliente novo criado com a foto de public_clients',
    (SELECT c.name || '|' || c.phone || '|' || COALESCE(c.photo_url, '-') FROM public.clients c WHERE c.id = a.client_id),
    'Nova|5511988880002|https://foto/nova.jpg');
  PERFORM pg_temp.check('9 dono sem login de profissional: só o dono é notificado',
    (SELECT string_agg(user_id, ',') FROM public.notifications WHERE booking_id = b), 'ac000000-0000-0000-0000-0000000000a0');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('5 qualquer', SQLERRM);
END $$;

-- 6 (sequencial). Mesmo horário/profissional de novo → slot_unavailable, nada gravado.
DO $$
DECLARE r text; s0 text;
BEGIN
  s0 := pg_temp.state('ac000000-0000-0000-0000-0000000000a0');
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000009', 'ac000000-0000-0000-0001-0000000000a1', pg_temp.slot(10, 13));
  PERFORM pg_temp.check('6 mesmo horário/profissional → slot_unavailable', r, 'error:slot_unavailable');
  PERFORM pg_temp.check('6 nada gravado', pg_temp.state('ac000000-0000-0000-0000-0000000000a0'), s0);
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('6 sequencial', SQLERRM);
END $$;

-- 7. Bloqueio e antecedência valem no automático.
DO $$
DECLARE r text; s0 text;
BEGIN
  INSERT INTO public.agenda_blocks (user_id, professional_id, starts_at, ends_at)
  VALUES ('ac000000-0000-0000-0000-0000000000a0', 'ac000000-0000-0000-0001-0000000000a2', pg_temp.slot(11, 9), pg_temp.slot(11, 12));
  s0 := pg_temp.state('ac000000-0000-0000-0000-0000000000a0');
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000010', 'ac000000-0000-0000-0001-0000000000a2', pg_temp.slot(11, 10));
  PERFORM pg_temp.check('7 horário bloqueado → slot_unavailable', r, 'error:slot_unavailable');
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000010', 'ac000000-0000-0000-0001-0000000000a2',
                    date_trunc('minute', now()) + interval '30 minutes');
  PERFORM pg_temp.check('7 antecedência violada → lead_time_violation', r, 'error:lead_time_violation');
  PERFORM pg_temp.check('7 nada gravado', pg_temp.state('ac000000-0000-0000-0000-0000000000a0'), s0);
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('7 bloqueio', SQLERRM);
END $$;

-- 8. Falha ao criar o appointment → rollback total.
CREATE OR REPLACE FUNCTION pg_temp.boom() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('ac.boom', true) = 'on' THEN RAISE EXCEPTION 'appointment_insert_failed'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ac_boom BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION pg_temp.boom();
DO $$
DECLARE r text; s0 text;
BEGIN
  s0 := pg_temp.state('ac000000-0000-0000-0000-0000000000a0');
  PERFORM set_config('ac.boom', 'on', false);
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000011', 'ac000000-0000-0000-0001-0000000000a2', pg_temp.slot(12, 10));
  PERFORM set_config('ac.boom', 'off', false);
  PERFORM pg_temp.check('8 falha no appointment → erro para o cliente', r, 'error:appointment_insert_failed');
  PERFORM pg_temp.check('8 nada persiste (nem pedido confirmado sem appointment)', pg_temp.state('ac000000-0000-0000-0000-0000000000a0'), s0);
EXCEPTION WHEN OTHERS THEN PERFORM set_config('ac.boom', 'off', false); PERFORM pg_temp.scenario_error('8 rollback', SQLERRM);
END $$;
DROP TRIGGER ac_boom ON public.appointments;

-- 9. Falha de notificação não impede o agendamento.
DO $$
DECLARE r text; b uuid;
BEGIN
  PERFORM set_config('agendix.fail_booking_notifications', 'on', false);
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000012', 'ac000000-0000-0000-0001-0000000000a2', pg_temp.slot(12, 10));
  PERFORM set_config('agendix.fail_booking_notifications', 'off', false);
  b := pg_temp.bid(r);
  PERFORM pg_temp.check('9 notificação falhou: agendamento confirmado mesmo assim',
    split_part(r, '|', 1) || '|' || (SELECT count(*) FROM public.appointments WHERE public_booking_id = b)::text, 'confirmed|1');
  PERFORM pg_temp.check('9 notificação falhou: nenhuma notificação gravada',
    (SELECT count(*)::text FROM public.notifications WHERE booking_id = b), '0');
EXCEPTION WHEN OTHERS THEN PERFORM set_config('agendix.fail_booking_notifications', 'off', false); PERFORM pg_temp.scenario_error('9 falha notif', SQLERRM);
END $$;

-- 10. Pedido pending anterior à troca continua aceitável/recusável.
DO $$
DECLARE r1 text; r2 text; v text;
BEGIN
  UPDATE public.business_settings SET online_booking_requires_approval = true WHERE user_id = 'ac000000-0000-0000-0000-0000000000a0';
  r1 := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000013', 'ac000000-0000-0000-0001-0000000000a2', pg_temp.slot(13, 10));
  r2 := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000014', 'ac000000-0000-0000-0001-0000000000a2', pg_temp.slot(13, 12));
  UPDATE public.business_settings SET online_booking_requires_approval = false WHERE user_id = 'ac000000-0000-0000-0000-0000000000a0';
  PERFORM pg_temp.check('10 criados como pending antes da troca', split_part(r1, '|', 1) || ',' || split_part(r2, '|', 1), 'pending,pending');
  PERFORM pg_temp.check('10 continuam pending depois de desligar',
    (SELECT string_agg(status, ',') FROM public.public_bookings WHERE id IN (pg_temp.bid(r1), pg_temp.bid(r2))), 'pending,pending');
  v := pg_temp.run_as('authenticated', 'ac000000-0000-0000-0000-0000000000a0',
    format('SELECT (public.accept_public_booking_v2(%L)->>''booking_id'')', pg_temp.bid(r1)));
  PERFORM pg_temp.check('10 aceitar pendente antigo funciona', v, pg_temp.bid(r1)::text);
  v := pg_temp.run_as('authenticated', 'ac000000-0000-0000-0000-0000000000a0',
    format('SELECT public.reject_public_booking_v2(%L)::text', pg_temp.bid(r2)));
  PERFORM pg_temp.check('10 recusar pendente antigo funciona', (v NOT LIKE 'error:%')::text, 'true');
  PERFORM pg_temp.check('10 estados finais',
    (SELECT status FROM public.public_bookings WHERE id = pg_temp.bid(r1)) || ',' || (SELECT status FROM public.public_bookings WHERE id = pg_temp.bid(r2)),
    'confirmed,cancelled');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('10 pendentes', SQLERRM);
END $$;

-- 4 (equivalência). O auto-confirmado gera o mesmo appointment que o aceite manual.
DO $$
DECLARE r1 text; r2 text; v1 text; v2 text;
BEGIN
  UPDATE public.business_settings SET online_booking_requires_approval = true WHERE user_id = 'ac000000-0000-0000-0000-0000000000a0';
  r1 := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000015', 'ac000000-0000-0000-0001-0000000000a2', pg_temp.slot(14, 10),
                     '[{"product_id":"ac000000-0000-0000-0003-0000000000a1","quantity":1}]', 'Igual');
  PERFORM pg_temp.run_as('authenticated', 'ac000000-0000-0000-0000-0000000000a0',
    format('SELECT (public.accept_public_booking_v2(%L)->>''booking_id'')', pg_temp.bid(r1)));
  UPDATE public.business_settings SET online_booking_requires_approval = false WHERE user_id = 'ac000000-0000-0000-0000-0000000000a0';
  r2 := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000015', 'ac000000-0000-0000-0001-0000000000a2', pg_temp.slot(14, 12),
                     '[{"product_id":"ac000000-0000-0000-0003-0000000000a1","quantity":1}]', 'Igual');
  SELECT a.client_id || '|' || a.professional_id || '|' || a.service || '|' || a.price || '|' || a.status || '|' || a.duration_minutes || '|' ||
         (SELECT string_agg(product_id || 'x' || quantity || '@' || unit_sale_price, ' ') FROM public.appointment_product_lines l WHERE l.appointment_id = a.id)
    INTO v1 FROM public.appointments a WHERE a.public_booking_id = pg_temp.bid(r1);
  SELECT a.client_id || '|' || a.professional_id || '|' || a.service || '|' || a.price || '|' || a.status || '|' || a.duration_minutes || '|' ||
         (SELECT string_agg(product_id || 'x' || quantity || '@' || unit_sale_price, ' ') FROM public.appointment_product_lines l WHERE l.appointment_id = a.id)
    INTO v2 FROM public.appointments a WHERE a.public_booking_id = pg_temp.bid(r2);
  PERFORM pg_temp.check('4 auto-confirmado = aceite manual (cliente, profissional, serviço, preço, status, duração, produtos)',
    v2, v1);
  PERFORM pg_temp.check('4 equivalência: os dois têm appointment', (v1 IS NOT NULL AND v2 IS NOT NULL)::text, 'true');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('4 equivalência', SQLERRM);
END $$;

-- Q4 / 17. Cancelamento pelo cliente.
DO $$
DECLARE r text; b uuid; v text; t_near timestamptz := date_trunc('hour', now()) + interval '4 hours';
BEGIN
  -- prazo de 24 h; horário daqui a ~4 h (dentro do prazo)
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000020', 'ac000000-0000-0000-0001-0000000000a2', t_near);
  b := pg_temp.bid(r);
  PERFORM pg_temp.check('Q4 auto-confirmado perto do horário foi criado', split_part(r, '|', 1), 'confirmed');
  v := pg_temp.run_as('anon', NULL, format('SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', b, '+55 11 90000-0020'));
  PERFORM pg_temp.check('Q4 nos primeiros 15 min: cancela mesmo dentro do prazo', v, 'true');
  PERFORM pg_temp.check('17 cancelar auto-confirmado cancela o appointment ligado',
    (SELECT status FROM public.public_bookings WHERE id = b) || '|' || (SELECT status FROM public.appointments WHERE public_booking_id = b),
    'cancelled|Cancelled');

  r := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000021', 'ac000000-0000-0000-0001-0000000000a2', t_near);
  b := pg_temp.bid(r);
  UPDATE public.public_booking_auto_confirmations SET confirmed_at = now() - interval '16 minutes' WHERE booking_id = b;
  v := pg_temp.run_as('anon', NULL, format('SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', b, '5511900000021'));
  PERFORM pg_temp.check('Q4 depois de 15 min: vale o prazo normal', v, 'error:cancel_window_closed');
  PERFORM pg_temp.check('Q4 depois de 15 min: continua confirmado',
    (SELECT status FROM public.public_bookings WHERE id = b) || '|' || (SELECT status FROM public.appointments WHERE public_booking_id = b), 'confirmed|Confirmed');

  -- marca forjada no futuro não abre janela eterna
  UPDATE public.public_booking_auto_confirmations SET confirmed_at = now() + interval '10 days' WHERE booking_id = b;
  v := pg_temp.run_as('anon', NULL, format('SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', b, '5511900000021'));
  PERFORM pg_temp.check('Q4 marca com data futura não dá janela', v, 'error:cancel_window_closed');

  -- 17: confirmado por aceite manual (sem marca) segue o prazo, como hoje
  UPDATE public.business_settings SET online_booking_requires_approval = true WHERE user_id = 'ac000000-0000-0000-0000-0000000000a0';
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000022', 'ac000000-0000-0000-0001-0000000000a1', t_near);
  b := pg_temp.bid(r);
  v := pg_temp.run_as('anon', NULL, format('SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', b, '5511900000022'));
  PERFORM pg_temp.check('17 pending cancela até o horário (inalterado)', v, 'true');
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000023', 'ac000000-0000-0000-0001-0000000000a1', t_near);
  b := pg_temp.bid(r);
  PERFORM pg_temp.run_as('authenticated', 'ac000000-0000-0000-0000-0000000000a0',
    format('SELECT (public.accept_public_booking_v2(%L)->>''booking_id'')', b));
  v := pg_temp.run_as('anon', NULL, format('SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', b, '5511900000023'));
  PERFORM pg_temp.check('17 aceito manualmente dentro do prazo: cancel_window_closed (inalterado)', v, 'error:cancel_window_closed');
  UPDATE public.business_settings SET online_booking_requires_approval = false WHERE user_id = 'ac000000-0000-0000-0000-0000000000a0';

  -- 17: auto-confirmado longe do horário cancela pelo prazo normal mesmo após 15 min
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000024', 'ac000000-0000-0000-0001-0000000000a2', pg_temp.slot(15, 10));
  b := pg_temp.bid(r);
  UPDATE public.public_booking_auto_confirmations SET confirmed_at = now() - interval '2 hours' WHERE booking_id = b;
  v := pg_temp.run_as('anon', NULL, format('SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', b, '5511900000024'));
  PERFORM pg_temp.check('17 auto-confirmado fora do prazo cancela normalmente', v, 'true');
  -- telefone errado continua recusado na janela
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000025', 'ac000000-0000-0000-0001-0000000000a2', t_near + interval '1 hour');
  b := pg_temp.bid(r);
  v := pg_temp.run_as('anon', NULL, format('SELECT public.cancel_public_booking_by_client_v2(%L, %L)::text', b, '5511900000099'));
  PERFORM pg_temp.check('Q4 janela não dispensa o telefone certo', v, 'error:booking_not_found');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('Q4 cancelamento', SQLERRM);
END $$;

-- 18. Alteração de um auto-confirmado vira pedido (Q1) e o aceite aplica.
DO $$
DECLARE r text; b uuid; v text; t1 timestamptz := pg_temp.slot(16, 10); t2 timestamptz := pg_temp.slot(16, 14);
BEGIN
  r := pg_temp.book('ac000000-0000-0000-0000-0000000000a0', '5511900000030', 'ac000000-0000-0000-0001-0000000000a2', t1);
  b := pg_temp.bid(r);
  v := pg_temp.run_as('anon', NULL, format(
    'SELECT status || ''|'' || is_edit::text FROM public.update_public_booking_by_client_v2(%L, %L, ARRAY[%L]::uuid[], %L::uuid, %L::timestamptz, %L::timestamptz, %L, %L, 40, 30, ''[]''::jsonb)',
    b, '5511900000030', 'ac000000-0000-0000-0002-0000000000a0', 'ac000000-0000-0000-0001-0000000000a2', t2, t1, 'Cliente Teste', '5511900000030'));
  PERFORM pg_temp.check('18 alterar auto-confirmado vira pedido de alteração (pending/is_edit)', v, 'pending|true');
  PERFORM pg_temp.check('18 appointment continua no horário antigo até o aceite',
    (SELECT (appointment_time = t1)::text || '|' || status FROM public.appointments WHERE public_booking_id = b), 'true|Confirmed');
  PERFORM pg_temp.check('18 notificação "Pedido de alteração"',
    (SELECT title FROM public.notifications WHERE booking_id = b AND event_key = 'edit:' || b AND user_id = 'ac000000-0000-0000-0000-0000000000a0'), 'Pedido de alteração');
  v := pg_temp.run_as('authenticated', 'ac000000-0000-0000-0000-0000000000a0',
    format('SELECT (public.accept_public_booking_v2(%L)->>''booking_id'')', b));
  PERFORM pg_temp.check('18 aceitar a alteração aplica no mesmo appointment',
    (SELECT status FROM public.public_bookings WHERE id = b) || '|' ||
    (SELECT count(*)::text || '|' || bool_and(appointment_time = t2)::text FROM public.appointments WHERE public_booking_id = b),
    'confirmed|1|true');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('18 alteração', SQLERRM);
END $$;

-- 21. Conflitos de bloqueio enxergam o auto-confirmado como appointment.
DO $$
BEGIN
  PERFORM pg_temp.check('21 slot_busy enxerga o auto-confirmado',
    public.public_booking_slot_busy('ac000000-0000-0000-0000-0000000000a0', pg_temp.slot(10, 13), 30, 'ac000000-0000-0000-0001-0000000000a1')::text, 'true');
  PERFORM pg_temp.check('21 appointment do auto-confirmado na coluna do profissional',
    (SELECT count(*)::text FROM public.appointments WHERE user_id = 'ac000000-0000-0000-0000-0000000000a0'
       AND professional_id = 'ac000000-0000-0000-0001-0000000000a1' AND appointment_time = pg_temp.slot(10, 13) AND status = 'Confirmed'), '1');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('21 conflitos', SQLERRM);
END $$;

-- Resultado ---------------------------------------------------------------------------
DO $$
DECLARE r record; n_fail int; n_total int;
BEGIN
  FOR r IN SELECT * FROM ac_result ORDER BY n LOOP
    IF r.ok THEN RAISE NOTICE 'PASS  %', r.name; ELSE RAISE NOTICE 'FAIL  % (%)', r.name, r.detail; END IF;
  END LOOP;
  SELECT count(*) FILTER (WHERE NOT ok), count(*) INTO n_fail, n_total FROM ac_result;
  IF n_fail > 0 THEN
    RAISE EXCEPTION 'auto_confirm_online_bookings: % de % checks falharam', n_fail, n_total;
  END IF;
  RAISE NOTICE 'auto_confirm_online_bookings: % checks ok', n_total;
END $$;
