CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;

\ir ../migrations/20260214_rate_limiting.sql
\ir ../migrations/20260918180000_p0_revoke_anon_definer_execute.sql
\ir ../migrations/20261120132243_seal_rate_limits_table_access.sql
\ir rate_limits_access.sql
\ir ../../docs/rollbacks/20261120132243_seal_rate_limits_table_access.rollback.sql

DO $$
BEGIN
  IF NOT has_function_privilege('anon', 'public.check_rate_limit(text, integer, integer)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.check_login_rate_limit(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.cleanup_rate_limits()', 'EXECUTE')
     OR (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.rate_limits'::regclass) THEN
    RAISE EXCEPTION 'rate limit rollback did not restore baseline behavior';
  END IF;
END;
$$;
