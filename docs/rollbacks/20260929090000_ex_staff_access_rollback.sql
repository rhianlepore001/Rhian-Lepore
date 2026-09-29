-- Rollback de 20260929090000_ex_staff_access.sql
-- Volta EXATAMENTE às definições de prod lidas em 29/09/2026 (pg_get_functiondef
-- e pg_policies). md5(pg_get_functiondef) esperado depois do rollback:
--   get_auth_company_id      4e27234398ff92bddb5bfb359afbc677
--   relink_staff_if_unbound  dc16b8a430cb52bd154736a642d46104
-- ACL de relink_staff_if_unbound igual à de prod: authenticated e service_role.
-- Sem mudança de dados: o rollback é imediato.
--
-- ORDEM DO ROLLBACK (obrigatória, com o #108 aplicado):
--   1. Primeiro o rollback do #108:
--      20260929120000_staff_invite_hardening_rollback.sql
--   2. Depois ESTE arquivo (#105).
-- Rodar este antes do #108 devolveria o relink de prod (sem token) com o convite
-- do #108 ainda ativo, e o rollback do #108, rodado depois, reinstalaria o relink
-- do #105. Sem o #108 aplicado, este arquivo roda sozinho.

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

CREATE OR REPLACE FUNCTION public.relink_staff_if_unbound()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_company_id text;
  v_name text;
  v_role text;
  v_member_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role, company_id, full_name
    INTO v_role, v_company_id, v_name
  FROM public.profiles
  WHERE id = v_uid::text;

  IF v_role IS DISTINCT FROM 'staff' OR v_company_id IS NULL OR btrim(COALESCE(v_name, '')) = '' THEN
    RETURN NULL;
  END IF;

  SELECT tm.id INTO v_member_id
  FROM public.team_members tm
  WHERE tm.staff_user_id = v_uid
    AND tm.user_id::text = v_company_id
    AND tm.deleted_at IS NULL
  LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    RETURN v_member_id;
  END IF;

  SELECT tm.id INTO v_member_id
  FROM public.team_members tm
  WHERE tm.user_id::text = v_company_id
    AND COALESCE(tm.is_owner, false) = false
    AND tm.deleted_at IS NULL
    AND tm.active = true
    AND tm.staff_user_id IS NULL
    AND lower(btrim(tm.name)) = lower(btrim(v_name))
  LIMIT 2;

  IF v_member_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF (
    SELECT count(*) FROM public.team_members tm
    WHERE tm.user_id::text = v_company_id
      AND COALESCE(tm.is_owner, false) = false
      AND tm.deleted_at IS NULL
      AND tm.active = true
      AND tm.staff_user_id IS NULL
      AND lower(btrim(tm.name)) = lower(btrim(v_name))
  ) <> 1 THEN
    RETURN NULL;
  END IF;

  UPDATE public.team_members
  SET staff_user_id = v_uid, updated_at = now()
  WHERE id = v_member_id
    AND staff_user_id IS NULL;

  RETURN v_member_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.relink_staff_if_unbound() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relink_staff_if_unbound() TO authenticated, service_role;

COMMIT;
