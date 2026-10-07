-- =============================================================================
-- ROLLBACK de 20261007140000_agenda_block_scope
-- =============================================================================
-- Volta exatamente ao estado de prod de 2026-10-07:
--   1. staff_can_manage_agenda_block(uuid) = pg_get_functiondef de prod
--      (md5 98221a8702f82d16262de5273e918073). CREATE OR REPLACE mantém dono,
--      ACL {postgres,service_role}, STABLE, SECURITY DEFINER e search_path.
--   2. Remove o trigger/função de sincronização.
--   3. Grava no booleano antigo a escolha atual (none -> false; own/all -> true)
--      e remove a coluna staff_agenda_block_scope (com o CHECK).
-- Efeito: quem estava em "Podem bloquear todas" volta a "própria agenda"
-- (o booleano ligado). Nenhum bloqueio é alterado ou apagado.
-- Idempotente.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.staff_can_manage_agenda_block(p_professional_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_company text;
  v_flag boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.role, COALESCE(NULLIF(btrim(p.company_id), ''), p.id)
    INTO v_role, v_company
  FROM public.profiles p
  WHERE p.id = v_uid::text;

  IF v_company IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = p_professional_id
      AND tm.user_id = v_company
      AND tm.deleted_at IS NULL
  ) THEN
    RETURN false;
  END IF;

  IF v_role IS DISTINCT FROM 'staff' THEN
    RETURN true;
  END IF;

  SELECT COALESCE(bs.staff_can_block_agenda, true)
    INTO v_flag
  FROM public.business_settings bs
  WHERE bs.user_id = v_company
  LIMIT 1;

  IF COALESCE(v_flag, true) IS NOT TRUE THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = p_professional_id
      AND tm.user_id = v_company
      AND tm.staff_user_id = v_uid
      AND tm.deleted_at IS NULL
  );
END;
$function$;

DROP TRIGGER IF EXISTS sync_staff_agenda_block_scope ON public.business_settings;
DROP FUNCTION IF EXISTS public.sync_staff_agenda_block_scope();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_settings'
      AND column_name = 'staff_agenda_block_scope'
  ) THEN
    EXECUTE $q$
      UPDATE public.business_settings
         SET staff_can_block_agenda = (staff_agenda_block_scope <> 'none')
       WHERE staff_can_block_agenda IS DISTINCT FROM (staff_agenda_block_scope <> 'none')
    $q$;
  END IF;
END $$;

ALTER TABLE public.business_settings DROP CONSTRAINT IF EXISTS business_settings_staff_agenda_block_scope_check;
ALTER TABLE public.business_settings DROP COLUMN IF EXISTS staff_agenda_block_scope;

COMMIT;
