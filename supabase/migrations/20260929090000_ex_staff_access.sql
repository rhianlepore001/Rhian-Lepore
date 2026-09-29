-- =============================================================================
-- Ex-colaborador perde o acesso à empresa (ACCEPTANCE.md, seção E)
-- =============================================================================
-- Problema: get_auth_company_id() devolvia profiles.company_id para QUALQUER
-- perfil staff, sem conferir o vínculo em team_members. 3 policies liam
-- profiles.company_id direto e também ignoravam o vínculo. Resultado: 8 contas
-- staff sem vínculo vivo continuavam lendo agenda, clientes e financeiro.
--
-- Correção (aditiva e reversível, sem mudança de dados):
--  1. get_auth_company_id(): para role = 'staff' com empresa diferente do
--     próprio id, só devolve a empresa se existir team_members com
--     staff_user_id = auth.uid(), user_id = empresa e deleted_at IS NULL
--     (ativo OU inativo: a recepção é cadastrada inativa de propósito).
--     Sem vínculo devolve NULL. Dono: sem mudança.
--  2. As 3 policies que liam profiles.company_id passam a usar
--     user_id = get_auth_company_id() (mesmos nomes; o ramo
--     staff_user_id = auth.uid() de team_members continua).
-- Rollback: docs/rollbacks/20260929090000_ex_staff_access_rollback.sql
-- Verificação pós-aplicação (E3.1): docs/rollbacks/20260929090000_ex_staff_access_verify.sql
-- =============================================================================

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.get_auth_company_id()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_self text;
  v_role text;
  v_company_id text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, role, COALESCE(NULLIF(btrim(company_id), ''), id)
    INTO v_self, v_role, v_company_id
  FROM public.profiles
  WHERE id = v_uid::text;

  -- Colaborador só enxerga a empresa enquanto houver vínculo vivo
  -- (ativo ou inativo). Usa idx_team_members_staff_user_id.
  IF v_role = 'staff' AND v_company_id IS DISTINCT FROM v_self THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.staff_user_id = v_uid
        AND tm.user_id = v_company_id
        AND tm.deleted_at IS NULL
    ) THEN
      RETURN NULL;
    END IF;
  END IF;

  RETURN v_company_id;
END;
$function$;

ALTER POLICY "Staff can read company appointments" ON public.appointments
  USING ((user_id = (auth.uid())::text) OR (user_id = public.get_auth_company_id()));

ALTER POLICY "Staff can read company services" ON public.services
  USING ((user_id = (auth.uid())::text) OR (user_id = public.get_auth_company_id()));

ALTER POLICY "Staff can read company team members" ON public.team_members
  USING ((user_id = (auth.uid())::text) OR (staff_user_id = auth.uid()) OR (user_id = public.get_auth_company_id()));

COMMIT;
