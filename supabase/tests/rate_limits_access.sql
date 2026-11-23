-- Run via rate_limits_access.harness.sql against a disposable local database.
-- Synthetic role and key assertions; no external or production records used.
BEGIN;
DO $$
DECLARE
  v_configured_functions integer;
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.rate_limits'::regclass) THEN
    RAISE EXCEPTION 'rate_limits must have RLS enabled';
  END IF;
  IF has_table_privilege('anon', 'public.rate_limits', 'SELECT')
     OR has_table_privilege('anon', 'public.rate_limits', 'INSERT')
     OR has_table_privilege('authenticated', 'public.rate_limits', 'SELECT')
     OR has_table_privilege('authenticated', 'public.rate_limits', 'INSERT') THEN
    RAISE EXCEPTION 'client roles must not access rate_limits directly';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.rate_limits', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.rate_limits', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public.rate_limits', 'UPDATE')
     OR NOT has_table_privilege('service_role', 'public.rate_limits', 'DELETE') THEN
    RAISE EXCEPTION 'service_role must retain internal rate_limits access';
  END IF;

  IF has_function_privilege('anon', 'public.check_rate_limit(text, integer, integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.check_rate_limit(text, integer, integer)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.check_rate_limit(text, integer, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'generic rate limiter must be backend-only';
  END IF;
  IF has_function_privilege('anon', 'public.cleanup_rate_limits()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.cleanup_rate_limits()', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.cleanup_rate_limits()', 'EXECUTE') THEN
    RAISE EXCEPTION 'rate limit cleanup must be backend-only';
  END IF;
  IF NOT has_function_privilege('anon', 'public.check_login_rate_limit(text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.check_login_rate_limit(text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.check_login_rate_limit(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'login rate limiter must remain available to clients and service_role';
  END IF;

  SELECT count(*) INTO v_configured_functions
  FROM pg_proc
  WHERE oid IN (
    'public.check_rate_limit(text,integer,integer)'::regprocedure,
    'public.cleanup_rate_limits()'::regprocedure,
    'public.check_login_rate_limit(text)'::regprocedure
  )
    AND prosecdef
    AND proconfig @> ARRAY['search_path=pg_catalog, public, pg_temp'];
  IF v_configured_functions <> 3 THEN
    RAISE EXCEPTION 'rate limit SECURITY DEFINER functions must pin search_path';
  END IF;
END;
$$;

-- Compatibility assertion: anon can still invoke the login wrapper.
SET LOCAL ROLE anon;
SELECT public.check_login_rate_limit('synthetic@example.invalid');
ROLLBACK;
