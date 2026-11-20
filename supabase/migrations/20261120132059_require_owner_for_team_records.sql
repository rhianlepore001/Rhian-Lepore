BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regprocedure('public.is_staff_of(uuid)') IS NOT NULL THEN
    CREATE OR REPLACE FUNCTION public.is_staff_of(p_business_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = ''
    AS $membership$
      SELECT auth.uid() IS NOT NULL
        AND public.get_auth_role() = 'staff'
        AND public.get_auth_company_id() = p_business_id::text
        AND EXISTS (
          SELECT 1 FROM public.team_members t
          WHERE t.user_id::text = p_business_id::text AND t.staff_user_id = auth.uid()
            AND t.active IS TRUE AND t.deleted_at IS NULL
        )
    $membership$;
  END IF;
END;
$$;

CREATE POLICY team_records_read ON public.team_members
  AS RESTRICTIVE FOR SELECT
  USING (
    user_id::text = (SELECT public.get_auth_company_id())
    AND (
      (SELECT public.get_auth_role()) = 'owner'
      OR ((SELECT public.get_auth_role()) = 'staff' AND staff_user_id = (SELECT auth.uid())
          AND deleted_at IS NULL)
    )
  );

CREATE POLICY team_records_insert ON public.team_members
  AS RESTRICTIVE FOR INSERT
  WITH CHECK (user_id::text = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');

CREATE POLICY team_records_update ON public.team_members
  AS RESTRICTIVE FOR UPDATE
  USING (user_id::text = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner')
  WITH CHECK (user_id::text = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');

CREATE POLICY team_records_delete ON public.team_members
  AS RESTRICTIVE FOR DELETE
  USING (user_id::text = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');

CREATE FUNCTION public.guard_team_member_binding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' AND NEW.staff_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'team_member_binding_requires_invite' USING ERRCODE = '42501';
    ELSIF TG_OP = 'UPDATE' AND NEW.staff_user_id IS DISTINCT FROM OLD.staff_user_id THEN
      RAISE EXCEPTION 'team_member_binding_requires_invite' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_team_member_binding() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_team_member_binding
  BEFORE INSERT OR UPDATE OF staff_user_id ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_team_member_binding();

COMMIT;
