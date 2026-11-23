BEGIN;
SET LOCAL lock_timeout = '5s';

DROP TRIGGER IF EXISTS protect_team_member_binding ON public.team_members;
DROP FUNCTION IF EXISTS public.guard_team_member_binding();

DROP POLICY IF EXISTS team_records_read ON public.team_members;
DROP POLICY IF EXISTS team_records_insert ON public.team_members;
DROP POLICY IF EXISTS team_records_update ON public.team_members;
DROP POLICY IF EXISTS team_records_delete ON public.team_members;

DO $$
BEGIN
  IF to_regprocedure('public.is_staff_of(uuid)') IS NOT NULL THEN
    CREATE OR REPLACE FUNCTION public.is_staff_of(p_business_id uuid)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $membership$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM team_members
        WHERE user_id::text = auth.uid()::text
          AND business_id = p_business_id AND active = true
      );
    END;
    $membership$;
  END IF;
END;
$$;

COMMIT;
