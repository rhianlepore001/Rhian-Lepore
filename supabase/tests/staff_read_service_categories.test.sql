-- Testes: equipe lê categorias da própria empresa (rodar após harness + migration).
\set ON_ERROR_STOP on
\set QUIET on

CREATE OR REPLACE FUNCTION pg_temp.as_user(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n int; r text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), true);
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

CREATE OR REPLACE FUNCTION pg_temp.names_as(p_uid text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), true);
  SET LOCAL ROLE authenticated;
  SELECT string_agg(name, ',' ORDER BY display_order) INTO r FROM public.service_categories;
  RESET ROLE;
  RETURN COALESCE(r, '');
END $$;

CREATE TEMP TABLE results (name text, ok boolean, got text);
GRANT ALL ON results TO PUBLIC;

BEGIN;
INSERT INTO results SELECT 'staff A lê as categorias da empresa A', g = 'Cortes,Barba,Combos', g FROM (SELECT pg_temp.names_as('00000000-0000-0000-0000-0000000000a1') g) s;
INSERT INTO results SELECT 'dono A continua lendo só as suas', g = 'Cortes,Barba,Combos', g FROM (SELECT pg_temp.names_as('00000000-0000-0000-0000-0000000000a0') g) s;
INSERT INTO results SELECT 'staff B não vê categorias da empresa A', g = 'Outra loja', g FROM (SELECT pg_temp.names_as('00000000-0000-0000-0000-0000000000b1') g) s;
INSERT INTO results SELECT 'usuário sem perfil não vê nada', g = '', g FROM (SELECT pg_temp.names_as('00000000-0000-0000-0000-0000000000ff') g) s;
INSERT INTO results SELECT 'anon não vê nada', g = 'ok:0', g FROM (SELECT pg_temp.as_user('anon', NULL, 'SELECT * FROM public.service_categories') g) s;
INSERT INTO results SELECT 'staff A não cria categoria na empresa A', g <> 'ok:1', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a1', $q$INSERT INTO public.service_categories (user_id, name) VALUES ('00000000-0000-0000-0000-0000000000a0', 'x')$q$) g) s;
INSERT INTO results SELECT 'staff A não renomeia categoria', g = 'ok:0', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a1', $q$UPDATE public.service_categories SET name = 'hack'$q$) g) s;
INSERT INTO results SELECT 'staff A não apaga categoria', g = 'ok:0', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a1', $q$DELETE FROM public.service_categories$q$) g) s;
INSERT INTO results SELECT 'dono A ainda gerencia (update)', g = 'ok:3', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', $q$UPDATE public.service_categories SET display_order = display_order$q$) g) s;
INSERT INTO results SELECT 'policies existentes intactas (2 de prod + 1 nova)', g = '3', g FROM (SELECT count(*)::text g FROM pg_policies WHERE tablename = 'service_categories') s;
COMMIT;

\set QUIET off
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS status, name, got FROM results;
DO $$ DECLARE f int; BEGIN
  SELECT count(*) INTO f FROM results WHERE NOT ok;
  RAISE NOTICE 'staff_read_service_categories: % passed, % failed', (SELECT count(*) FROM results WHERE ok), f;
  IF f > 0 THEN RAISE EXCEPTION '% teste(s) falharam', f; END IF;
END $$;
