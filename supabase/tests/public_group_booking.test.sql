-- Provas do agendamento em grupo: online (create_public_group_booking) e interno com
-- profissional por pessoa (create_internal_attendee_bookings_v2).
-- Dados fictícios. Cada check grava em pg_result; no fim, RAISE se algum falhou.
--   ab…a0 negócio M (aprovação manual)   ab…b0 negócio A (automático)   ab…c0 negócio C (um dia fechado)
SET TIMEZONE = 'UTC';
SET client_min_messages = notice;
CREATE TEMP TABLE pg_result (n serial, name text, ok boolean, detail text);

CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_exp text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO pg_result(name, ok, detail)
  VALUES (p_name, p_got IS NOT DISTINCT FROM p_exp, 'got=' || COALESCE(p_got, 'NULL') || ' expected=' || COALESCE(p_exp, 'NULL'));
END;
$$;
CREATE OR REPLACE FUNCTION pg_temp.scenario_error(p_name text, p_err text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN INSERT INTO pg_result(name, ok, detail) VALUES (p_name || ' (cenário abortou)', false, p_err); END;
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

CREATE OR REPLACE FUNCTION pg_temp.slot(p_days int, p_hour int, p_min int DEFAULT 0) RETURNS timestamptz LANGUAGE sql AS $$
  SELECT date_trunc('day', now()) + make_interval(days => p_days, hours => p_hour, mins => p_min)
$$;
CREATE OR REPLACE FUNCTION pg_temp.person(p_services text[], p_pro text, p_name text DEFAULT NULL) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object('attendee_name', p_name, 'service_ids', to_jsonb(p_services), 'professional_id', p_pro))
$$;
CREATE OR REPLACE FUNCTION pg_temp.grp(p_biz text, p_holder text, p_at timestamptz, p_people jsonb, p_phone text DEFAULT '351910000001') RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  RETURN pg_temp.run_as('anon', NULL, format(
    'SELECT string_agg(status || ''@'' || to_char(appointment_time AT TIME ZONE ''UTC'', ''HH24:MI'') || ''@'' || right(professional_id::text, 2) || ''@'' || total_price::text || ''@'' || COALESCE(attendee_name, ''-''), '','' ORDER BY group_position) FROM public.create_public_group_booking(%L, %L, %L, %L::timestamptz, %L::jsonb)',
    p_biz, p_holder, p_phone, p_at, p_people));
END;
$$;
CREATE OR REPLACE FUNCTION pg_temp.state(p_biz text) RETURNS text LANGUAGE sql AS $$
  SELECT (SELECT count(*) FROM public.public_bookings WHERE business_id = p_biz)::text || '/' ||
         (SELECT count(*) FROM public.appointments WHERE user_id = p_biz)::text || '/' ||
         (SELECT count(*) FROM public.client_dependents WHERE user_id = p_biz)::text
$$;

INSERT INTO public.profiles (id, role, company_id) VALUES
  ('ab000000-0000-0000-0000-0000000000a0', 'owner', 'ab000000-0000-0000-0000-0000000000a0'),
  ('ab000000-0000-0000-0000-0000000000b0', 'owner', 'ab000000-0000-0000-0000-0000000000b0'),
  ('ab000000-0000-0000-0000-0000000000c0', 'owner', 'ab000000-0000-0000-0000-0000000000c0');
UPDATE public.profiles SET booking_lead_time_hours = 0 WHERE id LIKE 'ab000000-%';

INSERT INTO public.team_members (id, user_id, name, is_owner, active, display_order) VALUES
  ('ab000000-0000-0000-0001-0000000000a1', 'ab000000-0000-0000-0000-0000000000a0', 'Profissional Um', false, true, 1),
  ('ab000000-0000-0000-0001-0000000000a2', 'ab000000-0000-0000-0000-0000000000a0', 'Profissional Dois', false, true, 2),
  ('ab000000-0000-0000-0001-0000000000a3', 'ab000000-0000-0000-0000-0000000000a0', 'Profissional Inativo', false, false, 3),
  ('ab000000-0000-0000-0001-0000000000b1', 'ab000000-0000-0000-0000-0000000000b0', 'Profissional Um', false, true, 1),
  ('ab000000-0000-0000-0001-0000000000b2', 'ab000000-0000-0000-0000-0000000000b0', 'Profissional Dois', false, true, 2),
  ('ab000000-0000-0000-0001-0000000000c1', 'ab000000-0000-0000-0000-0000000000c0', 'Profissional Um', false, true, 1);

INSERT INTO public.services (id, user_id, name, price, duration_minutes, active) VALUES
  ('ab000000-0000-0000-0002-0000000000a1', 'ab000000-0000-0000-0000-0000000000a0', 'Serviço Um', 40, 30, true),
  ('ab000000-0000-0000-0002-0000000000a2', 'ab000000-0000-0000-0000-0000000000a0', 'Serviço Dois', 30, 20, true),
  ('ab000000-0000-0000-0002-0000000000a3', 'ab000000-0000-0000-0000-0000000000a0', 'Sem preço', 0, 30, true),
  ('ab000000-0000-0000-0002-0000000000a4', 'ab000000-0000-0000-0000-0000000000a0', 'Sem duração', 25, 0, true),
  ('ab000000-0000-0000-0002-0000000000a5', 'ab000000-0000-0000-0000-0000000000a0', 'Inativo', 25, 30, false),
  ('ab000000-0000-0000-0002-0000000000b1', 'ab000000-0000-0000-0000-0000000000b0', 'Serviço Um', 40, 30, true),
  ('ab000000-0000-0000-0002-0000000000b2', 'ab000000-0000-0000-0000-0000000000b0', 'Serviço Dois', 30, 20, true),
  ('ab000000-0000-0000-0002-0000000000c1', 'ab000000-0000-0000-0000-0000000000c0', 'Serviço Um', 40, 30, true);

INSERT INTO public.business_settings (user_id, business_hours, timezone)
SELECT b, (SELECT jsonb_object_agg(d, jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '18:00'))))
           FROM unnest(ARRAY['sun','mon','tue','wed','thu','fri','sat']) d), 'UTC'
FROM unnest(ARRAY['ab000000-0000-0000-0000-0000000000a0','ab000000-0000-0000-0000-0000000000b0','ab000000-0000-0000-0000-0000000000c0']) b
ON CONFLICT (user_id) DO UPDATE SET business_hours = EXCLUDED.business_hours, timezone = EXCLUDED.timezone;
UPDATE public.business_settings SET online_booking_requires_approval = false WHERE user_id = 'ab000000-0000-0000-0000-0000000000b0';
UPDATE public.business_settings SET business_hours = jsonb_set(business_hours,
  ARRAY[CASE extract(dow FROM pg_temp.slot(12, 10))::int WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue' WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' WHEN 5 THEN 'fri' ELSE 'sat' END, 'isOpen'], 'false'::jsonb)
 WHERE user_id = 'ab000000-0000-0000-0000-0000000000c0';

INSERT INTO public.clients (id, user_id, name, phone) VALUES
  ('ab000000-0000-0000-0004-0000000000a1', 'ab000000-0000-0000-0000-0000000000a0', 'Titular Fictício', '351910000009');
INSERT INTO public.client_dependents (id, user_id, client_id, name) VALUES
  ('ab000000-0000-0000-0005-0000000000a1', 'ab000000-0000-0000-0000-0000000000a0', 'ab000000-0000-0000-0004-0000000000a1', 'Dependente Fictício');

-- 1. Metadados e permissões ---------------------------------------------------------------
DO $$
BEGIN
  PERFORM pg_temp.check('1 colunas do grupo em public_bookings',
    (SELECT string_agg(column_name, ',' ORDER BY column_name) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'public_bookings' AND column_name IN ('group_id', 'group_position', 'attendee_name')),
    'attendee_name,group_id,group_position');
  PERFORM pg_temp.check('1 anon executa o agendamento em grupo',
    has_function_privilege('anon', 'public.create_public_group_booking(text,text,text,timestamptz,jsonb)', 'EXECUTE')::text, 'true');
  PERFORM pg_temp.check('1 anon não executa a checagem de expediente',
    has_function_privilege('anon', 'public.public_group_slot_within_hours(text,timestamptz,integer)', 'EXECUTE')::text, 'false');
  PERFORM pg_temp.check('1 anon não executa o interno v2',
    has_function_privilege('anon', 'public.create_internal_attendee_bookings_v2(uuid,uuid,uuid,timestamptz,jsonb,text)', 'EXECUTE')::text, 'false');
  PERFORM pg_temp.check('1 authenticated executa o interno v2',
    has_function_privilege('authenticated', 'public.create_internal_attendee_bookings_v2(uuid,uuid,uuid,timestamptz,jsonb,text)', 'EXECUTE')::text, 'true');
  PERFORM pg_temp.check('1 anon não executa o resolvedor de dependente',
    has_function_privilege('anon', 'public.resolve_online_group_attendee()', 'EXECUTE')::text, 'false');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('1 metadados', SQLERRM);
END $$;

-- 2. Manual: dois profissionais no mesmo horário, preço recalculado no banco ---------------
DO $$
DECLARE r text;
BEGIN
  r := pg_temp.grp('ab000000-0000-0000-0000-0000000000a0', 'Titular Um', pg_temp.slot(10, 10), jsonb_build_array(
    pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000a1'], 'ab000000-0000-0000-0001-0000000000a1'),
    pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000a2'], 'ab000000-0000-0000-0001-0000000000a2', 'Dependente Um')));
  PERFORM pg_temp.check('2 dois profissionais, mesmo horário, pendentes', r,
    'pending@10:00@a1@40@-,pending@10:00@a2@30@Dependente Um');
  PERFORM pg_temp.check('2 mesmo grupo, posições 0 e 1',
    (SELECT count(DISTINCT group_id)::text || '/' || string_agg(group_position::text, ',' ORDER BY group_position)
       FROM public.public_bookings WHERE business_id = 'ab000000-0000-0000-0000-0000000000a0' AND appointment_time = pg_temp.slot(10, 10)), '1/0,1');
  PERFORM pg_temp.check('2 modo manual não cria agendamento nem dependente',
    pg_temp.state('ab000000-0000-0000-0000-0000000000a0'), '2/0/1');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('2 manual', SQLERRM);
END $$;

-- 3. Mesmo profissional: em sequência --------------------------------------------------------
DO $$
BEGIN
  PERFORM pg_temp.check('3 mesmo profissional, em sequência',
    pg_temp.grp('ab000000-0000-0000-0000-0000000000a0', 'Titular Dois', pg_temp.slot(10, 14), jsonb_build_array(
      pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000a1','ab000000-0000-0000-0002-0000000000a2'], 'ab000000-0000-0000-0001-0000000000a1'),
      pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000a2'], 'ab000000-0000-0000-0001-0000000000a1', 'Dependente Dois')), '351910000002'),
    'pending@14:00@a1@70@-,pending@14:50@a1@30@Dependente Dois');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('3 sequência', SQLERRM);
END $$;

-- 4. Automático: confirma, cria agendamentos e o dependente --------------------------------
DO $$
DECLARE r text;
BEGIN
  r := pg_temp.grp('ab000000-0000-0000-0000-0000000000b0', 'Titular Três', pg_temp.slot(10, 10), jsonb_build_array(
    pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000b1'], 'ab000000-0000-0000-0001-0000000000b1'),
    pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000b2'], 'ab000000-0000-0000-0001-0000000000b2', 'Dependente Três')), '351910000003');
  PERFORM pg_temp.check('4 automático confirma os dois', r, 'confirmed@10:00@b1@40@-,confirmed@10:00@b2@30@Dependente Três');
  PERFORM pg_temp.check('4 um agendamento por pessoa, ligado ao pedido',
    (SELECT count(*)::text || '/' || count(DISTINCT client_id)::text FROM public.appointments WHERE user_id = 'ab000000-0000-0000-0000-0000000000b0' AND public_booking_id IS NOT NULL), '2/1');
  PERFORM pg_temp.check('4 agendamento do dependente aponta para o dependente criado',
    (SELECT a.attendee_name || '|' || d.source || '|' || d.is_active::text FROM public.appointments a
       JOIN public.client_dependents d ON d.id = a.dependent_id AND d.client_id = a.client_id
      WHERE a.user_id = 'ab000000-0000-0000-0000-0000000000b0' AND a.professional_id = 'ab000000-0000-0000-0001-0000000000b2'),
    'Dependente Três|agendamento_online|true');
  PERFORM pg_temp.check('4 agendamento do titular sem dependente',
    (SELECT (dependent_id IS NULL)::text FROM public.appointments WHERE user_id = 'ab000000-0000-0000-0000-0000000000b0' AND professional_id = 'ab000000-0000-0000-0001-0000000000b1'), 'true');
  PERFORM pg_temp.check('4 preço de cada agendamento',
    (SELECT string_agg(price::text, ',' ORDER BY price) FROM public.appointments WHERE user_id = 'ab000000-0000-0000-0000-0000000000b0'), '30,40');
  r := pg_temp.grp('ab000000-0000-0000-0000-0000000000b0', 'Titular Três', pg_temp.slot(10, 12), jsonb_build_array(
    pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000b1'], 'ab000000-0000-0000-0001-0000000000b1'),
    pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000b2'], 'ab000000-0000-0000-0001-0000000000b2', ' dependente três ')), '351910000003');
  PERFORM pg_temp.check('4 mesmo dependente numa segunda vez reaproveita o cadastro',
    (SELECT count(*)::text FROM public.client_dependents WHERE user_id = 'ab000000-0000-0000-0000-0000000000b0'), '1');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('4 automático', SQLERRM);
END $$;

-- 5. Conflito posterior desfaz o grupo inteiro ----------------------------------------------
DO $$
DECLARE before_state text; r text;
BEGIN
  INSERT INTO public.appointments (user_id, professional_id, appointment_time, duration_minutes, status, service, price)
  VALUES ('ab000000-0000-0000-0000-0000000000b0', 'ab000000-0000-0000-0001-0000000000b2', pg_temp.slot(11, 10), 30, 'Confirmed', 'Serviço Um', 40);
  before_state := pg_temp.state('ab000000-0000-0000-0000-0000000000b0');
  r := pg_temp.grp('ab000000-0000-0000-0000-0000000000b0', 'Titular Quatro', pg_temp.slot(11, 10), jsonb_build_array(
    pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000b1'], 'ab000000-0000-0000-0001-0000000000b1'),
    pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000b2'], 'ab000000-0000-0000-0001-0000000000b2', 'Dependente Quatro')), '351910000004');
  PERFORM pg_temp.check('5 conflito da segunda pessoa devolve slot_unavailable', r, 'error:slot_unavailable');
  PERFORM pg_temp.check('5 nada do grupo ficou salvo (pedidos/agendamentos/dependentes)',
    pg_temp.state('ab000000-0000-0000-0000-0000000000b0'), before_state);
  PERFORM pg_temp.check('5 nem cliente novo ficou',
    (SELECT count(*)::text FROM public.clients WHERE user_id = 'ab000000-0000-0000-0000-0000000000b0' AND phone LIKE '%910000004'), '0');
  INSERT INTO public.agenda_blocks (user_id, professional_id, starts_at, ends_at)
  VALUES ('ab000000-0000-0000-0000-0000000000b0', 'ab000000-0000-0000-0001-0000000000b2', pg_temp.slot(11, 14), pg_temp.slot(11, 15));
  before_state := pg_temp.state('ab000000-0000-0000-0000-0000000000b0');
  r := pg_temp.grp('ab000000-0000-0000-0000-0000000000b0', 'Titular Cinco', pg_temp.slot(11, 14), jsonb_build_array(
    pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000b1'], 'ab000000-0000-0000-0001-0000000000b1'),
    pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000b2'], 'ab000000-0000-0000-0001-0000000000b2', 'Dependente Cinco')), '351910000005');
  PERFORM pg_temp.check('5 bloqueio da agenda na segunda pessoa desfaz tudo', r || '|' || (pg_temp.state('ab000000-0000-0000-0000-0000000000b0') = before_state)::text,
    'error:slot_unavailable|true');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('5 conflito', SQLERRM);
END $$;

-- 6. Expediente ------------------------------------------------------------------------------
DO $$
DECLARE before_state text;
BEGIN
  before_state := pg_temp.state('ab000000-0000-0000-0000-0000000000a0');
  PERFORM pg_temp.check('6 antes de abrir',
    pg_temp.grp('ab000000-0000-0000-0000-0000000000a0', 'Titular Seis', pg_temp.slot(12, 8, 30), jsonb_build_array(
      pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000a1'], 'ab000000-0000-0000-0001-0000000000a1'),
      pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000a2'], 'ab000000-0000-0000-0001-0000000000a2', 'Dependente Seis')), '351910000006'), 'error:slot_unavailable');
  PERFORM pg_temp.check('6 segunda pessoa na sequência estoura o fechamento',
    pg_temp.grp('ab000000-0000-0000-0000-0000000000a0', 'Titular Seis', pg_temp.slot(12, 17, 30), jsonb_build_array(
      pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000a2'], 'ab000000-0000-0000-0001-0000000000a1'),
      pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000a2'], 'ab000000-0000-0000-0001-0000000000a1', 'Dependente Seis')), '351910000006'), 'error:slot_unavailable');
  PERFORM pg_temp.check('6 termina exatamente no fechamento é aceito',
    pg_temp.grp('ab000000-0000-0000-0000-0000000000a0', 'Titular Seis', pg_temp.slot(12, 17, 0), jsonb_build_array(
      pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000a1'], 'ab000000-0000-0000-0001-0000000000a1'),
      pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000a1'], 'ab000000-0000-0000-0001-0000000000a2', 'Dependente Seis')), '351910000006'),
    'pending@17:00@a1@40@-,pending@17:00@a2@40@Dependente Seis');
  PERFORM pg_temp.check('6 nada ficou dos recusados', pg_temp.state('ab000000-0000-0000-0000-0000000000a0'), 
    ((split_part(before_state, '/', 1))::int + 2)::text || '/0/1');
  PERFORM pg_temp.check('6 dia fechado',
    pg_temp.grp('ab000000-0000-0000-0000-0000000000c0', 'Titular Sete', pg_temp.slot(12, 10), jsonb_build_array(
      pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000c1'], 'ab000000-0000-0000-0001-0000000000c1'),
      pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000c1'], 'ab000000-0000-0000-0001-0000000000c1', 'Dependente Sete')), '351910000007'), 'error:slot_unavailable');
  PERFORM pg_temp.check('6 dia aberto do mesmo negócio',
    pg_temp.grp('ab000000-0000-0000-0000-0000000000c0', 'Titular Sete', pg_temp.slot(13, 10), jsonb_build_array(
      pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000c1'], 'ab000000-0000-0000-0001-0000000000c1'),
      pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000c1'], 'ab000000-0000-0000-0001-0000000000c1', 'Dependente Sete')), '351910000007'),
    'pending@10:00@c1@40@-,pending@10:30@c1@40@Dependente Sete');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('6 expediente', SQLERRM);
END $$;

-- 7. Entradas inválidas -----------------------------------------------------------------------
DO $$
DECLARE
  a1 text := 'ab000000-0000-0000-0001-0000000000a1';
  a2 text := 'ab000000-0000-0000-0001-0000000000a2';
  s1 text := 'ab000000-0000-0000-0002-0000000000a1';
  biz text := 'ab000000-0000-0000-0000-0000000000a0';
  t timestamptz := pg_temp.slot(14, 10);
BEGIN
  PERFORM pg_temp.check('7 serviço sem preço fica de fora',
    pg_temp.grp(biz, 'T', t, jsonb_build_array(pg_temp.person(ARRAY[s1], a1), pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000a3'], a2, 'D'))), 'error:invalid_services');
  PERFORM pg_temp.check('7 serviço sem duração fica de fora',
    pg_temp.grp(biz, 'T', t, jsonb_build_array(pg_temp.person(ARRAY[s1], a1), pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000a4'], a2, 'D'))), 'error:invalid_services');
  PERFORM pg_temp.check('7 serviço inativo',
    pg_temp.grp(biz, 'T', t, jsonb_build_array(pg_temp.person(ARRAY[s1], a1), pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000a5'], a2, 'D'))), 'error:invalid_services');
  PERFORM pg_temp.check('7 serviço de outro negócio',
    pg_temp.grp(biz, 'T', t, jsonb_build_array(pg_temp.person(ARRAY[s1], a1), pg_temp.person(ARRAY['ab000000-0000-0000-0002-0000000000b1'], a2, 'D'))), 'error:invalid_services');
  PERFORM pg_temp.check('7 serviço repetido na mesma pessoa',
    pg_temp.grp(biz, 'T', t, jsonb_build_array(pg_temp.person(ARRAY[s1, s1], a1), pg_temp.person(ARRAY[s1], a2, 'D'))), 'error:invalid_services');
  PERFORM pg_temp.check('7 pessoa sem serviço',
    pg_temp.grp(biz, 'T', t, jsonb_build_array(pg_temp.person(ARRAY[s1], a1), pg_temp.person(ARRAY[]::text[], a2, 'D'))), 'error:invalid_services');
  PERFORM pg_temp.check('7 profissional inativo',
    pg_temp.grp(biz, 'T', t, jsonb_build_array(pg_temp.person(ARRAY[s1], a1), pg_temp.person(ARRAY[s1], 'ab000000-0000-0000-0001-0000000000a3', 'D'))), 'error:invalid_professional');
  PERFORM pg_temp.check('7 profissional de outro negócio',
    pg_temp.grp(biz, 'T', t, jsonb_build_array(pg_temp.person(ARRAY[s1], a1), pg_temp.person(ARRAY[s1], 'ab000000-0000-0000-0001-0000000000b1', 'D'))), 'error:invalid_professional');
  PERFORM pg_temp.check('7 sem profissional (o grupo exige escolha)',
    pg_temp.grp(biz, 'T', t, jsonb_build_array(pg_temp.person(ARRAY[s1], a1), jsonb_build_object('attendee_name', 'D', 'service_ids', jsonb_build_array(s1)))), 'error:invalid_professional');
  PERFORM pg_temp.check('7 dependente sem nome',
    pg_temp.grp(biz, 'T', t, jsonb_build_array(pg_temp.person(ARRAY[s1], a1), pg_temp.person(ARRAY[s1], a2, '  '))), 'error:invalid_people');
  PERFORM pg_temp.check('7 dependente com o nome do titular',
    pg_temp.grp(biz, 'Maria', t, jsonb_build_array(pg_temp.person(ARRAY[s1], a1), pg_temp.person(ARRAY[s1], a2, ' maria '))), 'error:invalid_people');
  PERFORM pg_temp.check('7 dois dependentes com o mesmo nome',
    pg_temp.grp(biz, 'T', t, jsonb_build_array(pg_temp.person(ARRAY[s1], a1), pg_temp.person(ARRAY[s1], a2, 'Ana'), pg_temp.person(ARRAY[s1], a1, 'ANA'))), 'error:invalid_people');
  PERFORM pg_temp.check('7 uma pessoa só não é grupo',
    pg_temp.grp(biz, 'T', t, jsonb_build_array(pg_temp.person(ARRAY[s1], a1))), 'error:invalid_people');
  PERFORM pg_temp.check('7 mais de 5 pessoas',
    pg_temp.grp(biz, 'T', t, (SELECT jsonb_agg(pg_temp.person(ARRAY[s1], a1, CASE WHEN i = 1 THEN NULL ELSE 'P' || i END)) FROM generate_series(1, 6) i)), 'error:invalid_people');
  PERFORM pg_temp.check('7 horário no passado',
    pg_temp.grp(biz, 'T', now() - interval '1 day', jsonb_build_array(pg_temp.person(ARRAY[s1], a1), pg_temp.person(ARRAY[s1], a2, 'D'))), 'error:slot_unavailable');
  PERFORM pg_temp.check('7 titular sem telefone',
    pg_temp.grp(biz, 'T', t, jsonb_build_array(pg_temp.person(ARRAY[s1], a1), pg_temp.person(ARRAY[s1], a2, 'D')), ''), 'error:invalid_customer');
  PERFORM pg_temp.check('7 nada foi gravado pelas tentativas inválidas',
    (SELECT count(*)::text FROM public.public_bookings WHERE business_id = biz AND appointment_time = t), '0');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('7 inválidas', SQLERRM);
END $$;

-- 8. Aceite manual de cada pedido do grupo cria o agendamento do dependente -------------------
DO $$
DECLARE b uuid;
BEGIN
  SELECT id INTO b FROM public.public_bookings
   WHERE business_id = 'ab000000-0000-0000-0000-0000000000a0' AND attendee_name = 'Dependente Um';
  PERFORM pg_temp.check('8 dono aceita o pedido do dependente',
    (pg_temp.run_as('authenticated', 'ab000000-0000-0000-0000-0000000000a0', format('SELECT (public.accept_public_booking_v2(%L)->>''booking_id'')', b)) LIKE 'error:%')::text, 'false');
  PERFORM pg_temp.check('8 agendamento com dependente criado no aceite',
    (SELECT a.attendee_name || '|' || (a.dependent_id IS NOT NULL)::text FROM public.appointments a WHERE a.public_booking_id = b), 'Dependente Um|true');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('8 aceite', SQLERRM);
END $$;

-- 9. Interno: profissional por pessoa ----------------------------------------------------------
DO $$
DECLARE
  biz text := 'ab000000-0000-0000-0000-0000000000a0';
  call text := 'SELECT public.create_internal_attendee_bookings_v2(%L::uuid, ''ab000000-0000-0000-0004-0000000000a1''::uuid, %L::uuid, %L::timestamptz, %L::jsonb)::text';
  r text;
  before_state text;
BEGIN
  r := pg_temp.run_as('authenticated', biz, format(call, biz, 'ab000000-0000-0000-0001-0000000000a1', pg_temp.slot(15, 10),
    jsonb_build_array(
      jsonb_build_object('service_ids', jsonb_build_array('ab000000-0000-0000-0002-0000000000a1'), 'professional_id', 'ab000000-0000-0000-0001-0000000000a1'),
      jsonb_build_object('dependent_id', 'ab000000-0000-0000-0005-0000000000a1', 'service_ids', jsonb_build_array('ab000000-0000-0000-0002-0000000000a2'), 'professional_id', 'ab000000-0000-0000-0001-0000000000a2'))));
  PERFORM pg_temp.check('9 duas pessoas, dois profissionais, mesmo horário', CASE WHEN r LIKE 'error:%' THEN r ELSE (r::jsonb->>'success') END, 'true');
  PERFORM pg_temp.check('9 horários e profissionais gravados',
    (SELECT string_agg(to_char(appointment_time AT TIME ZONE 'UTC', 'HH24:MI') || '@' || right(professional_id::text, 2) || '@' || COALESCE(attendee_name, '-'), ',' ORDER BY professional_id)
       FROM public.appointments WHERE user_id = biz AND appointment_time = pg_temp.slot(15, 10)),
    '10:00@a1@Titular Fictício,10:00@a2@Dependente Fictício');
  r := pg_temp.run_as('authenticated', biz, format(call, biz, 'ab000000-0000-0000-0001-0000000000a1', pg_temp.slot(15, 12),
    jsonb_build_array(
      jsonb_build_object('service_ids', jsonb_build_array('ab000000-0000-0000-0002-0000000000a1')),
      jsonb_build_object('dependent_id', 'ab000000-0000-0000-0005-0000000000a1', 'service_ids', jsonb_build_array('ab000000-0000-0000-0002-0000000000a2')))));
  PERFORM pg_temp.check('9 sem profissional por pessoa usa o principal, em sequência (comportamento anterior)',
    (r::jsonb->>'success') || '|' || (SELECT string_agg(to_char(appointment_time AT TIME ZONE 'UTC', 'HH24:MI'), ',' ORDER BY appointment_time)
       FROM public.appointments WHERE user_id = biz AND appointment_time >= pg_temp.slot(15, 12) AND appointment_time < pg_temp.slot(15, 13)),
    'true|12:00,12:30');
  before_state := pg_temp.state(biz);
  r := pg_temp.run_as('authenticated', biz, format(call, biz, 'ab000000-0000-0000-0001-0000000000a1', pg_temp.slot(15, 10, 0),
    jsonb_build_array(
      jsonb_build_object('service_ids', jsonb_build_array('ab000000-0000-0000-0002-0000000000a1'), 'professional_id', 'ab000000-0000-0000-0001-0000000000a2'),
      jsonb_build_object('dependent_id', 'ab000000-0000-0000-0005-0000000000a1', 'service_ids', jsonb_build_array('ab000000-0000-0000-0002-0000000000a2'), 'professional_id', 'ab000000-0000-0000-0001-0000000000a1'))));
  PERFORM pg_temp.check('9 conflito em qualquer pessoa devolve falha e não salva nada',
    (r::jsonb->>'success') || '|' || (r::jsonb->>'code') || '|' || (pg_temp.state(biz) = before_state)::text, 'false|sequence_slot_unavailable|true');
  PERFORM pg_temp.check('9 mensagem cita o profissional ocupado', ((r::jsonb->>'message') LIKE '%Profissional Dois%' OR (r::jsonb->>'message') LIKE '%Profissional Um%')::text, 'true');
  PERFORM pg_temp.check('9 profissional de outro negócio é recusado',
    pg_temp.run_as('authenticated', biz, format(call, biz, 'ab000000-0000-0000-0001-0000000000a1', pg_temp.slot(15, 15),
      jsonb_build_array(jsonb_build_object('service_ids', jsonb_build_array('ab000000-0000-0000-0002-0000000000a1'), 'professional_id', 'ab000000-0000-0000-0001-0000000000b1')))),
    'error:invalid_holder_or_professional');
  PERFORM pg_temp.check('9 outro negócio não usa o interno do vizinho',
    pg_temp.run_as('authenticated', 'ab000000-0000-0000-0000-0000000000b0', format(call, biz, 'ab000000-0000-0000-0001-0000000000a1', pg_temp.slot(15, 16),
      jsonb_build_array(jsonb_build_object('service_ids', jsonb_build_array('ab000000-0000-0000-0002-0000000000a1'))))),
    'error:forbidden');
  PERFORM pg_temp.check('9 anônimo sem acesso',
    (pg_temp.run_as('anon', NULL, format(call, biz, 'ab000000-0000-0000-0001-0000000000a1', pg_temp.slot(15, 16), '[]')) LIKE 'error:permission denied%')::text, 'true');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('9 interno', SQLERRM || ' @ ' || r);
END $$;

-- 10. Compatibilidade: função anterior continua igual -------------------------------------------
DO $$
BEGIN
  PERFORM pg_temp.check('10 interno anterior continua disponível',
    (to_regprocedure('public.create_internal_attendee_bookings(uuid,uuid,uuid,timestamptz,jsonb,text)') IS NOT NULL)::text, 'true');
  PERFORM pg_temp.check('10 agendamento individual anterior continua disponível',
    (to_regprocedure('public.create_public_booking(text,text,text,uuid[],uuid,timestamptz,numeric,integer,jsonb)') IS NOT NULL)::text, 'true');
END $$;

-- 11. Avisos do dono mostram quem será atendido, com o responsável ----------------------------
DO $$
DECLARE
  rec public.public_bookings%ROWTYPE;
  biz_a constant text := 'ab000000-0000-0000-0000-0000000000a0';
  biz_b constant text := 'ab000000-0000-0000-0000-0000000000b0';
BEGIN
  PERFORM pg_temp.check('11 pedido pendente: cada pessoa aparece com o responsável',
    (SELECT string_agg(split_part(n.message, ', ', 1), ' | ' ORDER BY pb.group_position)
       FROM public.public_bookings pb
       JOIN public.notifications n ON n.booking_id = pb.id AND n.user_id = biz_a
      WHERE pb.business_id = biz_a AND pb.appointment_time = pg_temp.slot(10, 10)),
    'Novo pedido: Titular Um | Novo pedido: Dependente Um (responsável: Titular Um)');
  PERFORM pg_temp.check('11 pedido pendente: mantém serviço e horário no aviso',
    (SELECT (n.message LIKE 'Novo pedido: Dependente Um (responsável: Titular Um), Serviço Dois, %')::text
       FROM public.public_bookings pb JOIN public.notifications n ON n.booking_id = pb.id AND n.user_id = biz_a
      WHERE pb.business_id = biz_a AND pb.attendee_name = 'Dependente Um'), 'true');
  PERFORM pg_temp.check('11 pedido pendente: sequência com o mesmo profissional',
    (SELECT (n.message LIKE 'Novo pedido: Dependente Dois (responsável: Titular Dois), Serviço Dois, %')::text
       FROM public.public_bookings pb JOIN public.notifications n ON n.booking_id = pb.id AND n.user_id = biz_a
      WHERE pb.business_id = biz_a AND pb.attendee_name = 'Dependente Dois'), 'true');
  PERFORM pg_temp.check('11 título do aviso continua o mesmo',
    (SELECT string_agg(DISTINCT n.title, ',') FROM public.notifications n WHERE n.user_id = biz_a AND n.booking_id IS NOT NULL), 'Novo pedido');
  PERFORM pg_temp.check('11 confirmado na hora: pessoa atendida e responsável',
    (SELECT (n.message LIKE 'Novo agendamento online: Dependente Três (responsável: Titular Três), Serviço Dois, % — já está na agenda.')::text
       FROM public.public_bookings pb JOIN public.notifications n ON n.booking_id = pb.id AND n.user_id = biz_b
      WHERE pb.business_id = biz_b AND pb.attendee_name = 'Dependente Três' AND pb.appointment_time = pg_temp.slot(10, 10)), 'true');
  PERFORM pg_temp.check('11 confirmado na hora: titular continua só com o próprio nome',
    (SELECT (n.message LIKE 'Novo agendamento online: Titular Três, Serviço Um, % — já está na agenda.')::text
       FROM public.public_bookings pb JOIN public.notifications n ON n.booking_id = pb.id AND n.user_id = biz_b
      WHERE pb.business_id = biz_b AND pb.attendee_name IS NULL AND pb.appointment_time = pg_temp.slot(10, 10)), 'true');

  -- pedido de alteração de uma pessoa do grupo
  SELECT * INTO rec FROM public.public_bookings WHERE business_id = biz_a AND attendee_name = 'Dependente Um';
  PERFORM public.notify_booking_recipients(rec, 'edit', rec.appointment_time - interval '1 day', ARRAY[rec.professional_id]);
  PERFORM pg_temp.check('11 pedido de alteração cita a pessoa e o responsável',
    (SELECT (n.message LIKE 'Pedido de alteração: Dependente Um (responsável: Titular Um), de % para %')::text
       FROM public.notifications n WHERE n.booking_id = rec.id AND n.user_id = biz_a AND n.event_key = 'edit:' || rec.id::text), 'true');

  -- nome igual ao do responsável não repete
  rec.attendee_name := rec.customer_name;
  PERFORM public.notify_booking_recipients(rec, 'edit', rec.appointment_time - interval '1 day', ARRAY[rec.professional_id]);
  PERFORM pg_temp.check('11 mesmo nome do responsável não é repetido',
    (SELECT (n.message LIKE 'Pedido de alteração: Titular Um, de % para %')::text
       FROM public.notifications n WHERE n.booking_id = rec.id AND n.user_id = biz_a AND n.event_key = 'edit:' || rec.id::text), 'true');

  -- nome em branco também não gera "(responsável: ...)"
  rec.attendee_name := '   ';
  PERFORM public.notify_booking_recipients(rec, 'edit', rec.appointment_time - interval '1 day', ARRAY[rec.professional_id]);
  PERFORM pg_temp.check('11 nome em branco usa só o responsável',
    (SELECT (n.message LIKE 'Pedido de alteração: Titular Um, de % para %')::text
       FROM public.notifications n WHERE n.booking_id = rec.id AND n.user_id = biz_a AND n.event_key = 'edit:' || rec.id::text), 'true');

  PERFORM pg_temp.check('11 permissões da função de avisos continuam restritas',
    has_function_privilege('anon', 'public.notify_booking_recipients(public.public_bookings,text,timestamptz,uuid[])', 'EXECUTE')::text || '/' ||
    has_function_privilege('authenticated', 'public.notify_booking_recipients(public.public_bookings,text,timestamptz,uuid[])', 'EXECUTE')::text || '/' ||
    has_function_privilege('service_role', 'public.notify_booking_recipients(public.public_bookings,text,timestamptz,uuid[])', 'EXECUTE')::text,
    'false/false/true');
EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.scenario_error('11 avisos', SQLERRM);
END $$;

-- Resultado ----------------------------------------------------------------------------------------
DO $$
DECLARE r record; n_fail int; n_total int;
BEGIN
  FOR r IN SELECT * FROM pg_result ORDER BY n LOOP
    IF r.ok THEN RAISE NOTICE 'PASS  %', r.name; ELSE RAISE NOTICE 'FAIL  % (%)', r.name, r.detail; END IF;
  END LOOP;
  SELECT count(*) FILTER (WHERE NOT ok), count(*) INTO n_fail, n_total FROM pg_result;
  IF n_fail > 0 THEN RAISE EXCEPTION 'public_group_booking: % de % checks falharam', n_fail, n_total; END IF;
  RAISE NOTICE 'public_group_booking: % checks ok', n_total;
END $$;
