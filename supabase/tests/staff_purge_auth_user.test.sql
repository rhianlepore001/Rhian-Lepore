-- Testes de exclusão de profissional (delete_staff_collaborator ->
-- purge_staff_auth_user) e do reconvite (release_staff_email_for_reinvite).
-- Rodar após o harness (+ migration). Uso: scripts/test-sql-staff-purge.sh
\set ON_ERROR_STOP on
\set QUIET on

-- Executa SQL como authenticated com sub no JWT (como o PostgREST faz).
-- Devolve 'ok:<valor>' ou 'error:<sqlstate>:<mensagem>'.
CREATE OR REPLACE FUNCTION pg_temp.try_as(p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
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
    EXECUTE 'RESET ROLE';
    RETURN 'error:' || SQLSTATE || ':' || SQLERRM;
  END;
END $$;

CREATE TEMP TABLE results (name text, got text, expected text);
CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_name, COALESCE(p_got, '<null>'), p_expected);
$$;

-- Dados ------------------------------------------------------------------------
-- Donos A e B
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'dono-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b0', 'dono-b@test.local');
INSERT INTO public.profiles VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'owner', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000b0', 'owner', '00000000-0000-0000-0000-0000000000b0');

-- Staff com login: S1 (exclusão normal), SB (de B), S3 (ativo em outra casa),
-- S5 (força caminho EXCEPTION), S6 (tem notificação), S7/S8 (órfãos p/ reconvite)
INSERT INTO auth.users (id, email, phone, raw_user_meta_data)
SELECT ('00000000-0000-0000-0000-0000000000' || x)::uuid, 's' || x || '@test.local', '+5511999' || x, '{"name":"x"}'::jsonb
FROM unnest(ARRAY['01','0b','03','05','06','07','08']) AS x;
INSERT INTO auth.identities (user_id, provider_id, identity_data)
SELECT id, id::text, jsonb_build_object('email', email, 'sub', id::text) FROM auth.users WHERE email LIKE 's%@test.local';
INSERT INTO auth.sessions (id, user_id)
SELECT ('5e000000-0000-0000-0000-0000000000' || right(id::text, 2))::uuid, id FROM auth.users WHERE email LIKE 's%@test.local';
-- 2 refresh tokens por staff: um ligado à sessão, outro solto (session_id NULL)
INSERT INTO auth.refresh_tokens (token, user_id, session_id)
SELECT 'tok-a-' || id::text, id::text, ('5e000000-0000-0000-0000-0000000000' || right(id::text, 2))::uuid FROM auth.users WHERE email LIKE 's%@test.local'
UNION ALL
SELECT 'tok-b-' || id::text, id::text, NULL FROM auth.users WHERE email LIKE 's%@test.local';

INSERT INTO public.profiles VALUES
  ('00000000-0000-0000-0000-000000000001', 'staff', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-00000000000b', 'staff', '00000000-0000-0000-0000-0000000000b0'),
  ('00000000-0000-0000-0000-000000000003', 'staff', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-000000000005', 'staff', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-000000000006', 'staff', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-000000000007', 'staff', '00000000-0000-0000-0000-0000000000a0');
-- S8: órfão sem profile (cadastro dirty)

INSERT INTO public.team_members (id, user_id, name, staff_user_id, is_owner, active, slug) VALUES
  ('10000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000000a0', 'Dono A', NULL, true, true, 'dono-a'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', 'M1 com login', '00000000-0000-0000-0000-000000000001', false, true, 'm1'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a0', 'M2 sem login', NULL, false, true, 'm2'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b0', 'MB de B', '00000000-0000-0000-0000-00000000000b', false, true, 'mb'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a0', 'M3 em A', '00000000-0000-0000-0000-000000000003', false, true, 'm3'),
  ('10000000-0000-0000-0000-0000000003b0', '00000000-0000-0000-0000-0000000000b0', 'M3 em B', '00000000-0000-0000-0000-000000000003', false, true, 'm3b'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000a0', 'M5 exception', '00000000-0000-0000-0000-000000000005', false, true, NULL),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a0', 'M6 notificado', '00000000-0000-0000-0000-000000000006', false, true, ''),
  -- convites livres (unbound) para reconvite
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000a0', 'Convite 7', NULL, false, true, 'c7'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000a0', 'Convite 8', NULL, false, true, 'c8'),
  -- vínculos antigos (já excluídos) dos órfãos S7
  ('10000000-0000-0000-0000-000000000070', '00000000-0000-0000-0000-0000000000a0', 'Antigo 7', '00000000-0000-0000-0000-000000000007', false, false, NULL);
UPDATE public.team_members SET deleted_at = now() - interval '10 days' WHERE id = '10000000-0000-0000-0000-000000000070';

-- S5: log em aios_logs (FK NO ACTION -> auth.users) faz DELETE auth.users falhar
INSERT INTO public.aios_logs (user_id) VALUES ('00000000-0000-0000-0000-000000000005');
-- Notificações (sino PR-7): uma para S6 (staff), uma para o dono A
INSERT INTO public.notifications (user_id, title, message, type, event_key) VALUES
  ('00000000-0000-0000-0000-000000000006', 'Novo pedido', 'Novo pedido: X', 'info', 'new:s6'),
  ('00000000-0000-0000-0000-0000000000a0', 'Novo pedido', 'Novo pedido: X', 'info', 'new:a0');

\set OWNER_A '''00000000-0000-0000-0000-0000000000a0'''

\o /dev/null

-- 1) Exclui profissional COM login ----------------------------------------------
SELECT pg_temp.check('1 delete member with login -> ok',
  pg_temp.try_as(:OWNER_A, $q$SELECT public.delete_staff_collaborator('10000000-0000-0000-0000-000000000001')::text$q$), 'ok:');
SELECT pg_temp.check('1 team_member soft-deleted/unlinked/slug freed',
  (SELECT (deleted_at IS NOT NULL AND active = false AND staff_user_id IS NULL AND slug LIKE 'm1-del-%')::text FROM team_members WHERE id = '10000000-0000-0000-0000-000000000001'), 'true');
SELECT pg_temp.check('1 profile deleted',
  (SELECT count(*)::text FROM profiles WHERE id = '00000000-0000-0000-0000-000000000001'), '0');
SELECT pg_temp.check('1 auth user/identities/sessions/refresh_tokens gone',
  (SELECT ((SELECT count(*) FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001')
         + (SELECT count(*) FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000001')
         + (SELECT count(*) FROM auth.sessions WHERE user_id = '00000000-0000-0000-0000-000000000001')
         + (SELECT count(*) FROM auth.refresh_tokens WHERE user_id = '00000000-0000-0000-0000-000000000001'))::text), '0');
SELECT pg_temp.check('1 other users refresh_tokens untouched (S3 still has 2)',
  (SELECT count(*)::text FROM auth.refresh_tokens WHERE user_id = '00000000-0000-0000-0000-000000000003'), '2');

-- 2) Exclui profissional SEM login ----------------------------------------------
SELECT pg_temp.check('2 delete member without login -> ok',
  pg_temp.try_as(:OWNER_A, $q$SELECT public.delete_staff_collaborator('10000000-0000-0000-0000-000000000002')::text$q$), 'ok:');
SELECT pg_temp.check('2 team_member soft-deleted',
  (SELECT (deleted_at IS NOT NULL AND active = false AND slug LIKE 'm2-del-%')::text FROM team_members WHERE id = '10000000-0000-0000-0000-000000000002'), 'true');

-- 3) Guardas --------------------------------------------------------------------
SELECT pg_temp.check('3a cannot delete owner row',
  split_part(pg_temp.try_as(:OWNER_A, $q$SELECT public.delete_staff_collaborator('10000000-0000-0000-0000-0000000000a0')::text$q$), ':', 3), 'OWNER_OR_MISSING_TEAM_MEMBER');
SELECT pg_temp.check('3a owner row intact',
  (SELECT (deleted_at IS NULL AND active)::text FROM team_members WHERE id = '10000000-0000-0000-0000-0000000000a0'), 'true');
SELECT pg_temp.check('3b cannot delete other company member',
  split_part(pg_temp.try_as(:OWNER_A, $q$SELECT public.delete_staff_collaborator('10000000-0000-0000-0000-00000000000b')::text$q$), ':', 3), 'OWNER_OR_MISSING_TEAM_MEMBER');
SELECT pg_temp.check('3b other company member + auth intact',
  (SELECT (tm.deleted_at IS NULL AND tm.staff_user_id IS NOT NULL
           AND EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-00000000000b')
           AND (SELECT count(*) FROM auth.refresh_tokens WHERE user_id = '00000000-0000-0000-0000-00000000000b') = 2)::text
   FROM team_members tm WHERE tm.id = '10000000-0000-0000-0000-00000000000b'), 'true');
SELECT pg_temp.check('3c no JWT -> refused',
  split_part(pg_temp.try_as(NULL, $q$SELECT public.delete_staff_collaborator('10000000-0000-0000-0000-000000000003')::text$q$), ':', 3), 'OWNER_OR_MISSING_TEAM_MEMBER');
SELECT pg_temp.check('3d authenticated cannot call purge directly',
  split_part(pg_temp.try_as(:OWNER_A, $q$SELECT public.purge_staff_auth_user('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a0')::text$q$), ':', 2), '42501');
SELECT pg_temp.check('3e ACL purge',
  (SELECT proacl::text FROM pg_proc WHERE oid = 'public.purge_staff_auth_user(uuid,text)'::regprocedure), '{postgres=X/postgres,service_role=X/postgres}');
SELECT pg_temp.check('3e ACL delete',
  (SELECT proacl::text FROM pg_proc WHERE oid = 'public.delete_staff_collaborator(uuid)'::regprocedure), '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}');
SELECT pg_temp.check('3e purge security definer + search_path + owner',
  (SELECT prosecdef::text || '|' || array_to_string(proconfig, ',') || '|' || pg_get_userbyid(proowner) FROM pg_proc WHERE oid = 'public.purge_staff_auth_user(uuid,text)'::regprocedure), 'true|search_path=public|postgres');

-- 4) Staff ainda ativo em outra casa: não purga a conta ---------------------------
SELECT pg_temp.check('4 delete member whose staff is active elsewhere -> ok',
  pg_temp.try_as(:OWNER_A, $q$SELECT public.delete_staff_collaborator('10000000-0000-0000-0000-000000000003')::text$q$), 'ok:');
SELECT pg_temp.check('4 member soft-deleted, other link kept, account intact',
  (SELECT ((SELECT deleted_at IS NOT NULL FROM team_members WHERE id = '10000000-0000-0000-0000-000000000003')
       AND (SELECT deleted_at IS NULL AND staff_user_id = '00000000-0000-0000-0000-000000000003' FROM team_members WHERE id = '10000000-0000-0000-0000-0000000003b0')
       AND EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000003' AND email = 's03@test.local')
       AND EXISTS (SELECT 1 FROM profiles WHERE id = '00000000-0000-0000-0000-000000000003')
       AND (SELECT count(*) FROM auth.sessions WHERE user_id = '00000000-0000-0000-0000-000000000003') = 1
       AND (SELECT count(*) FROM auth.refresh_tokens WHERE user_id = '00000000-0000-0000-0000-000000000003') = 2)::text), 'true');

-- 5) Caminho EXCEPTION (DELETE auth.users falha) anonimiza sem lançar erro ---------
SELECT pg_temp.check('5 delete member when auth delete fails -> ok (no throw)',
  pg_temp.try_as(:OWNER_A, $q$SELECT public.delete_staff_collaborator('10000000-0000-0000-0000-000000000005')::text$q$), 'ok:');
SELECT pg_temp.check('5 auth user anonymized',
  (SELECT (email = 'deleted-00000000-0000-0000-0000-000000000005@purged.invalid' AND phone IS NULL AND raw_user_meta_data = '{}'::jsonb)::text
   FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000005'), 'true');
SELECT pg_temp.check('5 identity anonymized',
  (SELECT (provider_id = 'deleted-00000000-0000-0000-0000-000000000005@purged.invalid'
           AND identity_data->>'email' = 'deleted-00000000-0000-0000-0000-000000000005@purged.invalid')::text
   FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000005'), 'true');
SELECT pg_temp.check('5 sessions + refresh_tokens gone, profile gone, member soft-deleted, log kept',
  (SELECT ((SELECT count(*) FROM auth.sessions WHERE user_id = '00000000-0000-0000-0000-000000000005') = 0
       AND (SELECT count(*) FROM auth.refresh_tokens WHERE user_id = '00000000-0000-0000-0000-000000000005') = 0
       AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = '00000000-0000-0000-0000-000000000005')
       AND (SELECT deleted_at IS NOT NULL AND staff_user_id IS NULL FROM team_members WHERE id = '10000000-0000-0000-0000-000000000005')
       AND (SELECT count(*) FROM aios_logs WHERE user_id = '00000000-0000-0000-0000-000000000005') = 1)::text), 'true');

-- 6) Staff com notificação no sino (FK notifications.user_id -> profiles) ----------
SELECT pg_temp.check('6 delete member with bell notification -> ok',
  pg_temp.try_as(:OWNER_A, $q$SELECT public.delete_staff_collaborator('10000000-0000-0000-0000-000000000006')::text$q$), 'ok:');
SELECT pg_temp.check('6 staff notification removed, owner notification kept, account gone',
  (SELECT ((SELECT count(*) FROM notifications WHERE user_id = '00000000-0000-0000-0000-000000000006') = 0
       AND (SELECT count(*) FROM notifications WHERE user_id = '00000000-0000-0000-0000-0000000000a0') = 1
       AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = '00000000-0000-0000-0000-000000000006')
       AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000006'))::text), 'true');

-- 7) Reconvite pelo dono (órfão antigo com refresh tokens) -------------------------
SELECT pg_temp.check('7 owner releases orphan email -> true',
  pg_temp.try_as(:OWNER_A, $q$SELECT public.release_staff_email_for_reinvite('00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-000000000007', ' S07@test.local ')::text$q$), 'ok:true');
SELECT pg_temp.check('7 orphan account purged, invite slot untouched',
  (SELECT ((SELECT count(*) FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000007') = 0
       AND (SELECT count(*) FROM auth.refresh_tokens WHERE user_id = '00000000-0000-0000-0000-000000000007') = 0
       AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = '00000000-0000-0000-0000-000000000007')
       AND (SELECT active AND deleted_at IS NULL AND staff_user_id IS NULL FROM team_members WHERE id = '10000000-0000-0000-0000-000000000007'))::text), 'true');

-- 8) Reconvite pelo próprio órfão (cadastro dirty, GUC de auto-purge) --------------
SELECT pg_temp.check('8 orphan claimant releases own email -> true',
  pg_temp.try_as('00000000-0000-0000-0000-000000000008', $q$SELECT public.release_staff_email_for_reinvite('00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-000000000008', 's08@test.local')::text$q$), 'ok:true');
SELECT pg_temp.check('8 orphan account purged',
  (SELECT ((SELECT count(*) FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000008')
         + (SELECT count(*) FROM auth.sessions WHERE user_id = '00000000-0000-0000-0000-000000000008')
         + (SELECT count(*) FROM auth.refresh_tokens WHERE user_id = '00000000-0000-0000-0000-000000000008'))::text), '0');

-- 9) Reconvite recusa e-mail de staff ainda ativo (em outra casa) ------------------
SELECT pg_temp.check('9 release refuses email of active staff -> false',
  pg_temp.try_as(:OWNER_A, $q$SELECT public.release_staff_email_for_reinvite('00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-000000000007', 's03@test.local')::text$q$), 'ok:false');
SELECT pg_temp.check('9 active staff account intact',
  (SELECT count(*)::text FROM auth.refresh_tokens WHERE user_id = '00000000-0000-0000-0000-000000000003'), '2');
SELECT pg_temp.check('9 owners and other-company staff accounts intact',
  (SELECT count(*)::text FROM auth.users WHERE id IN ('00000000-0000-0000-0000-0000000000a0','00000000-0000-0000-0000-0000000000b0','00000000-0000-0000-0000-00000000000b')), '3');

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
