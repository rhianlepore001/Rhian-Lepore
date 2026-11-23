BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN COALESCE(p.role, 'owner') = 'owner' THEN p.id::text
    WHEN p.role = 'staff' AND NULLIF(btrim(p.company_id::text), '') <> p.id::text
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.user_id::text = NULLIF(btrim(p.company_id::text), '')
          AND tm.staff_user_id = auth.uid() AND tm.deleted_at IS NULL
          AND tm.is_owner IS NOT TRUE
      ) THEN NULLIF(btrim(p.company_id::text), '')
  END
  FROM public.profiles p
  WHERE p.id::text = auth.uid()::text
$$;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p.role = 'staff' AND public.get_auth_company_id() IS NULL THEN 'unbound_staff'
    ELSE p.role
  END
  FROM public.profiles p
  WHERE p.id::text = auth.uid()::text
$$;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['appointments', 'clients', 'services', 'team_members', 'finance_records'] LOOP
    EXECUTE format(
      'CREATE POLICY require_bound_staff ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
         USING ((SELECT public.get_auth_role()) IS DISTINCT FROM %L)
         WITH CHECK ((SELECT public.get_auth_role()) IS DISTINCT FROM %L)',
      v_table, 'unbound_staff', 'unbound_staff'
    );
  END LOOP;
END;
$$;

CREATE POLICY require_bound_staff_to_read_peer_profiles ON public.profiles
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    id::text = (SELECT auth.uid())::text
    OR (SELECT public.get_auth_role()) IS DISTINCT FROM 'unbound_staff'
  );

COMMIT;
