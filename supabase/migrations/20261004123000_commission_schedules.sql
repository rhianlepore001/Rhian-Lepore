-- =============================================================================
-- Fin PR-D: ciclo de comissão versionado (semanal / quinzenal / mensal)
-- ADITIVO. Não aplica sozinho em produção.
--
-- - Tabela commission_schedules (regra do negócio + exceção por colaborador)
-- - _commission_cycle_bounds + _commission_cycle_core passa a andar o ciclo real
-- - set_commission_schedule_v1 (dono, SECURITY DEFINER)
-- - Lembretes no sino: generate_commission_reminders_v1 (RPC no load + pg_cron se houver)
-- - Backfill mensal {dia de acerto ou 5}, effective_from 2000-01-01, pay_offset 0
-- - Reset dos colaboradores weekly/biweekly ignorados para a regra do negócio
--
-- ROLLBACK: docs/rollbacks/20261004123000_commission_schedules.rollback.sql
-- =============================================================================

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.commission_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  professional_id uuid NULL,
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  close_days int[] NOT NULL DEFAULT ARRAY[]::int[],
  anchor_date date NULL,
  pay_offset_days int NOT NULL DEFAULT 0 CHECK (pay_offset_days IN (0, 2, 5)),
  reminder_offsets int[] NOT NULL DEFAULT ARRAY[2, 0],
  effective_from date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_by uuid NULL,
  CONSTRAINT commission_schedules_close_days_shape CHECK (
    cardinality(close_days) = 0
    OR (
      frequency = 'weekly'
      AND cardinality(close_days) = 1
      AND close_days[1] BETWEEN 0 AND 6
    )
    OR (
      frequency = 'monthly'
      AND cardinality(close_days) = 1
      AND close_days[1] BETWEEN 1 AND 31
    )
    OR (
      frequency = 'biweekly'
      AND cardinality(close_days) = 2
      AND close_days[1] BETWEEN 1 AND 31
      AND close_days[2] BETWEEN 1 AND 31
      AND close_days[1] <> close_days[2]
      AND abs(close_days[1] - close_days[2]) >= 7
    )
  ),
  CONSTRAINT commission_schedules_reminder_offsets CHECK (
    reminder_offsets <@ ARRAY[0, 1, 2]
    AND cardinality(reminder_offsets) >= 1
  )
);

CREATE INDEX IF NOT EXISTS commission_schedules_tenant_prof_from_idx
  ON public.commission_schedules (user_id, professional_id, effective_from DESC, created_at DESC);

COMMENT ON TABLE public.commission_schedules IS
  'Regra versionada de fechamento de comissão. professional_id NULL = padrão do negócio; close_days vazio = herda o padrão.';

ALTER TABLE public.commission_schedules
  ALTER COLUMN created_at SET DEFAULT clock_timestamp();

ALTER TABLE public.commission_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commission_schedules_owner_select ON public.commission_schedules;
CREATE POLICY commission_schedules_owner_select
  ON public.commission_schedules
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::text
    AND public.get_auth_role() = 'owner'
  );

REVOKE ALL ON TABLE public.commission_schedules FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.commission_schedules TO authenticated;
GRANT ALL ON TABLE public.commission_schedules TO service_role;

CREATE TABLE IF NOT EXISTS public.commission_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  professional_id uuid NULL,
  cycle_end date NOT NULL,
  offset_days int NOT NULL,
  notification_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_reminder_log
  ADD COLUMN IF NOT EXISTS prof_key uuid
  GENERATED ALWAYS AS (COALESCE(professional_id, '00000000-0000-0000-0000-000000000000'::uuid)) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS commission_reminder_log_dedupe_idx
  ON public.commission_reminder_log (user_id, prof_key, cycle_end, offset_days);

ALTER TABLE public.commission_reminder_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.commission_reminder_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.commission_reminder_log TO service_role;

CREATE TABLE IF NOT EXISTS public.commission_frequency_reset_backup (
  professional_id uuid PRIMARY KEY,
  user_id text NOT NULL,
  commission_payment_frequency text,
  commission_payment_day int
);

-- Backup interno do reset: nunca exposto pelo PostgREST (Supabase dá ALL a anon/authenticated por padrão).
ALTER TABLE public.commission_frequency_reset_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.commission_frequency_reset_backup FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.commission_frequency_reset_backup TO service_role;

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS commission_schedule_notice boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text,
  message text,
  type text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS event_key text;

-- ---------------------------------------------------------------------------
-- Helpers de calendário
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._commission_month_closes(p_month date, p_days int[])
RETURNS date[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(d ORDER BY d), ARRAY[]::date[])
  FROM (
    SELECT DISTINCT public._commission_settle_date(p_month, d) AS d
    FROM unnest(COALESCE(p_days, ARRAY[]::int[])) AS d
    WHERE d BETWEEN 1 AND 31
  ) s
$$;

CREATE OR REPLACE FUNCTION public._commission_first_close_of_rule(
  p_frequency text, p_close_days int[], p_anchor date, p_from date)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_from date := p_from;
  v_month date;
  v_d date;
  v_dow int;
  i int;
BEGIN
  IF p_from IS NULL OR p_frequency IS NULL OR COALESCE(cardinality(p_close_days), 0) = 0 THEN
    RETURN NULL;
  END IF;
  IF p_frequency = 'weekly' THEN
    v_dow := p_close_days[1];
    IF p_anchor IS NOT NULL AND p_anchor > v_from THEN
      v_from := p_anchor;
    END IF;
    RETURN v_from + ((v_dow - extract(dow FROM v_from)::int + 7) % 7);
  END IF;
  v_month := date_trunc('month', v_from)::date;
  FOR i IN 0..18 LOOP
    FOREACH v_d IN ARRAY public._commission_month_closes(v_month, p_close_days) LOOP
      IF v_d >= v_from THEN
        RETURN v_d;
      END IF;
    END LOOP;
    v_month := (v_month + interval '1 month')::date;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._commission_last_close_of_rule(
  p_frequency text, p_close_days int[], p_anchor date, p_to date)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_to date := p_to;
  v_month date;
  v_d date;
  v_best date;
  v_dow int;
  v_delta int;
  i int;
BEGIN
  IF p_to IS NULL OR p_frequency IS NULL OR COALESCE(cardinality(p_close_days), 0) = 0 THEN
    RETURN NULL;
  END IF;
  IF p_frequency = 'weekly' THEN
    v_dow := p_close_days[1];
    v_delta := (extract(dow FROM v_to)::int - v_dow + 7) % 7;
    v_best := v_to - v_delta;
    IF p_anchor IS NOT NULL AND v_best < p_anchor THEN
      RETURN NULL;
    END IF;
    RETURN v_best;
  END IF;
  v_month := date_trunc('month', v_to)::date;
  FOR i IN 0..18 LOOP
    v_best := NULL;
    FOREACH v_d IN ARRAY public._commission_month_closes(v_month, p_close_days) LOOP
      IF v_d <= v_to THEN
        v_best := v_d;
      END IF;
    END LOOP;
    IF v_best IS NOT NULL THEN
      RETURN v_best;
    END IF;
    v_month := (v_month - interval '1 month')::date;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._commission_rule_for_close(
  p_tenant text, p_professional_id uuid, p_close date,
  OUT frequency text, OUT close_days int[], OUT anchor_date date,
  OUT pay_offset_days int, OUT reminder_offsets int[], OUT effective_from date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.commission_schedules%ROWTYPE;
BEGIN
  frequency := 'monthly';
  close_days := ARRAY[5];
  anchor_date := NULL;
  pay_offset_days := 0;
  reminder_offsets := ARRAY[2, 0];
  effective_from := DATE '2000-01-01';

  IF p_professional_id IS NOT NULL THEN
    SELECT * INTO r
    FROM public.commission_schedules s
    WHERE s.user_id = p_tenant
      AND s.professional_id = p_professional_id
      AND s.effective_from < p_close
    ORDER BY s.effective_from DESC, s.created_at DESC
    LIMIT 1;
    IF FOUND AND COALESCE(cardinality(r.close_days), 0) > 0 THEN
      frequency := r.frequency;
      close_days := r.close_days;
      anchor_date := r.anchor_date;
      pay_offset_days := r.pay_offset_days;
      reminder_offsets := r.reminder_offsets;
      effective_from := r.effective_from;
      RETURN;
    END IF;
  END IF;

  SELECT * INTO r
  FROM public.commission_schedules s
  WHERE s.user_id = p_tenant
    AND s.professional_id IS NULL
    AND s.effective_from < p_close
  ORDER BY s.effective_from DESC, s.created_at DESC
  LIMIT 1;
  IF FOUND AND COALESCE(cardinality(r.close_days), 0) > 0 THEN
    frequency := r.frequency;
    close_days := r.close_days;
    anchor_date := r.anchor_date;
    pay_offset_days := r.pay_offset_days;
    reminder_offsets := r.reminder_offsets;
    effective_from := r.effective_from;
    RETURN;
  END IF;

  SELECT ARRAY[LEAST(GREATEST(COALESCE(bs.commission_settlement_day_of_month, 5), 1), 31)]
    INTO close_days
  FROM public.business_settings bs
  WHERE bs.user_id = p_tenant
  LIMIT 1;
  close_days := COALESCE(close_days, ARRAY[5]);
END;
$$;

CREATE OR REPLACE FUNCTION public._commission_is_close(
  p_tenant text, p_professional_id uuid, p_date date)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v date;
BEGIN
  IF p_date IS NULL THEN RETURN false; END IF;
  r := public._commission_rule_for_close(p_tenant, p_professional_id, p_date);
  v := public._commission_first_close_of_rule(r.frequency, r.close_days, r.anchor_date, p_date);
  RETURN v = p_date;
END;
$$;

CREATE OR REPLACE FUNCTION public._commission_next_close(
  p_tenant text, p_professional_id uuid, p_from date, p_inclusive boolean)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
-- Próximo fechamento >= p_from (ou > p_from). A regra r = _commission_rule_for_close(v)
-- vale para todo d em [v, t], t = primeira transição (effective_from) >= v; um close
-- c de r só é válido se c <= t. Senão, recomeça em t + 1 com a regra seguinte.
DECLARE
  v date := CASE WHEN p_inclusive THEN p_from ELSE p_from + 1 END;
  r record;
  c date;
  t date;
  i int;
BEGIN
  IF v IS NULL THEN RETURN NULL; END IF;
  FOR i IN 1..60 LOOP
    r := public._commission_rule_for_close(p_tenant, p_professional_id, v);
    c := public._commission_first_close_of_rule(r.frequency, r.close_days, r.anchor_date, v);
    t := public._commission_rule_transition(p_tenant, p_professional_id, v, true);
    IF c IS NOT NULL AND (t IS NULL OR c <= t) THEN
      RETURN c;
    END IF;
    IF t IS NULL THEN
      RETURN NULL;
    END IF;
    v := t + 1;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._commission_prev_close(
  p_tenant text, p_professional_id uuid, p_before date)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
-- Último fechamento < p_before. A regra r = _commission_rule_for_close(v) vale para
-- todo d em (l, v], l = última transição < v; um close c de r só é válido se c > l.
-- Senão, recomeça em l (que pertence à regra anterior e costuma ser o último close dela).
DECLARE
  v date := p_before - 1;
  r record;
  c date;
  l date;
  i int;
BEGIN
  IF p_before IS NULL THEN RETURN NULL; END IF;
  FOR i IN 1..60 LOOP
    r := public._commission_rule_for_close(p_tenant, p_professional_id, v);
    c := public._commission_last_close_of_rule(r.frequency, r.close_days, r.anchor_date, v);
    l := public._commission_rule_transition(p_tenant, p_professional_id, v, false);
    IF c IS NOT NULL AND (l IS NULL OR c > l) THEN
      RETURN c;
    END IF;
    IF l IS NULL THEN
      RETURN NULL;
    END IF;
    v := l;
  END LOOP;
  RETURN NULL;
END;
$$;

-- Primeira transição >= p_date (p_after) ou última < p_date, considerando as linhas
-- do negócio e, se houver colaborador, as dele.
CREATE OR REPLACE FUNCTION public._commission_rule_transition(
  p_tenant text, p_professional_id uuid, p_date date, p_after boolean)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN p_after
    THEN min(s.effective_from) FILTER (WHERE s.effective_from >= p_date)
    ELSE max(s.effective_from) FILTER (WHERE s.effective_from < p_date)
  END
  FROM public.commission_schedules s
  WHERE s.user_id = p_tenant
    AND (s.professional_id IS NULL OR s.professional_id = p_professional_id)
$$;

-- start/end/pay_due da versão em vigor no fechamento p_ref_date (já um close, ou snap).
CREATE OR REPLACE FUNCTION public._commission_cycle_bounds(
  p_tenant text, p_professional_id uuid, p_ref_date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
-- Ciclo que contém p_ref_date (se p_ref_date é um fechamento, o ciclo que termina nele).
DECLARE
  v_end date := p_ref_date;
  v_start date;
  v_prev date;
  r record;
BEGIN
  IF p_ref_date IS NULL THEN
    RETURN NULL;
  END IF;
  IF NOT public._commission_is_close(p_tenant, p_professional_id, v_end) THEN
    v_end := public._commission_next_close(p_tenant, p_professional_id, p_ref_date, true);
  END IF;
  IF v_end IS NULL THEN
    RETURN NULL;
  END IF;
  r := public._commission_rule_for_close(p_tenant, p_professional_id, v_end);
  v_prev := public._commission_prev_close(p_tenant, p_professional_id, v_end);
  IF v_prev IS NOT NULL THEN
    v_start := v_prev + 1;
  ELSIF r.frequency = 'weekly' THEN
    v_start := v_end - 6;
  ELSIF r.frequency = 'biweekly' THEN
    v_start := v_end - 14;
  ELSE
    v_start := public._commission_settle_date((date_trunc('month', v_end) - interval '1 month')::date, r.close_days[1]) + 1;
  END IF;
  RETURN jsonb_build_object(
    'start', v_start,
    'end', v_end,
    'pay_due', v_end + COALESCE(r.pay_offset_days, 0),
    'frequency', r.frequency,
    'close_days', to_jsonb(r.close_days),
    'pay_offset_days', COALESCE(r.pay_offset_days, 0),
    'reminder_offsets', to_jsonb(COALESCE(r.reminder_offsets, ARRAY[2, 0]))
  );
END;
$$;

-- Janela própria do colaborador com exceção ativa (NULL = segue a regra do negócio).
-- Ciclo do colaborador = o que termina no último fechamento dele <= p_biz_end.
CREATE OR REPLACE FUNCTION public._commission_member_window(
  p_tenant text, p_professional_id uuid, p_biz_end date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end date;
  v_own boolean;
  b jsonb;
BEGIN
  IF p_professional_id IS NULL OR p_biz_end IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.commission_schedules s
    WHERE s.user_id = p_tenant AND s.professional_id = p_professional_id
  ) THEN
    RETURN NULL;
  END IF;
  v_end := public._commission_prev_close(p_tenant, p_professional_id, p_biz_end + 1);
  IF v_end IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT COALESCE(cardinality(s.close_days), 0) > 0 INTO v_own
  FROM public.commission_schedules s
  WHERE s.user_id = p_tenant AND s.professional_id = p_professional_id
    AND s.effective_from < v_end
  ORDER BY s.effective_from DESC, s.created_at DESC
  LIMIT 1;
  IF NOT COALESCE(v_own, false) THEN
    RETURN NULL;
  END IF;
  b := public._commission_cycle_bounds(p_tenant, p_professional_id, v_end);
  IF b IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'start', b ->> 'start', 'end', b ->> 'end', 'pay_due', b ->> 'pay_due',
    'frequency', b ->> 'frequency', 'close_days', b -> 'close_days');
END;
$$;

-- ---------------------------------------------------------------------------
-- _commission_cycle_core: mesma assinatura; dates via bounds; previous/next reais
-- ---------------------------------------------------------------------------
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
  v_bounds jsonb;
  v_pay_due date;
  v_freq text;
  v_open_end date;
  v_rule record;
  v_prev_end date;
  v_next_end date;
BEGIN
  SELECT upper(p.region) INTO v_region FROM public.profiles p WHERE p.id = p_tenant;
  SELECT LEAST(GREATEST(COALESCE(bs.commission_settlement_day_of_month, 5), 1), 31) INTO v_day
  FROM public.business_settings bs WHERE bs.user_id = p_tenant LIMIT 1;
  v_day := COALESCE(v_day, 5);
  v_today := (p_now AT TIME ZONE v_tz)::date;

  IF p_cycle_end IS NULL THEN
    v_open_end := public._commission_next_close(p_tenant, NULL, v_today, true);
    IF v_open_end IS NULL THEN
      v_end := public._commission_settle_date(v_today, v_day);
      IF v_today <= v_end THEN
        v_end := public._commission_settle_date((date_trunc('month', v_today) - interval '1 month')::date, v_day);
      END IF;
    ELSE
      v_end := public._commission_prev_close(p_tenant, NULL, v_open_end);
      IF v_end IS NULL THEN
        v_end := v_open_end;
      END IF;
    END IF;
  ELSIF public._commission_is_close(p_tenant, NULL, p_cycle_end) THEN
    v_end := p_cycle_end;
  ELSE
    v_open_end := public._commission_next_close(p_tenant, NULL, p_cycle_end, true);
    v_rule := public._commission_rule_for_close(p_tenant, NULL, COALESCE(v_open_end, p_cycle_end));
    IF v_rule.frequency = 'monthly' THEN
      v_end := public._commission_settle_date(p_cycle_end, COALESCE(v_rule.close_days[1], v_day));
      IF NOT public._commission_is_close(p_tenant, NULL, v_end) THEN
        v_end := v_open_end;
      END IF;
    ELSE
      v_end := v_open_end;
    END IF;
    IF v_end IS NULL THEN
      v_end := public._commission_settle_date(p_cycle_end, v_day);
    END IF;
  END IF;

  v_bounds := public._commission_cycle_bounds(p_tenant, NULL, v_end);
  IF v_bounds IS NULL OR v_bounds ->> 'start' IS NULL THEN
    v_start := public._commission_settle_date((date_trunc('month', v_end) - interval '1 month')::date, v_day) + 1;
    v_pay_due := v_end;
    v_freq := 'monthly';
  ELSE
    v_start := (v_bounds ->> 'start')::date;
    v_end := (v_bounds ->> 'end')::date;
    v_pay_due := (v_bounds ->> 'pay_due')::date;
    v_freq := v_bounds ->> 'frequency';
  END IF;

  v_from := v_start::timestamp AT TIME ZONE v_tz;
  v_to := (v_end + 1)::timestamp AT TIME ZONE v_tz;

  WITH mw AS (
    SELECT tm.id, public._commission_member_window(p_tenant, tm.id, v_end) AS w
    FROM public.team_members tm
    WHERE tm.user_id = p_tenant AND COALESCE(tm.is_owner, false) = false
  ),
  mwin AS (
    SELECT mw.id, mw.w,
      COALESCE((mw.w ->> 'start')::date, v_start) AS m_start,
      COALESCE((mw.w ->> 'end')::date, v_end) AS m_end,
      COALESCE((mw.w ->> 'start')::date, v_start)::timestamp AT TIME ZONE v_tz AS m_from,
      (COALESCE((mw.w ->> 'end')::date, v_end) + 1)::timestamp AT TIME ZONE v_tz AS m_to
    FROM mw
  ),
  fr AS (
    SELECT f.professional_id, COALESCE(f.commission_value, 0) AS cv, f.commission_paid, f.created_at,
           EXISTS (SELECT 1 FROM public.product_sales ps WHERE ps.finance_record_id = f.id) AS is_product,
           w.m_from, w.m_to
    FROM public.finance_records f
    JOIN mwin w ON w.id = f.professional_id
    WHERE f.user_id = p_tenant AND f.type = 'revenue' AND COALESCE(f.commission_value, 0) > 0
  ),
  agg AS (
    SELECT fr.professional_id,
      COALESCE(sum(fr.cv) FILTER (WHERE COALESCE(fr.commission_paid, false) = false AND fr.created_at >= fr.m_from AND fr.created_at < fr.m_to), 0) AS a_pagar_ciclo,
      COALESCE(sum(fr.cv) FILTER (WHERE COALESCE(fr.commission_paid, false) = false), 0) AS saldo_acumulado,
      COALESCE(sum(fr.cv) FILTER (WHERE COALESCE(fr.commission_paid, false) = false AND fr.created_at < fr.m_from), 0) AS saldo_anterior,
      min((fr.created_at AT TIME ZONE v_tz)::date) FILTER (WHERE COALESCE(fr.commission_paid, false) = false) AS primeiro_nao_pago,
      COALESCE(sum(fr.cv) FILTER (WHERE COALESCE(fr.commission_paid, false) = true AND fr.created_at >= fr.m_from AND fr.created_at < fr.m_to), 0) AS pago_calculado,
      count(*) FILTER (WHERE COALESCE(fr.commission_paid, false) = false AND NOT fr.is_product AND fr.created_at >= fr.m_from AND fr.created_at < fr.m_to) AS servicos_ciclo,
      count(*) FILTER (WHERE COALESCE(fr.commission_paid, false) = false AND fr.is_product AND fr.created_at >= fr.m_from AND fr.created_at < fr.m_to) AS produtos_ciclo
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
      lp.paid_at AS last_paid_at, lp.amount AS last_amount, lp.start_date AS last_start, lp.end_date AS last_end,
      w.w AS own_cycle
    FROM public.team_members tm
    JOIN mwin w ON w.id = tm.id
    LEFT JOIN agg a ON a.professional_id = tm.id
    LEFT JOIN LATERAL (
      SELECT sum(c.amount) AS amount, max(c.paid_at) AS paid_at FROM public.commission_payments c
      WHERE c.user_id = p_tenant AND c.professional_id = tm.id AND c.status = 'paid'
        AND c.start_date <= w.m_end AND c.end_date >= w.m_start
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
      || CASE WHEN r.own_cycle IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('own_cycle', r.own_cycle) END
    ORDER BY r.inactive, r.a_pagar_ciclo DESC, r.name), '[]'::jsonb)
  INTO v_members
  FROM rows r
  WHERE NOT r.inactive OR r.saldo_acumulado > 0 OR r.last_paid_at IS NOT NULL;

  v_prev_end := COALESCE(
    public._commission_prev_close(p_tenant, NULL, v_end),
    public._commission_settle_date((date_trunc('month', v_end) - interval '1 month')::date, v_day));
  v_next_end := COALESCE(
    public._commission_next_close(p_tenant, NULL, v_end, false),
    public._commission_settle_date((date_trunc('month', v_end) + interval '1 month')::date, v_day));

  RETURN jsonb_build_object(
    'cycle', jsonb_build_object(
      'start', v_start, 'end', v_end,
      'open', v_today <= v_end AND v_today >= v_start,
      'pay_due', v_pay_due),
    'settlement_day', v_day, 'tz', v_tz,
    'frequency', COALESCE(v_freq, 'monthly'),
    'pay_due', v_pay_due,
    'pay_offset_days', COALESCE((v_bounds ->> 'pay_offset_days')::int, 0),
    'currency', CASE WHEN v_region = 'PT' THEN 'EUR' ELSE 'BRL' END,
    'previous_end', v_prev_end,
    'next_end', v_next_end,
    'members', v_members,
    'totals', jsonb_build_object(
      'a_pagar_ciclo', (SELECT COALESCE(round(sum((e ->> 'a_pagar_ciclo')::numeric + (e ->> 'saldo_anterior')::numeric), 2), 0) FROM jsonb_array_elements(v_members) e),
      'pendentes', (SELECT count(*) FROM jsonb_array_elements(v_members) e WHERE e ->> 'status' = 'pendente'),
      'pago_ciclo', (SELECT COALESCE(round(sum((e ->> 'pago_ciclo')::numeric), 2), 0) FROM jsonb_array_elements(v_members) e)));
END;
$$;

-- ---------------------------------------------------------------------------
-- RPCs novas
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._commission_require_owner()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR public.get_auth_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Apenas o dono pode alterar o pagamento da comissão.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public._commission_validate_rule(
  p_frequency text, p_close_days int[], p_pay_offset_days int, p_reminder_offsets int[], p_inherit boolean)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_days int[];
  v_off int[];
BEGIN
  IF p_pay_offset_days IS NULL OR p_pay_offset_days NOT IN (0, 2, 5) THEN
    RAISE EXCEPTION 'Prazo de pagamento inválido.' USING ERRCODE = '22023';
  END IF;
  v_off := COALESCE(p_reminder_offsets, ARRAY[2, 0]);
  IF NOT (v_off <@ ARRAY[0, 1, 2]) OR cardinality(v_off) < 1 THEN
    RAISE EXCEPTION 'Lembretes inválidos.' USING ERRCODE = '22023';
  END IF;
  IF p_inherit THEN
    RETURN;
  END IF;
  IF p_frequency NOT IN ('weekly', 'biweekly', 'monthly') THEN
    RAISE EXCEPTION 'Frequência inválida.' USING ERRCODE = '22023';
  END IF;
  v_days := COALESCE(p_close_days, ARRAY[]::int[]);
  IF p_frequency = 'weekly' THEN
    IF cardinality(v_days) <> 1 OR v_days[1] NOT BETWEEN 0 AND 6 THEN
      RAISE EXCEPTION 'Escolha um dia da semana.' USING ERRCODE = '22023';
    END IF;
  ELSIF p_frequency = 'monthly' THEN
    IF cardinality(v_days) <> 1 OR v_days[1] NOT BETWEEN 1 AND 31 THEN
      RAISE EXCEPTION 'Escolha o dia do mês.' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF cardinality(v_days) <> 2 OR v_days[1] NOT BETWEEN 1 AND 31 OR v_days[2] NOT BETWEEN 1 AND 31
       OR v_days[1] = v_days[2] OR abs(v_days[1] - v_days[2]) < 7 THEN
      RAISE EXCEPTION 'Quinzenal precisa de dois dias com pelo menos 7 dias de intervalo.' USING ERRCODE = '22023';
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_commission_schedule_v1(
  p_professional_id uuid DEFAULT NULL,
  p_frequency text DEFAULT 'monthly',
  p_close_days int[] DEFAULT ARRAY[5],
  p_anchor_date date DEFAULT NULL,
  p_pay_offset_days int DEFAULT 2,
  p_reminder_offsets int[] DEFAULT ARRAY[2, 0],
  p_use_business_default boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := public._commission_require_owner();
  v_tenant text := v_uid::text;
  v_today date;
  v_eff date;
  v_tz text := public._staff_perf_tz(v_tenant);
  v_days int[];
  v_id uuid;
  v_mirror int;
  v_is_owner boolean;
BEGIN
  v_today := (now() AT TIME ZONE v_tz)::date;
  IF p_professional_id IS NOT NULL THEN
    SELECT COALESCE(tm.is_owner, false) INTO v_is_owner
    FROM public.team_members tm
    WHERE tm.id = p_professional_id AND tm.user_id = v_tenant;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Colaborador não encontrado.' USING ERRCODE = '22023';
    END IF;
    IF v_is_owner THEN
      RAISE EXCEPTION 'O dono não entra na fila de comissão.' USING ERRCODE = '22023';
    END IF;
  ELSIF p_use_business_default THEN
    RAISE EXCEPTION 'A regra do negócio não pode herdar de si mesma.' USING ERRCODE = '22023';
  END IF;

  PERFORM public._commission_validate_rule(
    p_frequency, p_close_days, p_pay_offset_days, p_reminder_offsets,
    p_use_business_default AND p_professional_id IS NOT NULL);

  v_eff := public._commission_next_close(v_tenant, p_professional_id, v_today, true);
  IF v_eff IS NULL THEN
    v_eff := v_today;
  END IF;

  IF p_use_business_default AND p_professional_id IS NOT NULL THEN
    v_days := ARRAY[]::int[];
  ELSIF p_frequency = 'biweekly' THEN
    SELECT array_agg(d ORDER BY d) INTO v_days FROM unnest(p_close_days) d;
  ELSE
    v_days := p_close_days;
  END IF;

  INSERT INTO public.commission_schedules (
    user_id, professional_id, frequency, close_days, anchor_date,
    pay_offset_days, reminder_offsets, effective_from, created_by)
  VALUES (
    v_tenant, p_professional_id,
    COALESCE(p_frequency, 'monthly'),
    COALESCE(v_days, ARRAY[5]),
    CASE WHEN p_frequency = 'weekly' AND NOT (p_use_business_default AND p_professional_id IS NOT NULL) THEN v_eff ELSE NULL END,
    COALESCE(p_pay_offset_days, 2),
    COALESCE(p_reminder_offsets, ARRAY[2, 0]),
    v_eff, v_uid)
  RETURNING id INTO v_id;

  IF p_professional_id IS NULL AND NOT p_use_business_default THEN
    -- Espelho só para leitores legados (StaffPerformance, "Acerto todo dia N").
    -- business_settings tem CHECK 1..28 em prod: 29–31 e semanal/quinzenal não espelham.
    IF p_frequency = 'monthly' AND v_days[1] BETWEEN 1 AND 28 THEN
      v_mirror := v_days[1];
    ELSE
      v_mirror := NULL;
    END IF;
    IF v_mirror IS NOT NULL THEN
      UPDATE public.business_settings
         SET commission_settlement_day_of_month = v_mirror
       WHERE user_id = v_tenant;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', v_id,
    'effective_from', v_eff,
    'current_end', v_eff,
    'first_new_close', public._commission_next_close(v_tenant, p_professional_id, v_eff, false),
    'professional_id', p_professional_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_commission_schedule_v1(
  p_professional_id uuid DEFAULT NULL,
  p_frequency text DEFAULT 'monthly',
  p_close_days int[] DEFAULT ARRAY[5],
  p_anchor_date date DEFAULT NULL,
  p_pay_offset_days int DEFAULT 2,
  p_reminder_offsets int[] DEFAULT ARRAY[2, 0])
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := public._commission_require_owner();
  v_tenant text := v_uid::text;
  v_tz text := public._staff_perf_tz(v_tenant);
  v_today date;
  v_current_end date;
  v_closes date[] := ARRAY[]::date[];
  v_pays date[] := ARRAY[]::date[];
  v_rems date[] := ARRAY[]::date[];
  v_from date;
  v_c date;
  v_p date;
  v_off int;
  v_days int[];
  i int;
BEGIN
  PERFORM public._commission_validate_rule(
    p_frequency, p_close_days, p_pay_offset_days, p_reminder_offsets, false);
  v_today := (now() AT TIME ZONE v_tz)::date;
  v_current_end := public._commission_next_close(v_tenant, p_professional_id, v_today, true);
  IF p_frequency = 'biweekly' THEN
    SELECT array_agg(d ORDER BY d) INTO v_days FROM unnest(p_close_days) d;
  ELSE
    v_days := p_close_days;
  END IF;
  -- A mudança vale do próximo fechamento em diante: a prévia lista os closes da regra nova depois dele.
  v_from := COALESCE(v_current_end, v_today) + 1;
  FOR i IN 1..2 LOOP
    v_c := public._commission_first_close_of_rule(p_frequency, v_days, NULL, v_from);
    EXIT WHEN v_c IS NULL;
    v_closes := v_closes || v_c;
    v_p := v_c + COALESCE(p_pay_offset_days, 0);
    v_pays := v_pays || v_p;
    FOREACH v_off IN ARRAY COALESCE(p_reminder_offsets, ARRAY[2, 0]) LOOP
      IF v_off = 0 THEN
        v_rems := v_rems || v_p;
      ELSE
        v_rems := v_rems || (v_c - v_off);
      END IF;
    END LOOP;
    v_from := v_c + 1;
  END LOOP;
  SELECT array_agg(d ORDER BY d) INTO v_rems FROM (SELECT DISTINCT unnest(v_rems) AS d) s;
  RETURN jsonb_build_object(
    'today', v_today,
    'tz', v_tz,
    'current_end', v_current_end,
    'effective_from', v_current_end,
    'closes', to_jsonb(v_closes),
    'pay_dues', to_jsonb(v_pays),
    'reminders', to_jsonb(COALESCE(v_rems, ARRAY[]::date[]))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_commission_schedules_v1()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := public._commission_require_owner();
  v_tenant text := v_uid::text;
  v_tz text := public._staff_perf_tz(v_tenant);
  v_today date := (now() AT TIME ZONE v_tz)::date;
  v_notice boolean := false;
  v_biz jsonb;
  v_ex jsonb;
BEGIN
  SELECT COALESCE(bs.commission_schedule_notice, false) INTO v_notice
  FROM public.business_settings bs WHERE bs.user_id = v_tenant;

  SELECT to_jsonb(s) INTO v_biz
  FROM public.commission_schedules s
  WHERE s.user_id = v_tenant AND s.professional_id IS NULL
  ORDER BY s.effective_from DESC, s.created_at DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'professional_id', tm.id,
      'name', tm.name,
      'schedule', to_jsonb(s),
      'current_end', public._commission_next_close(v_tenant, tm.id, v_today, true)
    ) ORDER BY tm.name), '[]'::jsonb)
  INTO v_ex
  FROM public.team_members tm
  JOIN LATERAL (
    SELECT * FROM public.commission_schedules x
    WHERE x.user_id = v_tenant AND x.professional_id = tm.id
    ORDER BY x.effective_from DESC, x.created_at DESC
    LIMIT 1
  ) s ON COALESCE(cardinality(s.close_days), 0) > 0
  WHERE tm.user_id = v_tenant AND COALESCE(tm.is_owner, false) = false
    AND tm.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'today', v_today,
    'tz', v_tz,
    'notice', COALESCE(v_notice, false),
    'business', v_biz,
    'exceptions', COALESCE(v_ex, '[]'::jsonb),
    'current_end', public._commission_next_close(v_tenant, NULL, v_today, true)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_commission_schedule_notice_v1()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := public._commission_require_owner();
BEGIN
  UPDATE public.business_settings
     SET commission_schedule_notice = false
   WHERE user_id = v_uid::text;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public._commission_emit_reminder(
  p_tenant text, p_professional_id uuid, p_cycle_end date, p_offset int,
  p_title text, p_message text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_id uuid;
  v_log uuid;
BEGIN
  v_key := 'commission:' || p_tenant || ':' || COALESCE(p_professional_id::text, '_') || ':'
           || p_cycle_end::text || ':' || p_offset::text;
  INSERT INTO public.commission_reminder_log (user_id, professional_id, cycle_end, offset_days)
  VALUES (p_tenant, p_professional_id, p_cycle_end, p_offset)
  ON CONFLICT (user_id, prof_key, cycle_end, offset_days)
  DO NOTHING
  RETURNING id INTO v_log;
  IF v_log IS NULL THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.notifications (user_id, title, message, type, read, link, event_key)
  VALUES (p_tenant, p_title, p_message, 'commission_reminder', false, '/financeiro?tab=commissions', v_key)
  RETURNING id INTO v_id;
  UPDATE public.commission_reminder_log SET notification_id = v_id WHERE id = v_log;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_commission_reminders_v1(p_now timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tenants text[];
  v_tenant text;
  v_tz text;
  v_today date;
  v_open date;
  v_prev date;
  v_end date;
  v_pay date;
  v_off int;
  r record;
  v_bounds jsonb;
  v_msg text;
  v_title text;
  v_count int := 0;
  v_id uuid;
  v_prof uuid;
BEGIN
  IF v_uid IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_uid::text AND p.role = 'owner') THEN
      RAISE EXCEPTION 'Apenas o dono pode gerar lembretes de comissão.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    v_tenants := ARRAY[v_uid::text];
    p_now := now();  -- o cliente não escolhe a data (só cron/service_role testam outra)
  ELSE
    SELECT coalesce(array_agg(DISTINCT s.user_id), ARRAY[]::text[]) INTO v_tenants
    FROM public.commission_schedules s;
  END IF;

  FOREACH v_tenant IN ARRAY v_tenants LOOP
    -- Sem colaborador ativo (fora o dono) não há comissão a lembrar.
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = v_tenant AND COALESCE(tm.is_owner, false) = false
        AND tm.active IS NOT FALSE AND tm.deleted_at IS NULL);
    v_tz := public._staff_perf_tz(v_tenant);
    v_today := (p_now AT TIME ZONE v_tz)::date;
    v_open := public._commission_next_close(v_tenant, NULL, v_today, true);
    v_prev := public._commission_prev_close(v_tenant, NULL, COALESCE(v_open, v_today + 1));

    FOREACH v_end IN ARRAY ARRAY[v_open, v_prev] LOOP
      CONTINUE WHEN v_end IS NULL;
      v_bounds := public._commission_cycle_bounds(v_tenant, NULL, v_end);
      CONTINUE WHEN v_bounds IS NULL;
      v_pay := (v_bounds ->> 'pay_due')::date;
      FOREACH v_off IN ARRAY COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(v_bounds -> 'reminder_offsets')::int),
        ARRAY[2, 0]
      ) LOOP
        IF (v_off = 0 AND v_today = v_pay) OR (v_off > 0 AND v_today = v_end - v_off) THEN
          v_title := 'Pagamento de comissão';
          IF v_off = 0 THEN
            v_msg := 'Hoje é o prazo para pagar as comissões da equipe (até '
                     || to_char(v_pay, 'DD/MM') || ').';
          ELSIF v_off = 1 THEN
            v_msg := 'O ciclo fecha amanhã. Você paga até '
                     || to_char(v_pay, 'DD/MM') || '.';
          ELSE
            v_msg := 'Faltam ' || v_off || ' dias para o fechamento do ciclo. Você paga até '
                     || to_char(v_pay, 'DD/MM') || '.';
          END IF;
          v_id := public._commission_emit_reminder(v_tenant, NULL, v_end, v_off, v_title, v_msg);
          IF v_id IS NOT NULL THEN v_count := v_count + 1; END IF;
        END IF;
      END LOOP;
    END LOOP;

    FOR v_prof IN
      SELECT DISTINCT s.professional_id FROM public.commission_schedules s
      JOIN public.team_members tm ON tm.id = s.professional_id AND tm.user_id = v_tenant
      WHERE s.user_id = v_tenant AND s.professional_id IS NOT NULL
        AND COALESCE(tm.is_owner, false) = false AND tm.active IS NOT FALSE AND tm.deleted_at IS NULL
    LOOP
      v_open := public._commission_next_close(v_tenant, v_prof, v_today, true);
      v_prev := public._commission_prev_close(v_tenant, v_prof, COALESCE(v_open, v_today + 1));
      FOREACH v_end IN ARRAY ARRAY[v_open, v_prev] LOOP
        CONTINUE WHEN v_end IS NULL;
        CONTINUE WHEN public._commission_member_window(v_tenant, v_prof, v_end) IS NULL;
        v_bounds := public._commission_cycle_bounds(v_tenant, v_prof, v_end);
        CONTINUE WHEN v_bounds IS NULL;
        v_pay := (v_bounds ->> 'pay_due')::date;
        FOREACH v_off IN ARRAY COALESCE(
          ARRAY(SELECT jsonb_array_elements_text(v_bounds -> 'reminder_offsets')::int),
          ARRAY[2, 0]
        ) LOOP
          IF (v_off = 0 AND v_today = v_pay) OR (v_off > 0 AND v_today = v_end - v_off) THEN
            SELECT tm.name INTO v_title FROM public.team_members tm WHERE tm.id = v_prof;
            v_title := 'Comissão de ' || COALESCE(v_title, 'colaborador');
            IF v_off = 0 THEN
              v_msg := 'Hoje é o prazo para pagar a comissão (até ' || to_char(v_pay, 'DD/MM') || ').';
            ELSIF v_off = 1 THEN
              v_msg := 'O ciclo fecha amanhã. Você paga até ' || to_char(v_pay, 'DD/MM') || '.';
            ELSE
              v_msg := 'Faltam ' || v_off || ' dias para o fechamento. Você paga até ' || to_char(v_pay, 'DD/MM') || '.';
            END IF;
            v_id := public._commission_emit_reminder(v_tenant, v_prof, v_end, v_off, v_title, v_msg);
            IF v_id IS NOT NULL THEN v_count := v_count + 1; END IF;
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('inserted', v_count);
END;
$$;

-- ---------------------------------------------------------------------------
-- Backfill + reset dos weekly/biweekly ignorados
-- ---------------------------------------------------------------------------

INSERT INTO public.commission_schedules (
  user_id, professional_id, frequency, close_days, pay_offset_days, reminder_offsets, effective_from)
SELECT
  bs.user_id,
  NULL,
  'monthly',
  ARRAY[LEAST(GREATEST(COALESCE(bs.commission_settlement_day_of_month, 5), 1), 31)],
  0,
  ARRAY[2, 0],
  DATE '2000-01-01'
FROM public.business_settings bs
WHERE bs.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.commission_schedules s
    WHERE s.user_id = bs.user_id AND s.professional_id IS NULL
  );

INSERT INTO public.commission_schedules (
  user_id, professional_id, frequency, close_days, pay_offset_days, reminder_offsets, effective_from)
SELECT
  p.id,
  NULL,
  'monthly',
  ARRAY[5],
  0,
  ARRAY[2, 0],
  DATE '2000-01-01'
FROM public.profiles p
WHERE p.role = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM public.commission_schedules s
    WHERE s.user_id = p.id AND s.professional_id IS NULL
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'team_members'
      AND column_name = 'commission_payment_frequency'
  ) THEN
    WITH ins AS (
      INSERT INTO public.commission_frequency_reset_backup (
        professional_id, user_id, commission_payment_frequency, commission_payment_day)
      SELECT tm.id, tm.user_id, tm.commission_payment_frequency, tm.commission_payment_day
      FROM public.team_members tm
      WHERE lower(COALESCE(tm.commission_payment_frequency, '')) IN ('weekly', 'biweekly')
      ON CONFLICT (professional_id) DO NOTHING
      RETURNING user_id
    )
    UPDATE public.business_settings bs
       SET commission_schedule_notice = true
     WHERE bs.user_id IN (SELECT user_id FROM ins);

    UPDATE public.team_members tm
       SET commission_payment_frequency = 'monthly',
           commission_payment_day = COALESCE((
             SELECT LEAST(GREATEST(COALESCE(bs.commission_settlement_day_of_month, 5), 1), 31)
             FROM public.business_settings bs WHERE bs.user_id = tm.user_id LIMIT 1
           ), 5)
     WHERE tm.id IN (SELECT professional_id FROM public.commission_frequency_reset_backup);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Grants / revoke
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public._commission_month_closes(date,int[])',
    'public._commission_first_close_of_rule(text,int[],date,date)',
    'public._commission_last_close_of_rule(text,int[],date,date)',
    'public._commission_rule_for_close(text,uuid,date)',
    'public._commission_is_close(text,uuid,date)',
    'public._commission_next_close(text,uuid,date,boolean)',
    'public._commission_prev_close(text,uuid,date)',
    'public._commission_cycle_bounds(text,uuid,date)',
    'public._commission_rule_transition(text,uuid,date,boolean)',
    'public._commission_member_window(text,uuid,date)',
    'public._commission_require_owner()',
    'public._commission_validate_rule(text,int[],int,int[],boolean)',
    'public._commission_emit_reminder(text,uuid,date,int,text,text)'
  ] LOOP
    BEGIN
      EXECUTE 'REVOKE ALL ON FUNCTION ' || f || ' FROM PUBLIC, anon, authenticated';
      EXECUTE 'GRANT EXECUTE ON FUNCTION ' || f || ' TO service_role';
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public._commission_cycle_core(text, date, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._commission_cycle_core(text, date, timestamptz) TO service_role;

REVOKE ALL ON FUNCTION public.set_commission_schedule_v1(uuid, text, int[], date, int, int[], boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.preview_commission_schedule_v1(uuid, text, int[], date, int, int[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_commission_schedules_v1() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dismiss_commission_schedule_notice_v1() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_commission_reminders_v1(timestamptz) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.set_commission_schedule_v1(uuid, text, int[], date, int, int[], boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.preview_commission_schedule_v1(uuid, text, int[], date, int, int[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_commission_schedules_v1() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dismiss_commission_schedule_notice_v1() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_commission_reminders_v1(timestamptz) TO authenticated, service_role;

-- pg_cron se existir (UTC 08:20); o app do dono também chama a RPC no load.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('agendix_commission_reminders');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule(
      'agendix_commission_reminders',
      '20 8 * * *',
      $c$SELECT public.generate_commission_reminders_v1();$c$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Sem pg_cron utilizável os lembretes continuam pelo load do dono (RPC); não aborta a migration.
  RAISE WARNING 'pg_cron indisponível para agendix_commission_reminders: %', SQLERRM;
END $$;

COMMIT;
