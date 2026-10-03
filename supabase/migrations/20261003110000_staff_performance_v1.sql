-- =============================================================================
-- P1: get_staff_performance_v1 + get_commission_cycle_v1 (ACCEPTANCE.md §4, §8, §9)
-- =============================================================================
-- Só ADITIVO: 10 funções novas + 2 índices. Nenhuma função existente é alterada
-- (mark_commissions_as_paid de prod permanece: outras telas ainda podem chamá-la).
--   _staff_perf_tz(text)                 fuso do tenant (business_settings → região)
--   _staff_perf_raw(...)                 agregados por colaborador (interna)
--   _staff_performance_core(..., p_now)  payload (interna; o harness fixa o "agora")
--   _commission_settle_date(date, int)   dia de acerto do mês (interna)
--   _commission_cycle_core(..., p_now)   ciclo de acerto (interna)
--   _pay_commission_core(...)            marca no fuso do tenant; paga o SUM marcado
--   get_staff_performance_v1(...)        RPC pública: dono (equipe) ou colaborador (só ele)
--   get_commission_cycle_v1(...)         RPC pública: só dono
--   preview_commission_pay_v1(...)       quanto seria marcado no intervalo (dono)
--   pay_commission_v1(...)               paga exatamente o preview (dono; no-op se 0)
-- As internas não têm EXECUTE para anon/authenticated.
-- Regras: período pela data LOCAL do atendimento; receita = appointments.price
-- (nunca total_price); comissão = finance_records.commission_value só de
-- receita (despesa nunca entra); 1 linha por atendimento (DISTINCT ON);
-- dono com comissão 0 e fora do ranking; clube fora de receita/ticket/hora.
-- Rollback: docs/rollbacks/20261003110000_staff_performance_v1_rollback.sql
-- =============================================================================

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE INDEX IF NOT EXISTS idx_appointments_user_client_time
  ON public.appointments (user_id, client_id, appointment_time);

CREATE INDEX IF NOT EXISTS idx_product_sales_finance_record_id
  ON public.product_sales (finance_record_id);

-- Fuso do tenant: business_settings.timezone → PT = Europe/Lisbon → America/Sao_Paulo
CREATE OR REPLACE FUNCTION public._staff_perf_tz(p_tenant text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT NULLIF(btrim(bs.timezone), '') FROM public.business_settings bs
      WHERE bs.user_id = p_tenant AND EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = btrim(bs.timezone))
      LIMIT 1),
    CASE WHEN (SELECT upper(p.region) FROM public.profiles p WHERE p.id = p_tenant) = 'PT'
         THEN 'Europe/Lisbon' ELSE 'America/Sao_Paulo' END)
$$;

-- Agregados por "balde": id do colaborador do tenant, NULL = "Sem profissional".
DROP FUNCTION IF EXISTS public._staff_perf_raw(text, timestamptz, timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION public._staff_perf_raw(
  p_tenant text, p_from timestamptz, p_to timestamptz, p_now timestamptz,
  p_month_tz text DEFAULT NULL)
RETURNS TABLE(bucket uuid, m jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH tm AS (
  SELECT t.id, COALESCE(t.is_owner, false) AS is_owner FROM public.team_members t WHERE t.user_id = p_tenant
),
ap AS (
  SELECT a.id, a.client_id, a.status, a.appointment_time, a.completed_at, a.service,
         COALESCE(a.price, 0) AS price,
         GREATEST(COALESCE(a.duration_minutes, 0), 0) AS dur,
         lower(btrim(COALESCE(a.payment_method, ''))) = 'membership' AS clube,
         tm.id AS bucket, COALESCE(tm.is_owner, false) AS is_owner,
         CASE WHEN p_month_tz IS NULL THEN NULL::date
              ELSE (date_trunc('month', a.appointment_time AT TIME ZONE p_month_tz))::date END AS month_key
  FROM public.appointments a
  LEFT JOIN tm ON tm.id = a.professional_id
  WHERE a.user_id = p_tenant AND a.appointment_time >= p_from AND a.appointment_time < p_to
),
done AS (
  SELECT ap.*, (NOT ap.clube AND ap.price > 0) AS pago,
         COALESCE(ap.completed_at, ap.appointment_time + make_interval(mins => ap.dur)) AS anchor
  FROM ap WHERE ap.status = 'Completed'
),
frs AS (  -- linhas de receita de serviço dos concluídos (sem venda de produto ligada)
  SELECT fr.id, fr.appointment_id, COALESCE(fr.commission_value, 0) AS cv, fr.created_at
  FROM public.finance_records fr
  JOIN done d ON d.id = fr.appointment_id
  WHERE fr.user_id = p_tenant AND fr.type = 'revenue'
    AND NOT EXISTS (SELECT 1 FROM public.product_sales ps WHERE ps.finance_record_id = fr.id)
),
fr1 AS (
  SELECT DISTINCT ON (frs.appointment_id) frs.appointment_id, frs.cv
  FROM frs ORDER BY frs.appointment_id, frs.created_at DESC, frs.id DESC
),
dup AS (SELECT frs.appointment_id FROM frs GROUP BY frs.appointment_id HAVING count(*) > 1),
svc AS (
  SELECT d.bucket, d.month_key,
    count(*) AS atendimentos,
    count(*) FILTER (WHERE d.clube) AS atendimentos_clube,
    count(*) FILTER (WHERE d.pago) AS atendimentos_pagos,
    COALESCE(sum(d.price) FILTER (WHERE NOT d.clube), 0) AS receita_servicos,
    COALESCE(sum(d.dur), 0) AS tempo_total_min,
    COALESCE(sum(d.dur) FILTER (WHERE d.pago), 0) AS tempo_pago_min,
    COALESCE(sum(d.dur) FILTER (WHERE d.clube), 0) AS tempo_clube_min,
    COALESCE(sum(CASE WHEN d.is_owner THEN 0 ELSE f.cv END), 0) AS comissao_servicos,
    count(*) FILTER (WHERE d.pago AND f.appointment_id IS NULL) AS sem_registro_financeiro,
    count(*) FILTER (WHERE EXISTS (SELECT 1 FROM dup WHERE dup.appointment_id = d.id)) AS duplicadas,
    count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.product_sales ps
                                   WHERE ps.appointment_id = d.id AND ps.company_id = p_tenant::uuid)) AS visitas_com_produto,
    count(*) FILTER (WHERE d.anchor <= p_now - interval '48 hours') AS maduros,
    count(*) FILTER (WHERE d.anchor <= p_now - interval '48 hours' AND EXISTS (
      SELECT 1 FROM public.appointments b
      WHERE b.user_id = p_tenant AND b.client_id = d.client_id AND b.id <> d.id
        AND b.status IN ('Pending', 'Confirmed', 'Completed')
        AND b.appointment_time > d.anchor
        AND b.appointment_time <= d.anchor + interval '45 days'
        AND b.created_at <= d.anchor + interval '48 hours')) AS voltou
  FROM done d LEFT JOIN fr1 f ON f.appointment_id = d.id
  GROUP BY d.bucket, d.month_key
),
outc AS (
  SELECT ap.bucket, ap.month_key,
    count(*) FILTER (WHERE ap.status = 'NoShow') AS faltas,
    count(*) FILTER (WHERE ap.status = 'Cancelled') AS cancelamentos,
    count(*) FILTER (WHERE ap.status IN ('Completed', 'NoShow', 'Cancelled')) AS desfechos,
    count(*) FILTER (WHERE ap.status IN ('Confirmed', 'Pending') AND ap.appointment_time < p_now) AS sem_desfecho
  FROM ap GROUP BY ap.bucket, ap.month_key
),
avl AS (  -- receitas avulsas atribuídas (sem atendimento, sem venda de produto)
  SELECT tm.id AS bucket,
    CASE WHEN p_month_tz IS NULL THEN NULL::date
         ELSE (date_trunc('month', fr.created_at AT TIME ZONE p_month_tz))::date END AS month_key,
    COALESCE(sum(fr.revenue), 0) AS receita_avulsa,
    COALESCE(sum(CASE WHEN tm.is_owner THEN 0 ELSE COALESCE(fr.commission_value, 0) END), 0) AS comissao_avulsa,
    count(*) AS avulsos
  FROM public.finance_records fr JOIN tm ON tm.id = fr.professional_id
  WHERE fr.user_id = p_tenant AND fr.type = 'revenue' AND fr.appointment_id IS NULL
    AND fr.created_at >= p_from AND fr.created_at < p_to
    AND NOT EXISTS (SELECT 1 FROM public.product_sales ps WHERE ps.finance_record_id = fr.id)
  GROUP BY 1, 2
),
prd AS (
  SELECT tm.id AS bucket,
    CASE WHEN p_month_tz IS NULL THEN NULL::date
         ELSE (date_trunc('month', ps.created_at AT TIME ZONE p_month_tz))::date END AS month_key,
    COALESCE(sum(ps.total_revenue), 0) AS receita_produtos,
    COALESCE(sum(ps.total_cost), 0) AS custo_produtos,
    COALESCE(sum(CASE WHEN COALESCE(tm.is_owner, false) THEN 0 ELSE ps.commission_value END), 0) AS comissao_produtos,
    count(*) AS vendas_produtos
  FROM public.product_sales ps LEFT JOIN tm ON tm.id = ps.professional_id
  WHERE ps.company_id = p_tenant::uuid AND ps.created_at >= p_from AND ps.created_at < p_to
  GROUP BY 1, 2
),
keys AS (
  SELECT bucket, month_key FROM svc
  UNION SELECT bucket, month_key FROM outc
  UNION SELECT bucket, month_key FROM avl
  UNION SELECT bucket, month_key FROM prd
),
raw AS (
  SELECT k.bucket, k.month_key,
    COALESCE(s.atendimentos, 0) AS atendimentos, COALESCE(s.atendimentos_clube, 0) AS atendimentos_clube,
    COALESCE(s.atendimentos_pagos, 0) AS atendimentos_pagos, COALESCE(s.receita_servicos, 0) AS receita_servicos,
    COALESCE(s.tempo_total_min, 0) AS tempo_total_min, COALESCE(s.tempo_pago_min, 0) AS tempo_pago_min,
    COALESCE(s.tempo_clube_min, 0) AS tempo_clube_min, COALESCE(s.comissao_servicos, 0) AS comissao_servicos,
    COALESCE(s.sem_registro_financeiro, 0) AS sem_registro_financeiro, COALESCE(s.duplicadas, 0) AS duplicadas,
    COALESCE(s.visitas_com_produto, 0) AS visitas_com_produto, COALESCE(s.maduros, 0) AS maduros,
    COALESCE(s.voltou, 0) AS voltou,
    COALESCE(o.faltas, 0) AS faltas, COALESCE(o.cancelamentos, 0) AS cancelamentos,
    COALESCE(o.desfechos, 0) AS desfechos, COALESCE(o.sem_desfecho, 0) AS sem_desfecho,
    COALESCE(v.receita_avulsa, 0) AS receita_avulsa, COALESCE(v.comissao_avulsa, 0) AS comissao_avulsa,
    COALESCE(v.avulsos, 0) AS avulsos,
    COALESCE(p.receita_produtos, 0) AS receita_produtos, COALESCE(p.custo_produtos, 0) AS custo_produtos,
    COALESCE(p.comissao_produtos, 0) AS comissao_produtos, COALESCE(p.vendas_produtos, 0) AS vendas_produtos
  FROM keys k
  LEFT JOIN svc s ON s.bucket IS NOT DISTINCT FROM k.bucket AND s.month_key IS NOT DISTINCT FROM k.month_key
  LEFT JOIN outc o ON o.bucket IS NOT DISTINCT FROM k.bucket AND o.month_key IS NOT DISTINCT FROM k.month_key
  LEFT JOIN avl v ON v.bucket IS NOT DISTINCT FROM k.bucket AND v.month_key IS NOT DISTINCT FROM k.month_key
  LEFT JOIN prd p ON p.bucket IS NOT DISTINCT FROM k.bucket AND p.month_key IS NOT DISTINCT FROM k.month_key
)
SELECT r.bucket, jsonb_build_object(
  'atendimentos', r.atendimentos,
  'atendimentos_clube', r.atendimentos_clube,
  'atendimentos_pagos', r.atendimentos_pagos,
  'receita_servicos', round(r.receita_servicos, 2),
  'tempo_total_min', r.tempo_total_min,
  'tempo_pago_min', r.tempo_pago_min,
  'tempo_clube_min', r.tempo_clube_min,
  'comissao_servicos', round(r.comissao_servicos, 2),
  'receita_avulsa', round(r.receita_avulsa, 2),
  'comissao_avulsa', round(r.comissao_avulsa, 2),
  'avulsos', r.avulsos,
  'receita_produtos', round(r.receita_produtos, 2),
  'custo_produtos', round(r.custo_produtos, 2),
  'comissao_produtos', round(r.comissao_produtos, 2),
  'vendas_produtos', r.vendas_produtos,
  'visitas_com_produto', r.visitas_com_produto,
  'attach', CASE WHEN r.atendimentos > 0 THEN round(r.visitas_com_produto::numeric / r.atendimentos, 4) END,
  'retorno', CASE WHEN r.atendimentos + r.vendas_produtos + r.avulsos > 0 THEN round(x.retorno, 2) END,
  'retorno_por_hora', CASE WHEN r.tempo_pago_min > 0 THEN round((x.retorno - r.receita_avulsa + r.comissao_avulsa) / (r.tempo_pago_min / 60.0), 2) END,
  'faturamento_por_hora', CASE WHEN r.tempo_pago_min > 0 THEN round(r.receita_servicos / (r.tempo_pago_min / 60.0), 2) END,
  'ticket_medio', CASE WHEN r.atendimentos_pagos > 0 THEN round(r.receita_servicos / r.atendimentos_pagos, 2) END,
  'faltas', r.faltas,
  'cancelamentos', r.cancelamentos,
  'desfechos', r.desfechos,
  'taxa_faltas', CASE WHEN r.desfechos > 0 THEN round(r.faltas::numeric / r.desfechos, 4) END,
  'taxa_cancelamentos', CASE WHEN r.desfechos > 0 THEN round(r.cancelamentos::numeric / r.desfechos, 4) END,
  'sem_desfecho', r.sem_desfecho,
  'maduros', r.maduros,
  'voltou', r.voltou,
  'voltou_taxa', CASE WHEN r.maduros > 0 THEN round(r.voltou::numeric / r.maduros, 4) END,
  'imaturos', r.atendimentos - r.maduros,
  'receita_gerada', round(r.receita_servicos + r.receita_produtos + r.receita_avulsa, 2),
  'comissao_periodo', round(r.comissao_servicos + r.comissao_produtos + r.comissao_avulsa, 2),
  'sem_registro_financeiro', r.sem_registro_financeiro,
  'duplicadas', r.duplicadas,
  'month', to_char(r.month_key, 'YYYY-MM')
)
FROM (
  SELECT * FROM raw
  UNION ALL  -- linha da equipe inteira (bucket = uuid nulo-zero), soma de todos os baldes
  SELECT '00000000-0000-0000-0000-000000000000'::uuid, NULL::date,
    COALESCE(sum(atendimentos), 0), COALESCE(sum(atendimentos_clube), 0), COALESCE(sum(atendimentos_pagos), 0),
    COALESCE(sum(receita_servicos), 0), COALESCE(sum(tempo_total_min), 0), COALESCE(sum(tempo_pago_min), 0),
    COALESCE(sum(tempo_clube_min), 0), COALESCE(sum(comissao_servicos), 0), COALESCE(sum(sem_registro_financeiro), 0),
    COALESCE(sum(duplicadas), 0), COALESCE(sum(visitas_com_produto), 0), COALESCE(sum(maduros), 0), COALESCE(sum(voltou), 0),
    COALESCE(sum(faltas), 0), COALESCE(sum(cancelamentos), 0), COALESCE(sum(desfechos), 0), COALESCE(sum(sem_desfecho), 0),
    COALESCE(sum(receita_avulsa), 0), COALESCE(sum(comissao_avulsa), 0), COALESCE(sum(avulsos), 0),
    COALESCE(sum(receita_produtos), 0), COALESCE(sum(custo_produtos), 0), COALESCE(sum(comissao_produtos), 0),
    COALESCE(sum(vendas_produtos), 0)
  FROM raw
  WHERE p_month_tz IS NULL
) r
CROSS JOIN LATERAL (
  SELECT r.receita_servicos + r.receita_avulsa + r.receita_produtos
       - r.comissao_servicos - r.comissao_avulsa - r.comissao_produtos - r.custo_produtos AS retorno
) x
$$;

CREATE OR REPLACE FUNCTION public._staff_performance_core(
  p_tenant text, p_start date, p_end date, p_professional_id uuid, p_compare boolean,
  p_now timestamptz, p_staff boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_team CONSTANT uuid := '00000000-0000-0000-0000-000000000000';
  c_min_sample CONSTANT int := 8;
  v_tz text;
  v_region text;
  v_prev_start date;
  v_prev_end date;
  v_from timestamptz;
  v_to timestamptz;
  v_cur jsonb;
  v_prev jsonb := '{}'::jsonb;
  v_members jsonb;
  v_trend jsonb;
  v_top jsonb;
  v_period jsonb;
  v_empty jsonb;
  v_staff_keys text[] := ARRAY[
    'atendimentos','atendimentos_clube','atendimentos_pagos','receita_servicos','tempo_total_min','tempo_pago_min',
    'tempo_clube_min','faturamento_por_hora','ticket_medio','faltas','cancelamentos','desfechos','taxa_faltas',
    'taxa_cancelamentos','sem_desfecho','visitas_com_produto','attach','receita_produtos','vendas_produtos',
    'maduros','voltou','voltou_taxa','imaturos','comissao_periodo','sem_registro_financeiro'];
  v_trend_from timestamptz;
  v_trend_to timestamptz;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_start > p_end THEN
    RAISE EXCEPTION 'Período inválido: início deve ser menor ou igual ao fim.' USING ERRCODE = '22023';
  END IF;
  IF p_end - p_start + 1 > 366 THEN
    RAISE EXCEPTION 'Período máximo é de 366 dias.' USING ERRCODE = '22023';
  END IF;

  v_tz := public._staff_perf_tz(p_tenant);
  SELECT upper(p.region) INTO v_region FROM public.profiles p WHERE p.id = p_tenant;

  -- Período anterior: mês cheio → mês anterior; senão os mesmos N dias antes
  IF p_start = date_trunc('month', p_start)::date
     AND p_end = (date_trunc('month', p_start) + interval '1 month - 1 day')::date THEN
    v_prev_start := (date_trunc('month', p_start) - interval '1 month')::date;
    v_prev_end := p_start - 1;
  ELSE
    v_prev_end := p_start - 1;
    v_prev_start := v_prev_end - (p_end - p_start);
  END IF;

  v_from := p_start::timestamp AT TIME ZONE v_tz;
  v_to := (p_end + 1)::timestamp AT TIME ZONE v_tz;

  SELECT COALESCE(jsonb_object_agg(COALESCE(r.bucket::text, 'unassigned'), r.m), '{}'::jsonb) INTO v_cur
  FROM public._staff_perf_raw(p_tenant, v_from, v_to, p_now) r;
  IF p_compare THEN
    SELECT COALESCE(jsonb_object_agg(COALESCE(r.bucket::text, 'unassigned'), r.m), '{}'::jsonb) INTO v_prev
    FROM public._staff_perf_raw(p_tenant, v_prev_start::timestamp AT TIME ZONE v_tz, p_start::timestamp AT TIME ZONE v_tz, p_now) r;
  END IF;
  -- métricas zeradas (linha de equipe de um intervalo vazio) para quem não tem dado
  SELECT r.m INTO v_empty FROM public._staff_perf_raw(p_tenant, v_from, v_from, p_now) r WHERE r.bucket = c_team;

  v_period := jsonb_build_object(
    'start', p_start, 'end', p_end, 'tz', v_tz,
    'currency', CASE WHEN v_region = 'PT' THEN 'EUR' ELSE 'BRL' END,
    'partial', (p_now AT TIME ZONE v_tz)::date BETWEEN p_start AND p_end,
    'previous', CASE WHEN p_compare THEN jsonb_build_object('start', v_prev_start, 'end', v_prev_end) END);

  IF p_professional_id IS NOT NULL THEN
    v_trend_from := (date_trunc('month', p_end) - interval '5 months')::timestamp AT TIME ZONE v_tz;
    v_trend_to := (date_trunc('month', p_end) + interval '1 month')::timestamp AT TIME ZONE v_tz;
    SELECT COALESCE(jsonb_agg(item ORDER BY item ->> 'month'), '[]'::jsonb) INTO v_trend
    FROM (
      SELECT jsonb_build_object(
        'month', to_char(gs, 'YYYY-MM'),
        'retorno', r.m -> 'retorno',
        'ticket_medio', r.m -> 'ticket_medio',
        'comissao', r.m -> 'comissao_periodo',
        'atendimentos', COALESCE((r.m ->> 'atendimentos')::int, 0),
        'low_sample', COALESCE((r.m ->> 'atendimentos')::int, 0) < c_min_sample)
        - CASE WHEN p_staff THEN 'retorno' ELSE '' END AS item
      FROM generate_series(
        date_trunc('month', p_end) - interval '5 months',
        date_trunc('month', p_end),
        interval '1 month') AS gs
      LEFT JOIN public._staff_perf_raw(p_tenant, v_trend_from, v_trend_to, p_now, v_tz) r
        ON r.bucket = p_professional_id AND r.m ->> 'month' = to_char(gs, 'YYYY-MM')
    ) s;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('service', t.service, 'count', t.n) ORDER BY t.n DESC, t.service), '[]'::jsonb)
      INTO v_top
    FROM (
      SELECT lower(btrim(a.service)) AS service, count(*) AS n
      FROM public.appointments a
      WHERE a.user_id = p_tenant AND a.professional_id = p_professional_id AND a.status = 'Completed'
        AND a.appointment_time >= v_from AND a.appointment_time < v_to
      GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 5
    ) t;
  END IF;

  IF p_staff THEN
    RETURN (
      SELECT jsonb_build_object(
        'mode', 'staff',
        'period', v_period,
        'me', jsonb_build_object(
          'professional_id', tm.id, 'name', tm.name, 'photo_url', tm.photo_url,
          'low_sample', COALESCE((v_cur -> tm.id::text ->> 'atendimentos')::int, 0) < c_min_sample,
          'metrics', (SELECT COALESCE(jsonb_object_agg(k, COALESCE(v_cur -> tm.id::text, v_empty) -> k), '{}'::jsonb) FROM unnest(v_staff_keys) k),
          'previous', CASE WHEN p_compare THEN
            (SELECT COALESCE(jsonb_object_agg(k, COALESCE(v_prev -> tm.id::text, v_empty) -> k), '{}'::jsonb) FROM unnest(v_staff_keys) k) END),
        'trend', v_trend,
        'top_services', v_top)
      FROM public.team_members tm
      WHERE tm.id = p_professional_id AND tm.user_id = p_tenant);
  END IF;

  WITH mem AS (
    SELECT tm.id, tm.name, tm.photo_url, COALESCE(tm.is_owner, false) AS is_owner,
           (tm.active IS FALSE OR tm.deleted_at IS NOT NULL) AS inactive,
           COALESCE(v_cur -> tm.id::text, v_empty) AS mc,
           v_prev -> tm.id::text AS mp,
           (v_cur ? tm.id::text) AS has_data
    FROM public.team_members tm
    WHERE tm.user_id = p_tenant
      AND (p_professional_id IS NULL OR tm.id = p_professional_id)
  ),
  shown AS (
    SELECT mem.*,
      (mem.mc ->> 'atendimentos')::int < c_min_sample AS low_sample,
      (NOT mem.inactive AND NOT mem.is_owner AND (mem.mc ->> 'atendimentos')::int >= c_min_sample) AS eligible
    FROM mem WHERE NOT mem.inactive OR mem.has_data
  ),
  elig AS (SELECT count(*) AS n FROM shown WHERE eligible),
  ranked AS (
    SELECT s.*,
      CASE WHEN s.eligible AND (SELECT n FROM elig) >= 2 THEN
        row_number() OVER (PARTITION BY s.eligible ORDER BY
          (s.mc ->> 'retorno_por_hora')::numeric DESC NULLS LAST,
          (s.mc ->> 'ticket_medio')::numeric DESC NULLS LAST,
          (s.mc ->> 'atendimentos')::int DESC, s.name)
      END AS rank
    FROM shown s
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'professional_id', r.id, 'name', r.name, 'photo_url', r.photo_url,
      'is_owner', r.is_owner, 'inactive', r.inactive, 'eligible', r.eligible,
      'low_sample', r.low_sample, 'rank', r.rank,
      'metrics', r.mc,
      'previous', CASE WHEN p_compare THEN COALESCE(r.mp, v_empty) END,
      'quality', jsonb_build_object(
        'sem_registro_financeiro', r.mc -> 'sem_registro_financeiro',
        'duplicadas', r.mc -> 'duplicadas',
        'sem_desfecho', r.mc -> 'sem_desfecho',
        'imaturos_rebooking', r.mc -> 'imaturos'))
    ORDER BY r.rank NULLS LAST, r.inactive, r.is_owner, (r.mc ->> 'retorno')::numeric DESC NULLS LAST, r.name), '[]'::jsonb)
  INTO v_members
  FROM ranked r;

  RETURN jsonb_build_object(
    'mode', 'owner',
    'period', v_period,
    'min_sample', c_min_sample,
    'ranking_available', (SELECT count(*) FROM jsonb_array_elements(v_members) e WHERE (e ->> 'rank') IS NOT NULL) >= 2,
    'members', v_members,
    'unassigned', CASE WHEN p_professional_id IS NULL THEN COALESCE(v_cur -> 'unassigned', v_empty) END,
    'unassigned_previous', CASE WHEN p_professional_id IS NULL AND p_compare THEN COALESCE(v_prev -> 'unassigned', v_empty) END,
    'team_totals', CASE WHEN p_professional_id IS NULL THEN v_cur -> c_team::text END,
    'team_previous', CASE WHEN p_professional_id IS NULL AND p_compare THEN v_prev -> c_team::text END,
    'trend', v_trend,
    'top_services', v_top);
END;
$$;

-- Dia de acerto dentro do mês de p_month (dia 31 em fevereiro → último dia do mês)
CREATE OR REPLACE FUNCTION public._commission_settle_date(p_month date, p_day int)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (date_trunc('month', p_month)::date
          + (LEAST(p_day, extract(day FROM date_trunc('month', p_month) + interval '1 month - 1 day')::int) - 1))
$$;

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

REVOKE ALL ON FUNCTION public._staff_perf_tz(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._staff_perf_raw(text, timestamptz, timestamptz, timestamptz, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._staff_performance_core(text, date, date, uuid, boolean, timestamptz, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._commission_cycle_core(text, date, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._commission_settle_date(date, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._commission_settle_date(date, int) TO service_role;
GRANT EXECUTE ON FUNCTION public._staff_perf_tz(text) TO service_role;
GRANT EXECUTE ON FUNCTION public._staff_perf_raw(text, timestamptz, timestamptz, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public._staff_performance_core(text, date, date, uuid, boolean, timestamptz, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public._commission_cycle_core(text, date, timestamptz) TO service_role;

REVOKE ALL ON FUNCTION public.get_staff_performance_v1(date, date, uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_commission_cycle_v1(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_performance_v1(date, date, uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_commission_cycle_v1(date) TO authenticated, service_role;

-- Paga o SUM do que o fuso do tenant realmente marca. Sem p_amount do cliente.
-- mark_commissions_as_paid de prod NÃO é alterada. Inserts copiam as colunas
-- NOT NULL de prod (payment_date, net_amount, commission_percent, barber_name,
-- description) e gravam commission_paid_at nas linhas marcadas.
CREATE OR REPLACE FUNCTION public._pay_commission_core(
  p_tenant text, p_professional_id uuid, p_start date, p_end date, p_commit boolean)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text := public._staff_perf_tz(p_tenant);
  v_from timestamptz;
  v_to timestamptz;
  v_amount numeric := 0;
  v_count int := 0;
  v_is_owner boolean;
  v_professional_name text;
  v_commission_percent numeric;
  v_payment_date date;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_start > p_end THEN
    RAISE EXCEPTION 'Intervalo inválido.' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(tm.is_owner, false), tm.name, COALESCE(tm.commission_percent, tm.commission_rate, 0)
    INTO v_is_owner, v_professional_name, v_commission_percent
    FROM public.team_members tm
   WHERE tm.id = p_professional_id AND tm.user_id = p_tenant;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Colaborador não encontrado.' USING ERRCODE = '22023';
  END IF;
  IF v_is_owner THEN
    RETURN jsonb_build_object('amount', 0, 'count', 0, 'start', p_start, 'end', p_end, 'tz', v_tz);
  END IF;

  v_from := p_start::timestamp AT TIME ZONE v_tz;
  v_to := (p_end + 1)::timestamp AT TIME ZONE v_tz;

  IF NOT p_commit THEN
    SELECT COALESCE(round(sum(COALESCE(fr.commission_value, 0)), 2), 0), count(*)
      INTO v_amount, v_count
      FROM public.finance_records fr
     WHERE fr.user_id = p_tenant AND fr.professional_id = p_professional_id
       AND fr.type = 'revenue' AND COALESCE(fr.commission_paid, false) = false
       AND COALESCE(fr.commission_value, 0) > 0
       AND fr.created_at >= v_from AND fr.created_at < v_to;
    RETURN jsonb_build_object('amount', v_amount, 'count', v_count, 'start', p_start, 'end', p_end, 'tz', v_tz);
  END IF;

  WITH locked AS (
    SELECT fr.id
      FROM public.finance_records fr
     WHERE fr.user_id = p_tenant AND fr.professional_id = p_professional_id
       AND fr.type = 'revenue' AND COALESCE(fr.commission_paid, false) = false
       AND COALESCE(fr.commission_value, 0) > 0
       AND fr.created_at >= v_from AND fr.created_at < v_to
     FOR UPDATE OF fr
  ),
  upd AS (
    UPDATE public.finance_records f
       SET commission_paid = true, commission_paid_at = now()
     WHERE f.id IN (SELECT id FROM locked)
     RETURNING COALESCE(f.commission_value, 0) AS cv
  )
  SELECT COALESCE(round(sum(cv), 2), 0), count(*) INTO v_amount, v_count FROM upd;

  IF v_amount <= 0 THEN
    RETURN jsonb_build_object('amount', 0, 'count', 0, 'start', p_start, 'end', p_end, 'tz', v_tz);
  END IF;

  v_payment_date := (now() AT TIME ZONE v_tz)::date;

  INSERT INTO public.commission_payments (
    user_id, professional_id, payment_date, amount, start_date, end_date,
    status, paid_at, net_amount, commission_percent)
  VALUES (
    p_tenant, p_professional_id, v_payment_date, v_amount, p_start, p_end,
    'paid', now(), v_amount, v_commission_percent);

  INSERT INTO public.finance_records (
    user_id, professional_id, barber_name, revenue, commission_value, type,
    description, created_at, commission_paid)
  VALUES (
    p_tenant, p_professional_id, v_professional_name, 0, v_amount, 'expense',
    'Pagamento de Comissão', now(), true);

  RETURN jsonb_build_object('amount', v_amount, 'count', v_count, 'start', p_start, 'end', p_end, 'tz', v_tz);
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_commission_pay_v1(
  p_professional_id uuid, p_start date, p_end date)
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
    RAISE EXCEPTION 'Apenas o dono pode ver o preview do repasse.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public._pay_commission_core(v_uid::text, p_professional_id, p_start, p_end, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.pay_commission_v1(
  p_professional_id uuid, p_start date, p_end date)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_uid::text AND p.role = 'owner') THEN
    RAISE EXCEPTION 'Apenas o dono pode pagar comissões.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public._pay_commission_core(v_uid::text, p_professional_id, p_start, p_end, true);
END;
$$;

REVOKE ALL ON FUNCTION public._pay_commission_core(text, uuid, date, date, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._pay_commission_core(text, uuid, date, date, boolean) TO service_role;
REVOKE ALL ON FUNCTION public.preview_commission_pay_v1(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pay_commission_v1(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_commission_pay_v1(uuid, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pay_commission_v1(uuid, date, date) TO authenticated, service_role;

COMMIT;
