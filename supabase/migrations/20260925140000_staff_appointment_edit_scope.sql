-- =============================================================================
-- Permissão da equipe (staff) para editar / reagendar / cancelar agendamentos
-- =============================================================================
-- CONTEXTO (diagnóstico em prod, 2026-09-25)
--   * UI: colaborador nunca viu "Editar" nem "Cancelar" (só o dono); "Confirmar e
--     cobrar", "Faltou" e "Novo agendamento" são liberados para a equipe.
--   * Banco: a policy "Appointments: company isolation" (ALL, authenticated,
--     user_id = get_auth_company_id()) deixa o colaborador fazer UPDATE/DELETE
--     direto em QUALQUER agendamento da empresa pela API — a restrição era só
--     visual.
--
-- O QUE ESTA MIGRATION FAZ (somente aditivo; nenhuma policy/função existente é
-- alterada e nenhuma linha de appointments é tocada)
--   1. business_settings.staff_appointment_edit_scope text NOT NULL DEFAULT 'none'
--      CHECK IN ('none','own','all'):
--        none = colaborador não edita/reagenda/cancela (= comportamento atual da UI)
--        own  = só agendamentos em que ele é o profissional
--        all  = qualquer agendamento da empresa
--   2. public.staff_can_modify_appointment(company, old_pro, new_pro) — SECURITY
--      DEFINER, STABLE: aplica a regra para o usuário logado. Não-staff (dono)
--      sempre true.
--   3. Trigger BEFORE UPDATE OR DELETE em appointments
--      (enforce_staff_appointment_edit_scope, SECURITY INVOKER):
--        * só atua em escrita direta pela API (current_user = 'authenticated');
--          RPCs SECURITY DEFINER (complete_appointment, accept_public_booking,
--          create_secure_booking, settle_queue_ticket, cancel/update por cliente,
--          delete_appointment_with_finance, delete_team_member) rodam como o dono
--          da função e mantêm as próprias checagens -> checkout, fila, booking
--          público e área do cliente não mudam;
--        * "Faltou" (status Confirmed/Pending -> NoShow sem mudar mais nada)
--          continua liberado para toda a equipe;
--        * demais UPDATE/DELETE de colaborador passam pela permissão; bloqueio
--          = erro 42501 'staff_appointment_edit_forbidden'.
--   INSERT não é afetado (criar agendamento segue liberado para a equipe).
--
-- COMPATIBILIDADE
--   * Front novo com banco antigo: coluna ausente -> front assume 'none' (mesma
--     UI de hoje) e a opção nas Configurações fica travada com aviso.
--   * Front antigo com banco novo: a UI antiga só faz, como colaborador,
--     checkout (RPC), "Faltou" (liberado) e criação (INSERT/RPC) -> nada quebra.
--
-- ROLLBACK: docs/rollbacks/20260925140000_staff_appointment_edit_scope_rollback.sql
-- =============================================================================

-- 1. Coluna -------------------------------------------------------------------
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS staff_appointment_edit_scope text NOT NULL DEFAULT 'none';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'business_settings_staff_appointment_edit_scope_check'
      AND conrelid = 'public.business_settings'::regclass
  ) THEN
    ALTER TABLE public.business_settings
      ADD CONSTRAINT business_settings_staff_appointment_edit_scope_check
      CHECK (staff_appointment_edit_scope IN ('none', 'own', 'all'));
  END IF;
END $$;

COMMENT ON COLUMN public.business_settings.staff_appointment_edit_scope IS
  'Permissão da equipe para editar/reagendar/cancelar agendamentos: none (só o dono), own (só os próprios), all (todos). Aplicada pela trigger enforce_staff_appointment_edit_scope.';

-- 2. Regra (SECURITY DEFINER: lê profiles/team_members/business_settings) -------
CREATE OR REPLACE FUNCTION public.staff_can_modify_appointment(
  p_company_id text,
  p_old_professional_id uuid,
  p_new_professional_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_company text;
  v_scope text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN true; -- sem usuário: quem decide é a RLS (anon não tem UPDATE/DELETE)
  END IF;

  SELECT p.role, COALESCE(NULLIF(btrim(p.company_id), ''), p.id)
    INTO v_role, v_company
  FROM public.profiles p
  WHERE p.id = v_uid::text;

  IF v_role IS DISTINCT FROM 'staff' THEN
    RETURN true; -- dono (e qualquer papel não-staff): sem mudança
  END IF;

  IF v_company IS DISTINCT FROM p_company_id THEN
    RETURN true; -- fora da empresa do colaborador: a RLS já decide
  END IF;

  SELECT bs.staff_appointment_edit_scope
    INTO v_scope
  FROM public.business_settings bs
  WHERE bs.user_id = p_company_id
  LIMIT 1;

  v_scope := COALESCE(v_scope, 'none');

  IF v_scope = 'all' THEN
    RETURN true;
  END IF;

  IF v_scope = 'own' THEN
    RETURN p_old_professional_id IS NOT NULL
      AND p_new_professional_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.id = p_old_professional_id
          AND tm.user_id = p_company_id
          AND tm.staff_user_id = v_uid
          AND tm.deleted_at IS NULL
      )
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.id = p_new_professional_id
          AND tm.user_id = p_company_id
          AND tm.staff_user_id = v_uid
          AND tm.deleted_at IS NULL
      );
  END IF;

  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION public.staff_can_modify_appointment(text, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_can_modify_appointment(text, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.staff_can_modify_appointment(text, uuid, uuid) TO authenticated, service_role;

-- 3. Trigger (SECURITY INVOKER: current_user distingue API direta de RPC) ------
CREATE OR REPLACE FUNCTION public.enforce_staff_appointment_edit_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Só escrita direta via PostgREST. Dentro de RPC SECURITY DEFINER o
  -- current_user é o dono da função (postgres) e a RPC tem checagem própria.
  IF current_user IS DISTINCT FROM 'authenticated' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF NOT public.staff_can_modify_appointment(OLD.user_id, OLD.professional_id, OLD.professional_id) THEN
      RAISE EXCEPTION 'staff_appointment_edit_forbidden'
        USING ERRCODE = '42501',
              DETAIL = 'A permissão da equipe definida pelo dono não permite excluir este agendamento.';
    END IF;
    RETURN OLD;
  END IF;

  -- "Faltou": só o status muda (Confirmed/Pending -> NoShow). Liberado para toda a equipe.
  IF NEW.status = 'NoShow'
     AND OLD.status IN ('Confirmed', 'Pending')
     AND (to_jsonb(NEW) - 'status' - 'updated_at') = (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RETURN NEW;
  END IF;

  IF NOT public.staff_can_modify_appointment(OLD.user_id, OLD.professional_id, NEW.professional_id) THEN
    RAISE EXCEPTION 'staff_appointment_edit_forbidden'
      USING ERRCODE = '42501',
            DETAIL = 'A permissão da equipe definida pelo dono não permite alterar este agendamento.';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_staff_appointment_edit_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_staff_appointment_edit_scope() FROM anon;

DROP TRIGGER IF EXISTS enforce_staff_appointment_edit_scope ON public.appointments;
CREATE TRIGGER enforce_staff_appointment_edit_scope
  BEFORE UPDATE OR DELETE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_staff_appointment_edit_scope();
