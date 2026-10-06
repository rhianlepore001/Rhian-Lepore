-- Guarda de atendimento em aberto em delete_staff_collaborator.
-- Rodar após staff_purge_auth_user.harness.sql + 20261006071036 +
-- delete_staff_open_appointments.harness.sql (+ migration). Uso:
--   scripts/test-sql-delete-staff-open-appointments.sh
-- Antes da migration: FALHA (exclui mesmo com atendimento em aberto).
\set ON_ERROR_STOP on
\set QUIET on

CREATE OR REPLACE FUNCTION pg_temp.try_as(p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text; v_detail text; v_hint text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), true);
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_uid IS NULL THEN '' ELSE json_build_object('sub', p_uid, 'role', 'authenticated')::text END, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    EXECUTE p_sql INTO v;
    EXECUTE 'RESET ROLE';
    RETURN 'ok:' || COALESCE(v, 'null');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL, v_hint = PG_EXCEPTION_HINT;
    EXECUTE 'RESET ROLE';
    RETURN 'error:' || SQLSTATE || ':' || SQLERRM || ':' || COALESCE(v_detail, '') || ':' || COALESCE(v_hint, '');
  END;
END $$;

CREATE TEMP TABLE results (name text, got text, expected text);
CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_name, COALESCE(p_got, '<null>'), p_expected);
$$;
CREATE OR REPLACE FUNCTION pg_temp.del(p_member text) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.try_as('00000000-0000-0000-0000-0000000000a0',
    format('SELECT public.delete_staff_collaborator(%L)::text', p_member));
$$;
CREATE OR REPLACE FUNCTION pg_temp.alive(p_member text) RETURNS text LANGUAGE sql AS $$
  SELECT (deleted_at IS NULL AND active)::text FROM public.team_members WHERE id = p_member::uuid;
$$;

-- Dados ------------------------------------------------------------------------
-- Donos A e B; staff com login L1 (A), L2 (A), L3 (A, legado), LB (B)
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'dono-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b0', 'dono-b@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'l1@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'l2@test.local'),
  ('00000000-0000-0000-0000-0000000000c3', 'l3@test.local');
INSERT INTO public.profiles VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'owner', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000b0', 'owner', '00000000-0000-0000-0000-0000000000b0'),
  ('00000000-0000-0000-0000-0000000000c1', 'staff', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000c2', 'staff', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000c3', 'staff', '00000000-0000-0000-0000-0000000000a0');

INSERT INTO public.team_members (id, user_id, name, staff_user_id, is_owner, active, slug) VALUES
  ('20000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000000a0', 'Dono A', NULL, true, true, 'dono-a2'),
  -- O1: sem login, Confirmed futuro  -> bloqueia
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', 'O1 aberto futuro', NULL, false, true, 'o1'),
  -- O2: com login (L1), Pending atrasado + Confirmed -> bloqueia (2)
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a0', 'O2 atrasado', '00000000-0000-0000-0000-0000000000c1', false, true, 'o2'),
  -- T1: sem login, só Completed/Cancelled/NoShow/no_show -> exclui
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a0', 'T1 terminais', NULL, false, true, 't1'),
  -- T2: com login (L2), só terminais -> exclui e purga a conta
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a0', 'T2 terminais login', '00000000-0000-0000-0000-0000000000c2', false, true, 't2'),
  -- X1: atendimento em aberto só em OUTRO negócio (user_id = B) -> não conta
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000a0', 'X1 outro negocio', NULL, false, true, 'x1'),
  -- U1: status desconhecido -> bloqueia (falha segura)
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a0', 'U1 status estranho', NULL, false, true, 'u1'),
  -- G1: com login (L3), linha legada com user_id = profile do staff -> 23503 (sem mudança)
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000a0', 'G1 legado', '00000000-0000-0000-0000-0000000000c3', false, true, 'g1'),
  -- C1: case/espaços em status terminais -> exclui
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000a0', 'C1 caixa', NULL, false, true, 'c1'),
  -- N1: nenhum atendimento, sem login -> exclui
  ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000a0', 'N1 vazio', NULL, false, true, 'n1'),
  -- MB: membro do dono B
  ('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b0', 'MB', NULL, false, true, 'mb2');

INSERT INTO public.clients (id, user_id, name) VALUES
  ('30000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a0', 'Cliente A'),
  ('30000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b0', 'Cliente B'),
  ('30000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c3', 'Cliente legado');

INSERT INTO public.appointments (user_id, client_id, service, appointment_time, status, professional_id, origin) VALUES
  ('00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-0000000000a1', 'Corte', now() + interval '2 days', 'Confirmed', '20000000-0000-0000-0000-000000000001', 'agenda'),
  ('00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-0000000000a1', 'Corte', now() - interval '3 hours', 'Pending', '20000000-0000-0000-0000-000000000002', 'booking'),
  ('00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-0000000000a1', 'Barba', now() + interval '1 day', 'Confirmed', '20000000-0000-0000-0000-000000000002', 'agenda'),
  ('00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-0000000000a1', 'Corte', now() - interval '5 days', 'Completed', '20000000-0000-0000-0000-000000000003', 'agenda'),
  ('00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-0000000000a1', 'Corte', now() + interval '5 days', 'Cancelled', '20000000-0000-0000-0000-000000000003', 'agenda'),
  ('00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-0000000000a1', 'Corte', now() - interval '1 day', 'NoShow', '20000000-0000-0000-0000-000000000003', 'agenda'),
  ('00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-0000000000a1', 'Corte', now() - interval '2 days', 'no_show', '20000000-0000-0000-0000-000000000003', 'agenda'),
  ('00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-0000000000a1', 'Corte', now() - interval '5 days', 'Completed', '20000000-0000-0000-0000-000000000004', 'queue'),
  ('00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-0000000000a1', 'Corte', now() + interval '1 day', 'Cancelled', '20000000-0000-0000-0000-000000000004', 'booking'),
  ('00000000-0000-0000-0000-0000000000b0', '30000000-0000-0000-0000-0000000000b1', 'Corte', now() + interval '1 day', 'Confirmed', '20000000-0000-0000-0000-000000000005', 'agenda'),
  ('00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-0000000000a1', 'Corte', now() + interval '1 day', 'Rascunho', '20000000-0000-0000-0000-000000000006', 'agenda'),
  ('00000000-0000-0000-0000-0000000000c3', '30000000-0000-0000-0000-0000000000c3', 'Corte', now() - interval '170 days', 'Confirmed', '20000000-0000-0000-0000-000000000007', 'agenda'),
  ('00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-0000000000a1', 'Corte', now() - interval '1 day', ' completed ', '20000000-0000-0000-0000-000000000008', 'agenda'),
  ('00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-0000000000a1', 'Corte', now() - interval '1 day', 'CANCELLED', '20000000-0000-0000-0000-000000000008', 'agenda'),
  ('00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-0000000000a1', 'Corte', now() - interval '1 day', 'noshow', '20000000-0000-0000-0000-000000000008', 'agenda');

\o /dev/null

-- 1) Atendimento em aberto bloqueia, com código e contagem; nada muda -----------
SELECT pg_temp.check('1a sem login + Confirmed futuro -> STAFF_HAS_OPEN_APPOINTMENTS',
  pg_temp.del('20000000-0000-0000-0000-000000000001'), 'error:P0001:STAFF_HAS_OPEN_APPOINTMENTS:open_count=1:staff_has_open_appointments');
SELECT pg_temp.check('1a membro intacto', pg_temp.alive('20000000-0000-0000-0000-000000000001'), 'true');
SELECT pg_temp.check('1b com login + atrasado + futuro -> bloqueia com open_count=2',
  pg_temp.del('20000000-0000-0000-0000-000000000002'), 'error:P0001:STAFF_HAS_OPEN_APPOINTMENTS:open_count=2:staff_has_open_appointments');
SELECT pg_temp.check('1b membro, vínculo, profile e conta intactos',
  (SELECT (tm.deleted_at IS NULL AND tm.active AND tm.slug = 'o2' AND tm.staff_user_id = '00000000-0000-0000-0000-0000000000c1'
       AND EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000c1')
       AND EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-0000000000c1'))::text
   FROM public.team_members tm WHERE tm.id = '20000000-0000-0000-0000-000000000002'), 'true');
SELECT pg_temp.check('1c status desconhecido bloqueia (falha segura)',
  split_part(pg_temp.del('20000000-0000-0000-0000-000000000006'), ':', 3), 'STAFF_HAS_OPEN_APPOINTMENTS');
SELECT pg_temp.check('1d atendimentos não foram alterados',
  (SELECT count(*)::text FROM public.appointments WHERE status IN ('Confirmed', 'Pending', 'Rascunho')), '6');

-- 2) Só Finalizado/Cancelado/Não compareceu: exclui ------------------------------
SELECT pg_temp.check('2a sem login, só terminais -> ok', pg_temp.del('20000000-0000-0000-0000-000000000003'), 'ok:');
SELECT pg_temp.check('2a soft-delete', pg_temp.alive('20000000-0000-0000-0000-000000000003'), 'false');
SELECT pg_temp.check('2b com login, só terminais -> ok', pg_temp.del('20000000-0000-0000-0000-000000000004'), 'ok:');
SELECT pg_temp.check('2b soft-delete + profile e conta purgados (PR #138)',
  (SELECT (tm.deleted_at IS NOT NULL AND tm.staff_user_id IS NULL AND tm.slug LIKE 't2-del-%'
       AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000c2')
       AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-0000000000c2'))::text
   FROM public.team_members tm WHERE tm.id = '20000000-0000-0000-0000-000000000004'), 'true');
SELECT pg_temp.check('2c status terminal com caixa/espaços -> ok', pg_temp.del('20000000-0000-0000-0000-000000000008'), 'ok:');
SELECT pg_temp.check('2d sem nenhum atendimento -> ok', pg_temp.del('20000000-0000-0000-0000-000000000009'), 'ok:');
SELECT pg_temp.check('2e histórico preservado (terminais continuam lá)',
  (SELECT count(*)::text FROM public.appointments WHERE professional_id IN
    ('20000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000008')), '9');

-- 3) Atendimento de OUTRO negócio não conta ---------------------------------------
SELECT pg_temp.check('3 aberto só com user_id de outro negócio -> ok', pg_temp.del('20000000-0000-0000-0000-000000000005'), 'ok:');

-- 4) Guardas antigas continuam ------------------------------------------------------
SELECT pg_temp.check('4a dono não pode ser excluído',
  split_part(pg_temp.del('20000000-0000-0000-0000-0000000000a0'), ':', 3), 'OWNER_OR_MISSING_TEAM_MEMBER');
SELECT pg_temp.check('4b membro de outro negócio -> OWNER_OR_MISSING_TEAM_MEMBER',
  split_part(pg_temp.del('20000000-0000-0000-0000-0000000000b1'), ':', 3), 'OWNER_OR_MISSING_TEAM_MEMBER');
SELECT pg_temp.check('4c staff não exclui colega (aberto ou não)',
  split_part(pg_temp.try_as('00000000-0000-0000-0000-0000000000c1', $q$SELECT public.delete_staff_collaborator('20000000-0000-0000-0000-000000000001')::text$q$), ':', 3), 'OWNER_OR_MISSING_TEAM_MEMBER');
SELECT pg_temp.check('4d sem JWT -> recusado',
  split_part(pg_temp.try_as(NULL, $q$SELECT public.delete_staff_collaborator('20000000-0000-0000-0000-000000000001')::text$q$), ':', 3), 'OWNER_OR_MISSING_TEAM_MEMBER');

-- 5) Legado (linha com user_id = profile do staff): 23503 como hoje, atômico ------
SELECT pg_temp.check('5 legado -> 23503 (cliente mostra mensagem amigável)',
  split_part(pg_temp.del('20000000-0000-0000-0000-000000000007'), ':', 2), '23503');
SELECT pg_temp.check('5 legado: nada mudou (membro, vínculo, profile, linhas)',
  (SELECT (tm.deleted_at IS NULL AND tm.active AND tm.staff_user_id = '00000000-0000-0000-0000-0000000000c3'
       AND EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000c3')
       AND (SELECT count(*) FROM public.appointments WHERE user_id = '00000000-0000-0000-0000-0000000000c3') = 1
       AND (SELECT count(*) FROM public.clients WHERE user_id = '00000000-0000-0000-0000-0000000000c3') = 1)::text
   FROM public.team_members tm WHERE tm.id = '20000000-0000-0000-0000-000000000007'), 'true');

-- 6) Assinatura de segurança igual a prod ------------------------------------------
SELECT pg_temp.check('6 ACL / definer / search_path / dono',
  (SELECT proacl::text || '|' || prosecdef::text || '|' || array_to_string(proconfig, ',') || '|' || pg_get_userbyid(proowner)
   FROM pg_proc WHERE oid = 'public.delete_staff_collaborator(uuid)'::regprocedure),
  '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}|true|search_path=public|postgres');

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
