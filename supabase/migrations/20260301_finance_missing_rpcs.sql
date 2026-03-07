-- =======================================================================
-- RPCs FALTANTES — Módulo Financeiro
-- Data: 2026-03-01
-- Problema: mark_expense_as_paid e get_monthly_finance_history são chamados
-- pelo Finance.tsx mas não existem em nenhuma migration anterior.
-- =======================================================================

-- -----------------------------------------------------------------------
-- RPC 1: mark_expense_as_paid
-- Chamado pelo botão "LIQUIDAR" nas transações pendentes
-- Parâmetros: p_record_id (uuid/text), p_user_id (text)
-- -----------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mark_expense_as_paid(uuid, text);
DROP FUNCTION IF EXISTS public.mark_expense_as_paid(text, text);

CREATE OR REPLACE FUNCTION public.mark_expense_as_paid(
  p_record_id TEXT,
  p_user_id   TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE finance_records
  SET
    commission_paid    = TRUE,
    commission_paid_at = NOW(),
    status             = 'paid'
  WHERE id        = p_record_id::UUID
    AND user_id   = p_user_id
    AND type      = 'expense';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro não encontrado ou sem permissão: %', p_record_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_expense_as_paid(TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------
-- RPC 2: get_monthly_finance_history
-- Chamado pela aba "HISTÓRICO" do Finance.tsx
-- Retorna histórico mensal: month_name, year_num, revenue, expenses, profit
-- -----------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_monthly_finance_history(text, integer);

CREATE OR REPLACE FUNCTION public.get_monthly_finance_history(
  p_user_id     TEXT,
  p_months_count INTEGER DEFAULT 12
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(t) ORDER BY (row_to_json(t)->>'year_num'), (row_to_json(t)->>'month_num'))
  INTO v_result
  FROM (
    SELECT
      TO_CHAR(month_start, 'TMMonth') AS month_name,
      EXTRACT(YEAR  FROM month_start)::INTEGER AS year_num,
      EXTRACT(MONTH FROM month_start)::INTEGER AS month_num,

      -- Receita: agendamentos concluídos + entradas manuais sem appointment
      COALESCE((
        SELECT SUM(price)
        FROM appointments
        WHERE user_id = p_user_id
          AND status = 'Completed'
          AND DATE_TRUNC('month', appointment_time) = month_start
      ), 0)
      +
      COALESCE((
        SELECT SUM(COALESCE(revenue, 0))
        FROM finance_records
        WHERE user_id = p_user_id
          AND type = 'revenue'
          AND appointment_id IS NULL
          AND DATE_TRUNC('month', created_at) = month_start
      ), 0) AS revenue,

      -- Despesas pagas
      COALESCE((
        SELECT SUM(COALESCE(commission_value, 0))
        FROM finance_records
        WHERE user_id = p_user_id
          AND type = 'expense'
          AND (commission_paid IS TRUE OR status = 'paid')
          AND DATE_TRUNC('month', created_at) = month_start
      ), 0) AS expenses,

      -- Lucro
      COALESCE((
        SELECT SUM(price)
        FROM appointments
        WHERE user_id = p_user_id
          AND status = 'Completed'
          AND DATE_TRUNC('month', appointment_time) = month_start
      ), 0)
      +
      COALESCE((
        SELECT SUM(COALESCE(revenue, 0))
        FROM finance_records
        WHERE user_id = p_user_id
          AND type = 'revenue'
          AND appointment_id IS NULL
          AND DATE_TRUNC('month', created_at) = month_start
      ), 0)
      -
      COALESCE((
        SELECT SUM(COALESCE(commission_value, 0))
        FROM finance_records
        WHERE user_id = p_user_id
          AND type = 'expense'
          AND (commission_paid IS TRUE OR status = 'paid')
          AND DATE_TRUNC('month', created_at) = month_start
      ), 0) AS profit

    FROM (
      SELECT generate_series(
        DATE_TRUNC('month', NOW()) - ((p_months_count - 1) * INTERVAL '1 month'),
        DATE_TRUNC('month', NOW()),
        INTERVAL '1 month'
      ) AS month_start
    ) months
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_finance_history(TEXT, INTEGER) TO authenticated;
