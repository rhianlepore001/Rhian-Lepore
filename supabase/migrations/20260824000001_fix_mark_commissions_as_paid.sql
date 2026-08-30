-- Correção do fluxo de comissões pagas (23-24 Ago 2026).
--
-- Dois bugs no mesmo fluxo, verificados em produção via Management API:
--   1. mark_commissions_as_paid inseria em commission_payments SEM
--      status='paid' nem paid_at → pagamento ficava 'pending' para sempre
--      (o histórico "Pago" nunca teria linhas mesmo com a leitura correta).
--   2. A RPC era SECURITY DEFINER sem validar tenant (confiava no p_user_id
--      recebido) e sem SET search_path — mesmo padrão de hardening aplicado
--      em delete_team_member e update_commission_record/recalculate_pending.
--
-- Mantém a assinatura (text, uuid, numeric, date, date) para não quebrar o
-- frontend. Registros antigos presos em 'pending' NÃO são alterados (sem
-- sinal confiável de que foram pagos de verdade — decisão consciente).

CREATE OR REPLACE FUNCTION public.mark_commissions_as_paid(
  p_user_id TEXT,
  p_professional_id UUID,
  p_amount NUMERIC,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id TEXT;
  v_professional_name TEXT;
  v_commission_percent NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sua sessão expirou. Faça login novamente.';
  END IF;

  v_company_id := COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT);

  IF p_user_id IS DISTINCT FROM v_company_id THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  IF get_auth_role() = 'staff' THEN
    RAISE EXCEPTION 'Apenas o dono pode registrar pagamentos de comissão.';
  END IF;

  SELECT name, COALESCE(commission_percent, commission_rate, 0)
    INTO v_professional_name, v_commission_percent
  FROM public.team_members
  WHERE id = p_professional_id
    AND user_id = v_company_id;

  IF v_professional_name IS NULL THEN
    RAISE EXCEPTION 'Profissional não encontrado ou não autorizado.';
  END IF;

  INSERT INTO public.commission_payments (
    user_id,
    professional_id,
    payment_date,
    amount,
    start_date,
    end_date,
    status,
    paid_at,
    net_amount,
    commission_percent
  ) VALUES (
    v_company_id,
    p_professional_id,
    CURRENT_DATE,
    p_amount,
    p_start_date,
    p_end_date,
    'paid',
    NOW(),
    p_amount,
    v_commission_percent
  );

  UPDATE public.finance_records
  SET commission_paid = TRUE,
      commission_paid_at = NOW()
  WHERE user_id = v_company_id
    AND professional_id = p_professional_id
    AND created_at::DATE >= p_start_date
    AND created_at::DATE <= p_end_date
    AND commission_paid = FALSE
    AND type = 'revenue';

  INSERT INTO public.finance_records (
    user_id,
    professional_id,
    barber_name,
    revenue,
    commission_value,
    type,
    description,
    created_at,
    commission_paid
  ) VALUES (
    v_company_id,
    p_professional_id,
    v_professional_name,
    0,
    p_amount,
    'expense',
    'Pagamento de Comissão',
    NOW(),
    TRUE
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_commissions_as_paid(TEXT, UUID, NUMERIC, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_commissions_as_paid(TEXT, UUID, NUMERIC, DATE, DATE) TO authenticated;
