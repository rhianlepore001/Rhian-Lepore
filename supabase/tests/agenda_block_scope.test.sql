-- Testes de 20261007140000_agenda_block_scope. Uso: scripts/test-sql-agenda-block-scope.sh
-- Chama as funções REAIS de prod (create_agenda_block / delete_agenda_block, md5 conferido
-- pelo script) como role authenticated, igual ao PostgREST.
\set ON_ERROR_STOP on
\set QUIET on

CREATE TEMP TABLE results (name text, got text, expected text);
CREATE FUNCTION pg_temp.check(p_name text, p_got text, p_expected text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_name, p_got, p_expected);
$$;
GRANT ALL ON TABLE results TO authenticated, anon;

CREATE FUNCTION pg_temp.run_as(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', true);
    RETURN v;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', true);
    RETURN 'error:' || SQLERRM;
  END;
END $$;

-- Horário local do negócio (Europe/Lisbon), n dias à frente.
CREATE FUNCTION pg_temp.at(p_days int, p_hm text) RETURNS timestamptz LANGUAGE sql AS $$
  SELECT ((current_date + p_days)::text || ' ' || p_hm)::timestamp AT TIME ZONE 'Europe/Lisbon'
$$;

-- create_agenda_block como authenticated → 'ok' ou o code.
CREATE FUNCTION pg_temp.blk(p_uid text, p_pro text, p_from timestamptz, p_to timestamptz) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.run_as('authenticated', p_uid, format(
    $q$SELECT CASE WHEN (r->>'success')::boolean THEN 'ok' ELSE r->>'code' END
         FROM (SELECT public.create_agenda_block(%L::uuid, %L::timestamptz, %L::timestamptz, false, NULL::uuid[]) AS r) x$q$,
    p_pro, p_from, p_to))
$$;

-- delete_agenda_block como authenticated → 'ok' ou o code.
CREATE FUNCTION pg_temp.unblk(p_uid text, p_block uuid) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.run_as('authenticated', p_uid, format(
    $q$SELECT CASE WHEN (r->>'success')::boolean THEN 'ok' ELSE r->>'code' END
         FROM (SELECT public.delete_agenda_block(%L::uuid) AS r) x$q$, p_block))
$$;

-- Bloqueio gravado direto (ex.: criado antes pelo dono).
CREATE FUNCTION pg_temp.raw_block(p_company text, p_pro text, p_from timestamptz, p_to timestamptz, p_by text) RETURNS uuid LANGUAGE sql AS $$
  INSERT INTO public.agenda_blocks (user_id, professional_id, starts_at, ends_at, created_by)
  VALUES (p_company, p_pro::uuid, p_from, p_to, p_by::uuid) RETURNING id
$$;

CREATE FUNCTION pg_temp.set_scope(p_company text, p_scope text) RETURNS void LANGUAGE sql AS $$
  UPDATE public.business_settings SET staff_agenda_block_scope = p_scope WHERE user_id = p_company
$$;

CREATE FUNCTION pg_temp.exists_block(p_id uuid) RETURNS text LANGUAGE sql AS $$
  SELECT (EXISTS (SELECT 1 FROM public.agenda_blocks WHERE id = p_id))::text
$$;

\set A '00000000-0000-0000-0000-0000000000a0'
\set S1 '00000000-0000-0000-0000-0000000000a1'
\set S2 '00000000-0000-0000-0000-0000000000a2'
\set S3 '00000000-0000-0000-0000-0000000000a3'
\set B '00000000-0000-0000-0000-0000000000b0'
\set C '00000000-0000-0000-0000-0000000000c0'
\set C1 '00000000-0000-0000-0000-0000000000c1'
\set E '00000000-0000-0000-0000-0000000000e0'
\set E1 '00000000-0000-0000-0000-0000000000e1'
\set PA0 'a0000000-0000-0000-0000-0000000000f0'
\set P1 'a0000000-0000-0000-0000-0000000000f1'
\set P2 'a0000000-0000-0000-0000-0000000000f2'
\set P3 'a0000000-0000-0000-0000-0000000000f3'
\set P4 'a0000000-0000-0000-0000-0000000000f4'
\set P5 'a0000000-0000-0000-0000-0000000000f5'
\set PB 'b0000000-0000-0000-0000-0000000000f0'
\set PC1 'c0000000-0000-0000-0000-0000000000f1'
\set PE0 'e0000000-0000-0000-0000-0000000000f0'
\set PE1 'e0000000-0000-0000-0000-0000000000f1'

-- ---------------------------------------------------------------------------
-- 1. Coluna, CHECK, padrão e backfill
-- ---------------------------------------------------------------------------
SELECT pg_temp.check('1 coluna NOT NULL DEFAULT own',
  (SELECT is_nullable || ' ' || column_default FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_settings' AND column_name = 'staff_agenda_block_scope'),
  'NO ''own''::text');
SELECT pg_temp.check('1 backfill booleano true -> own (A)',
  (SELECT staff_agenda_block_scope FROM business_settings WHERE user_id = :'A'), 'own');
SELECT pg_temp.check('1 backfill booleano true -> own (B)',
  (SELECT staff_agenda_block_scope FROM business_settings WHERE user_id = :'B'), 'own');
SELECT pg_temp.check('1 backfill booleano false -> none (C)',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = :'C'), 'none/false');
DO $$
BEGIN
  UPDATE public.business_settings SET staff_agenda_block_scope = 'tudo' WHERE user_id = '00000000-0000-0000-0000-0000000000b0';
  INSERT INTO results VALUES ('1 CHECK recusa valor fora de none/own/all', 'aceitou', 'check_violation');
EXCEPTION WHEN check_violation THEN
  INSERT INTO results VALUES ('1 CHECK recusa valor fora de none/own/all', 'check_violation', 'check_violation');
END $$;

-- Negócio sem linha (E) → own: staff bloqueia a própria coluna, não a do dono.
SELECT pg_temp.check('1 sem linha: staff cria na própria (own)',
  pg_temp.blk(:'E1', :'PE1', pg_temp.at(20, '10:00'), pg_temp.at(20, '11:00')), 'ok');
SELECT pg_temp.check('1 sem linha: staff não cria na do dono',
  pg_temp.blk(:'E1', :'PE0', pg_temp.at(20, '10:00'), pg_temp.at(20, '11:00')), 'forbidden');
SELECT pg_temp.check('1 sem linha: continua sem linha (nada criado)',
  (SELECT count(*)::text FROM business_settings WHERE user_id = :'E'), '0');

-- ---------------------------------------------------------------------------
-- 2. none: nada na própria coluna nem em outras; nada gravado/apagado
-- ---------------------------------------------------------------------------
SELECT pg_temp.set_scope(:'A', 'none');
CREATE TEMP TABLE ids AS SELECT
  pg_temp.raw_block(:'A', :'P2', pg_temp.at(21, '09:00'), pg_temp.at(21, '10:00'), :'A') AS own_by_owner,
  pg_temp.raw_block(:'A', :'P1', pg_temp.at(21, '09:00'), pg_temp.at(21, '10:00'), :'A') AS other_by_owner;
GRANT SELECT ON ids TO authenticated;
SELECT pg_temp.check('2 none: criar na própria = forbidden',
  pg_temp.blk(:'S1', :'P2', pg_temp.at(22, '10:00'), pg_temp.at(22, '11:00')), 'forbidden');
SELECT pg_temp.check('2 none: criar na de outro = forbidden',
  pg_temp.blk(:'S1', :'P1', pg_temp.at(22, '10:00'), pg_temp.at(22, '11:00')), 'forbidden');
SELECT pg_temp.check('2 none: remover da própria = forbidden',
  pg_temp.unblk(:'S1', (SELECT own_by_owner FROM ids)), 'forbidden');
SELECT pg_temp.check('2 none: remover de outro = forbidden',
  pg_temp.unblk(:'S1', (SELECT other_by_owner FROM ids)), 'forbidden');
SELECT pg_temp.check('2 none: nada gravado nem apagado',
  (SELECT count(*)::text FROM agenda_blocks WHERE user_id = :'A'), '2');

-- ---------------------------------------------------------------------------
-- 3. own: própria coluna (3 tipos de período); outra coluna não; bloqueio do dono na própria sai
-- ---------------------------------------------------------------------------
SELECT pg_temp.set_scope(:'A', 'own');
SELECT pg_temp.check('3 own: período no dia na própria',
  pg_temp.blk(:'S1', :'P2', pg_temp.at(23, '10:00'), pg_temp.at(23, '11:30')), 'ok');
SELECT pg_temp.check('3 own: dia inteiro na própria',
  pg_temp.blk(:'S1', :'P2', pg_temp.at(24, '00:00'), pg_temp.at(25, '00:00')), 'ok');
SELECT pg_temp.check('3 own: vários dias na própria',
  pg_temp.blk(:'S1', :'P2', pg_temp.at(26, '00:00'), pg_temp.at(29, '00:00')), 'ok');
SELECT pg_temp.check('3 own: criar na de outro = forbidden',
  pg_temp.blk(:'S1', :'P1', pg_temp.at(23, '10:00'), pg_temp.at(23, '11:00')), 'forbidden');
SELECT pg_temp.check('3 own: criar na do dono = forbidden',
  pg_temp.blk(:'S1', :'PA0', pg_temp.at(23, '10:00'), pg_temp.at(23, '11:00')), 'forbidden');
SELECT pg_temp.check('3 own: remover de outro = forbidden',
  pg_temp.unblk(:'S1', (SELECT other_by_owner FROM ids)), 'forbidden');
SELECT pg_temp.check('3 own: bloqueio de outro continua',
  pg_temp.exists_block((SELECT other_by_owner FROM ids)), 'true');
SELECT pg_temp.check('3 own: remover bloqueio do dono na própria coluna (como hoje)',
  pg_temp.unblk(:'S1', (SELECT own_by_owner FROM ids)), 'ok');
SELECT pg_temp.check('3 own: removido de fato',
  pg_temp.exists_block((SELECT own_by_owner FROM ids)), 'false');
SELECT pg_temp.check('3 own: remover bloqueio próprio',
  pg_temp.unblk(:'S1', (SELECT id FROM agenda_blocks WHERE professional_id = :'P2' AND starts_at = pg_temp.at(23, '10:00'))), 'ok');

-- ---------------------------------------------------------------------------
-- 4. all: qualquer coluna ativa do negócio (inclusive a do dono); fora do negócio / inativo não
-- ---------------------------------------------------------------------------
SELECT pg_temp.set_scope(:'A', 'all');
SELECT pg_temp.check('4 all: criar na de outro',
  pg_temp.blk(:'S1', :'P1', pg_temp.at(30, '10:00'), pg_temp.at(30, '11:00')), 'ok');
SELECT pg_temp.check('4 all: criar na do dono',
  pg_temp.blk(:'S1', :'PA0', pg_temp.at(30, '10:00'), pg_temp.at(30, '11:00')), 'ok');
SELECT pg_temp.check('4 all: dia inteiro na de outro',
  pg_temp.blk(:'S1', :'P1', pg_temp.at(31, '00:00'), pg_temp.at(32, '00:00')), 'ok');
SELECT pg_temp.check('4 all: criar na própria',
  pg_temp.blk(:'S1', :'P2', pg_temp.at(30, '10:00'), pg_temp.at(30, '11:00')), 'ok');
SELECT pg_temp.check('4 all: remover de outro (criado pelo dono)',
  pg_temp.unblk(:'S1', (SELECT other_by_owner FROM ids)), 'ok');
SELECT pg_temp.check('4 all: remover do dono',
  pg_temp.unblk(:'S1', (SELECT id FROM agenda_blocks WHERE professional_id = :'PA0' AND starts_at = pg_temp.at(30, '10:00'))), 'ok');
SELECT pg_temp.check('4 all: profissional de outro negócio = forbidden',
  pg_temp.blk(:'S1', :'PB', pg_temp.at(30, '12:00'), pg_temp.at(30, '13:00')), 'forbidden');
SELECT pg_temp.check('4 all: profissional inativo = forbidden',
  pg_temp.blk(:'S1', :'P5', pg_temp.at(30, '12:00'), pg_temp.at(30, '13:00')), 'forbidden');
SELECT pg_temp.check('4 all: profissional excluído = forbidden',
  pg_temp.blk(:'S1', :'P3', pg_temp.at(30, '12:00'), pg_temp.at(30, '13:00')), 'forbidden');
-- delete_agenda_block devolve success para id que não é do negócio (não revela), mas não apaga.
CREATE TEMP TABLE idb AS SELECT pg_temp.raw_block(:'B', :'PB', pg_temp.at(30, '12:00'), pg_temp.at(30, '13:00'), :'B') AS id;
GRANT SELECT ON idb TO authenticated;
SELECT pg_temp.check('4 all: remover bloqueio de outro negócio (resposta)',
  pg_temp.unblk(:'S1', (SELECT id FROM idb)), 'ok');
SELECT pg_temp.check('4 all: bloqueio de outro negócio não foi apagado',
  pg_temp.exists_block((SELECT id FROM idb)), 'true');

-- ---------------------------------------------------------------------------
-- 5. Dono sempre pode, em qualquer opção
-- ---------------------------------------------------------------------------
SELECT pg_temp.set_scope(:'A', 'none');
SELECT pg_temp.check('5 dono (none): cria na coluna do staff',
  pg_temp.blk(:'A', :'P2', pg_temp.at(33, '10:00'), pg_temp.at(33, '11:00')), 'ok');
SELECT pg_temp.check('5 dono (none): cria na própria',
  pg_temp.blk(:'A', :'PA0', pg_temp.at(33, '10:00'), pg_temp.at(33, '11:00')), 'ok');
SELECT pg_temp.check('5 dono (none): remove',
  pg_temp.unblk(:'A', (SELECT id FROM agenda_blocks WHERE professional_id = :'P2' AND starts_at = pg_temp.at(33, '10:00'))), 'ok');
SELECT pg_temp.set_scope(:'A', 'own');
SELECT pg_temp.check('5 dono (own): cria em P1',
  pg_temp.blk(:'A', :'P1', pg_temp.at(33, '12:00'), pg_temp.at(33, '13:00')), 'ok');
SELECT pg_temp.set_scope(:'A', 'all');
SELECT pg_temp.check('5 dono (all): remove de P1',
  pg_temp.unblk(:'A', (SELECT id FROM agenda_blocks WHERE professional_id = :'P1' AND starts_at = pg_temp.at(33, '12:00'))), 'ok');
SELECT pg_temp.check('5 dono não bloqueia outro negócio',
  pg_temp.blk(:'A', :'PB', pg_temp.at(33, '12:00'), pg_temp.at(33, '13:00')), 'forbidden');

-- ---------------------------------------------------------------------------
-- 6. Colaborador excluído (login vivo) ou inativo → forbidden em qualquer opção
-- ---------------------------------------------------------------------------
SELECT pg_temp.set_scope(:'A', 'all');
SELECT pg_temp.check('6 all: ex-staff (excluído, login vivo) não cria',
  pg_temp.blk(:'S2', :'P1', pg_temp.at(34, '10:00'), pg_temp.at(34, '11:00')), 'forbidden');
SELECT pg_temp.check('6 all: ex-staff não remove',
  pg_temp.unblk(:'S2', pg_temp.raw_block(:'A', :'P1', pg_temp.at(34, '12:00'), pg_temp.at(34, '13:00'), :'A')), 'forbidden');
SELECT pg_temp.check('6 all: staff inativo não cria',
  pg_temp.blk(:'S3', :'P1', pg_temp.at(34, '14:00'), pg_temp.at(34, '15:00')), 'forbidden');
SELECT pg_temp.set_scope(:'A', 'own');
SELECT pg_temp.check('6 own: ex-staff não cria',
  pg_temp.blk(:'S2', :'P3', pg_temp.at(34, '14:00'), pg_temp.at(34, '15:00')), 'forbidden');
SELECT pg_temp.check('6 own: staff inativo não remove bloqueio da própria coluna',
  pg_temp.unblk(:'S3', pg_temp.raw_block(:'A', :'P4', pg_temp.at(34, '16:00'), pg_temp.at(34, '17:00'), :'A')), 'forbidden');
SELECT pg_temp.check('6 staff do negócio C (booleano false = none) não cria',
  pg_temp.blk(:'C1', :'PC1', pg_temp.at(34, '10:00'), pg_temp.at(34, '11:00')), 'forbidden');

-- ---------------------------------------------------------------------------
-- 7. Trocar a opção não mexe nos bloqueios existentes
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE snap AS SELECT md5(string_agg(id::text || starts_at::text || ends_at::text, ',' ORDER BY id)) AS h FROM agenda_blocks;
SELECT pg_temp.set_scope(:'A', 'none');
SELECT pg_temp.set_scope(:'A', 'all');
SELECT pg_temp.set_scope(:'A', 'own');
UPDATE business_settings SET staff_can_block_agenda = false WHERE user_id = :'A';
UPDATE business_settings SET staff_can_block_agenda = true WHERE user_id = :'A';
SELECT pg_temp.check('7 bloqueios intactos após trocar a opção',
  ((SELECT md5(string_agg(id::text || starts_at::text || ends_at::text, ',' ORDER BY id)) FROM agenda_blocks) = (SELECT h FROM snap))::text, 'true');

-- ---------------------------------------------------------------------------
-- 8. Compatibilidade com staff_can_block_agenda (front antigo) — trigger de sincronia
-- ---------------------------------------------------------------------------
SELECT pg_temp.set_scope(:'B', 'own');
UPDATE business_settings SET staff_can_block_agenda = false WHERE user_id = :'B';
SELECT pg_temp.check('8 booleano false -> none',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = :'B'), 'none/false');
UPDATE business_settings SET staff_can_block_agenda = true WHERE user_id = :'B';
SELECT pg_temp.check('8 booleano true (vindo de none) -> own',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = :'B'), 'own/true');
SELECT pg_temp.set_scope(:'B', 'all');
SELECT pg_temp.check('8 scope all -> booleano true',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = :'B'), 'all/true');
UPDATE business_settings SET staff_can_block_agenda = true WHERE user_id = :'B';
SELECT pg_temp.check('8 booleano true com all -> all preservado',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = :'B'), 'all/true');
UPDATE business_settings SET staff_can_block_agenda = false WHERE user_id = :'B';
SELECT pg_temp.check('8 booleano false com all -> none',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = :'B'), 'none/false');
SELECT pg_temp.set_scope(:'B', 'own');
SELECT pg_temp.check('8 scope own -> booleano true',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = :'B'), 'own/true');
SELECT pg_temp.set_scope(:'B', 'none');
SELECT pg_temp.check('8 scope none -> booleano false',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = :'B'), 'none/false');
UPDATE business_settings SET staff_agenda_block_scope = 'all', staff_can_block_agenda = false WHERE user_id = :'B';
SELECT pg_temp.check('8 os dois mudam juntos: scope vence',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = :'B'), 'all/true');
-- Upsert do PostgREST (INSERT ... ON CONFLICT DO UPDATE SET <só as colunas enviadas>)
INSERT INTO business_settings (user_id, staff_can_block_agenda) VALUES (:'B', true)
  ON CONFLICT (user_id) DO UPDATE SET staff_can_block_agenda = EXCLUDED.staff_can_block_agenda;
SELECT pg_temp.check('8 upsert antigo (booleano true) com all -> all preservado',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = :'B'), 'all/true');
INSERT INTO business_settings (user_id, staff_can_block_agenda) VALUES (:'B', false)
  ON CONFLICT (user_id) DO UPDATE SET staff_can_block_agenda = EXCLUDED.staff_can_block_agenda;
SELECT pg_temp.check('8 upsert antigo (booleano false) -> none',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = :'B'), 'none/false');
INSERT INTO business_settings (user_id, staff_agenda_block_scope) VALUES (:'B', 'own')
  ON CONFLICT (user_id) DO UPDATE SET staff_agenda_block_scope = EXCLUDED.staff_agenda_block_scope;
SELECT pg_temp.check('8 upsert novo (scope own) -> booleano true',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = :'B'), 'own/true');
-- INSERT de linha nova
INSERT INTO profiles (id, role) VALUES ('00000000-0000-0000-0000-0000000000d0', 'owner'), ('00000000-0000-0000-0000-0000000000d1', 'owner'), ('00000000-0000-0000-0000-0000000000d2', 'owner');
INSERT INTO business_settings (user_id, staff_can_block_agenda) VALUES ('00000000-0000-0000-0000-0000000000d0', false);
INSERT INTO business_settings (user_id, staff_agenda_block_scope) VALUES ('00000000-0000-0000-0000-0000000000d1', 'none');
INSERT INTO business_settings (user_id) VALUES ('00000000-0000-0000-0000-0000000000d2');
SELECT pg_temp.check('8 insert só booleano false -> none',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = '00000000-0000-0000-0000-0000000000d0'), 'none/false');
SELECT pg_temp.check('8 insert só scope none -> booleano false',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = '00000000-0000-0000-0000-0000000000d1'), 'none/false');
SELECT pg_temp.check('8 insert padrão -> own/true',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = '00000000-0000-0000-0000-0000000000d2'), 'own/true');
UPDATE business_settings SET timezone = 'Europe/Lisbon' WHERE user_id = :'B';
SELECT pg_temp.check('8 update de outra coluna não mexe no scope',
  (SELECT staff_agenda_block_scope || '/' || staff_can_block_agenda FROM business_settings WHERE user_id = :'B'), 'own/true');

-- ---------------------------------------------------------------------------
-- 9. Só o dono grava (RLS de prod)
-- ---------------------------------------------------------------------------
SELECT pg_temp.set_scope(:'A', 'own');
SELECT pg_temp.check('9 staff UPDATE do scope: 0 linhas',
  pg_temp.run_as('authenticated', :'S1', format($q$WITH u AS (UPDATE public.business_settings SET staff_agenda_block_scope = 'all' WHERE user_id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, :'A')), '0');
SELECT pg_temp.check('9 staff upsert do scope: recusado',
  left(pg_temp.run_as('authenticated', :'S1', format($q$INSERT INTO public.business_settings (user_id, staff_agenda_block_scope) VALUES (%L, 'all') ON CONFLICT (user_id) DO UPDATE SET staff_agenda_block_scope = EXCLUDED.staff_agenda_block_scope RETURNING staff_agenda_block_scope$q$, :'A')), 6), 'error:');
SELECT pg_temp.check('9 anon UPDATE do scope: 0 linhas',
  pg_temp.run_as('anon', NULL, format($q$WITH u AS (UPDATE public.business_settings SET staff_agenda_block_scope = 'all' WHERE user_id = %L RETURNING 1) SELECT count(*)::text FROM u$q$, :'A')), '0');
SELECT pg_temp.check('9 continua own',
  (SELECT staff_agenda_block_scope FROM business_settings WHERE user_id = :'A'), 'own');
SELECT pg_temp.check('9 dono grava (upsert do front)',
  pg_temp.run_as('authenticated', :'A', format($q$INSERT INTO public.business_settings (user_id, staff_agenda_block_scope) VALUES (%L, 'all') ON CONFLICT (user_id) DO UPDATE SET staff_agenda_block_scope = EXCLUDED.staff_agenda_block_scope RETURNING staff_agenda_block_scope || '/' || staff_can_block_agenda$q$, :'A')), 'all/true');
SELECT pg_temp.check('9 staff lê o scope (company read)',
  pg_temp.run_as('authenticated', :'S1', format($q$SELECT staff_agenda_block_scope FROM public.business_settings WHERE user_id = %L$q$, :'A')), 'all');

-- ---------------------------------------------------------------------------
-- 10. Metadados das funções
-- ---------------------------------------------------------------------------
SELECT pg_temp.check('10 staff_can_manage_agenda_block: ACL/definer/stable/search_path/dono',
  (SELECT proacl::text || ' ' || prosecdef || ' ' || provolatile::text || ' ' || array_to_string(proconfig, ',') || ' ' || pg_get_userbyid(proowner)
     FROM pg_proc WHERE oid = 'public.staff_can_manage_agenda_block(uuid)'::regprocedure),
  '{postgres=X/postgres,service_role=X/postgres} true s search_path=public postgres');
SELECT pg_temp.check('10 trigger de sincronia: sem EXECUTE para anon/authenticated',
  COALESCE((SELECT (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))::text
              FROM pg_proc p WHERE p.oid = to_regprocedure('public.sync_staff_agenda_block_scope()')), 'função ausente'), 'false');
SELECT pg_temp.check('10 trigger de sincronia: SECURITY INVOKER',
  COALESCE((SELECT prosecdef::text FROM pg_proc WHERE oid = to_regprocedure('public.sync_staff_agenda_block_scope()')), 'função ausente'), 'false');
SELECT pg_temp.check('10 authenticated continua sem INSERT direto em agenda_blocks',
  has_table_privilege('authenticated', 'public.agenda_blocks', 'INSERT')::text, 'false');

-- Relatório
SELECT name, got, expected,
       CASE WHEN got IS NOT DISTINCT FROM expected THEN 'ok' ELSE 'FAIL' END AS status
FROM results
ORDER BY name;

DO $$
DECLARE n int; f int;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE got IS DISTINCT FROM expected) INTO n, f FROM results;
  RAISE NOTICE 'agenda_block_scope: % checks, % FAIL', n, f;
  IF f > 0 THEN
    RAISE EXCEPTION 'agenda_block_scope tests failed (% de %)', f, n;
  END IF;
END $$;
