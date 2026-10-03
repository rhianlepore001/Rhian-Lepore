-- Follow-up ACCEPTANCE. Falha no estado do #113; passa depois de 20261003120000.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

CREATE TEMP TABLE results (name text, got text, expected text);
CREATE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_name, p_got, p_expected);
$$;
CREATE FUNCTION pg_temp.try(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RETURN 'ok';
EXCEPTION WHEN OTHERS THEN
  RETURN 'error:' || SQLERRM;
END $$;

\set OWNER '00000000-0000-0000-0000-00000000000a'
\set PRO1 '10000000-0000-0000-0000-000000000001'
\set PRO2 '10000000-0000-0000-0000-000000000002'
\set CLIENT '30000000-0000-0000-0000-000000000001'
\set SVC '20000000-0000-0000-0000-000000000001'

INSERT INTO public.profiles (id, role, region) VALUES (:'OWNER', 'owner', 'PT')
ON CONFLICT (id) DO UPDATE SET role = 'owner';
INSERT INTO public.team_members (id, user_id, name, active, is_owner, display_order) VALUES
  (:'PRO1', :'OWNER', 'Diego', true, true, 0),
  (:'PRO2', :'OWNER', 'Bruna', true, false, 1)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_owner = EXCLUDED.is_owner, display_order = EXCLUDED.display_order, active = true, deleted_at = NULL;
INSERT INTO public.services VALUES (:'SVC', :'OWNER', 'Corte', 45, 30) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.clients (id, user_id, name, phone) VALUES (:'CLIENT', :'OWNER', 'Aline', '351600000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.business_settings (user_id, timezone) VALUES (:'OWNER', 'Europe/Lisbon')
ON CONFLICT (user_id) DO UPDATE SET timezone = 'Europe/Lisbon';

SELECT set_config('request.jwt.claim.sub', :'OWNER', false);

DELETE FROM public.public_bookings;
DELETE FROM public.appointments;
DELETE FROM public.agenda_blocks;

-- índice
SELECT pg_temp.check('índice professional_id',
  (SELECT count(*)::text FROM pg_indexes WHERE indexname = 'agenda_blocks_professional_id_idx'),
  '1');

-- B-35 / G2: atendimento que já está num bloqueio não entra em outro
INSERT INTO public.appointments (id, user_id, client_id, professional_id, appointment_time, status, duration_minutes)
VALUES ('40000000-0000-0000-0000-000000000001', :'OWNER', :'CLIENT', :'PRO1', now() + interval '2 days', 'Confirmed', 30);
INSERT INTO public.public_bookings (id, business_id, customer_name, customer_phone, service_ids, professional_id, appointment_time, total_price, status, duration_minutes)
VALUES ('70000000-0000-0000-0000-000000000001', :'OWNER', 'Aline', '351600000001', ARRAY[:'SVC']::uuid[], :'PRO1', now() + interval '2 days', 45, 'pending', 30);
INSERT INTO public.agenda_blocks (user_id, professional_id, starts_at, ends_at)
VALUES (:'OWNER', :'PRO1', now() + interval '2 days', now() + interval '2 days 1 hour');
INSERT INTO public.agenda_blocks (user_id, professional_id, starts_at, ends_at)
VALUES (:'OWNER', :'PRO2', now() + interval '5 days', now() + interval '6 days');
SELECT pg_temp.check('B-35 mover para outro bloqueio',
  pg_temp.try(format($q$UPDATE public.appointments SET professional_id = %L, appointment_time = now() + interval '5 days 2 hours' WHERE id = '40000000-0000-0000-0000-000000000001'$q$, :'PRO2')),
  'error:Horário bloqueado na agenda de Bruna. Para agendar, remova o bloqueio primeiro.');
SELECT pg_temp.check('B-35 horário original preservado',
  (SELECT (professional_id = :'PRO1')::text FROM public.appointments WHERE id = '40000000-0000-0000-0000-000000000001'),
  'true');

-- B-30: só status, dentro do bloqueio, passa
SELECT pg_temp.check('B-30 só status dentro do bloqueio',
  pg_temp.try($q$UPDATE public.appointments SET status = 'Confirmed' WHERE id = '40000000-0000-0000-0000-000000000001'$q$),
  'ok');
SELECT pg_temp.check('B-30 duração maior dentro do bloqueio',
  pg_temp.try($q$UPDATE public.appointments SET duration_minutes = 240 WHERE id = '40000000-0000-0000-0000-000000000001'$q$),
  'error:Horário bloqueado na agenda de Diego. Para agendar, remova o bloqueio primeiro.');
SELECT pg_temp.check('B-30 duração original permanece',
  (SELECT duration_minutes::text FROM public.appointments WHERE id = '40000000-0000-0000-0000-000000000001'),
  '30');

-- B-41
INSERT INTO public.agenda_blocks (user_id, professional_id, starts_at, ends_at)
VALUES (:'OWNER', :'PRO1', now() - interval '1 hour', now() + interval '1 hour');
SELECT pg_temp.check('B-41 Completed no bloqueio',
  pg_temp.try(format($q$INSERT INTO public.appointments (user_id, client_id, professional_id, appointment_time, status, duration_minutes, origin) VALUES (%L, %L, %L, now(), 'Completed', 30, 'queue')$q$, :'OWNER', :'CLIENT', :'PRO1')),
  'ok');
SELECT pg_temp.check('B-42 reabrir Completed dentro do bloqueio',
  pg_temp.try($q$UPDATE public.appointments SET status = 'Confirmed' WHERE origin = 'queue' AND status = 'Completed'$q$),
  'error:Horário bloqueado na agenda de Diego. Para agendar, remova o bloqueio primeiro.');

-- B-46: pedido que já estava no bloqueio não muda para outro bloqueio
SELECT pg_temp.check('B-46 cliente muda para outro bloqueio',
  pg_temp.try(format($q$SELECT id FROM public.update_public_booking_by_client('70000000-0000-0000-0000-000000000001', '351600000001', ARRAY[%L]::uuid[], %L, now() + interval '5 days 2 hours', now() + interval '2 days', 'Aline', '351600000001', 45, 30)$q$, :'SVC', :'PRO2')),
  'error:slot_unavailable');

-- B-25
INSERT INTO public.agenda_blocks (id, user_id, professional_id, starts_at, ends_at)
VALUES ('50000000-0000-0000-0000-000000000001', :'OWNER', :'PRO1', now() - interval '3 days', now() - interval '2 days');
SELECT pg_temp.check('B-25 delete bloqueio terminado',
  (public.delete_agenda_block('50000000-0000-0000-0000-000000000001')->>'code'),
  'block_finished');
SELECT pg_temp.check('B-25 mensagem',
  (public.delete_agenda_block('50000000-0000-0000-0000-000000000001')->>'message'),
  'Este bloqueio já terminou e fica só no histórico.');
SELECT pg_temp.check('B-25 linha permanece',
  (SELECT count(*)::text FROM public.agenda_blocks WHERE id = '50000000-0000-0000-0000-000000000001'),
  '1');

-- B-19 / B-18
SELECT pg_temp.check('B-19 início 10 dias atrás',
  (public.create_agenda_block(:'PRO2', now() - interval '10 days', now() - interval '9 days', false)->>'code'),
  'block_starts_in_past');
SELECT pg_temp.check('B-19 mensagem',
  (public.create_agenda_block(:'PRO2', now() - interval '10 days', now() - interval '9 days', false)->>'message'),
  'Este bloqueio já terminou e fica só no histórico.');
SELECT pg_temp.check('B-19 início antigo ainda em curso pede ajuste',
  (public.create_agenda_block(:'PRO2', now() - interval '1 day', now() + interval '1 day', false)->>'code'),
  'block_start_adjusted');
SELECT pg_temp.check('B-19 início antigo arredonda o minuto',
  (SELECT ((r->>'starts_at')::timestamptz = date_trunc('minute', now() + interval '1 minute' - interval '1 microsecond'))::text
   FROM (SELECT public.create_agenda_block(:'PRO2', now() - interval '1 day', now() + interval '1 day', false) AS r) s),
  'true');
SELECT pg_temp.check('B-19 intervalo já terminado',
  (public.create_agenda_block(:'PRO2', now() - interval '4 minutes', now() - interval '1 minute', false)->>'code'),
  'block_starts_in_past');
SELECT pg_temp.check('B-19 tolerância 4 min',
  (public.create_agenda_block(:'PRO2', now() - interval '4 minutes', now() + interval '30 minutes', false)->>'success'),
  'true');
SELECT pg_temp.check('B-18 mais de 366 dias',
  (public.create_agenda_block(:'PRO1', now() + interval '400 days', now() + interval '800 days', false)->>'code'),
  'block_too_long');
SELECT pg_temp.check('B-18 mensagem',
  (public.create_agenda_block(:'PRO1', now() + interval '400 days', now() + interval '800 days', false)->>'message'),
  'Um bloqueio pode ter no máximo 366 dias.');
SELECT pg_temp.check('B-18 exatamente 366 dias',
  (public.create_agenda_block(:'PRO1', now() + interval '700 days', now() + interval '700 days' + interval '366 days', false)->>'success'),
  'true');

-- B-20
INSERT INTO public.appointments (id, user_id, client_id, professional_id, appointment_time, status, duration_minutes)
VALUES ('40000000-0000-0000-0000-0000000000b1', :'OWNER', :'CLIENT', :'PRO1', now() + interval '20 days', 'Confirmed', 30);
SELECT pg_temp.check('B-20 preview',
  (public.create_agenda_block(:'PRO1', now() + interval '20 days', now() + interval '20 days 2 hours', false)->>'code'),
  'conflicts');
INSERT INTO public.appointments (id, user_id, client_id, professional_id, appointment_time, status, duration_minutes)
VALUES ('40000000-0000-0000-0000-0000000000b2', :'OWNER', :'CLIENT', :'PRO1', now() + interval '20 days 30 minutes', 'Pending', 30);
SELECT pg_temp.check('B-20 lista mudou',
  (public.create_agenda_block(:'PRO1', now() + interval '20 days', now() + interval '20 days 2 hours', true, ARRAY['40000000-0000-0000-0000-0000000000b1']::uuid[])->>'code'),
  'block_conflicts_changed');
SELECT pg_temp.check('B-20 mensagem e lista nova',
  (SELECT (r->>'message') || ':' || ((r->'items')::jsonb @> '[{"id":"40000000-0000-0000-0000-0000000000b2"}]'::jsonb)::text
   FROM (SELECT public.create_agenda_block(:'PRO1', now() + interval '20 days', now() + interval '20 days 2 hours', true, ARRAY['40000000-0000-0000-0000-0000000000b1']::uuid[]) AS r) s),
  'Entrou um novo atendimento nesse período. Revise a lista e confirme de novo.:true');
SELECT pg_temp.check('B-20 ack sem lista não cria',
  (SELECT (r->>'success') || ':' || (r->>'code') || ':' ||
     (SELECT count(*)::text FROM public.agenda_blocks b
      WHERE b.professional_id = :'PRO1'
        AND b.starts_at < now() + interval '20 days 2 hours'
        AND b.ends_at > now() + interval '20 days')
   FROM (SELECT public.create_agenda_block(:'PRO1', now() + interval '20 days', now() + interval '20 days 2 hours', true, NULL) AS r) s),
  'false:conflicts:0');
SELECT pg_temp.check('B-20 confirmação com a lista nova cria e não cancela',
  (SELECT (public.create_agenda_block(:'PRO1', now() + interval '20 days', now() + interval '20 days 2 hours', true,
      ARRAY['40000000-0000-0000-0000-0000000000b1','40000000-0000-0000-0000-0000000000b2']::uuid[])->>'success')
    || ':' || (SELECT count(*)::text FROM public.appointments WHERE id IN ('40000000-0000-0000-0000-0000000000b1','40000000-0000-0000-0000-0000000000b2') AND status IN ('Confirmed','Pending'))),
  'true:2');

-- B-03: bloqueios podem se sobrepor
SELECT pg_temp.check('B-03 bloqueios sobrepostos',
  (SELECT (public.create_agenda_block(:'PRO2', now() + interval '15 days', now() + interval '15 days 2 hours', false)->>'success')
    || ':' || (public.create_agenda_block(:'PRO2', now() + interval '15 days 1 hour', now() + interval '15 days 3 hours', false)->>'success')),
  'true:true');

-- B-21/B-22: dia inteiro de hoje (00:00) e período já passado no mesmo dia
DO $$
DECLARE
  v_tz text := 'Europe/Lisbon';
  v_day_start timestamptz := date_trunc('day', timezone(v_tz, now())) AT TIME ZONE v_tz;
  v_day_end timestamptz := v_day_start + interval '1 day';
  v_noon timestamptz := v_day_start + interval '12 hours';
  r json;
  v_code text;
  v_msg text;
BEGIN
  r := public.create_agenda_block('10000000-0000-0000-0000-000000000002', v_day_start, v_day_end, false);
  IF v_day_start < now() - interval '5 minutes' THEN
    v_code := 'block_start_adjusted';
    v_msg := 'O início do bloqueio já passou. Ajustamos para agora — confira e confirme de novo.';
  ELSE
    v_code := 'created';
    v_msg := 'created';
  END IF;
  INSERT INTO results VALUES (
    'B-21 dia inteiro hoje',
    COALESCE(r->>'code', CASE WHEN r->>'success' = 'true' THEN 'created' ELSE 'fail' END),
    v_code
  );
  INSERT INTO results VALUES ('B-21 mensagem', COALESCE(r->>'message', 'created'), v_msg);
  IF r->>'code' = 'block_start_adjusted' THEN
    IF (r->>'starts_at')::timestamptz = date_trunc('minute', now() + interval '1 minute' - interval '1 microsecond') THEN
      INSERT INTO results VALUES ('B-21 arredonda para o próximo minuto', 'ceil', 'ceil');
    ELSE
      INSERT INTO results VALUES ('B-21 arredonda para o próximo minuto', COALESCE(r->>'starts_at', 'null'), 'ceil');
    END IF;
    r := public.create_agenda_block('10000000-0000-0000-0000-000000000002', (r->>'starts_at')::timestamptz, v_day_end, false);
  END IF;
  INSERT INTO results VALUES ('B-22 segunda confirmação cria', COALESCE(r->>'success', 'false'), 'true');

  DELETE FROM public.agenda_blocks WHERE professional_id = '10000000-0000-0000-0000-000000000002';
  r := public.create_agenda_block('10000000-0000-0000-0000-000000000002', v_noon, v_noon + interval '2 hours', false);
  IF v_noon + interval '2 hours' <= date_trunc('minute', now() + interval '1 minute' - interval '1 microsecond') THEN
    v_code := 'block_starts_in_past';
    v_msg := 'Este bloqueio já terminou e fica só no histórico.';
  ELSIF v_noon < now() - interval '5 minutes' THEN
    v_code := 'block_start_adjusted';
    v_msg := 'O início do bloqueio já passou. Ajustamos para agora — confira e confirme de novo.';
  ELSE
    v_code := 'created';
    v_msg := 'created';
  END IF;
  INSERT INTO results VALUES (
    'B-22 período 12:00',
    COALESCE(r->>'code', CASE WHEN r->>'success' = 'true' THEN 'created' ELSE 'fail' END),
    v_code
  );
  INSERT INTO results VALUES ('B-22 período 12:00 mensagem', COALESCE(r->>'message', 'created'), v_msg);
END $$;

-- C-B17 / B-51
DELETE FROM public.agenda_blocks WHERE professional_id = :'PRO2' AND starts_at > now() + interval '4 days';
INSERT INTO public.agenda_blocks (user_id, professional_id, starts_at, ends_at)
VALUES (:'OWNER', :'PRO1', now() + interval '8 days', now() + interval '8 days 2 hours');
DO $$
DECLARE v uuid;
BEGIN
  BEGIN
    v := public.get_first_available_professional('00000000-0000-0000-0000-00000000000a', now() + interval '8 days 30 minutes', 30);
    INSERT INTO results VALUES ('C-B17 get_first pula bloqueado', COALESCE(v::text, 'null'), '10000000-0000-0000-0000-000000000002');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO results VALUES ('C-B17 get_first pula bloqueado', SQLERRM, '10000000-0000-0000-0000-000000000002');
  END;
END $$;

-- B-44: pedido "qualquer" já nasce atribuído; o link mostra o nome
SELECT pg_temp.check('B-44 atribuído ao livre',
  (SELECT professional_id::text FROM public.create_public_booking(
    '00000000-0000-0000-0000-00000000000a', 'Cliente Novo', '351600000099',
    ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], NULL,
    now() + interval '8 days 30 minutes', 45, 30)),
  '10000000-0000-0000-0000-000000000002');
SELECT pg_temp.check('B-44 link mostra o profissional',
  (SELECT professional_name FROM public.get_client_bookings_history('351600000099', '00000000-0000-0000-0000-00000000000a') LIMIT 1),
  'Bruna');
SELECT pg_temp.check('B-44 insert direto sem profissional atribui',
  pg_temp.try(format($q$INSERT INTO public.public_bookings (business_id, customer_name, customer_phone, service_ids, professional_id, appointment_time, total_price, status, duration_minutes) VALUES (%L, 'Cliente Direto', '351600000088', ARRAY[%L]::uuid[], NULL, now() + interval '12 days', 45, 'pending', 30)$q$, :'OWNER', :'SVC')),
  'ok');
SELECT pg_temp.check('B-44 insert direto ficou com o dono',
  (SELECT professional_id::text FROM public.public_bookings WHERE customer_phone = '351600000088'),
  '10000000-0000-0000-0000-000000000001');

SELECT pg_temp.check('duração somada acima de 24h fica em 1440',
  (SELECT duration_minutes::text FROM public.create_public_booking(
    '00000000-0000-0000-0000-00000000000a', 'Cliente Longo', '351600000077',
    ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], NULL,
    now() + interval '30 days', 45, 2000)),
  '1440');
SELECT pg_temp.check('appointments_duration_chk recusa acima de 1440',
  pg_temp.try(format($q$INSERT INTO public.appointments (id, user_id, client_id, professional_id, appointment_time, status, duration_minutes) VALUES ('40000000-0000-0000-0000-0000000000d1', %L, %L, %L, now() + interval '40 days', 'Confirmed', 2000)$q$, :'OWNER', :'CLIENT', :'PRO2')),
  'error:new row for relation "appointments" violates check constraint "appointments_duration_chk"');

-- M1 no insert direto
SELECT pg_temp.check('M1 insert no bloqueio',
  pg_temp.try(format($q$INSERT INTO public.appointments (user_id, client_id, professional_id, appointment_time, status, duration_minutes) VALUES (%L, %L, %L, now() + interval '8 days 30 minutes', 'Confirmed', 30)$q$, :'OWNER', :'CLIENT', :'PRO1')),
  'error:Horário bloqueado na agenda de Diego. Para agendar, remova o bloqueio primeiro.');

\o
SELECT name, CASE WHEN got IS NOT DISTINCT FROM expected THEN 'ok' ELSE 'FAIL' END AS status, got, expected
FROM results ORDER BY name;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM results WHERE got IS DISTINCT FROM expected) THEN
    RAISE EXCEPTION 'agenda_blocks follow-up tests failed';
  END IF;
END $$;
