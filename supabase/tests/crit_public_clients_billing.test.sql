-- Provas C-01 (public_clients) + C-02 (billing).
-- [S] = segurança: FALHA antes das migrations, passa depois.
-- [F] = fluxo: passa antes E depois (com soft-skip onde a RPC nova ainda não existe).
SET client_min_messages = warning;
CREATE TEMP TABLE cpb_result (n serial, name text, ok boolean, detail text);
GRANT ALL ON cpb_result TO PUBLIC;
GRANT ALL ON SEQUENCE cpb_result_n_seq TO PUBLIC;

CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_exp text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO cpb_result(name, ok, detail)
  VALUES (p_name, p_got IS NOT DISTINCT FROM p_exp,
          'got=' || COALESCE(p_got, 'NULL') || ' expected=' || COALESCE(p_exp, 'NULL'));
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.run_as(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), false);
  PERFORM set_config('request.jwt.claim.role', p_role, false);
  EXECUTE format('SET ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', false);
    RETURN COALESCE(v, 'ok');
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', false);
    RETURN 'error:' || SQLERRM;
  END;
END;
$$;

INSERT INTO public.profiles (id, role, company_id, subscription_status, subscription_plan, trial_ends_at, business_name) VALUES
  ('a0000000-0000-4000-8000-0000000000a0', 'owner', 'a0000000-0000-4000-8000-0000000000a0', 'trial', NULL, now() + interval '10 days', 'Barb A'),
  ('a0000000-0000-4000-8000-0000000000a1', 'staff', 'a0000000-0000-4000-8000-0000000000a0', 'trial', NULL, now() + interval '10 days', 'Staff A'),
  ('b0000000-0000-4000-8000-0000000000b0', 'owner', 'b0000000-0000-4000-8000-0000000000b0', 'trial', NULL, now() + interval '10 days', 'Barb B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.public_clients (id, business_id, name, phone, email) VALUES
  ('c0000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-0000000000a0', 'Cliente A1', '+5511999990001', 'a1@ex.invalid'),
  ('c0000000-0000-4000-8000-0000000000c2', 'b0000000-0000-4000-8000-0000000000b0', 'Cliente B1', '+5511888880002', 'b1@ex.invalid')
ON CONFLICT (id) DO NOTHING;

-- [S] anon não lista (0 linhas via RLS ou permission denied via REVOKE)
SELECT pg_temp.check(
  'S anon select count',
  CASE
    WHEN pg_temp.run_as('anon', NULL, 'SELECT count(*)::text FROM public.public_clients') IN ('0')
      OR pg_temp.run_as('anon', NULL, 'SELECT count(*)::text FROM public.public_clients') LIKE 'error:%'
    THEN 'blocked' ELSE 'leaked' END,
  'blocked'
);

-- [S] anon não UPDATE (usa nome temporário e restaura)
SELECT pg_temp.check(
  'S anon update blocked',
  CASE
    WHEN pg_temp.run_as('anon', NULL,
      $$UPDATE public.public_clients SET name = 'HACK' WHERE id = 'c0000000-0000-4000-8000-0000000000c1'::uuid RETURNING name$$
    ) = 'HACK' THEN 'leaked'
    ELSE 'blocked'
  END,
  'blocked'
);
UPDATE public.public_clients SET name = 'Cliente A1'
  WHERE id = 'c0000000-0000-4000-8000-0000000000c1'::uuid;

-- [S] anon não INSERT direto
SELECT pg_temp.check(
  'S anon insert direct blocked',
  CASE
    WHEN pg_temp.run_as('anon', NULL,
      $$INSERT INTO public.public_clients (business_id, name, phone)
        VALUES ('a0000000-0000-4000-8000-0000000000a0','X','+5511777770003') RETURNING 'ins'$$
    ) = 'ins' THEN 'leaked'
    ELSE 'blocked'
  END,
  'blocked'
);

-- [S] auto-upgrade bloqueado
SELECT pg_temp.check(
  'S auth cannot self-upgrade',
  CASE
    WHEN pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a0',
      $$UPDATE public.profiles
         SET subscription_status='active', subscription_plan='pro', trial_ends_at=now()+interval '100 years'
         WHERE id = auth.uid()::text RETURNING subscription_status$$
    ) = 'active' THEN 'leaked'
    ELSE 'blocked'
  END,
  'blocked'
);

SELECT pg_temp.check(
  'S auth cannot set stripe id direct',
  CASE
    WHEN pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a0',
      $$UPDATE public.profiles SET stripe_customer_id='cus_HACK'
         WHERE id = auth.uid()::text RETURNING stripe_customer_id$$
    ) = 'cus_HACK' THEN 'leaked'
    ELSE 'blocked'
  END,
  'blocked'
);

-- [S] cross-tenant
SELECT pg_temp.check(
  'S owner A cannot see B clients',
  pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a0',
    $$SELECT count(*)::text FROM public.public_clients
      WHERE business_id = 'b0000000-0000-4000-8000-0000000000b0'$$),
  '0'
);

-- [F] RPCs públicas
SELECT pg_temp.check(
  'F upsert_public_client anon',
  CASE WHEN pg_temp.run_as('anon', NULL,
    $$SELECT t.name FROM public.upsert_public_client(
      'a0000000-0000-4000-8000-0000000000a0'::uuid, 'Novo Cli', '+5511666660004', NULL, NULL) AS t$$
  ) = 'Novo Cli' THEN 'ok' ELSE 'fail' END,
  'ok'
);

SELECT pg_temp.check(
  'F get_public_client_by_phone anon',
  CASE WHEN pg_temp.run_as('anon', NULL,
    $$SELECT t.name FROM public.get_public_client_by_phone(
      'a0000000-0000-4000-8000-0000000000a0'::uuid, '+5511999990001') AS t$$
  ) = 'Cliente A1' THEN 'ok' ELSE 'fail' END,
  'ok'
);

SELECT pg_temp.check(
  'F staff select own tenant',
  CASE WHEN (pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a1',
    $$SELECT count(*)::text FROM public.public_clients
      WHERE business_id = 'a0000000-0000-4000-8000-0000000000a0'$$
  )) ~ '^[1-9]' THEN 'ok' ELSE 'fail' END,
  'ok'
);

SELECT pg_temp.check(
  'F owner can update business_name',
  CASE WHEN pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a0',
    $$UPDATE public.profiles SET business_name='Barb A2'
       WHERE id = auth.uid()::text RETURNING business_name$$
  ) = 'Barb A2' THEN 'ok' ELSE 'fail' END,
  'ok'
);

SELECT pg_temp.check(
  'F set_stripe_customer_id_for_caller',
  CASE
    WHEN to_regprocedure('public.set_stripe_customer_id_for_caller(text)') IS NULL THEN 'skip'
    WHEN pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a0',
      $$SELECT public.set_stripe_customer_id_for_caller('cus_Test123ABC')$$
    ) = 'cus_Test123ABC' THEN 'ok'
    ELSE 'fail'
  END,
  CASE WHEN to_regprocedure('public.set_stripe_customer_id_for_caller(text)') IS NULL
       THEN 'skip' ELSE 'ok' END
);

SELECT pg_temp.check(
  'F reject short phone after harden',
  CASE
    WHEN pg_temp.run_as('anon', NULL,
      $$SELECT name FROM public.get_public_client_by_phone(
        'a0000000-0000-4000-8000-0000000000a0'::uuid, '123')$$
    ) LIKE 'error:%' THEN 'ok'
    WHEN position('phone_invalid' in (
      SELECT prosrc FROM pg_proc WHERE oid = 'public.get_public_client_by_phone(uuid,text)'::regprocedure
    )) = 0 THEN 'ok'
    ELSE 'fail'
  END,
  'ok'
);

DO $$
DECLARE fail int; total int;
BEGIN
  SELECT count(*) FILTER (WHERE NOT ok), count(*) INTO fail, total FROM cpb_result;
  RAISE WARNING 'crit_public_clients_billing: %/% checks ok', total - fail, total;
  IF fail > 0 THEN
    RAISE EXCEPTION 'crit_public_clients_billing: % checks falharam: %', fail,
      (SELECT string_agg(name || ' → ' || detail, ' | ') FROM cpb_result WHERE NOT ok);
  END IF;
END $$;
