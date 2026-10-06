-- Excluir profissional: bloqueia no servidor quando ainda há atendimento em aberto.
--
-- Antes: delete_staff_collaborator fazia o soft-delete mesmo com agendamentos
-- Pendentes/Confirmados atribuídos ao profissional (no futuro ou atrasados), que
-- ficavam presos a um profissional excluído. A tela agora explica e lista esses
-- atendimentos, mas outro cliente (API direta) poderia pular a tela.
--
-- Agora: mesma função de prod (pg_get_functiondef em 2026-10-06), idêntica exceto
-- pela guarda abaixo, logo após localizar o profissional (FOR UPDATE):
--   "em aberto" = appointments do MESMO negócio (user_id = dono) com
--   professional_id = profissional e status que NÃO é terminal. Terminais (igual a
--   utils/appointmentStatus.ts): Completed (Finalizado), Cancelled, NoShow
--   (Não compareceu) — comparados sem caixa/espaços, aceitando no_show.
--   Qualquer outro status (Pending, Confirmed, desconhecido) bloqueia: falha segura.
-- Erro: RAISE 'STAFF_HAS_OPEN_APPOINTMENTS' (P0001), DETAIL open_count=<n>,
-- HINT staff_has_open_appointments. Nada é alterado (a transação aborta antes do
-- UPDATE/purge). O FOR UPDATE no team_members conflita com o FOR KEY SHARE que o
-- INSERT em appointments (FK professional_id) pega: não há corrida com um
-- agendamento novo criado ao mesmo tempo.
-- Sem atendimento em aberto, o comportamento é o de prod (com e sem login, PR #138).
-- CREATE OR REPLACE mantém dono (postgres), ACL, SECURITY DEFINER, search_path e
-- COMMENT; nenhum GRANT/REVOKE aqui.
-- Rollback: docs/rollbacks/20261006084726_delete_staff_block_open_appointments.rollback.sql

CREATE OR REPLACE FUNCTION public.delete_staff_collaborator(p_member_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staff_user_id uuid;
  v_company_id text;
  v_open_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'OWNER_OR_MISSING_TEAM_MEMBER';
  END IF;

  SELECT staff_user_id, user_id::text
    INTO v_staff_user_id, v_company_id
  FROM public.team_members
  WHERE id = p_member_id
    AND user_id::text = auth.uid()::text
    AND COALESCE(is_owner, false) = false
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OWNER_OR_MISSING_TEAM_MEMBER';
  END IF;

  SELECT count(*)::integer
    INTO v_open_count
  FROM public.appointments a
  WHERE a.professional_id = p_member_id
    AND a.user_id = v_company_id
    AND lower(btrim(a.status)) NOT IN ('completed', 'cancelled', 'noshow', 'no_show');

  IF v_open_count > 0 THEN
    RAISE EXCEPTION 'STAFF_HAS_OPEN_APPOINTMENTS'
      USING ERRCODE = 'P0001',
            DETAIL = format('open_count=%s', v_open_count),
            HINT = 'staff_has_open_appointments';
  END IF;

  UPDATE public.team_members
  SET
    deleted_at = now(),
    active = false,
    staff_user_id = NULL,
    slug = CASE
      WHEN slug IS NULL OR btrim(slug) = '' THEN slug
      ELSE left(slug, 80) || '-del-' || replace(id::text, '-', '')
    END,
    updated_at = now()
  WHERE id = p_member_id;

  IF v_staff_user_id IS NOT NULL THEN
    PERFORM public.purge_staff_auth_user(v_staff_user_id, v_company_id);
  END IF;
END;
$function$;
