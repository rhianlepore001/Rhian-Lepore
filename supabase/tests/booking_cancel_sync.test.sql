-- Testes do item 5b: pedido online cancelado pelo salão aparece para o cliente.
-- Rodar após harness + baseline de prod (+ migration). Uso:
--   scripts/test-sql-booking-cancel-sync.sh
\set ON_ERROR_STOP on
\set QUIET on

-- Dados ------------------------------------------------------------------------
-- Empresa A (dono a0 + colaborador a1), empresa B (dono b0). Dia D = hoje + 7.
CREATE TEMP TABLE ctx AS SELECT (current_date + 7)::date AS d;
GRANT SELECT ON ctx TO PUBLIC;
CREATE FUNCTION pg_temp.at(p_hm text) RETURNS timestamptz LANGUAGE sql AS $$
  SELECT ((SELECT d FROM ctx)::text || ' ' || p_hm)::timestamp AT TIME ZONE 'Europe/Lisbon'
$$;

INSERT INTO public.profiles VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'owner', NULL),
  ('00000000-0000-0000-0000-0000000000a1', 'staff', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000b0', 'owner', NULL);
INSERT INTO public.team_members (id, user_id, name, staff_user_id, is_owner, display_order) VALUES
  ('10000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000000a0', 'Dono A', NULL, true, 0),
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a0', 'Staff 1', '00000000-0000-0000-0000-0000000000a1', false, 1),
  ('10000000-0000-0000-0000-0000000000b0', '00000000-0000-0000-0000-0000000000b0', 'Dono B', NULL, true, 0);
INSERT INTO public.business_settings (user_id) VALUES
  ('00000000-0000-0000-0000-0000000000a0'), ('00000000-0000-0000-0000-0000000000b0');
INSERT INTO public.services VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', 'Barba', 35, 30);
-- Cliente da agenda com o telefone formatado; o pedido online vem só com dígitos.
INSERT INTO public.clients (id, user_id, name, phone) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', 'Ana', '+351 912 345 678'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a0', 'Outro', '+351 933 333 333'),
  ('30000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b0', 'Ana em B', '+351 912 345 678');

\set A '''00000000-0000-0000-0000-0000000000a0'''
\set OWNER '''00000000-0000-0000-0000-0000000000a0'''
\set STAFF '''00000000-0000-0000-0000-0000000000a1'''
\set OWNERB '''00000000-0000-0000-0000-0000000000b0'''
\set PHONE '''351912345678'''

-- Pedidos online (todos da Ana, telefone só com dígitos)
INSERT INTO public.public_bookings (id, business_id, customer_phone, customer_name, service_ids, professional_id, appointment_time, total_price, status)
SELECT v.id::uuid, v.biz, '351912345678', 'Ana', ARRAY['20000000-0000-0000-0000-000000000001'::uuid], v.pro::uuid, pg_temp.at(v.hm), 35, v.st
FROM (VALUES
  -- via accept (fluxo normal)
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a0', '10:00', 'pending'),   -- dono cancela
  ('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a0', '11:00', 'pending'),   -- NoShow
  ('50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a0', '11:30', 'pending'),   -- Completed
  ('50000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a0', '12:00', 'pending'),   -- cliente cancela antes
  ('50000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a0', '12:30', 'pending'),   -- recusado
  ('50000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a0', '13:00', 'pending'),   -- editado pelo cliente
  ('50000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a0', NULL,                                   '14:00', 'pending'),   -- "qualquer profissional"
  -- legado: 'confirmed' com agendamento sem vínculo (accept antigo)
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a0', NULL,                                   '15:00', 'confirmed'), -- colaborador (own) cancela
  ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a1', '15:30', 'confirmed'), -- colaborador sem permissão
  ('50000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a0', '16:00', 'confirmed'), -- outro cliente no horário
  ('50000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a0', '16:30', 'confirmed'), -- 2 agendamentos ligados
  ('50000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a0', '17:00', 'confirmed')  -- outra empresa cancela no horário
) AS v(id, biz, pro, hm, st);

-- Agendamentos legados (public_booking_id NULL)
INSERT INTO public.appointments (id, user_id, client_id, professional_id, service, appointment_time, status, updated_at)
SELECT v.id::uuid, v.biz, v.cli::uuid, v.pro::uuid, 'Barba', pg_temp.at(v.hm), 'Confirmed', '2026-01-01 00:00+00'
FROM (VALUES
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000a1', '15:00'),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000a1', '15:30'),
  ('40000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-0000000000a0', '16:00'),
  ('40000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000a0', '16:30'),
  ('40000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000a0', '16:30'),
  ('40000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000b0', '30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-0000000000b0', '17:00'),
  ('40000000-0000-0000-0000-0000000000f0', '00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-0000000000a0', '18:00')  -- agenda comum
) AS v(id, biz, cli, pro, hm);

-- Helpers ------------------------------------------------------------------------
-- Executa como papel (anon/authenticated) com sub no JWT; devolve texto do resultado ou erro
CREATE FUNCTION pg_temp.run_as(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
    EXECUTE 'RESET ROLE';
    RETURN v;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    RETURN 'error:' || SQLERRM;
  END;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.run_as(text, text, text) TO PUBLIC;
CREATE FUNCTION pg_temp.upd(p_role text, p_uid text, p_id text, p_status text) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.run_as(p_role, p_uid, format(
    'WITH u AS (UPDATE public.appointments SET status = %L WHERE id = %L RETURNING 1) SELECT ''ok:'' || count(*) FROM u', p_status, p_id))
$$;
CREATE FUNCTION pg_temp.pb(p_id text) RETURNS text LANGUAGE sql AS $$ SELECT status FROM public.public_bookings WHERE id = p_id::uuid $$;
CREATE FUNCTION pg_temp.appt_of(p_booking text) RETURNS text LANGUAGE sql AS $$
  SELECT id::text FROM public.appointments WHERE public_booking_id = p_booking::uuid AND status <> 'Cancelled' ORDER BY created_at DESC LIMIT 1
$$;
CREATE TEMP TABLE accepted (booking text, appt text);
GRANT ALL ON accepted TO PUBLIC;
CREATE FUNCTION pg_temp.accept(p_booking text) RETURNS text LANGUAGE sql AS $$
  WITH r AS (SELECT pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000a0',
    format('SELECT public.accept_public_booking(%L)->>''appointment_id''', p_booking)) AS appt)
  INSERT INTO accepted SELECT p_booking, appt FROM r RETURNING appt
$$;
CREATE FUNCTION pg_temp.acc(p_booking text) RETURNS text LANGUAGE sql AS $$
  SELECT appt FROM accepted WHERE booking = p_booking ORDER BY ctid DESC LIMIT 1
$$;
CREATE FUNCTION pg_temp.cancellations(p_phone text, p_biz text) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.run_as('anon', NULL, format(
    'SELECT COALESCE(string_agg(right(booking_id::text, 2) || ''='' || cancelled_by_business, '','' ORDER BY booking_id), ''none'') FROM public.get_client_booking_cancellations(%L, %L)', p_phone, p_biz))
$$;
CREATE FUNCTION pg_temp.set_scope(p text) RETURNS void LANGUAGE sql AS $$
  UPDATE public.business_settings SET staff_appointment_edit_scope = p WHERE user_id = '00000000-0000-0000-0000-0000000000a0'
$$;

CREATE TEMP TABLE results (name text, got text, expected text);
CREATE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$ INSERT INTO results VALUES (p_name, p_got, p_expected) $$;

\o /dev/null
-- 1) Aceite grava o vínculo; salão cancela -> pedido cancelado ----------------------
SELECT pg_temp.accept('50000000-0000-0000-0000-000000000001');
SELECT pg_temp.check('accept: appointment created', (SELECT CASE WHEN pg_temp.acc('50000000-0000-0000-0000-000000000001') ~ '^[0-9a-f-]{36}$' THEN 'uuid' ELSE pg_temp.acc('50000000-0000-0000-0000-000000000001') END), 'uuid');
SELECT pg_temp.check('accept: booking confirmed', pg_temp.pb('50000000-0000-0000-0000-000000000001'), 'confirmed');
SELECT pg_temp.check('accept: public_booking_id recorded (not only for edits)',
  (SELECT COALESCE(public_booking_id::text, 'null') FROM public.appointments WHERE id::text = pg_temp.acc('50000000-0000-0000-0000-000000000001')), '50000000-0000-0000-0000-000000000001');
SELECT pg_temp.check('accept: appointment Confirmed at the booking time and pro',
  (SELECT status || ' ' || (appointment_time = pg_temp.at('10:00')) || ' ' || professional_id FROM public.appointments WHERE id::text = pg_temp.acc('50000000-0000-0000-0000-000000000001')),
  'Confirmed true 10000000-0000-0000-0000-0000000000a0');
SELECT pg_temp.check('owner cancels (Agenda UPDATE status) -> ok:1',
  pg_temp.upd('authenticated', :OWNER, pg_temp.acc('50000000-0000-0000-0000-000000000001'), 'Cancelled'), 'ok:1');
SELECT pg_temp.check('owner cancel -> booking cancelled', pg_temp.pb('50000000-0000-0000-0000-000000000001'), 'cancelled');
SELECT pg_temp.check('client area: cancelled by business = true', pg_temp.cancellations(:PHONE, :A), '01=true');
SELECT pg_temp.check('client area: phone typed with spaces/+ also matches', pg_temp.cancellations('+351 912 345 678', :A), '01=true');
SELECT pg_temp.check('client area: history shows it as cancelled',
  pg_temp.run_as('anon', NULL, $q$SELECT status FROM public.get_client_bookings_history('351912345678', '00000000-0000-0000-0000-0000000000a0') WHERE id = '50000000-0000-0000-0000-000000000001'$q$), 'cancelled');
SELECT pg_temp.check('no longer active: not returned by get_active_booking_by_phone',
  pg_temp.run_as('anon', NULL, $q$SELECT count(*)::text FROM public.get_active_booking_by_phone('351912345678', '00000000-0000-0000-0000-0000000000a0') WHERE id = '50000000-0000-0000-0000-000000000001'$q$), '0');
SELECT pg_temp.check('client can no longer open it for edit (get_booking_by_id)',
  pg_temp.run_as('anon', NULL, $q$SELECT count(*)::text FROM public.get_booking_by_id('50000000-0000-0000-0000-000000000001', '351912345678')$q$), '0');
SELECT pg_temp.check('client can no longer edit it (update_public_booking_by_client)',
  pg_temp.run_as('anon', NULL, $q$SELECT count(*)::text FROM public.update_public_booking_by_client('50000000-0000-0000-0000-000000000001', '351912345678', ARRAY['20000000-0000-0000-0000-000000000001'::uuid], NULL, now() + interval '9 days', NULL, 'Ana', '351912345678', 35, 30, '[]'::jsonb)$q$),
  'error:update_public_booking_by_client: booking not found or not editable');
SELECT pg_temp.check('client cancel on it -> booking_not_cancellable',
  pg_temp.run_as('anon', NULL, $q$SELECT public.cancel_public_booking_by_client('50000000-0000-0000-0000-000000000001', '351912345678')::text$q$), 'error:booking_not_cancellable');

-- 2) Legado sem vínculo + colaborador com permissão "own" (item 4) ---------------------
SELECT pg_temp.set_scope('own');
SELECT pg_temp.check('staff (own) cancels own legacy appointment -> ok:1',
  pg_temp.upd('authenticated', :STAFF, '40000000-0000-0000-0000-000000000002', 'Cancelled'), 'ok:1');
SELECT pg_temp.check('legacy match (any-pro request, time + formatted phone) -> cancelled', pg_temp.pb('50000000-0000-0000-0000-000000000002'), 'cancelled');
SELECT pg_temp.set_scope('none');
SELECT pg_temp.check('staff without permission: item 4 trigger still blocks',
  pg_temp.upd('authenticated', :STAFF, '40000000-0000-0000-0000-000000000003', 'Cancelled'), 'error:staff_appointment_edit_forbidden');
SELECT pg_temp.check('blocked cancel leaves the appointment Confirmed',
  (SELECT status FROM public.appointments WHERE id = '40000000-0000-0000-0000-000000000003'), 'Confirmed');
SELECT pg_temp.check('blocked cancel leaves the booking confirmed', pg_temp.pb('50000000-0000-0000-0000-000000000003'), 'confirmed');

-- 3) NoShow / Completed não mexem no pedido ---------------------------------------
SELECT pg_temp.accept('50000000-0000-0000-0000-000000000004');
SELECT pg_temp.check('NoShow -> ok:1', pg_temp.upd('authenticated', :OWNER, pg_temp.acc('50000000-0000-0000-0000-000000000004'), 'NoShow'), 'ok:1');
SELECT pg_temp.check('NoShow keeps the booking confirmed (client sees a past booking)', pg_temp.pb('50000000-0000-0000-0000-000000000004'), 'confirmed');
SELECT pg_temp.accept('50000000-0000-0000-0000-000000000005');
SELECT pg_temp.check('Completed -> ok:1', pg_temp.upd('authenticated', :OWNER, pg_temp.acc('50000000-0000-0000-0000-000000000005'), 'Completed'), 'ok:1');
SELECT pg_temp.check('Completed keeps the booking confirmed', pg_temp.pb('50000000-0000-0000-0000-000000000005'), 'confirmed');

-- 4) Cliente cancelou antes; salão só limpa a agenda depois ---------------------------
SELECT pg_temp.accept('50000000-0000-0000-0000-000000000006');
SELECT pg_temp.check('client cancels confirmed booking (own flow) -> true',
  pg_temp.run_as('anon', NULL, $q$SELECT public.cancel_public_booking_by_client('50000000-0000-0000-0000-000000000006', '351912345678')::text$q$), 'true');
SELECT pg_sleep(0.01);
SELECT pg_temp.check('owner cancels the leftover appointment -> ok:1', pg_temp.upd('authenticated', :OWNER, pg_temp.acc('50000000-0000-0000-0000-000000000006'), 'Cancelled'), 'ok:1');
SELECT pg_temp.check('client-cancelled first -> booking stays cancelled', pg_temp.pb('50000000-0000-0000-0000-000000000006'), 'cancelled');

-- 5) Recusado pelo salão (pending -> reject) ----------------------------------------
SELECT pg_temp.check('owner rejects pending request -> true',
  pg_temp.run_as('authenticated', :OWNER, $q$SELECT public.reject_public_booking('50000000-0000-0000-0000-000000000007')::text$q$), 'true');
SELECT pg_temp.check('rejected -> cancelled, no appointment',
  pg_temp.pb('50000000-0000-0000-0000-000000000007') || ' ' || (SELECT count(*) FROM public.appointments WHERE public_booking_id = '50000000-0000-0000-0000-000000000007'), 'cancelled 0');
SELECT pg_temp.check('client area: 01 business, 06 client-first, 07 rejected (neutral), 02 legacy business',
  pg_temp.cancellations(:PHONE, :A), '01=true,02=true,06=false,07=false');

-- 6) Edição pelo cliente (fluxo existente) ------------------------------------------
SELECT pg_temp.accept('50000000-0000-0000-0000-000000000009');
SELECT pg_temp.check('client edits confirmed booking -> pending edit',
  pg_temp.run_as('anon', NULL, $q$SELECT status || ' ' || is_edit FROM public.update_public_booking_by_client('50000000-0000-0000-0000-000000000009', '351912345678', ARRAY['20000000-0000-0000-0000-000000000001'::uuid], '10000000-0000-0000-0000-0000000000a0', pg_temp.at('13:30'), pg_temp.at('13:00'), 'Ana', '351912345678', 35, 30, '[]'::jsonb)$q$),
  'pending true');
SELECT pg_temp.check('salon cancels the OLD appointment while the edit is pending -> ok:1',
  pg_temp.upd('authenticated', :OWNER, pg_temp.acc('50000000-0000-0000-0000-000000000009'), 'Cancelled'), 'ok:1');
SELECT pg_temp.check('pending edit is not touched', pg_temp.pb('50000000-0000-0000-0000-000000000009'), 'pending');
SELECT pg_temp.accept('50000000-0000-0000-0000-000000000009');
SELECT pg_temp.check('edit accepted -> confirmed, 2 linked appointments (old Cancelled + new Confirmed)',
  pg_temp.pb('50000000-0000-0000-0000-000000000009') || ' ' || (SELECT string_agg(status, ',' ORDER BY status) FROM public.appointments WHERE public_booking_id = '50000000-0000-0000-0000-000000000009'),
  'confirmed Cancelled,Confirmed');
SELECT pg_temp.check('salon cancels the new appointment -> ok:1', pg_temp.upd('authenticated', :OWNER, pg_temp.acc('50000000-0000-0000-0000-000000000009'), 'Cancelled'), 'ok:1');
SELECT pg_temp.check('then the edited booking is cancelled', pg_temp.pb('50000000-0000-0000-0000-000000000009'), 'cancelled');

-- 7) "Qualquer profissional" aceito (accept escolhe o profissional padrão) -------------
SELECT pg_temp.accept('50000000-0000-0000-0000-00000000000a');
SELECT pg_temp.check('any-pro accepted -> cancel -> cancelled',
  pg_temp.upd('authenticated', :OWNER, pg_temp.acc('50000000-0000-0000-0000-00000000000a'), 'Cancelled') || ' ' || pg_temp.pb('50000000-0000-0000-0000-00000000000a'), 'ok:1 cancelled');
SELECT pg_temp.check('cancelling again (Cancelled -> Cancelled): no error, booking stays cancelled',
  pg_temp.upd('authenticated', :OWNER, (SELECT appt FROM accepted WHERE booking = '50000000-0000-0000-0000-00000000000a'), 'Cancelled') || ' ' || pg_temp.pb('50000000-0000-0000-0000-00000000000a'), 'ok:1 cancelled');

-- 8) Sem falsos positivos ---------------------------------------------------------
SELECT pg_temp.check('other client at the same time/pro cancelled -> booking stays confirmed',
  pg_temp.upd('authenticated', :OWNER, '40000000-0000-0000-0000-000000000008', 'Cancelled') || ' ' || pg_temp.pb('50000000-0000-0000-0000-000000000008'), 'ok:1 confirmed');
SELECT pg_temp.check('2 linked appointments, only one cancelled -> stays confirmed',
  pg_temp.upd('authenticated', :OWNER, '40000000-0000-0000-0000-0000000000c1', 'Cancelled') || ' ' || pg_temp.pb('50000000-0000-0000-0000-00000000000c'), 'ok:1 confirmed');
SELECT pg_temp.check('... and the second one cancelled -> cancelled',
  pg_temp.upd('authenticated', :OWNER, '40000000-0000-0000-0000-0000000000c2', 'Cancelled') || ' ' || pg_temp.pb('50000000-0000-0000-0000-00000000000c'), 'ok:1 cancelled');
SELECT pg_temp.check('other company cancels at the same time (same phone) -> A booking stays confirmed',
  pg_temp.upd('authenticated', :OWNERB, '40000000-0000-0000-0000-00000000000d', 'Cancelled') || ' ' || pg_temp.pb('50000000-0000-0000-0000-00000000000d'), 'ok:1 confirmed');
SELECT pg_temp.check('owner B cannot cancel company A appointment (RLS, 0 rows)',
  pg_temp.upd('authenticated', :OWNERB, '40000000-0000-0000-0000-0000000000f0', 'Cancelled'), 'ok:0');
SELECT pg_temp.check('plain agenda appointment cancel -> ok:1, no booking changed',
  pg_temp.upd('authenticated', :OWNER, '40000000-0000-0000-0000-0000000000f0', 'Cancelled') || ' ' || (SELECT count(*) FROM public.public_bookings WHERE status = 'confirmed'), 'ok:1 5');
SELECT pg_temp.check('client area: wrong phone -> none', pg_temp.cancellations('351900000000', :A), 'none');
SELECT pg_temp.check('client area: empty phone -> none', pg_temp.cancellations('', :A), 'none');
SELECT pg_temp.check('client area: other business -> none', pg_temp.cancellations(:PHONE, :OWNERB), 'none');

-- 9) O sync nunca bloqueia o cancelamento --------------------------------------------
BEGIN;
DO $$ BEGIN
  IF to_regprocedure('public.public_booking_linked_appointments(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.public_booking_linked_appointments(uuid) RENAME TO public_booking_linked_appointments_broken;
  END IF;
END $$;
UPDATE public.appointments SET status = 'Confirmed' WHERE id = '40000000-0000-0000-0000-0000000000f0';
SET LOCAL client_min_messages = error;
SELECT pg_temp.upd('authenticated', :OWNER, '40000000-0000-0000-0000-0000000000f0', 'Cancelled') AS broken_sync_cancel \gset
ROLLBACK;
SELECT pg_temp.check('sync failure does not block the cancel (warning only)', :'broken_sync_cancel', 'ok:1');

-- 10) ACL ----------------------------------------------------------------------
SELECT pg_temp.check('anon can call get_client_booking_cancellations (Minha Área is public)',
  (SELECT CASE WHEN to_regprocedure('public.get_client_booking_cancellations(text,uuid)') IS NULL THEN 'missing'
    ELSE has_function_privilege('anon', 'public.get_client_booking_cancellations(text,uuid)', 'EXECUTE')::text END), 'true');
SELECT pg_temp.check('anon cannot call public_booking_linked_appointments',
  (SELECT CASE WHEN to_regprocedure('public.public_booking_linked_appointments(uuid)') IS NULL THEN 'missing'
    ELSE has_function_privilege('anon', 'public.public_booking_linked_appointments(uuid)', 'EXECUTE')::text END), 'false');
SELECT pg_temp.check('authenticated cannot call public_booking_linked_appointments',
  (SELECT CASE WHEN to_regprocedure('public.public_booking_linked_appointments(uuid)') IS NULL THEN 'missing'
    ELSE has_function_privilege('authenticated', 'public.public_booking_linked_appointments(uuid)', 'EXECUTE')::text END), 'false');
SELECT pg_temp.check('anon/authenticated cannot call the trigger function',
  (SELECT CASE WHEN to_regprocedure('public.sync_public_booking_on_appointment_cancel()') IS NULL THEN 'missing'
    ELSE (has_function_privilege('anon', 'public.sync_public_booking_on_appointment_cancel()', 'EXECUTE') OR has_function_privilege('authenticated', 'public.sync_public_booking_on_appointment_cancel()', 'EXECUTE'))::text END), 'false');
SELECT pg_temp.check('accept_public_booking ACL kept (anon no, authenticated yes)',
  has_function_privilege('anon', 'public.accept_public_booking(uuid)', 'EXECUTE')::text || ' ' || has_function_privilege('authenticated', 'public.accept_public_booking(uuid)', 'EXECUTE')::text, 'false true');
SELECT pg_temp.check('trigger present: AFTER UPDATE OF status, only on -> Cancelled',
  (SELECT COALESCE(max(pg_get_triggerdef(oid)), 'missing') FROM pg_trigger WHERE tgname = 'sync_public_booking_on_appointment_cancel'),
  'CREATE TRIGGER sync_public_booking_on_appointment_cancel AFTER UPDATE OF status ON public.appointments FOR EACH ROW WHEN (((new.status = ''Cancelled''::text) AND (old.status IS DISTINCT FROM ''Cancelled''::text))) EXECUTE FUNCTION sync_public_booking_on_appointment_cancel()');
SELECT pg_temp.check('item 4 trigger untouched', (SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname = 'enforce_staff_appointment_edit_scope'),
  'CREATE TRIGGER enforce_staff_appointment_edit_scope BEFORE DELETE OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION enforce_staff_appointment_edit_scope()');
SELECT pg_temp.check('item 4 function untouched (md5 = prod)', (SELECT md5(pg_get_functiondef('public.enforce_staff_appointment_edit_scope()'::regprocedure))), 'f31188aa32bade9349bcb4fb556a4374');
\o

\set QUIET off
SELECT CASE WHEN got IS NOT DISTINCT FROM expected THEN 'PASS' ELSE 'FAIL' END AS result, name,
       CASE WHEN got IS DISTINCT FROM expected THEN 'got=' || COALESCE(got, 'NULL') || ' expected=' || expected END AS detail
FROM results;
SELECT count(*) FILTER (WHERE got IS DISTINCT FROM expected) AS failures, count(*) AS total FROM results \gset
\echo 'SQL tests:' :total 'total,' :failures 'failures'
SELECT CASE WHEN :failures > 0 THEN 1/0 END;
