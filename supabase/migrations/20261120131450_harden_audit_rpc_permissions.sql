-- Keep the authenticated, per-user audit read RPC available while reserving
-- maintenance and manual writes for trusted backend jobs. Some hosted projects
-- never installed these legacy functions/views, so make this migration tolerant.
DO $$
DECLARE
  v_function regprocedure;
  v_view regclass;
BEGIN
  v_function := to_regprocedure('public.cleanup_old_audit_logs()');
  IF v_function IS NOT NULL THEN
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_function);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_function);
    EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, public, pg_temp', v_function);
  END IF;

  v_function := to_regprocedure('public.create_audit_log(character varying, character varying, uuid, jsonb, jsonb, jsonb)');
  IF v_function IS NOT NULL THEN
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_function);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_function);
    EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, public, pg_temp', v_function);
  END IF;

  v_function := to_regprocedure('public.get_audit_logs(integer, integer, character varying, character varying, timestamp with time zone, timestamp with time zone)');
  IF v_function IS NOT NULL THEN
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', v_function);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', v_function);
    EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, public, pg_temp', v_function);
  END IF;

  v_view := to_regclass('public.audit_daily_summary');
  IF v_view IS NOT NULL THEN
    EXECUTE format('ALTER VIEW %s SET (security_invoker = true)', v_view);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC, anon, authenticated', v_view);
  END IF;

  v_view := to_regclass('public.audit_recent_activity');
  IF v_view IS NOT NULL THEN
    EXECUTE format('ALTER VIEW %s SET (security_invoker = true)', v_view);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC, anon, authenticated', v_view);
  END IF;
END;
$$;
