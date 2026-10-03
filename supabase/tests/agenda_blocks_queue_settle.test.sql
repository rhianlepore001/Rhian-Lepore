-- B-41 / C-B20: fechar senha da fila (settle_queue_ticket grava Completed em now())
-- funciona com bloqueio ativo do profissional. Uso: scripts/test-sql-agenda-blocks-queue.sh
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

CREATE TEMP TABLE results (name text, got text, expected text);
GRANT ALL ON results TO authenticated;
CREATE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_name, p_got, p_expected);
$$;
CREATE FUNCTION pg_temp.run_as(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
    EXECUTE 'RESET ROLE';
    RETURN COALESCE(NULLIF(v, ''), 'ok');
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    RETURN 'error:' || SQLERRM;
  END;
END $$;

\set OWNER '00000000-0000-0000-0000-00000000000a'
\set STAFF '00000000-0000-0000-0000-00000000001a'
\set PRO1 '10000000-0000-0000-0000-000000000001'
\set PRO2 '10000000-0000-0000-0000-000000000002'
\set CLIENT '30000000-0000-0000-0000-000000000001'

INSERT INTO public.profiles (id, role, company_id, region) VALUES
  (:'OWNER', 'owner', NULL, 'PT'),
  (:'STAFF', 'staff', :'OWNER', 'PT')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, company_id = EXCLUDED.company_id;
INSERT INTO public.team_members (id, user_id, name, staff_user_id, active) VALUES
  (:'PRO1', :'OWNER', 'Diego', NULL, true),
  (:'PRO2', :'OWNER', 'Bruna', :'STAFF', true)
ON CONFLICT (id) DO UPDATE SET staff_user_id = EXCLUDED.staff_user_id, name = EXCLUDED.name;
INSERT INTO public.clients (id, user_id, name, phone) VALUES (:'CLIENT', :'OWNER', 'Aline', '351600000001')
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.finance_records;
DELETE FROM public.queue_entries;
DELETE FROM public.appointments;
DELETE FROM public.agenda_blocks;

INSERT INTO public.agenda_blocks (user_id, professional_id, starts_at, ends_at) VALUES
  (:'OWNER', :'PRO1', now() - interval '1 hour', now() + interval '1 hour'),
  (:'OWNER', :'PRO2', now() - interval '1 hour', now() + interval '1 hour');

INSERT INTO public.queue_entries (id, business_id, client_name, client_phone, professional_id, status, duration_minutes, service_price_cents) VALUES
  ('60000000-0000-0000-0000-000000000001', :'OWNER', 'Marta', '351600000077', :'PRO1', 'serving', 30, 1500),
  ('60000000-0000-0000-0000-000000000002', :'OWNER', 'Rui', '351600000078', :'PRO2', 'serving', 30, 1500);

-- B-41 dono: comanda da fila durante bloqueio ativo
SELECT pg_temp.check('B-41 dono settle_queue_ticket durante bloqueio',
  pg_temp.run_as('authenticated', :'OWNER',
    $q$SELECT public.settle_queue_ticket('60000000-0000-0000-0000-000000000001'::uuid, 'Corte', 15, NULL, 'cash')::text$q$),
  'ok');
SELECT pg_temp.check('B-41 dono: Completed origin queue gravado',
  (SELECT count(*)::text FROM public.appointments
    WHERE professional_id = :'PRO1' AND status = 'Completed' AND origin = 'queue'),
  '1');
SELECT pg_temp.check('B-41 dono: senha settled',
  (SELECT ticket_status FROM public.queue_entries WHERE id = '60000000-0000-0000-0000-000000000001'),
  'settled');

-- B-41 colaborador
SELECT pg_temp.check('B-41 colaborador settle_queue_ticket durante bloqueio',
  pg_temp.run_as('authenticated', :'STAFF',
    $q$SELECT public.settle_queue_ticket('60000000-0000-0000-0000-000000000002'::uuid, 'Corte', 15, NULL, 'cash')::text$q$),
  'ok');
SELECT pg_temp.check('B-41 colaborador: financeiro gravado',
  (SELECT count(*)::text FROM public.finance_records WHERE professional_id = :'PRO2'),
  '1');

-- Probe G1 (validação independente): INSERT Completed origin queue em now()
SELECT pg_temp.check('probe G1 insert Completed queue em now()',
  pg_temp.run_as('authenticated', :'OWNER', format(
    $q$INSERT INTO public.appointments (user_id, client_id, professional_id, appointment_time, status, duration_minutes, origin)
       VALUES (%L, %L, %L, now(), 'Completed', 30, 'queue') RETURNING status$q$, :'OWNER', :'CLIENT', :'PRO1')),
  'Completed');

-- B-40: mudar só o status para Completed dentro do bloqueio continua permitido
-- Atendimento que já existia antes do bloqueio (semeado sem trigger).
SET session_replication_role = replica;
INSERT INTO public.appointments (id, user_id, client_id, professional_id, appointment_time, status, duration_minutes)
VALUES ('40000000-0000-0000-0000-0000000000c1', :'OWNER', :'CLIENT', :'PRO1', now() - interval '30 minutes', 'Confirmed', 30);
SET session_replication_role = origin;
SELECT pg_temp.check('B-40 Confirmed -> Completed dentro do bloqueio',
  pg_temp.run_as('authenticated', :'OWNER',
    $q$UPDATE public.appointments SET status = 'Completed' WHERE id = '40000000-0000-0000-0000-0000000000c1' RETURNING status$q$),
  'Completed');

-- Regressões: o que deve continuar recusado
SELECT pg_temp.check('B-33 Confirmed em now() dentro do bloqueio continua recusado',
  CASE WHEN pg_temp.run_as('authenticated', :'OWNER', format(
    $q$INSERT INTO public.appointments (user_id, client_id, professional_id, appointment_time, status, duration_minutes)
       VALUES (%L, %L, %L, now(), 'Confirmed', 30) RETURNING status$q$, :'OWNER', :'CLIENT', :'PRO1')) LIKE 'error:%bloqueado%'
  THEN 'refused' ELSE 'allowed' END,
  'refused');
SELECT pg_temp.check('B-33 Pending em now() dentro do bloqueio continua recusado',
  CASE WHEN pg_temp.run_as('authenticated', :'OWNER', format(
    $q$INSERT INTO public.appointments (user_id, client_id, professional_id, appointment_time, status, duration_minutes)
       VALUES (%L, %L, %L, now(), 'Pending', 30) RETURNING status$q$, :'OWNER', :'CLIENT', :'PRO1')) LIKE 'error:%bloqueado%'
  THEN 'refused' ELSE 'allowed' END,
  'refused');
SELECT pg_temp.check('B-42 reabrir Completed -> Confirmed dentro do bloqueio recusado',
  (SELECT CASE WHEN pg_temp.run_as('authenticated', :'OWNER',
    $q$UPDATE public.appointments SET status = 'Confirmed'
       WHERE professional_id = '10000000-0000-0000-0000-000000000001'
         AND status = 'Completed' AND origin = 'queue'
       RETURNING status$q$) LIKE 'error:%bloqueado%'
  THEN 'refused' ELSE 'allowed' END),
  'refused');
SELECT pg_temp.check('B-42 reabrir Cancelled -> Confirmed dentro do bloqueio continua recusado',
  (SELECT CASE WHEN pg_temp.run_as('authenticated', :'OWNER',
    $q$UPDATE public.appointments SET status = 'Cancelled' WHERE id = '40000000-0000-0000-0000-0000000000c1' RETURNING status$q$) = 'Cancelled'
   AND pg_temp.run_as('authenticated', :'OWNER',
    $q$UPDATE public.appointments SET status = 'Confirmed' WHERE id = '40000000-0000-0000-0000-0000000000c1' RETURNING status$q$) LIKE 'error:%bloqueado%'
  THEN 'refused' ELSE 'allowed' END),
  'refused');

\o
SELECT name, got, expected,
       CASE WHEN got IS NOT DISTINCT FROM expected THEN 'ok' ELSE 'FAIL' END AS status
FROM results
ORDER BY name;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM results WHERE got IS DISTINCT FROM expected) THEN
    RAISE EXCEPTION 'agenda_blocks_queue_settle tests failed';
  END IF;
END $$;
