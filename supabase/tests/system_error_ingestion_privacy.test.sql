CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;

CREATE TABLE auth.users (id uuid PRIMARY KEY);
INSERT INTO auth.users VALUES
  ('10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002');

CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT current_user::text;
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

\ir ../migrations/20260216_error_tracking.sql
\ir ../migrations/20261012130157_log_signup_error.sql

GRANT SELECT, INSERT, UPDATE ON public.system_errors TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.log_error(text, text, text, varchar, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_error(text, text, text, varchar, jsonb) TO authenticated;

CREATE TEMP TABLE error_rpc_baseline AS
SELECT oid, regexp_replace(pg_get_functiondef(oid), '[ \t]+$', '', 'gn') AS definition, proacl
FROM pg_proc
WHERE oid IN (
  'public.log_error(text,text,text,varchar,jsonb)'::regprocedure,
  'public.log_signup_error(jsonb)'::regprocedure
);

\ir ../migrations/20261120133014_system_error_ingestion_privacy.sql

SET ROLE anon;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.system_errors (error_message) VALUES ('fixture');
    RAISE EXCEPTION 'anonymous direct insert succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  IF public.log_signup_error('{"ref":"ABC234","flow":"staff_invite","error_code":"unexpected_failure","error_status":500,"email":"cliente@example.invalid","url":"https://example.invalid/#/register?invite=ficticio","error_message":"texto livre"}') IS NULL THEN
    RAISE EXCEPTION 'anonymous signup diagnostic was not accepted';
  END IF;

  IF has_function_privilege('public.log_error(text,text,text,varchar,jsonb)', 'EXECUTE')
    OR has_function_privilege('public.sanitize_system_error_context(jsonb,boolean)', 'EXECUTE')
    OR EXISTS (SELECT FROM public.system_errors) THEN
    RAISE EXCEPTION 'anonymous role has extra telemetry access';
  END IF;

  FOR i IN 1..29 LOOP
    IF public.log_signup_error('{"flow":"owner"}') IS NULL THEN
      RAISE EXCEPTION 'signup quota was reached too early';
    END IF;
  END LOOP;
  IF public.log_signup_error('{"flow":"owner"}') IS NOT NULL THEN
    RAISE EXCEPTION 'signup quota was not enforced';
  END IF;
END;
$$;

RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
DO $$
BEGIN
  BEGIN
    INSERT INTO public.system_errors (error_message, user_id)
    VALUES ('fixture', '10000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'authenticated direct insert succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  IF public.log_error('cliente@example.invalid', 'stack do cliente', 'component stack do cliente', 'critical',
    '{"route":"/book","error_status":404,"error_name":"TypeError","error_code":"PGRST202","token":"ficticio","user_agent":"indesejado"}') IS NULL THEN
    RAISE EXCEPTION 'authenticated diagnostic was not accepted';
  END IF;

  IF public.log_error('signup_unexpected_error ABC234', p_context =>
    '{"ref":"ABC234","flow":"owner","error_status":"123456","error_code":"123456"}') IS NULL THEN
    RAISE EXCEPTION 'legacy signup fallback was not accepted';
  END IF;

  IF EXISTS (SELECT FROM public.system_errors) THEN
    RAISE EXCEPTION 'historical errors can be read by the browser role';
  END IF;

  FOR i IN 1..28 LOOP
    IF public.log_error('client_error') IS NULL THEN
      RAISE EXCEPTION 'per-user quota was reached too early';
    END IF;
  END LOOP;
  IF public.log_error('client_error') IS NOT NULL THEN
    RAISE EXCEPTION 'per-user quota was not enforced';
  END IF;
END;
$$;

SET request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
DO $$
BEGIN
  IF public.log_error('client_error') IS NULL THEN
    RAISE EXCEPTION 'one user exhausted another user quota';
  END IF;
END;
$$;

RESET ROLE;
SET ROLE service_role;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM public.system_errors
    WHERE user_id IS NULL AND error_message = 'signup_unexpected_error'
      AND stack_trace IS NULL AND component_stack IS NULL
      AND context = '{"source":"log_signup_error","ref":"ABC234","flow":"staff_invite","error_code":"unexpected_failure","error_status":500}'
  ) OR NOT EXISTS (
    SELECT FROM public.system_errors
    WHERE error_message = 'client_error' AND severity = 'critical'
      AND stack_trace IS NULL AND component_stack IS NULL
      AND context = '{"route":"/book","error_status":404,"error_name":"TypeError","error_code":"PGRST202"}'
  ) OR NOT EXISTS (
    SELECT FROM public.system_errors
    WHERE error_message = 'signup_unexpected_error'
      AND context = '{"ref":"ABC234","flow":"owner"}'
  ) THEN
    RAISE EXCEPTION 'stored error data differs from the allowlist';
  END IF;
END;
$$;

RESET ROLE;

\ir ../../docs/rollbacks/20261120133014_system_error_ingestion_privacy.rollback.sql

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM error_rpc_baseline b
    LEFT JOIN pg_proc p ON p.oid = b.oid
    WHERE b.definition IS DISTINCT FROM regexp_replace(pg_get_functiondef(p.oid), '[ \t]+$', '', 'gn')
      OR b.proacl IS DISTINCT FROM p.proacl
  ) OR EXISTS (
    SELECT FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'system_errors' AND policyname = 'system_errors_server_only'
  ) OR to_regprocedure('public.sanitize_system_error_context(jsonb,boolean)') IS NOT NULL THEN
    RAISE EXCEPTION 'rollback did not restore the prior RPC definitions, grants and policies';
  END IF;
END;
$$;
