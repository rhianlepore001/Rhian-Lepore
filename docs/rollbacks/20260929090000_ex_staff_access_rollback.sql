-- Rollback de 20260929090000_ex_staff_access.sql
-- Volta EXATAMENTE às definições de prod lidas em 29/09/2026 (pg_get_functiondef
-- e pg_policies). md5(pg_get_functiondef) esperado depois do rollback:
--   get_auth_company_id  4e27234398ff92bddb5bfb359afbc677
-- Sem mudança de dados: o rollback é imediato.

BEGIN;
SET LOCAL lock_timeout = '5s';

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

ALTER POLICY "Staff can read company appointments" ON public.appointments
  USING (((user_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (auth.uid())::text) AND (profiles.role = 'staff'::text) AND (profiles.company_id = appointments.user_id))))));

ALTER POLICY "Staff can read company services" ON public.services
  USING (((user_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (auth.uid())::text) AND (profiles.role = 'staff'::text) AND (profiles.company_id = services.user_id))))));

ALTER POLICY "Staff can read company team members" ON public.team_members
  USING (((user_id = (auth.uid())::text) OR (staff_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (auth.uid())::text) AND (profiles.role = 'staff'::text) AND (profiles.company_id = team_members.user_id))))));

COMMIT;
