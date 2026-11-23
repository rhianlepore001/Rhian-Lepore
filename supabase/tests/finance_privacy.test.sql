\ir staff_performance.harness.sql

ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.finance_records TO authenticated;
CREATE POLICY finance_legacy_read ON public.finance_records FOR SELECT TO authenticated USING (
  user_id = public.get_auth_company_id()
);

SELECT set_config('test.own_unpaid', (
  SELECT sum(commission_value)::text FROM public.finance_records
  WHERE user_id = '10000000-0000-0000-0000-000000000001'
    AND professional_id = '20000000-0000-0000-0000-0000000000a1'
    AND type = 'revenue' AND commission_paid IS FALSE
), false);

\ir ../migrations/20261120132554_project_staff_unpaid_commissions.sql
\ir ../migrations/20261120132559_require_owner_for_raw_finance.sql

SET ROLE anon;
DO $$
BEGIN
  IF has_function_privilege('public.get_my_unpaid_commissions_v1(uuid)', 'EXECUTE')
    OR has_table_privilege('public.finance_records', 'SELECT') THEN
    RAISE EXCEPTION 'Visitante anônimo tem acesso financeiro';
  END IF;
END;
$$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-0000000000a1', false);
DO $$
DECLARE
  v_expected numeric := current_setting('test.own_unpaid')::numeric;
BEGIN
  IF EXISTS (SELECT FROM public.finance_records) THEN
    RAISE EXCEPTION 'Colaborador recebeu dados financeiros brutos';
  END IF;
  IF v_expected <= 0 OR public.get_my_unpaid_commissions_v1('20000000-0000-0000-0000-0000000000a1') IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'Total pendente do próprio colaborador incorreto';
  END IF;

  BEGIN
    PERFORM public.get_my_unpaid_commissions_v1('20000000-0000-0000-0000-0000000000b1');
    RAISE EXCEPTION 'Colaborador recebeu comissões de um colega';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM public.get_my_unpaid_commissions_v1('40000000-0000-0000-0000-0000000000b1');
    RAISE EXCEPTION 'Colaborador recebeu comissões de outra empresa';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM public.finance_records)
    OR EXISTS (SELECT FROM public.finance_records WHERE user_id <> '10000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'Leitura financeira do dono perdeu o escopo da própria empresa';
  END IF;
END;
$$;
RESET ROLE;

UPDATE public.team_members SET active = false WHERE id = '20000000-0000-0000-0000-0000000000a1';

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-0000000000a1', false);
DO $$
BEGIN
  IF public.get_my_unpaid_commissions_v1('20000000-0000-0000-0000-0000000000a1')
      IS DISTINCT FROM current_setting('test.own_unpaid')::numeric THEN
    RAISE EXCEPTION 'Ocultar profissional da agenda apagou a visibilidade da comissão devida';
  END IF;
END;
$$;
RESET ROLE;

\ir ../../docs/rollbacks/20261120132559_require_owner_for_raw_finance.rollback.sql
\ir ../../docs/rollbacks/20261120132554_project_staff_unpaid_commissions.rollback.sql

DO $$
BEGIN
  IF to_regprocedure('public.get_my_unpaid_commissions_v1(uuid)') IS NOT NULL
    OR EXISTS (SELECT FROM pg_policy WHERE polrelid = 'public.finance_records'::regclass AND polname = 'finance_raw_owner_only') THEN
    RAISE EXCEPTION 'Rollback incompleto da privacidade financeira';
  END IF;
END;
$$;
