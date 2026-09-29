-- Testes de 20260929110000_commissions_owner_only (rodar via scripts/test-sql-commissions-owner-only.sh).
-- Cada bloco imprime PASS ou aborta com FAIL (ON_ERROR_STOP).
\set A0 '00000000-0000-0000-0000-0000000000a0'
\set A1 '00000000-0000-0000-0000-0000000000a1'
\set A2 '00000000-0000-0000-0000-0000000000a2'
\set B0 '00000000-0000-0000-0000-0000000000b0'

CREATE OR REPLACE FUNCTION public._t_expect_denied(p_sql text, p_label text) RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN insufficient_privilege THEN
    RETURN 'PASS ' || p_label || ': 42501';
  END;
  RAISE EXCEPTION 'FAIL %: não negou (colaborador leu comissões da equipe)', p_label;
END $$;
GRANT EXECUTE ON FUNCTION public._t_expect_denied(text, text) TO authenticated;

-- 1) Dono A continua vendo a equipe dele (sem mudança de resultado)
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'A0', false) AS _sub \gset
DO $$
DECLARE n int; ana numeric; bruno numeric; d json; s json;
BEGIN
  SELECT count(*), max(total_due) FILTER (WHERE professional_name = 'Ana'), max(total_due) FILTER (WHERE professional_name = 'Bruno')
    INTO n, ana, bruno FROM public.get_commissions_due();
  IF n <> 3 OR ana <> 32 OR bruno <> 50 THEN RAISE EXCEPTION 'FAIL dono A get_commissions_due: n=% ana=% bruno=%', n, ana, bruno; END IF;
  d := public.get_professional_commission_details(NULL, '10000000-0000-0000-0000-0000000000a3', current_date - 1, current_date + 1);
  IF (d->'summary'->>'total_commission_due')::numeric <> 50 OR json_array_length(d->'records') <> 1 THEN RAISE EXCEPTION 'FAIL dono A details: %', d; END IF;
  s := public.get_professional_finance_summary(NULL, '10000000-0000-0000-0000-0000000000a3', current_date - 1, current_date + 1);
  IF (s->>'total_due')::numeric <> 50 THEN RAISE EXCEPTION 'FAIL dono A summary: %', s; END IF;
  RAISE NOTICE 'PASS dono A: 3 colaboradores ativos, Ana 32, Bruno 50; detalhes e resumo iguais';
END $$;

-- 2) Dono B só vê a própria empresa
SELECT set_config('request.jwt.claim.sub', :'B0', false) AS _sub \gset
DO $$
DECLARE n int; t numeric;
BEGIN
  SELECT count(*), sum(total_due) INTO n, t FROM public.get_commissions_due();
  IF n <> 1 OR t <> 27 THEN RAISE EXCEPTION 'FAIL dono B: n=% total=%', n, t; END IF;
  RAISE NOTICE 'PASS dono B: só a própria equipe (1 linha, 27)';
END $$;

-- 3) Colaborador ativo A1: as 3 RPCs negam
SELECT set_config('request.jwt.claim.sub', :'A1', false) AS _sub \gset
SELECT public._t_expect_denied('SELECT count(*) FROM public.get_commissions_due()', 'staff get_commissions_due');
SELECT public._t_expect_denied($q$SELECT public.get_professional_commission_details(NULL, '10000000-0000-0000-0000-0000000000a3', current_date - 1, current_date + 1)$q$, 'staff details de colega');
SELECT public._t_expect_denied($q$SELECT public.get_professional_commission_details(NULL, '10000000-0000-0000-0000-0000000000a1', current_date - 1, current_date + 1)$q$, 'staff details próprio');
SELECT public._t_expect_denied($q$SELECT public.get_professional_finance_summary(NULL, '10000000-0000-0000-0000-0000000000a3', current_date - 1, current_date + 1)$q$, 'staff summary de colega');

-- 4) Ex-colaborador A2 (vínculo excluído, profiles.company_id ainda setado): nega
SELECT set_config('request.jwt.claim.sub', :'A2', false) AS _sub \gset
SELECT public._t_expect_denied('SELECT count(*) FROM public.get_commissions_due()', 'ex-staff get_commissions_due');
SELECT public._t_expect_denied($q$SELECT public.get_professional_finance_summary(NULL, '10000000-0000-0000-0000-0000000000a3', NULL, NULL)$q$, 'ex-staff summary');

-- 5) Sessão sem usuário: nega (como antes)
SELECT set_config('request.jwt.claim.sub', '', false) AS _sub \gset
SELECT public._t_expect_denied('SELECT count(*) FROM public.get_commissions_due()', 'sem login get_commissions_due');
RESET ROLE;

-- 6) Grants e configuração
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS f, p.prosecdef, p.proconfig FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace
             AND p.proname IN ('get_commissions_due','get_professional_commission_details','get_professional_finance_summary') LOOP
    IF has_function_privilege('anon', r.f, 'EXECUTE') THEN RAISE EXCEPTION 'FAIL anon executa %', r.f; END IF;
    IF NOT has_function_privilege('authenticated', r.f, 'EXECUTE') THEN RAISE EXCEPTION 'FAIL authenticated perdeu EXECUTE em %', r.f; END IF;
    IF NOT r.prosecdef OR r.proconfig IS DISTINCT FROM ARRAY['search_path=public'] THEN RAISE EXCEPTION 'FAIL config % (%/%)', r.f, r.prosecdef, r.proconfig; END IF;
  END LOOP;
  IF has_function_privilege('authenticated', 'public.get_professional_commission_details__tenant_unsafe(uuid,uuid,date,date)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.get_professional_finance_summary__tenant_unsafe(uuid,uuid,date,date)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL __tenant_unsafe executável por authenticated';
  END IF;
  RAISE NOTICE 'PASS grants: anon sem EXECUTE, authenticated com EXECUTE, DEFINER + search_path=public, __tenant_unsafe fechado';
END $$;
DROP FUNCTION public._t_expect_denied(text, text);
