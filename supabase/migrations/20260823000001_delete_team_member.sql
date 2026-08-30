-- Exclusão definitiva de profissional preservando o histórico financeiro.
--
-- Substitui a RPC legada delete_team_member(uuid) criada manualmente em
-- produção (soft delete, referenciava a coluna inexistente auth_user_id e
-- não fixava search_path) por uma operação transacional de exclusão real,
-- conforme decisão de produto: apagar definitivamente preservando histórico.
--
-- Schema verificado em produção (Management API, 23 Ago 2026):
--   * team_members.user_id, finance_records.user_id e appointments.user_id são TEXT
--   * appointments.professional_id e finance_records.professional_id têm FK
--     NO ACTION para team_members (causa do erro 23503 no DELETE direto)
--   * commission_payments.professional_id já é FK ON DELETE SET NULL (auto)
--   * queue_entries, public_bookings, product_sales, received_by e completed_by: SET NULL (auto)
--   * finance_records.barber_name é NOT NULL (nome já preservado no histórico)

CREATE OR REPLACE FUNCTION public.delete_team_member(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id TEXT := get_auth_company_id();
  v_is_owner BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sua sessão expirou. Faça login novamente.';
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Não foi possível identificar sua empresa. Faça login novamente.';
  END IF;

  IF get_auth_role() = 'staff' THEN
    RAISE EXCEPTION 'Apenas o dono pode excluir profissionais.';
  END IF;

  SELECT COALESCE(is_owner, FALSE) INTO v_is_owner
  FROM public.team_members
  WHERE id = p_id
    AND user_id = v_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profissional não encontrado.';
  END IF;

  IF v_is_owner THEN
    RAISE EXCEPTION 'O perfil do dono não pode ser excluído.';
  END IF;

  UPDATE public.finance_records
  SET professional_id = NULL
  WHERE professional_id = p_id
    AND user_id = v_company_id;

  UPDATE public.appointments
  SET professional_id = NULL
  WHERE professional_id = p_id
    AND user_id = v_company_id;

  DELETE FROM public.team_members
  WHERE id = p_id
    AND user_id = v_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profissional não encontrado.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_team_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_team_member(UUID) TO authenticated;
