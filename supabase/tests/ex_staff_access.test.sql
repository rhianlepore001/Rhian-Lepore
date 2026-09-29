-- Testes S-01..S-07 (ACCEPTANCE.md seção E). Rodar após harness + baseline + migration.
\set ON_ERROR_STOP on
\set QUIET on

CREATE OR REPLACE FUNCTION pg_temp.run_as(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n int; r text;
BEGIN
  PERFORM public._as(p_uid);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    r := 'ok:' || n;
  EXCEPTION WHEN insufficient_privilege THEN r := 'denied';
  WHEN OTHERS THEN r := 'error:' || SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.scalar_as(p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  PERFORM public._as(p_uid);
  SET LOCAL ROLE authenticated;
  EXECUTE p_sql INTO r;
  RESET ROLE;
  RETURN r;
END $$;

CREATE TEMP TABLE results (name text, ok boolean, got text);
GRANT ALL ON results TO PUBLIC;

BEGIN;
-- S-01: colaborador com vínculo vivo (ativo OU inativo) mantém exatamente o mesmo acesso
INSERT INTO results SELECT 'S-01 staff com vínculo ativo: acesso idêntico ao de antes', f = b.fp, f
  FROM (SELECT public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000a1') f) s, public._baseline b WHERE b.who = 'a1';
INSERT INTO results SELECT 'S-01 staff com vínculo INATIVO (recepção): acesso idêntico', f = b.fp, f
  FROM (SELECT public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000a2') f) s, public._baseline b WHERE b.who = 'a2';
INSERT INTO results SELECT 'S-01 staff ativo enxerga a empresa A', f LIKE 'company=00000000-0000-0000-0000-0000000000a0 appt=2 cli=2 svc=2 %', f
  FROM (SELECT public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000a1') f) s;
INSERT INTO results SELECT 'S-01 staff sem company_id (empresa = ele mesmo): sem mudança', f = b.fp, f
  FROM (SELECT public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000a7') f) s, public._baseline b WHERE b.who = 'a7';

-- S-02: sem vínculo -> NULL e 0 linhas em tudo
INSERT INTO results SELECT 'S-02 nunca vinculado: NULL e 0 linhas', f = 'company=NULL appt=0 cli=0 svc=0 tm=0 fin=0 pb=0 prof=1', f
  FROM (SELECT public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000a3') f) s;
INSERT INTO results SELECT 'S-02 excluído (delete_staff_collaborator): NULL e 0 linhas', f = 'company=NULL appt=0 cli=0 svc=0 tm=0 fin=0 pb=0 prof=1', f
  FROM (SELECT public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000a4') f) s;
INSERT INTO results SELECT 'S-02 vínculo só em outra empresa: NULL e 0 linhas da A', f = 'company=NULL appt=0 cli=0 svc=0 tm=1 fin=0 pb=0 prof=1', f
  FROM (SELECT public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000a6') f) s;
INSERT INTO results SELECT 'S-02 vínculo em outra empresa: a única linha de team_members é o próprio cadastro (na B)', g = '10000000-0000-0000-0000-0000000000b6', g
  FROM (SELECT pg_temp.scalar_as('00000000-0000-0000-0000-0000000000a6', 'SELECT string_agg(id::text, '','') FROM public.team_members') g) s;
-- Legado: cadastro excluído que ainda aponta para o login (1 caso em prod, 0 lançamentos financeiros).
-- O ramo staff_user_id = auth.uid() de team_members é mantido por E2.2: ele só vê o PRÓPRIO cadastro.
INSERT INTO results SELECT 'S-02 excluído legado: NULL, nada da empresa; só o próprio cadastro', f = 'company=NULL appt=0 cli=0 svc=0 tm=1 fin=0 pb=0 prof=1', f
  FROM (SELECT public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000a5') f) s;
INSERT INTO results SELECT 'S-02 órfão não lê o perfil do dono (nome/plano)', g = '0', g
  FROM (SELECT pg_temp.scalar_as('00000000-0000-0000-0000-0000000000a3', $q$SELECT count(*)::text FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000a0'$q$) g) s;
INSERT INTO results SELECT 'S-02 órfão não cria agendamento na empresa', g IN ('denied', 'error:42501'), g
  FROM (SELECT pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000a3', $q$INSERT INTO public.appointments (user_id) VALUES ('00000000-0000-0000-0000-0000000000a0')$q$) g) s;
INSERT INTO results SELECT 'S-02 órfão não altera agendamentos (0 linhas)', g = 'ok:0', g
  FROM (SELECT pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000a3', $q$UPDATE public.appointments SET status = 'Cancelled'$q$) g) s;
INSERT INTO results SELECT 'S-02 órfão não cria cliente na empresa', g IN ('denied', 'error:42501'), g
  FROM (SELECT pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000a3', $q$INSERT INTO public.clients (user_id, name) VALUES ('00000000-0000-0000-0000-0000000000a0', 'x')$q$) g) s;
INSERT INTO results SELECT 'S-02 órfão não altera pedidos online (0 linhas)', g = 'ok:0', g
  FROM (SELECT pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000a5', $q$UPDATE public.public_bookings SET status = 'cancelled'$q$) g) s;

-- S-03: donos -> o próprio id, acesso idêntico
INSERT INTO results SELECT 'S-03 dono ' || b.who || ': acesso idêntico e empresa = próprio id',
       f = b.fp AND f LIKE 'company=00000000-0000-0000-0000-0000000000' || b.who || ' %', f
  FROM public._baseline b, LATERAL (SELECT public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000' || b.who) f) s
  WHERE b.who IN ('a0', 'b0', 'c0');

-- S-04: as 3 policies reescritas, nenhuma policy lê profiles.company_id
INSERT INTO results SELECT 'S-04 nenhuma policy lê profiles.company_id', g = '0', g
  FROM (SELECT count(*)::text g FROM pg_policies WHERE schemaname = 'public'
        AND (COALESCE(qual, '') || COALESCE(with_check, '')) ILIKE '%profiles.company_id%') s;
INSERT INTO results SELECT 'S-04 as 3 policies continuam existindo com o mesmo nome', g = '3', g
  FROM (SELECT count(*)::text g FROM pg_policies WHERE schemaname = 'public' AND policyname IN
        ('Staff can read company appointments', 'Staff can read company services', 'Staff can read company team members')
        AND qual ILIKE '%get_auth_company_id()%') s;
INSERT INTO results SELECT 'S-04 team_members mantém o ramo staff_user_id = auth.uid()', g, g::text
  FROM (SELECT bool_and(qual ILIKE '%staff_user_id = auth.uid()%') g FROM pg_policies WHERE policyname = 'Staff can read company team members') s;
INSERT INTO results SELECT 'S-04 nenhuma policy criada ou removida (mesmo total de antes)', g = b.fp, g || ' (antes ' || b.fp || ')'
  FROM (SELECT count(*)::text g FROM pg_policies WHERE schemaname = 'public') s, public._baseline b WHERE b.who = 'policies';

-- S-05b: relink NÃO é porta de volta. O nome do perfil é editável pelo próprio
-- usuário ("Profiles: own update") e os nomes são públicos em /book/<slug>;
-- a metadata do auth também é editável (auth.updateUser). Nada disso religa.
INSERT INTO results SELECT 'S-05b órfão consegue renomear o próprio perfil (policy own update)', g = 'ok:1', g
  FROM (SELECT pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000a3', $q$UPDATE public.profiles SET full_name = 'Vaga Aberta' WHERE id = '00000000-0000-0000-0000-0000000000a3'$q$) g) s;
INSERT INTO results SELECT 'S-05b órfão renomeado para um cadastro livre: relink recusado', g IS NULL, COALESCE(g, 'NULL')
  FROM (SELECT pg_temp.scalar_as('00000000-0000-0000-0000-0000000000a3', 'SELECT public.relink_staff_if_unbound()::text') g) s;
INSERT INTO results SELECT 'S-05b órfão renomeado para "Novo Colaborador" (repro da revisão): relink recusado', g IS NULL, COALESCE(g, 'NULL')
  FROM (SELECT pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000a3', $q$UPDATE public.profiles SET full_name = 'Novo Colaborador' WHERE id = '00000000-0000-0000-0000-0000000000a3'$q$) r) x,
        LATERAL (SELECT pg_temp.scalar_as('00000000-0000-0000-0000-0000000000a3', 'SELECT public.relink_staff_if_unbound()::text') g) s;
UPDATE auth.users SET raw_user_meta_data = '{"role":"staff","member_id":"10000000-0000-0000-0000-0000000000a9"}'
  WHERE id = '00000000-0000-0000-0000-0000000000a3'; -- simula auth.updateUser({ data: { member_id } })
INSERT INTO results SELECT 'S-05b órfão (conta de 30 dias) forja member_id na metadata: relink recusado', g IS NULL, COALESCE(g, 'NULL')
  FROM (SELECT pg_temp.scalar_as('00000000-0000-0000-0000-0000000000a3', 'SELECT public.relink_staff_if_unbound()::text') g) s;
INSERT INTO results SELECT 'S-05b depois das tentativas: órfão continua sem empresa e o cadastro livre segue livre', f = 'company=NULL appt=0 cli=0 svc=0 tm=0 fin=0 pb=0 prof=1' AND l IS NULL, f || ' a9.staff_user_id=' || COALESCE(l, 'NULL')
  FROM (SELECT public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000a3') f) s,
       (SELECT staff_user_id::text l FROM public.team_members WHERE id = '10000000-0000-0000-0000-0000000000a9') t;
INSERT INTO results SELECT 'S-05b conta nova com member_id de OUTRA empresa: relink recusado', g IS NULL, COALESCE(g, 'NULL')
  FROM (SELECT pg_temp.scalar_as('00000000-0000-0000-0000-000000000a11', 'SELECT public.relink_staff_if_unbound()::text') g) s;
UPDATE auth.users SET raw_user_meta_data = '{"role":"staff","member_id":"10000000-0000-0000-0000-0000000000a0"}'
  WHERE id = '00000000-0000-0000-0000-000000000a11';
INSERT INTO results SELECT 'S-05b conta nova com member_id do DONO: relink recusado', g IS NULL, COALESCE(g, 'NULL')
  FROM (SELECT pg_temp.scalar_as('00000000-0000-0000-0000-000000000a11', 'SELECT public.relink_staff_if_unbound()::text') g) s;
UPDATE auth.users SET raw_user_meta_data = '{"role":"staff","member_id":"10000000-0000-0000-0000-0000000000a4"}'
  WHERE id = '00000000-0000-0000-0000-000000000a11';
INSERT INTO results SELECT 'S-05b conta nova com member_id de cadastro EXCLUÍDO: relink recusado', g IS NULL, COALESCE(g, 'NULL')
  FROM (SELECT pg_temp.scalar_as('00000000-0000-0000-0000-000000000a11', 'SELECT public.relink_staff_if_unbound()::text') g) s;
UPDATE auth.users SET raw_user_meta_data = '{"role":"staff","member_id":"nao-e-uuid"}'
  WHERE id = '00000000-0000-0000-0000-000000000a11';
INSERT INTO results SELECT 'S-05b metadata inválida não quebra: NULL', g IS NULL, COALESCE(g, 'NULL')
  FROM (SELECT pg_temp.scalar_as('00000000-0000-0000-0000-000000000a11', 'SELECT public.relink_staff_if_unbound()::text') g) s;

-- S-05: relink continua funcionando para o cadastro do convite, dentro da
-- janela do cadastro (conta com até 24 h), e dá acesso logo depois.
INSERT INTO results SELECT 'S-05 antes do relink: recém-cadastrado ainda sem empresa', g IS NULL, COALESCE(g, 'NULL')
  FROM (SELECT pg_temp.scalar_as('00000000-0000-0000-0000-0000000000a8', 'SELECT public.get_auth_company_id()') g) s;
INSERT INTO results SELECT 'S-05 relink vincula o recém-cadastrado ao member_id do convite', g = '10000000-0000-0000-0000-0000000000a8', COALESCE(g, 'NULL')
  FROM (SELECT pg_temp.scalar_as('00000000-0000-0000-0000-0000000000a8', 'SELECT public.relink_staff_if_unbound()::text') g) s;
INSERT INTO results SELECT 'S-05 relink de novo devolve o mesmo vínculo (idempotente)', g = '10000000-0000-0000-0000-0000000000a8', COALESCE(g, 'NULL')
  FROM (SELECT pg_temp.scalar_as('00000000-0000-0000-0000-0000000000a8', 'SELECT public.relink_staff_if_unbound()::text') g) s;
INSERT INTO results SELECT 'S-05 depois do relink: acesso à empresa A', f LIKE 'company=00000000-0000-0000-0000-0000000000a0 appt=2 cli=2 svc=2 %', f
  FROM (SELECT public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000a8') f) s;
INSERT INTO results SELECT 'S-05 relink NÃO religa o Caique legado', g IS NULL, COALESCE(g, 'NULL')
  FROM (SELECT pg_temp.scalar_as('00000000-0000-0000-0000-0000000000a5', 'SELECT public.relink_staff_if_unbound()::text') g) s;
INSERT INTO results SELECT 'S-05 relink segue sem EXECUTE para anon', NOT g, g::text
  FROM (SELECT has_function_privilege('anon', 'public.relink_staff_if_unbound()', 'EXECUTE') g) s;

-- S-07: anônimo igual
INSERT INTO results SELECT 'S-07 anônimo: mesma visão de antes', f = b.fp, f
  FROM (SELECT public._fingerprint('anon', NULL) f) s, public._baseline b WHERE b.who = 'anon';
INSERT INTO results SELECT 'S-07 anônimo cria pedido pendente no link público', g = 'ok:1', g
  FROM (SELECT pg_temp.run_as('anon', NULL, $q$INSERT INTO public.public_bookings (business_id, status, customer_name) VALUES ('00000000-0000-0000-0000-0000000000a0', 'pending', 'Cliente Web')$q$) g) s;
INSERT INTO results SELECT 'S-07 anônimo lê o pedido recém-criado (policy fresh)', g = 'ok:1', g
  FROM (SELECT pg_temp.run_as('anon', NULL, $q$SELECT 1 FROM public.public_bookings WHERE customer_name = 'Cliente Web'$q$) g) s;

-- Função: continua STABLE SECURITY DEFINER com search_path fixo e grants intactos
INSERT INTO results SELECT 'função mantém STABLE + SECURITY DEFINER + search_path', g, g::text
  FROM (SELECT (p.provolatile = 's' AND p.prosecdef AND p.proconfig = ARRAY['search_path=public']) g
        FROM pg_proc p WHERE p.proname = 'get_auth_company_id') s;
INSERT INTO results SELECT 'função continua executável por authenticated', g, g::text
  FROM (SELECT has_function_privilege('authenticated', 'public.get_auth_company_id()', 'EXECUTE') g) s;
COMMIT;

\set QUIET off
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS status, name, got FROM results;
DO $$ DECLARE f int; BEGIN
  SELECT count(*) INTO f FROM results WHERE NOT ok;
  RAISE NOTICE 'ex_staff_access: % passed, % failed', (SELECT count(*) FROM results WHERE ok), f;
  IF f > 0 THEN RAISE EXCEPTION '% teste(s) falharam', f; END IF;
END $$;
