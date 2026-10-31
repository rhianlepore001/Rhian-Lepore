-- Testes de 20261031120000_signup_attribution (rodar via scripts/test-sql-signup-attribution.sh). Ids 0a000000-.
BEGIN;
CREATE TEMP TABLE results (n int, name text, ok boolean, got text, expected text);
CREATE FUNCTION pg_temp.chk(p_n int, p_name text, p_got text, p_exp text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_n, p_name, p_got IS NOT DISTINCT FROM p_exp, p_got, p_exp);
$$;
CREATE FUNCTION pg_temp.run_as(p_role text, p_uid uuid, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid::text, ''), true);
  PERFORM set_config('request.jwt.claims', CASE WHEN p_uid IS NULL THEN '' ELSE json_build_object('sub', p_uid, 'role', p_role)::text END, true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
  EXCEPTION WHEN OTHERS THEN
    v := 'error:' || SQLERRM;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
  RETURN v;
END $$;

SET LOCAL session_replication_role = replica; -- só no setup: sem triggers de signup
INSERT INTO auth.users (id, email) VALUES
  ('0a000000-0000-4000-8000-000000000001', 'dono@exemplo.com'),
  ('0a000000-0000-4000-8000-000000000002', 'equipe@exemplo.com'),
  ('0a000000-0000-4000-8000-000000000003', 'semperfil@exemplo.com');
INSERT INTO public.profiles (id, role, company_id) VALUES
  ('0a000000-0000-4000-8000-000000000001', 'owner', '0a000000-0000-4000-8000-000000000001'),
  ('0a000000-0000-4000-8000-000000000002', 'staff', '0a000000-0000-4000-8000-000000000001');

SET LOCAL session_replication_role = origin;

-- 1 dono grava a própria origem
SELECT pg_temp.chk(1, 'dono grava', pg_temp.run_as('authenticated', '0a000000-0000-4000-8000-000000000001',
  $q$SELECT public.save_signup_attribution('instagram','paid','lancamento','reels1','barbearia','fbabc','https://l.instagram.com/','/register','Mozilla/5.0', now() - interval '1 day')$q$), 'saved');
SELECT pg_temp.chk(2, 'linha completa', (SELECT utm_source||'|'||utm_medium||'|'||utm_campaign||'|'||utm_content||'|'||utm_term||'|'||fbclid||'|'||referrer||'|'||landing_path||'|'||user_agent||'|'||company_id FROM public.signup_attribution WHERE user_id = '0a000000-0000-4000-8000-000000000001'),
  'instagram|paid|lancamento|reels1|barbearia|fbabc|https://l.instagram.com/|/register|Mozilla/5.0|0a000000-0000-4000-8000-000000000001');
-- 3 primeira origem vale (não sobrescreve)
SELECT pg_temp.chk(3, 'segunda chamada nao sobrescreve', pg_temp.run_as('authenticated', '0a000000-0000-4000-8000-000000000001',
  $q$SELECT public.save_signup_attribution('google','cpc')$q$), 'exists');
SELECT pg_temp.chk(4, 'continua instagram', (SELECT utm_source FROM public.signup_attribution WHERE user_id = '0a000000-0000-4000-8000-000000000001'), 'instagram');
-- 5 equipe e sem perfil não gravam
SELECT pg_temp.chk(5, 'equipe nao grava', pg_temp.run_as('authenticated', '0a000000-0000-4000-8000-000000000002', $q$SELECT public.save_signup_attribution('x')$q$), 'no_owner_profile');
SELECT pg_temp.chk(6, 'sem perfil nao grava', pg_temp.run_as('authenticated', '0a000000-0000-4000-8000-000000000003', $q$SELECT public.save_signup_attribution('x')$q$), 'no_owner_profile');
-- 7 anon não executa; 8 sem sessão em service_role = no_session
SELECT pg_temp.chk(7, 'anon sem permissao', (pg_temp.run_as('anon', NULL, $q$SELECT public.save_signup_attribution('x')$q$) LIKE 'error:permission denied%')::text, 'true');
SELECT pg_temp.chk(8, 'sem sessao', pg_temp.run_as('service_role', NULL, $q$SELECT public.save_signup_attribution('x')$q$), 'no_session');
-- 9/10 RLS fechada: ninguém lê nem escreve direto
SELECT pg_temp.chk(9, 'authenticated nao le', (pg_temp.run_as('authenticated', '0a000000-0000-4000-8000-000000000001', $q$SELECT count(*)::text FROM public.signup_attribution$q$) LIKE 'error:permission denied%')::text, 'true');
SELECT pg_temp.chk(10, 'anon nao le', (pg_temp.run_as('anon', NULL, $q$SELECT count(*)::text FROM public.signup_attribution$q$) LIKE 'error:permission denied%')::text, 'true');
SELECT pg_temp.chk(11, 'authenticated nao insere', (pg_temp.run_as('authenticated', '0a000000-0000-4000-8000-000000000001',
  $q$INSERT INTO public.signup_attribution (user_id) VALUES ('0a000000-0000-4000-8000-000000000003') RETURNING user_id::text$q$) LIKE 'error:permission denied%')::text, 'true');
SELECT pg_temp.chk(12, 'service_role le', pg_temp.run_as('service_role', NULL, $q$SELECT count(*)::text FROM public.signup_attribution$q$), '1');
-- 13 truncamento e data fora da janela
DELETE FROM public.signup_attribution;
SELECT pg_temp.chk(13, 'regrava apos limpar', pg_temp.run_as('authenticated', '0a000000-0000-4000-8000-000000000001',
  format($q$SELECT public.save_signup_attribution(%L, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, now() + interval '30 days')$q$, repeat('a', 500))), 'saved');
SELECT pg_temp.chk(14, 'utm_source truncado em 100', (SELECT char_length(utm_source)::text FROM public.signup_attribution), '100');
SELECT pg_temp.chk(15, 'data futura descartada', (SELECT (first_seen_at IS NULL)::text FROM public.signup_attribution), 'true');
-- 17 apagar usuário apaga a origem (LGPD)
DELETE FROM auth.users WHERE id = '0a000000-0000-4000-8000-000000000001';
SELECT pg_temp.chk(16, 'cascade ao apagar usuario', (SELECT count(*)::text FROM public.signup_attribution), '0');
-- 18 funcao nao e executavel por PUBLIC
SELECT pg_temp.chk(17, 'public sem execute', has_function_privilege('anon', 'public.save_signup_attribution(text,text,text,text,text,text,text,text,text,timestamptz)', 'EXECUTE')::text, 'false');

SELECT CASE WHEN ok THEN n || ' ok ' || name ELSE n || ' FAIL ' || name || ' got=' || COALESCE(got,'NULL') || ' expected=' || COALESCE(expected,'NULL') END FROM results ORDER BY n;
ROLLBACK;
