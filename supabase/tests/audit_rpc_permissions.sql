-- Run after supabase db reset/test db against a disposable local database.
-- These assertions cover access boundaries without touching production data.
DO $$
DECLARE
  v_view record;
  v_configured_functions integer;
BEGIN
  IF has_function_privilege('anon', 'public.cleanup_old_audit_logs()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.cleanup_old_audit_logs()', 'EXECUTE') THEN
    RAISE EXCEPTION 'audit cleanup must not be callable by anon or authenticated';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.cleanup_old_audit_logs()', 'EXECUTE') THEN
    RAISE EXCEPTION 'audit cleanup must remain callable by service_role';
  END IF;
  IF has_function_privilege('anon', 'public.cleanup_old_deleted_items()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.cleanup_old_deleted_items()', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.cleanup_old_deleted_items()', 'EXECUTE') THEN
    RAISE EXCEPTION 'soft-delete cleanup must be backend-only';
  END IF;

  IF has_function_privilege('anon', 'public.create_audit_log(character varying, character varying, uuid, jsonb, jsonb, jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.create_audit_log(character varying, character varying, uuid, jsonb, jsonb, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'manual SECURITY DEFINER audit insertion must be backend-only';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.create_audit_log(character varying, character varying, uuid, jsonb, jsonb, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'manual audit insertion must remain callable by service_role';
  END IF;

  IF has_function_privilege('anon', 'public.get_audit_logs(integer, integer, character varying, character varying, timestamptz, timestamptz)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.get_audit_logs(integer, integer, character varying, character varying, timestamptz, timestamptz)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.get_audit_logs(integer, integer, character varying, character varying, timestamptz, timestamptz)', 'EXECUTE') THEN
    RAISE EXCEPTION 'audit log reads must be authenticated/service_role only';
  END IF;

  SELECT count(*) INTO v_configured_functions
  FROM pg_proc
  WHERE oid IN (
    'public.cleanup_old_audit_logs()'::regprocedure,
    'public.cleanup_old_deleted_items()'::regprocedure,
    'public.create_audit_log(character varying,character varying,uuid,jsonb,jsonb,jsonb)'::regprocedure,
    'public.get_audit_logs(integer,integer,character varying,character varying,timestamptz,timestamptz)'::regprocedure
  )
    AND prosecdef
    AND proconfig @> ARRAY['search_path=pg_catalog, public, pg_temp'];
  IF v_configured_functions <> 4 THEN
    RAISE EXCEPTION 'audit SECURITY DEFINER functions must pin search_path';
  END IF;

  FOR v_view IN
    SELECT c.oid, c.relname, c.reloptions
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('audit_daily_summary', 'audit_recent_activity')
      AND c.relkind = 'v'
  LOOP
    IF NOT ('security_invoker=true' = ANY(COALESCE(v_view.reloptions, ARRAY[]::text[]))) THEN
      RAISE EXCEPTION 'view % must use security_invoker', v_view.relname;
    END IF;
    IF has_table_privilege('anon', v_view.oid, 'SELECT')
       OR has_table_privilege('authenticated', v_view.oid, 'SELECT') THEN
      RAISE EXCEPTION 'unused audit summary view % must not be client-readable', v_view.relname;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'audit_daily_summary'
      AND c.relkind = 'v'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'audit_recent_activity'
      AND c.relkind = 'v'
  ) THEN
    RAISE EXCEPTION 'expected legacy audit summary views to exist';
  END IF;
END;
$$;
