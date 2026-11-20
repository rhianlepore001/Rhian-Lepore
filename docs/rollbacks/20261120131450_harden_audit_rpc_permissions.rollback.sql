-- Restore the grants/options from the checked-in migrations before this patch.
-- 20260918180000 revoked PUBLIC/anon from SECURITY DEFINER RPCs; none of the
-- audit functions is on its public/authenticated allowlist. On deployments
-- where a legacy object was absent, this rollback safely leaves it absent.
DO $$
DECLARE
  v_function regprocedure;
  v_view regclass;
BEGIN
  v_function := to_regprocedure('public.cleanup_old_audit_logs()');
  IF v_function IS NOT NULL THEN
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role', v_function);
    EXECUTE format('ALTER FUNCTION %s RESET search_path', v_function);
  END IF;

  v_function := to_regprocedure('public.create_audit_log(character varying, character varying, uuid, jsonb, jsonb, jsonb)');
  IF v_function IS NOT NULL THEN
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role', v_function);
    EXECUTE format('ALTER FUNCTION %s RESET search_path', v_function);
  END IF;

  v_function := to_regprocedure('public.get_audit_logs(integer, integer, character varying, character varying, timestamp with time zone, timestamp with time zone)');
  IF v_function IS NOT NULL THEN
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role', v_function);
    EXECUTE format('ALTER FUNCTION %s RESET search_path', v_function);
  END IF;

  v_view := to_regclass('public.audit_daily_summary');
  IF v_view IS NOT NULL THEN
    EXECUTE format('ALTER VIEW %s RESET (security_invoker)', v_view);
  END IF;

  v_view := to_regclass('public.audit_recent_activity');
  IF v_view IS NOT NULL THEN
    EXECUTE format('ALTER VIEW %s RESET (security_invoker)', v_view);
  END IF;
END;
$$;
