-- =============================================================================
-- Bloqueio de agenda: 3 opções para a equipe (igual a "Edição de agendamentos")
-- =============================================================================
-- Spec: docs/specs/agenda-block-permissions-SPEC.md
-- Rollback: docs/rollbacks/20261007140000_agenda_block_scope.rollback.sql
--
-- ANTES (prod, lido em 2026-10-07): business_settings.staff_can_block_agenda
-- boolean NOT NULL DEFAULT true (28/28 linhas = true; sem linha = true por
-- COALESCE). Ligado = cada colaborador cria/remove bloqueio só na própria coluna
-- (inclusive bloqueio que o dono pôs nela). Desligado = só o dono.
--
-- AGORA (somente aditivo):
--   1. business_settings.staff_agenda_block_scope text NOT NULL DEFAULT 'own'
--      CHECK IN ('none','own','all'):
--        none = "Não podem bloquear"              (= booleano desligado)
--        own  = "Podem bloquear a própria agenda" (= booleano ligado = HOJE)
--        all  = "Podem bloquear todas"            (novo)
--      Padrão 'own' (diferente da edição, cujo padrão é 'none'): preserva o que
--      a equipe já pode fazer hoje em todos os negócios.
--   2. Backfill a partir do booleano: false -> 'none', true -> 'own'. Idempotente
--      (só corrige linhas incoerentes; 'all' com booleano true é preservado).
--   3. Trigger BEFORE INSERT/UPDATE em business_settings que mantém o booleano
--      antigo e o scope em sincronia (front antigo em cache durante o deploy):
--        - scope mudou (ou INSERT com scope explícito) -> booleano := scope <> 'none';
--        - só o booleano mudou -> false = 'none'; true = 'own' (ou mantém 'all').
--      O booleano NÃO é removido.
--   4. staff_can_manage_agenda_block(uuid): mesma função de prod
--      (pg_get_functiondef em 2026-10-07, md5 98221a8702f82d16262de5273e918073)
--      com a regra do scope e uma exigência nova: o colaborador precisa ter um
--      team_member ATIVO e não excluído no negócio (login órfão de ex-colaborador
--      não bloqueia nada). CREATE OR REPLACE mantém dono, ACL
--      {postgres,service_role}, STABLE, SECURITY DEFINER e search_path.
--   create_agenda_block / delete_agenda_block / agenda_blocks / RLS: intocados
--   (já chamam staff_can_manage_agenda_block para o profissional do bloqueio).
-- =============================================================================

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS staff_agenda_block_scope text NOT NULL DEFAULT 'own';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.business_settings'::regclass
      AND conname = 'business_settings_staff_agenda_block_scope_check'
  ) THEN
    ALTER TABLE public.business_settings
      ADD CONSTRAINT business_settings_staff_agenda_block_scope_check
      CHECK (staff_agenda_block_scope = ANY (ARRAY['none'::text, 'own'::text, 'all'::text]));
  END IF;
END $$;

COMMENT ON COLUMN public.business_settings.staff_agenda_block_scope IS
  'Bloqueio de agenda pela equipe: none = não podem; own = só a própria coluna (padrão, comportamento anterior); all = qualquer profissional do negócio. Sincronizado com staff_can_block_agenda pelo trigger sync_staff_agenda_block_scope.';

-- Backfill (antes do trigger existir na 1ª execução; idempotente nas seguintes).
UPDATE public.business_settings
   SET staff_agenda_block_scope = CASE WHEN staff_can_block_agenda IS FALSE THEN 'none' ELSE 'own' END
 WHERE (staff_can_block_agenda IS FALSE AND staff_agenda_block_scope <> 'none')
    OR (staff_can_block_agenda IS NOT FALSE AND staff_agenda_block_scope = 'none');

CREATE OR REPLACE FUNCTION public.sync_staff_agenda_block_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Front antigo grava só o booleano (scope fica no padrão 'own').
    IF NEW.staff_can_block_agenda IS FALSE AND NEW.staff_agenda_block_scope = 'own' THEN
      NEW.staff_agenda_block_scope := 'none';
    ELSE
      NEW.staff_can_block_agenda := (NEW.staff_agenda_block_scope <> 'none');
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.staff_agenda_block_scope IS DISTINCT FROM OLD.staff_agenda_block_scope THEN
    NEW.staff_can_block_agenda := (NEW.staff_agenda_block_scope <> 'none');
  ELSIF NEW.staff_can_block_agenda IS DISTINCT FROM OLD.staff_can_block_agenda THEN
    IF NEW.staff_can_block_agenda IS FALSE THEN
      NEW.staff_agenda_block_scope := 'none';
    ELSIF OLD.staff_agenda_block_scope = 'none' THEN
      NEW.staff_agenda_block_scope := 'own';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_staff_agenda_block_scope() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_staff_agenda_block_scope() TO service_role;

DROP TRIGGER IF EXISTS sync_staff_agenda_block_scope ON public.business_settings;
CREATE TRIGGER sync_staff_agenda_block_scope
  BEFORE INSERT OR UPDATE OF staff_agenda_block_scope, staff_can_block_agenda ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.sync_staff_agenda_block_scope();

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
  v_scope text;
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

  -- Novo: colaborador precisa ser membro ativo e não excluído do negócio.
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = v_company
      AND tm.staff_user_id = v_uid
      AND tm.deleted_at IS NULL
      AND COALESCE(tm.active, true)
  ) THEN
    RETURN false;
  END IF;

  SELECT bs.staff_agenda_block_scope, bs.staff_can_block_agenda
    INTO v_scope, v_flag
  FROM public.business_settings bs
  WHERE bs.user_id = v_company
  LIMIT 1;

  -- Sem linha de configurações -> 'own' (= comportamento anterior).
  v_scope := COALESCE(v_scope, CASE WHEN v_flag IS FALSE THEN 'none' ELSE 'own' END);

  IF v_scope = 'all' THEN
    RETURN true;
  END IF;

  IF v_scope IS DISTINCT FROM 'own' THEN
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
