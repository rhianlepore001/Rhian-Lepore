-- Testes I-01..I-17 do convite com token (20260929120000_staff_invite_hardening).
-- Rodar após: ex_staff_access.harness + staff_invite.harness + baseline + #105 + esta migration.
-- Sem a migration (--pre) os testes têm que FALHAR (evidência de falha primeiro).
\set ON_ERROR_STOP on
\set QUIET on

-- Executa p_sql como p_role/p_uid e devolve 'ok:<valor>', 'denied' ou 'err:<mensagem>'.
CREATE OR REPLACE FUNCTION pg_temp.q(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  PERFORM public._as(p_uid);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO r;
    r := 'ok:' || COALESCE(r, 'NULL');
  EXCEPTION WHEN insufficient_privilege THEN r := 'denied';
  WHEN OTHERS THEN r := 'err:' || SQLERRM;
  END;
  RESET ROLE;
  RETURN r;
END $$;

-- Simula o app: token NULL = chamada antiga (sem p_invite_token).
CREATE OR REPLACE FUNCTION pg_temp.claim(p_uid text, p_company text, p_member text, p_token text) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.q('authenticated', p_uid, CASE WHEN p_token IS NULL
    THEN format('SELECT public.complete_staff_invite(p_company_id => %L, p_member_id => %L, p_birth_date => %L)::text', p_company, p_member, '1990-01-01')
    ELSE format('SELECT public.complete_staff_invite(p_company_id => %L, p_member_id => %L, p_birth_date => %L, p_invite_token => %L)::text', p_company, p_member, '1990-01-01', p_token)
  END)
$$;

CREATE OR REPLACE FUNCTION pg_temp.linked(p_member text) RETURNS text LANGUAGE sql AS $$
  SELECT COALESCE(staff_user_id::text, 'NULL') FROM public.team_members WHERE id = p_member::uuid
$$;

-- Token emitido pelo dono (via RPC). 'x' quando não há RPC (--pre).
CREATE TEMP TABLE tok (k text PRIMARY KEY, v text);
CREATE OR REPLACE FUNCTION pg_temp.t(p_k text) RETURNS text LANGUAGE sql AS $$
  SELECT CASE WHEN v LIKE 'ok:%' THEN substr(v, 4) ELSE 'x' END FROM tok WHERE k = p_k
$$;
CREATE OR REPLACE FUNCTION pg_temp.issue(p_k text, p_owner text, p_member text, p_fn text DEFAULT 'get_or_create_staff_invite') RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  r := pg_temp.q('authenticated', p_owner, format('SELECT public.%I(%L)', p_fn, p_member));
  INSERT INTO tok VALUES (p_k, r) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v;
  RETURN r;
END $$;

-- Consulta como o usuário atual (postgres); erro vira 'err:' (ex.: objeto inexistente no --pre).
CREATE OR REPLACE FUNCTION pg_temp.sq(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  EXECUTE p_sql INTO r;
  RETURN COALESCE(r, 'NULL');
EXCEPTION WHEN OTHERS THEN RETURN 'err:' || SQLERRM;
END $$;

CREATE TEMP TABLE results (name text, ok boolean, got text);
GRANT ALL ON results TO PUBLIC;

-- Ids
\set A '00000000-0000-0000-0000-0000000000a0'
\set B '00000000-0000-0000-0000-0000000000b0'
\set d1 '20000000-0000-0000-0000-0000000000d1'
\set d2 '20000000-0000-0000-0000-0000000000d2'
\set d3 '20000000-0000-0000-0000-0000000000d3'
\set d4 '20000000-0000-0000-0000-0000000000d4'
\set d5 '20000000-0000-0000-0000-0000000000d5'
\set d6 '20000000-0000-0000-0000-0000000000d6'
\set d7 '20000000-0000-0000-0000-0000000000d7'
\set d8 '20000000-0000-0000-0000-0000000000d8'
\set d9 '20000000-0000-0000-0000-0000000000d9'
\set da '20000000-0000-0000-0000-0000000000da'
\set e1 '20000000-0000-0000-0000-0000000000e1'
\set f1 '20000000-0000-0000-0000-0000000000f1'
\set a1 '00000000-0000-0000-0000-0000000000a1'
\set a3 '00000000-0000-0000-0000-0000000000a3'
\set c1 '30000000-0000-0000-0000-0000000000c1'
\set c2 '30000000-0000-0000-0000-0000000000c2'
\set c3 '30000000-0000-0000-0000-0000000000c3'
\set c4 '30000000-0000-0000-0000-0000000000c4'
\set c5 '30000000-0000-0000-0000-0000000000c5'
\set c7 '30000000-0000-0000-0000-0000000000c7'
\set c8 '30000000-0000-0000-0000-0000000000c8'
\set c9 '30000000-0000-0000-0000-0000000000c9'
\set cb '30000000-0000-0000-0000-0000000000cb'
\set cc '30000000-0000-0000-0000-0000000000cc'
\set cf '30000000-0000-0000-0000-0000000000cf'
\set cg '30000000-0000-0000-0000-0000000000d0'
\set ch '30000000-0000-0000-0000-0000000000d1'
\set ci '30000000-0000-0000-0000-0000000000d2'

-- I-01: ex-colaborador cortado (#105) não se vincula a um cadastro livre só com os ids
INSERT INTO results SELECT 'I-01 ex-colaborador cortado + ids públicos: invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.claim(:'a3', :'A', :'d6', NULL) g) s;
INSERT INTO results SELECT 'I-01 cadastro livre continua livre e o cortado continua sem empresa', l = 'NULL' AND c = 'ok:NULL', l || ' ' || c
  FROM (SELECT pg_temp.linked(:'d6') l, pg_temp.q('authenticated', :'a3', 'SELECT public.get_auth_company_id()') c) s;

-- I-02: conta nova (sem perfil) não reivindica cadastro livre só com os ids
INSERT INTO results SELECT 'I-02 conta nova sem perfil + ids públicos: invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.claim(:'c1', :'A', :'d5', NULL) g) s;
INSERT INTO results SELECT 'I-02 conta nova continua sem perfil staff e o cadastro livre', p = 0 AND l = 'NULL', p || ' ' || l
  FROM (SELECT (SELECT count(*) FROM public.profiles WHERE id = :'c1' AND role = 'staff') p, pg_temp.linked(:'d5') l) s;

-- Tokens emitidos pelo dono A (d1, d2, d3) e pelo dono B (e1)
SELECT pg_temp.issue('d1', :'A', :'d1'), pg_temp.issue('d2', :'A', :'d2'), pg_temp.issue('d3', :'A', :'d3'),
       pg_temp.issue('d4', :'A', :'d4'), pg_temp.issue('d5', :'A', :'d5') \g /dev/null
INSERT INTO results SELECT 'I-03 dono emite token de 64 hex para o próprio cadastro', pg_temp.t('d1') ~ '^[0-9a-f]{64}$', (SELECT v FROM tok WHERE k = 'd1');

-- I-03: token ausente, errado, de outro cadastro, vencido, malformado
INSERT INTO results SELECT 'I-03 sem token (chamada antiga de 3 args): invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.claim(:'c2', :'A', :'d1', NULL) g) s;
INSERT INTO results SELECT 'I-03 token NULL explícito: invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.q('authenticated', :'c2', format('SELECT public.complete_staff_invite(p_company_id => %L, p_member_id => %L, p_invite_token => NULL)::text', :'A', :'d1')) g) s;
INSERT INTO results SELECT 'I-03 token errado: invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.claim(:'c2', :'A', :'d1', repeat('0f', 32)) g) s;
INSERT INTO results SELECT 'I-03 token malformado: invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.claim(:'c2', :'A', :'d1', 'abc') g) s;
INSERT INTO results SELECT 'I-03 token de OUTRO cadastro: invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.claim(:'c2', :'A', :'d1', pg_temp.t('d2')) g) s;
INSERT INTO results SELECT 'I-03 token certo com empresa errada: invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.claim(:'c2', :'B', :'d1', pg_temp.t('d1')) g) s;
DO $$ BEGIN
  IF to_regclass('public.staff_invites') IS NOT NULL THEN
    EXECUTE $q$UPDATE public.staff_invites SET expires_at = now() - interval '1 second' WHERE member_id = '20000000-0000-0000-0000-0000000000d3'$q$;
  END IF;
END $$;
INSERT INTO results SELECT 'I-03 token vencido: invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.claim(:'c2', :'A', :'d3', pg_temp.t('d3')) g) s;
INSERT INTO results SELECT 'I-03 nenhuma tentativa vinculou d1/d3', l1 = 'NULL' AND l3 = 'NULL', l1 || ' ' || l3
  FROM (SELECT pg_temp.linked(:'d1') l1, pg_temp.linked(:'d3') l3) s;

-- I-04: token válido vincula uma única vez
INSERT INTO results SELECT 'I-04 token válido vincula a conta nova ao cadastro', g = 'ok:' || :'d1', g
  FROM (SELECT pg_temp.claim(:'c2', :'A', :'d1', pg_temp.t('d1')) g) s;
INSERT INTO results SELECT 'I-04 perfil vira staff da empresa A, com nascimento, e o token fica usado',
       p = 'staff|' || :'A' || '|1990-01-01' AND u = 'true' AND l = :'c2', concat_ws(' ', p, u, l)
  FROM (SELECT (SELECT role || '|' || company_id || '|' || birth_date FROM public.profiles WHERE id = :'c2') p,
               pg_temp.sq(format('SELECT (used_at IS NOT NULL)::text FROM public.staff_invites WHERE member_id = %L', :'d1')) u,
               pg_temp.linked(:'d1') l) s;
INSERT INTO results SELECT 'I-04 mesmo token por OUTRA conta (token usado): invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.claim(:'c3', :'A', :'d1', pg_temp.t('d1')) g) s;
INSERT INTO results SELECT 'I-04 repetir pela mesma conta é idempotente (retry do app)', g = 'ok:' || :'d1' AND l = :'c2', g || ' ' || l
  FROM (SELECT pg_temp.claim(:'c2', :'A', :'d1', pg_temp.t('d1')) g, pg_temp.linked(:'d1') l) s;
INSERT INTO results SELECT 'I-04 conta nova tem acesso à empresa A', g = 'ok:' || :'A', g
  FROM (SELECT pg_temp.q('authenticated', :'c2', 'SELECT public.get_auth_company_id()') g) s;

-- I-05: "Copiar link" estável; "Gerar novo link" invalida o anterior
SELECT pg_temp.issue('d2b', :'A', :'d2') \g /dev/null
INSERT INTO results SELECT 'I-05 get_or_create devolve o MESMO token enquanto válido', pg_temp.t('d2b') = pg_temp.t('d2') AND pg_temp.t('d2') <> 'x', pg_temp.t('d2b')
  ;
SELECT pg_temp.issue('d2r', :'A', :'d2', 'rotate_staff_invite') \g /dev/null
INSERT INTO results SELECT 'I-05 rotate devolve token novo', pg_temp.t('d2r') <> pg_temp.t('d2') AND pg_temp.t('d2r') ~ '^[0-9a-f]{64}$', (SELECT v FROM tok WHERE k = 'd2r');
INSERT INTO results SELECT 'I-05 token antigo depois do rotate: invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.claim(:'c3', :'A', :'d2', pg_temp.t('d2')) g) s;
INSERT INTO results SELECT 'I-05 token novo vincula', g = 'ok:' || :'d2', g
  FROM (SELECT pg_temp.claim(:'c3', :'A', :'d2', pg_temp.t('d2r')) g) s;
SELECT pg_temp.issue('d3n', :'A', :'d3') \g /dev/null
INSERT INTO results SELECT 'I-05 get_or_create depois de vencido gera token novo', pg_temp.t('d3n') <> pg_temp.t('d3') AND pg_temp.t('d3n') ~ '^[0-9a-f]{64}$', (SELECT v FROM tok WHERE k = 'd3n');
INSERT INTO results SELECT 'I-05 cadastro que já tem login não recebe convite novo', g = 'err:invite_already_used', g
  FROM (SELECT pg_temp.q('authenticated', :'A', format('SELECT public.get_or_create_staff_invite(%L)', :'d1')) g) s;

-- I-06: staff_invites fechada; team_members intacta para a equipe
INSERT INTO results SELECT 'I-06 staff não lê staff_invites', g = 'denied', g
  FROM (SELECT pg_temp.q('authenticated', :'a1', 'SELECT count(*) FROM public.staff_invites') g) s;
INSERT INTO results SELECT 'I-06 anônimo não lê staff_invites', g = 'denied', g
  FROM (SELECT pg_temp.q('anon', NULL, 'SELECT count(*) FROM public.staff_invites') g) s;
INSERT INTO results SELECT 'I-06 nem o dono lê direto (só pelas RPCs)', g = 'denied', g
  FROM (SELECT pg_temp.q('authenticated', :'A', 'SELECT count(*) FROM public.staff_invites') g) s;
INSERT INTO results SELECT 'I-06 staff não escreve em staff_invites', g = 'denied', g
  FROM (SELECT pg_temp.q('authenticated', :'a1', format('INSERT INTO public.staff_invites (member_id, company_id) VALUES (%L, %L) RETURNING 1', :'d6', :'A')) g) s;
INSERT INTO results SELECT 'I-06 sem grant para anon/authenticated e RLS ligada', g = 'false|false|true', g
  FROM (SELECT pg_temp.sq($q$SELECT has_table_privilege('anon', 'public.staff_invites', 'SELECT,INSERT,UPDATE,DELETE')::text || '|'
               || has_table_privilege('authenticated', 'public.staff_invites', 'SELECT,INSERT,UPDATE,DELETE')::text || '|'
               || relrowsecurity::text FROM pg_class WHERE oid = 'public.staff_invites'::regclass$q$) g) s;
INSERT INTO results SELECT 'I-06 staff: select * em team_members continua funcionando', g ~ '^ok:[1-9]', g
  FROM (SELECT pg_temp.q('authenticated', :'a1', 'SELECT count(*) FROM (SELECT * FROM public.team_members) t') g) s;
INSERT INTO results SELECT 'I-06 team_members não ganhou coluna de token', g = 0, g::text
  FROM (SELECT count(*) g FROM information_schema.columns WHERE table_name = 'team_members' AND column_name ILIKE '%token%') s;

-- I-07: dono só emite token para cadastros da própria equipe
INSERT INTO results SELECT 'I-07 dono B não emite token para cadastro da A', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.q('authenticated', :'B', format('SELECT public.get_or_create_staff_invite(%L)', :'d6')) g) s;
INSERT INTO results SELECT 'I-07 dono B não gira token de cadastro da A', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.q('authenticated', :'B', format('SELECT public.rotate_staff_invite(%L)', :'d4')) g) s;
INSERT INTO results SELECT 'I-07 staff não emite token', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.q('authenticated', :'a1', format('SELECT public.get_or_create_staff_invite(%L)', :'d6')) g) s;
INSERT INTO results SELECT 'I-07 dono não emite token para o cadastro de dono', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.q('authenticated', :'A', format('SELECT public.get_or_create_staff_invite(%L)', '10000000-0000-0000-0000-0000000000a0')) g) s;
INSERT INTO results SELECT 'I-07 dono não emite token para cadastro excluído', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.q('authenticated', :'A', format('SELECT public.get_or_create_staff_invite(%L)', :'f1')) g) s;
INSERT INTO results SELECT 'I-07 anônimo não executa as RPCs do dono', g = 'denied' AND a = 'false|false', g || ' ' || a
  FROM (SELECT pg_temp.q('anon', NULL, format('SELECT public.get_or_create_staff_invite(%L)', :'d6')) g,
               pg_temp.sq($q$SELECT has_function_privilege('anon', 'public.get_or_create_staff_invite(uuid)', 'EXECUTE')::text || '|'
                 || has_function_privilege('anon', 'public.rotate_staff_invite(uuid)', 'EXECUTE')::text$q$) a) s;
INSERT INTO results SELECT 'I-07 tentativas negadas não criaram convite (d6 da A)', g = '0', g
  FROM (SELECT pg_temp.sq($q$SELECT count(*)::text FROM public.staff_invites WHERE member_id = '20000000-0000-0000-0000-0000000000d6'$q$) g) s;
INSERT INTO results SELECT 'I-07 dono B emite para o próprio cadastro', g ~ '^ok:[0-9a-f]{64}$', g
  FROM (SELECT pg_temp.q('authenticated', :'B', format('SELECT public.get_or_create_staff_invite(%L)', :'e1')) g) s;

-- I-08: accept_staff_invite fechada; uma única complete_staff_invite
INSERT INTO results SELECT 'I-08 accept_staff_invite sem EXECUTE para authenticated/anon/public', NOT a AND NOT n AND NOT p, concat_ws(' ', a, n, p)
  FROM (SELECT has_function_privilege('authenticated', 'public.accept_staff_invite(text,uuid)', 'EXECUTE') a,
               has_function_privilege('anon', 'public.accept_staff_invite(text,uuid)', 'EXECUTE') n,
               has_function_privilege('public', 'public.accept_staff_invite(text,uuid)', 'EXECUTE') p) s;
INSERT INTO results SELECT 'I-08 accept_staff_invite chamada por usuário: negada e nada vinculado', g = 'denied' AND pg_temp.linked(:'d5') = 'NULL', g
  FROM (SELECT pg_temp.q('authenticated', :'c4', format('SELECT id::text FROM public.accept_staff_invite(%L, %L)', :'A', :'d5')) g) s;
INSERT INTO results SELECT 'I-08 só existe UMA complete_staff_invite (com p_invite_token)', g = '1:complete_staff_invite(text,uuid,date,text)', g
  FROM (SELECT count(*) || ':' || string_agg(p.oid::regprocedure::text, ',') g FROM pg_proc p
        WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'complete_staff_invite') s;
INSERT INTO results SELECT 'I-08 uma única get_team_member_for_invite e release_staff_email_for_reinvite (com token)',
       g = 'get_team_member_for_invite(text,uuid,text),release_staff_email_for_reinvite(text,uuid,text,text)', g
  FROM (SELECT string_agg(p.oid::regprocedure::text, ',' ORDER BY p.proname) g FROM pg_proc p
        WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN ('get_team_member_for_invite', 'release_staff_email_for_reinvite')) s;
INSERT INTO results SELECT 'I-08 complete_staff_invite: authenticated sim, anon não', a AND NOT n, a || ' ' || n
  FROM (SELECT has_function_privilege('authenticated', p.oid, 'EXECUTE') a, has_function_privilege('anon', p.oid, 'EXECUTE') n
        FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'complete_staff_invite' LIMIT 1) s;

-- I-09: handle_new_user só cria staff com token válido
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'c7', 'hnu7@teste.local', jsonb_build_object('role', 'staff', 'company_id', :'A', 'member_id', :'d4', 'full_name', 'Sem Token')),
  (:'c8', 'hnu8@teste.local', jsonb_build_object('role', 'staff', 'company_id', :'A', 'member_id', :'d4', 'invite_token', repeat('0f', 32))),
  ('30000000-0000-0000-0000-0000000000ca', 'hnua@teste.local', jsonb_build_object('role', 'staff', 'company_id', :'A', 'member_id', :'d4', 'invite_token', pg_temp.t('d5')));
INSERT INTO results SELECT 'I-09 cadastro com company+member e SEM token: perfil de dono, não staff', g = 'owner|' || :'c7', g
  FROM (SELECT role || '|' || company_id g FROM public.profiles WHERE id = :'c7') s;
INSERT INTO results SELECT 'I-09 cadastro com token ERRADO: perfil de dono, não staff', g = 'owner|' || :'c8', g
  FROM (SELECT role || '|' || company_id g FROM public.profiles WHERE id = :'c8') s;
INSERT INTO results SELECT 'I-09 cadastro com token de OUTRO cadastro: perfil de dono', g = 'owner|30000000-0000-0000-0000-0000000000ca', g
  FROM (SELECT role || '|' || company_id g FROM public.profiles WHERE id = '30000000-0000-0000-0000-0000000000ca') s;
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'c9', 'hnu9@teste.local', jsonb_build_object('role', 'staff', 'company_id', :'A', 'member_id', :'d4', 'invite_token', pg_temp.t('d4')));
INSERT INTO results SELECT 'I-09 cadastro com token válido: perfil staff da empresa A', g = 'staff|' || :'A', COALESCE(g, 'NULL')
  FROM (SELECT (SELECT role || '|' || company_id FROM public.profiles WHERE id = :'c9') g) s;
INSERT INTO results SELECT 'I-09 o trigger não consome o token nem vincula', u = 'false' AND l = 'NULL', u || ' ' || l
  FROM (SELECT pg_temp.sq(format('SELECT (used_at IS NOT NULL)::text FROM public.staff_invites WHERE member_id = %L', :'d4')) u, pg_temp.linked(:'d4') l) s;

-- I-10: get_team_member_for_invite (tela do convite, anônimo)
INSERT INTO results SELECT 'I-10 sem token: nada', g = 'ok:0', g
  FROM (SELECT pg_temp.q('anon', NULL, format('SELECT count(*)::text FROM public.get_team_member_for_invite(p_company_id => %L, p_member_id => %L)', :'A', :'d4')) g) s;
INSERT INTO results SELECT 'I-10 token errado: nada', g = 'ok:0', g
  FROM (SELECT pg_temp.q('anon', NULL, format('SELECT count(*)::text FROM public.get_team_member_for_invite(%L, %L, %L)', :'A', :'d4', repeat('0f', 32))) g) s;
INSERT INTO results SELECT 'I-10 token de outro cadastro: nada', g = 'ok:0', g
  FROM (SELECT pg_temp.q('anon', NULL, format('SELECT count(*)::text FROM public.get_team_member_for_invite(%L, %L, %L)', :'A', :'d4', pg_temp.t('d5'))) g) s;
INSERT INTO results SELECT 'I-10 token válido: nome do cadastro', g = 'ok:Convite D4', g
  FROM (SELECT pg_temp.q('anon', NULL, format('SELECT name FROM public.get_team_member_for_invite(%L, %L, %L)', :'A', :'d4', pg_temp.t('d4'))) g) s;
INSERT INTO results SELECT 'I-10 token já usado pela conta vinculada: linha com staff_user_id ("já utilizado")', g = 'ok:' || :'c2', g
  FROM (SELECT pg_temp.q('anon', NULL, format('SELECT staff_user_id::text FROM public.get_team_member_for_invite(%L, %L, %L)', :'A', :'d1', pg_temp.t('d1'))) g) s;

-- I-11: relink (#105) também exige o token da metadata
INSERT INTO public.profiles (id, role, company_id, full_name) VALUES (:'c5', 'staff', :'A', 'Convite D5');
UPDATE auth.users SET raw_user_meta_data = jsonb_build_object('role', 'staff', 'member_id', :'d5') WHERE id = :'c5';
INSERT INTO results SELECT 'I-11 relink com member_id e SEM token: NULL', g = 'ok:NULL', g
  FROM (SELECT pg_temp.q('authenticated', :'c5', 'SELECT public.relink_staff_if_unbound()::text') g) s;
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('invite_token', pg_temp.t('d4')) WHERE id = :'c5';
INSERT INTO results SELECT 'I-11 relink com token de outro cadastro: NULL', g = 'ok:NULL' AND pg_temp.linked(:'d5') = 'NULL', g
  FROM (SELECT pg_temp.q('authenticated', :'c5', 'SELECT public.relink_staff_if_unbound()::text') g) s;
INSERT INTO results SELECT 'I-11 relink com token válido vincula e consome o token', g = 'ok:' || :'d4' AND u = 'true', g || ' ' || u
  FROM (SELECT pg_temp.q('authenticated', :'c9', 'SELECT public.relink_staff_if_unbound()::text') g) s,
       LATERAL (SELECT pg_temp.sq(format('SELECT (used_at IS NOT NULL)::text FROM public.staff_invites WHERE member_id = %L', :'d4')) u) t;
INSERT INTO results SELECT 'I-11 complete depois do relink (mesma conta) segue idempotente', g = 'ok:' || :'d4', g
  FROM (SELECT pg_temp.claim(:'c9', :'A', :'d4', pg_temp.t('d4')) g) s;

-- I-12: release_staff_email_for_reinvite: o convidado precisa do token
INSERT INTO results SELECT 'I-12 convidado sem token não libera o e-mail', g = 'ok:false' AND e = 1, g || ' users=' || e
  FROM (SELECT pg_temp.q('authenticated', :'c5', format('SELECT public.release_staff_email_for_reinvite(%L, %L, %L)::text', :'A', :'d5', 'nova5@teste.local')) g) s,
       LATERAL (SELECT count(*) e FROM auth.users WHERE email = 'nova5@teste.local') t;
INSERT INTO results SELECT 'I-12 convidado com token errado não libera', g = 'ok:false', g
  FROM (SELECT pg_temp.q('authenticated', :'c5', format('SELECT public.release_staff_email_for_reinvite(%L, %L, %L, %L)::text', :'A', :'d5', 'nova5@teste.local', repeat('0f', 32))) g) s;
INSERT INTO results SELECT 'I-12 dono continua liberando (caminho do dono sem mudança)', g = 'ok:true', g
  FROM (SELECT pg_temp.q('authenticated', :'A', format('SELECT public.release_staff_email_for_reinvite(%L, %L, %L)::text', :'A', :'d5', 'ninguem@teste.local')) g) s;
INSERT INTO results SELECT 'I-12 convidado com token válido libera o próprio e-mail', g = 'ok:true', g
  FROM (SELECT pg_temp.q('authenticated', :'c5', format('SELECT public.release_staff_email_for_reinvite(%L, %L, %L, %L)::text', :'A', :'d5', 'nova5@teste.local', pg_temp.t('d5'))) g) s;
INSERT INTO results SELECT 'I-12 depois de liberar: e-mail livre para o novo cadastro', g = 0, g::text
  FROM (SELECT count(*) g FROM auth.users WHERE email = 'nova5@teste.local') s;

-- I-13: helper interno fechado
INSERT INTO results SELECT 'I-13 staff_invite_token_is_valid não é executável por anon/authenticated', g = 'false|false', g
  FROM (SELECT pg_temp.sq($q$SELECT has_function_privilege('anon', 'public.staff_invite_token_is_valid(uuid,text,text)', 'EXECUTE')::text || '|'
               || has_function_privilege('authenticated', 'public.staff_invite_token_is_valid(uuid,text,text)', 'EXECUTE')::text$q$) g) s;

-- I-14: formato e validade padrão
INSERT INTO results SELECT 'I-14 token 64 hex, validade de 30 dias e created_by = dono', g = 'true', g
  FROM (SELECT pg_temp.sq(format($q$SELECT bool_and(token ~ '^[0-9a-f]{64}$' AND expires_at BETWEEN now() + interval '29 days' AND now() + interval '31 days' AND created_by::text = company_id)::text
        FROM public.staff_invites WHERE member_id IN (%L, %L, %L)$q$, :'d1', :'d2', :'e1')) g) s;

-- I-15: só cadastro ATIVO recebe convite (get_or_create e rotate)
INSERT INTO results SELECT 'I-15 cadastro inativo: get_or_create_staff_invite invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.q('authenticated', :'A', format('SELECT public.get_or_create_staff_invite(%L)', :'da')) g) s;
INSERT INTO results SELECT 'I-15 cadastro inativo: rotate_staff_invite invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.q('authenticated', :'A', format('SELECT public.rotate_staff_invite(%L)', :'da')) g) s;
INSERT INTO results SELECT 'I-15 nenhum convite criado para o inativo', g = '0', g
  FROM (SELECT pg_temp.sq(format('SELECT count(*)::text FROM public.staff_invites WHERE member_id = %L', :'da')) g) s;
INSERT INTO results SELECT 'I-15 cadastro excluído: get_or_create e rotate invalid_invite', g = 'err:invalid_invite|err:invalid_invite', g
  FROM (SELECT pg_temp.q('authenticated', :'A', format('SELECT public.get_or_create_staff_invite(%L)', :'f1')) || '|'
            || pg_temp.q('authenticated', :'A', format('SELECT public.rotate_staff_invite(%L)', :'f1')) g) s;

-- I-16: duas contas com o MESMO token (a segunda perde; um único vínculo)
SELECT pg_temp.issue('d7', :'A', :'d7') \g /dev/null
INSERT INTO results SELECT 'I-16 primeira conta com o token vincula', g = 'ok:' || :'d7', g
  FROM (SELECT pg_temp.claim(:'cb', :'A', :'d7', pg_temp.t('d7')) g) s;
INSERT INTO results SELECT 'I-16 segunda conta com o mesmo token: invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.claim(:'cc', :'A', :'d7', pg_temp.t('d7')) g) s;
INSERT INTO results SELECT 'I-16 um único vínculo (primeira conta) e a segunda sem perfil staff', l = :'cb' AND p = 0 AND n = 1, l || ' staff_cc=' || p || ' links=' || n
  FROM (SELECT pg_temp.linked(:'d7') l,
               (SELECT count(*) FROM public.profiles WHERE id = :'cc' AND role = 'staff') p,
               (SELECT count(*) FROM public.team_members WHERE staff_user_id IN (:'cb', :'cc')) n) s;
INSERT INTO results SELECT 'I-16 segunda conta também não entra por relink nem pela tela do convite', r = 'ok:NULL' AND v = 'ok:' || :'cb', r || ' ' || v
  FROM (SELECT pg_temp.q('authenticated', :'cc', 'SELECT public.relink_staff_if_unbound()::text') r,
               pg_temp.q('anon', NULL, format('SELECT staff_user_id::text FROM public.get_team_member_for_invite(%L, %L, %L)', :'A', :'d7', pg_temp.t('d7'))) v) s;

-- I-17: cadastro desativado (d8) ou excluído (d9) DEPOIS de o token ser emitido
SELECT pg_temp.issue('d8', :'A', :'d8'), pg_temp.issue('d9', :'A', :'d9') \g /dev/null
-- Contas criadas com o token válido enquanto o cadastro ainda estava ativo (perfil staff, sem vínculo).
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'cf', 'hnuf@teste.local', jsonb_build_object('role', 'staff', 'company_id', :'A', 'member_id', :'d8', 'invite_token', pg_temp.t('d8'))),
  (:'ch', 'hnuh@teste.local', jsonb_build_object('role', 'staff', 'company_id', :'A', 'member_id', :'d9', 'invite_token', pg_temp.t('d9')));
INSERT INTO results SELECT 'I-17 antes: contas com token válido nascem staff da A', g = 'staff|' || :'A' || ',staff|' || :'A', COALESCE(g, 'NULL')
  FROM (SELECT string_agg(role || '|' || company_id, ',' ORDER BY id) g FROM public.profiles WHERE id IN (:'cf', :'ch')) s;
UPDATE public.team_members SET active = false WHERE id = :'d8';
UPDATE public.team_members SET deleted_at = now() WHERE id = :'d9';
INSERT INTO results SELECT 'I-17 desativado: complete_staff_invite com o token invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.claim(:'cf', :'A', :'d8', pg_temp.t('d8')) g) s;
INSERT INTO results SELECT 'I-17 excluído: complete_staff_invite com o token invalid_invite', g = 'err:invalid_invite', g
  FROM (SELECT pg_temp.claim(:'ch', :'A', :'d9', pg_temp.t('d9')) g) s;
INSERT INTO results SELECT 'I-17 desativado/excluído: relink não vincula', a = 'ok:NULL' AND b = 'ok:NULL', a || ' ' || b
  FROM (SELECT pg_temp.q('authenticated', :'cf', 'SELECT public.relink_staff_if_unbound()::text') a,
               pg_temp.q('authenticated', :'ch', 'SELECT public.relink_staff_if_unbound()::text') b) s;
INSERT INTO results SELECT 'I-17 desativado/excluído: tela do convite não mostra nada', g = 'ok:0|ok:0', g
  FROM (SELECT pg_temp.q('anon', NULL, format('SELECT count(*)::text FROM public.get_team_member_for_invite(%L, %L, %L)', :'A', :'d8', pg_temp.t('d8'))) || '|'
            || pg_temp.q('anon', NULL, format('SELECT count(*)::text FROM public.get_team_member_for_invite(%L, %L, %L)', :'A', :'d9', pg_temp.t('d9'))) g) s;
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'cg', 'hnug@teste.local', jsonb_build_object('role', 'staff', 'company_id', :'A', 'member_id', :'d8', 'invite_token', pg_temp.t('d8'))),
  (:'ci', 'hnui@teste.local', jsonb_build_object('role', 'staff', 'company_id', :'A', 'member_id', :'d9', 'invite_token', pg_temp.t('d9')));
INSERT INTO results SELECT 'I-17 desativado/excluído: cadastro novo com o token vira dono, não staff', g = 'owner|' || :'cg' || ',owner|' || :'ci', COALESCE(g, 'NULL')
  FROM (SELECT string_agg(role || '|' || company_id, ',' ORDER BY id) g FROM public.profiles WHERE id IN (:'cg', :'ci')) s;
INSERT INTO results SELECT 'I-17 desativado/excluído: nenhum vínculo e token não consumido', l = 'NULL NULL' AND u = 'false,false', l || ' ' || u
  FROM (SELECT pg_temp.linked(:'d8') || ' ' || pg_temp.linked(:'d9') l,
               pg_temp.sq(format('SELECT string_agg((used_at IS NOT NULL)::text, '','') FROM public.staff_invites WHERE member_id IN (%L, %L)', :'d8', :'d9')) u) s;
INSERT INTO results SELECT 'I-17 desativado depois: dono não reemite nem gira o token', g = 'err:invalid_invite|err:invalid_invite', g
  FROM (SELECT pg_temp.q('authenticated', :'A', format('SELECT public.get_or_create_staff_invite(%L)', :'d8')) || '|'
            || pg_temp.q('authenticated', :'A', format('SELECT public.rotate_staff_invite(%L)', :'d8')) g) s;

\set QUIET off
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS status, name, left(got, 90) AS got FROM results;
DO $$ DECLARE f int; BEGIN
  SELECT count(*) INTO f FROM results WHERE NOT ok OR ok IS NULL;
  RAISE NOTICE 'staff_invite: % passed, % failed', (SELECT count(*) FROM results WHERE ok), f;
  IF f > 0 THEN RAISE EXCEPTION '% teste(s) falharam', f; END IF;
END $$;
