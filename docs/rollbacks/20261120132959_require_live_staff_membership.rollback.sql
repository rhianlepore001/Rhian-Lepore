BEGIN;
SET LOCAL lock_timeout = '5s';

DROP POLICY IF EXISTS require_bound_staff_to_read_peer_profiles ON public.profiles;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['appointments', 'clients', 'services', 'team_members', 'finance_records'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS require_bound_staff ON public.%I', v_table);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_company_id()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT;
BEGIN
  SELECT COALESCE(NULLIF(btrim(company_id), ''), id)
    INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid()::text;
  RETURN v_company_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_auth_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()::text;
  RETURN v_role;
END;
$function$;

COMMIT;
