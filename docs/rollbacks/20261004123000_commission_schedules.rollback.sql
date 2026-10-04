-- Rollback de 20261004123000_commission_schedules.sql
-- Restaura _commission_cycle_core ao corpo de 20261003110000 e remove o que este PR criou.
-- Não mexe em commission_payments nem em finance_records.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('agendix_commission_reminders');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

UPDATE public.team_members tm
   SET commission_payment_frequency = b.commission_payment_frequency,
       commission_payment_day = b.commission_payment_day
  FROM public.commission_frequency_reset_backup b
 WHERE tm.id = b.professional_id;

DROP FUNCTION IF EXISTS public.generate_commission_reminders_v1(timestamptz);
DROP FUNCTION IF EXISTS public.dismiss_commission_schedule_notice_v1();
DROP FUNCTION IF EXISTS public.get_commission_schedules_v1();
DROP FUNCTION IF EXISTS public.preview_commission_schedule_v1(uuid, text, int[], date, int, int[]);
DROP FUNCTION IF EXISTS public.set_commission_schedule_v1(uuid, text, int[], date, int, int[], boolean);
DROP FUNCTION IF EXISTS public._commission_emit_reminder(text, uuid, date, int, text, text);
DROP FUNCTION IF EXISTS public._commission_insert_reminder(text, uuid, date, int, text, text);
DROP FUNCTION IF EXISTS public._commission_validate_rule(text, int[], int, int[], boolean);
DROP FUNCTION IF EXISTS public._commission_require_owner();
DROP FUNCTION IF EXISTS public._commission_cycle_bounds(text, uuid, date);
DROP FUNCTION IF EXISTS public._commission_prev_close(text, uuid, date);
DROP FUNCTION IF EXISTS public._commission_next_close(text, uuid, date, boolean);
DROP FUNCTION IF EXISTS public._commission_is_close(text, uuid, date);
DROP FUNCTION IF EXISTS public._commission_rule_for_close(text, uuid, date);
DROP FUNCTION IF EXISTS public._commission_last_close_of_rule(text, int[], date, date);
DROP FUNCTION IF EXISTS public._commission_first_close_of_rule(text, int[], date, date);
DROP FUNCTION IF EXISTS public._commission_month_closes(date, int[]);

DROP TABLE IF EXISTS public.commission_schedules;
DROP TABLE IF EXISTS public.commission_reminder_log;
DROP TABLE IF EXISTS public.commission_frequency_reset_backup;

ALTER TABLE public.business_settings DROP COLUMN IF EXISTS commission_schedule_notice;

-- Ciclo de acerto: fechado = (dia+1 do mês anterior) … (dia do mês), no fuso do tenant
CREATE OR REPLACE FUNCTION public._commission_cycle_core(p_tenant text, p_cycle_end date, p_now timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text := public._staff_perf_tz(p_tenant);
  v_region text;
  v_day int;
  v_today date;
  v_end date;
  v_start date;
  v_from timestamptz;
  v_to timestamptz;
  v_members jsonb;
BEGIN
  SELECT upper(p.region) INTO v_region FROM public.profiles p WHERE p.id = p_tenant;
  SELECT LEAST(GREATEST(COALESCE(bs.commission_settlement_day_of_month, 5), 1), 31) INTO v_day
  FROM public.business_settings bs WHERE bs.user_id = p_tenant LIMIT 1;
  v_day := COALESCE(v_day, 5);
  v_today := (p_now AT TIME ZONE v_tz)::date;

  IF p_cycle_end IS NULL THEN
    v_end := public._commission_settle_date(v_today, v_day);
    IF v_today <= v_end THEN  -- o ciclo deste mês ainda está aberto → padrão = último fechado
      v_end := public._commission_settle_date((date_trunc('month', v_today) - interval '1 month')::date, v_day);
    END IF;
  ELSE
    v_end := public._commission_settle_date(p_cycle_end, v_day);
  END IF;
  v_start := public._commission_settle_date((date_trunc('month', v_end) - interval '1 month')::date, v_day) + 1;
  v_from := v_start::timestamp AT TIME ZONE v_tz;
  v_to := (v_end + 1)::timestamp AT TIME ZONE v_tz;

  WITH fr AS (
    SELECT f.professional_id, COALESCE(f.commission_value, 0) AS cv, f.commission_paid, f.created_at,
           EXISTS (SELECT 1 FROM public.product_sales ps WHERE ps.finance_record_id = f.id) AS is_product
    FROM public.finance_records f
    WHERE f.user_id = p_tenant AND f.type = 'revenue' AND COALESCE(f.commission_value, 0) > 0
  ),
  agg AS (
    SELECT fr.professional_id,
      COALESCE(sum(fr.cv) FILTER (WHERE COALESCE(fr.commission_paid, false) = false AND fr.created_at >= v_from AND fr.created_at < v_to), 0) AS a_pagar_ciclo,
      COALESCE(sum(fr.cv) FILTER (WHERE COALESCE(fr.commission_paid, false) = false), 0) AS saldo_acumulado,
      COALESCE(sum(fr.cv) FILTER (WHERE COALESCE(fr.commission_paid, false) = false AND fr.created_at < v_from), 0) AS saldo_anterior,
      min((fr.created_at AT TIME ZONE v_tz)::date) FILTER (WHERE COALESCE(fr.commission_paid, false) = false) AS primeiro_nao_pago,
      COALESCE(sum(fr.cv) FILTER (WHERE COALESCE(fr.commission_paid, false) = true AND fr.created_at >= v_from AND fr.created_at < v_to), 0) AS pago_calculado,
      count(*) FILTER (WHERE COALESCE(fr.commission_paid, false) = false AND NOT fr.is_product AND fr.created_at >= v_from AND fr.created_at < v_to) AS servicos_ciclo,
      count(*) FILTER (WHERE COALESCE(fr.commission_paid, false) = false AND fr.is_product AND fr.created_at >= v_from AND fr.created_at < v_to) AS produtos_ciclo
    FROM fr GROUP BY fr.professional_id
  ),
  rows AS (
    SELECT tm.id, tm.name, tm.photo_url,
      (tm.active IS FALSE OR tm.deleted_at IS NOT NULL) AS inactive,
      COALESCE(tm.commission_rate, tm.commission_percent, 0) AS rate,
      COALESCE(a.a_pagar_ciclo, 0) AS a_pagar_ciclo, COALESCE(a.saldo_acumulado, 0) AS saldo_acumulado,
      COALESCE(a.saldo_anterior, 0) AS saldo_anterior,
      a.primeiro_nao_pago,
      COALESCE(a.pago_calculado, 0) AS pago_calculado,
      COALESCE(a.servicos_ciclo, 0) AS servicos_ciclo, COALESCE(a.produtos_ciclo, 0) AS produtos_ciclo,
      cp.amount AS pago_ciclo, cp.paid_at AS pago_ciclo_em,
      lp.paid_at AS last_paid_at, lp.amount AS last_amount, lp.start_date AS last_start, lp.end_date AS last_end
    FROM public.team_members tm
    LEFT JOIN agg a ON a.professional_id = tm.id
    LEFT JOIN LATERAL (
      SELECT sum(c.amount) AS amount, max(c.paid_at) AS paid_at FROM public.commission_payments c
      WHERE c.user_id = p_tenant AND c.professional_id = tm.id AND c.status = 'paid'
        AND c.start_date <= v_end AND c.end_date >= v_start
      HAVING count(*) > 0
    ) cp ON true
    LEFT JOIN LATERAL (
      SELECT c.paid_at, c.amount, c.start_date, c.end_date FROM public.commission_payments c
      WHERE c.user_id = p_tenant AND c.professional_id = tm.id AND c.status = 'paid'
      ORDER BY c.paid_at DESC NULLS LAST LIMIT 1
    ) lp ON true
    WHERE tm.user_id = p_tenant AND COALESCE(tm.is_owner, false) = false
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'professional_id', r.id, 'name', r.name, 'photo_url', r.photo_url, 'inactive', r.inactive,
      'commission_rate', r.rate,
      'a_pagar_ciclo', round(r.a_pagar_ciclo, 2),
      'saldo_acumulado', round(r.saldo_acumulado, 2),
      'saldo_anterior', round(r.saldo_anterior, 2),
      'primeiro_nao_pago', r.primeiro_nao_pago,
      'servicos_ciclo', r.servicos_ciclo, 'produtos_ciclo', r.produtos_ciclo,
      'pago_ciclo', round(r.pago_ciclo, 2), 'pago_ciclo_em', r.pago_ciclo_em, 'pago_calculado', round(r.pago_calculado, 2),
      'status', CASE
        WHEN r.a_pagar_ciclo > 0 OR r.saldo_anterior > 0 THEN 'pendente'
        WHEN r.pago_ciclo IS NOT NULL AND abs(r.pago_ciclo - r.pago_calculado) <= 0.01 THEN 'pago'
        WHEN r.pago_ciclo IS NOT NULL THEN 'pago_com_ajuste'
        ELSE 'nada_a_pagar' END,
      'ultimo_pagamento', CASE WHEN r.last_paid_at IS NOT NULL THEN jsonb_build_object(
        'paid_at', r.last_paid_at, 'amount', r.last_amount, 'start_date', r.last_start, 'end_date', r.last_end) END)
    ORDER BY r.inactive, r.a_pagar_ciclo DESC, r.name), '[]'::jsonb)
  INTO v_members
  FROM rows r
  WHERE NOT r.inactive OR r.saldo_acumulado > 0 OR r.last_paid_at IS NOT NULL;

  RETURN jsonb_build_object(
    'cycle', jsonb_build_object('start', v_start, 'end', v_end, 'open', v_today <= v_end AND v_today >= v_start),
    'settlement_day', v_day, 'tz', v_tz,
    'currency', CASE WHEN v_region = 'PT' THEN 'EUR' ELSE 'BRL' END,
    'previous_end', public._commission_settle_date((date_trunc('month', v_end) - interval '1 month')::date, v_day),
    'next_end', public._commission_settle_date((date_trunc('month', v_end) + interval '1 month')::date, v_day),
    'members', v_members,
    'totals', jsonb_build_object(
      'a_pagar_ciclo', (SELECT COALESCE(round(sum((e ->> 'a_pagar_ciclo')::numeric + (e ->> 'saldo_anterior')::numeric), 2), 0) FROM jsonb_array_elements(v_members) e),
      'pendentes', (SELECT count(*) FROM jsonb_array_elements(v_members) e WHERE e ->> 'status' = 'pendente'),
      'pago_ciclo', (SELECT COALESCE(round(sum((e ->> 'pago_ciclo')::numeric), 2), 0) FROM jsonb_array_elements(v_members) e)));
END;
$$;

-- RPC pública: dono (equipe inteira ou 1 colaborador) ou colaborador ativo (só ele, payload reduzido)
CREATE OR REPLACE FUNCTION public.get_staff_performance_v1(
  p_start date, p_end date, p_professional_id uuid DEFAULT NULL, p_compare boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_company text;
  v_member uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário autenticado obrigatório.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT p.role, NULLIF(btrim(p.company_id), '') INTO v_role, v_company FROM public.profiles p WHERE p.id = v_uid::text;

  IF v_role = 'owner' THEN
    RETURN public._staff_performance_core(v_uid::text, p_start, p_end, p_professional_id, p_compare, now(), false);
  END IF;

  IF v_role = 'staff' AND v_company IS NOT NULL THEN
    SELECT tm.id INTO v_member FROM public.team_members tm
    WHERE tm.staff_user_id = v_uid AND tm.user_id = v_company
      AND tm.active IS NOT FALSE AND tm.deleted_at IS NULL
    LIMIT 1;
    IF v_member IS NOT NULL AND (p_professional_id IS NULL OR p_professional_id = v_member) THEN
      RETURN public._staff_performance_core(v_company, p_start, p_end, v_member, p_compare, now(), true);
    END IF;
  END IF;

  RAISE EXCEPTION 'Sem permissão para ver estes resultados.' USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_commission_cycle_v1(p_cycle_end date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_uid::text AND p.role = 'owner') THEN
    RAISE EXCEPTION 'Apenas o dono pode ver os repasses.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public._commission_cycle_core(v_uid::text, p_cycle_end, now());
END;
$$;

REVOKE ALL ON FUNCTION public._commission_cycle_core(text, date, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._commission_cycle_core(text, date, timestamptz) TO service_role;

COMMIT;
