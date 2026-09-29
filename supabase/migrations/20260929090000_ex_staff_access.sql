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
--     staff_user_id = auth.uid() de team_members continua). A chamada vai em
--     (SELECT ...) para o Postgres avaliar uma vez por consulta (initplan).
--  3. relink_staff_if_unbound() só religa pelo member_id do convite, dentro da
--     janela do cadastro (detalhes abaixo).
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
  USING ((user_id = (auth.uid())::text) OR (user_id = (SELECT public.get_auth_company_id())));

ALTER POLICY "Staff can read company services" ON public.services
  USING ((user_id = (auth.uid())::text) OR (user_id = (SELECT public.get_auth_company_id())));

ALTER POLICY "Staff can read company team members" ON public.team_members
  USING ((user_id = (auth.uid())::text) OR (staff_user_id = auth.uid()) OR (user_id = (SELECT public.get_auth_company_id())));

-- 3. relink_staff_if_unbound(): deixa de religar pelo NOME. O nome do perfil é
--    editável pelo próprio usuário ("Profiles: own update") e os nomes dos
--    profissionais são públicos em /book/<slug>: uma conta cortada podia se
--    renomear, chamar o relink e voltar a ter acesso. Agora só religa:
--      - ao member_id gravado no cadastro do convite (auth.users.raw_user_meta_data);
--      - dentro da janela do cadastro (conta criada há no máximo 24 h), porque a
--        metadata também é editável pelo usuário (auth.updateUser) e created_at não;
--      - se o cadastro é da mesma empresa, ativo, não é o dono, não foi excluído e
--        ainda não tem login (staff_user_id IS NULL).
--    Quem já tem vínculo vivo continua recebendo o próprio id (sem mudança).
CREATE OR REPLACE FUNCTION public.relink_staff_if_unbound()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_company_id text;
  v_role text;
  v_member_id uuid;
  v_meta_member text;
  v_user_created timestamptz;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role, company_id
    INTO v_role, v_company_id
  FROM public.profiles
  WHERE id = v_uid::text;

  IF v_role IS DISTINCT FROM 'staff' OR btrim(COALESCE(v_company_id, '')) = '' THEN
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

  SELECT u.raw_user_meta_data ->> 'member_id', u.created_at
    INTO v_meta_member, v_user_created
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_user_created IS NULL OR v_user_created < now() - interval '24 hours' THEN
    RETURN NULL;
  END IF;

  IF v_meta_member IS NULL
     OR v_meta_member !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  UPDATE public.team_members tm
  SET staff_user_id = v_uid, updated_at = now()
  WHERE tm.id = v_meta_member::uuid
    AND tm.user_id::text = v_company_id
    AND COALESCE(tm.is_owner, false) = false
    AND tm.deleted_at IS NULL
    AND tm.active = true
    AND tm.staff_user_id IS NULL
  RETURNING tm.id INTO v_member_id;

  RETURN v_member_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.relink_staff_if_unbound() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relink_staff_if_unbound() TO authenticated, service_role;

COMMIT;
