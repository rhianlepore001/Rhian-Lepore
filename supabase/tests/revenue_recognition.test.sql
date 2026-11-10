-- Receita de atendimento reconhecida na conclusão. Roda como postgres com o JWT do dono do tenant isolado.
SET client_min_messages = notice;
SET request.jwt.claim.sub = '7e000000-0000-0000-0000-000000000001';
DO $$
DECLARE
  t text := '7e000000-0000-0000-0000-000000000001';
  today text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  nxt_from text := to_char(date_trunc('month', now()) + interval '1 month', 'YYYY-MM-DD');
  nxt_to text := to_char(date_trunc('month', now()) + interval '2 months - 1 day', 'YYYY-MM-DD');
  j json; jb jsonb; v numeric; n bigint; d timestamptz;
BEGIN
  j := public.get_finance_stats__tenant_unsafe(t, today, today, NULL);
  IF (j->>'revenue')::numeric <> 65 THEN RAISE EXCEPTION 'FAIL finance_stats hoje: receita % (esperado 65 = 40 concluído hoje + 25 legado)', j->>'revenue'; END IF;
  SELECT (x->>'created_at')::timestamptz INTO d FROM json_array_elements(j->'transactions') x WHERE x->>'id' = '7e000000-0000-0000-0000-0000000000f1';
  IF d IS NULL OR (d AT TIME ZONE 'UTC')::date <> (now() AT TIME ZONE 'UTC')::date THEN RAISE EXCEPTION 'FAIL transação do atendimento futuro datada em % (esperado hoje)', d; END IF;
  IF (j->'revenue_by_method'->>'pix')::numeric IS NULL THEN RAISE EXCEPTION 'FAIL revenue_by_method ausente'; END IF;
  j := public.get_finance_stats__tenant_unsafe(t, nxt_from, nxt_to, NULL);
  IF (j->>'revenue')::numeric <> 0 THEN RAISE EXCEPTION 'FAIL finance_stats mês que vem: receita % (esperado 0)', j->>'revenue'; END IF;
  RAISE NOTICE 'PASS finance_stats: receita do atendimento futuro entra hoje, não no mês da marcação';

  j := public.get_monthly_finance_history__tenant_unsafe(t, 1);
  IF (j->0->>'revenue')::numeric <> 65 THEN RAISE EXCEPTION 'FAIL histórico mensal: % (esperado 65 no mês corrente)', j->0->>'revenue'; END IF;
  RAISE NOTICE 'PASS histórico mensal';

  j := public.get_dashboard_stats__tenant_unsafe(t);
  IF (j->>'current_month_revenue')::numeric <> 65 THEN RAISE EXCEPTION 'FAIL dashboard current_month_revenue: % (esperado 65)', j->>'current_month_revenue'; END IF;
  RAISE NOTICE 'PASS dashboard receita do mês';

  SELECT services_month INTO n FROM public.get_commissions_due() WHERE professional_id = '7e000000-0000-0000-0000-0000000000a1';
  IF n IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'FAIL comissões services_month: % (esperado 1)', n; END IF;
  RAISE NOTICE 'PASS comissões: serviço conta no mês da conclusão';

  jb := public.get_chair_hour_v1((now() AT TIME ZONE 'UTC')::date, '7e000000-0000-0000-0000-0000000000a1', (now() AT TIME ZONE 'UTC')::date);
  IF (jb->'total'->>'attendance_count')::int IS DISTINCT FROM 1 OR (jb->'total'->>'revenue')::numeric IS DISTINCT FROM 40 THEN
    RAISE EXCEPTION 'FAIL hora de cadeira hoje: atendimentos % receita % (esperado 1 / 40)', jb->'total'->>'attendance_count', jb->'total'->>'revenue';
  END IF;
  RAISE NOTICE 'PASS hora de cadeira: atendimento entra no dia da conclusão';
END $$;

-- Trigger: update direto de status (widget Meu Dia) registra a conclusão.
UPDATE public.appointments SET status = 'Completed' WHERE id = '7e000000-0000-0000-0000-0000000000c2';
DO $$
DECLARE d timestamptz; d2 timestamptz;
BEGIN
  SELECT completed_at INTO d FROM public.appointments WHERE id = '7e000000-0000-0000-0000-0000000000c2';
  IF d IS NULL OR d < now() - interval '1 minute' OR d > now() + interval '1 minute' THEN RAISE EXCEPTION 'FAIL trigger: completed_at % (esperado agora)', d; END IF;
  SELECT completed_at INTO d2 FROM public.appointments WHERE id = '7e000000-0000-0000-0000-0000000000b1';
  IF d2 IS NOT NULL THEN RAISE EXCEPTION 'FAIL trigger mexeu em atendimento já concluído'; END IF;
  RAISE NOTICE 'PASS trigger: conclusão direta grava completed_at e não toca histórico';
END $$;
UPDATE public.appointments SET price = 31 WHERE id = '7e000000-0000-0000-0000-0000000000b1';
DO $$ BEGIN
  IF (SELECT completed_at FROM public.appointments WHERE id = '7e000000-0000-0000-0000-0000000000b1') IS NOT NULL THEN RAISE EXCEPTION 'FAIL trigger em update sem mudança de status'; END IF;
  RAISE NOTICE 'PASS trigger ignora updates que não concluem';
END $$;
-- Volta o fixture para a próxima rodada.
UPDATE public.appointments SET status = 'Confirmed', completed_at = NULL WHERE id = '7e000000-0000-0000-0000-0000000000c2';
UPDATE public.appointments SET price = 25 WHERE id = '7e000000-0000-0000-0000-0000000000b1';
RESET request.jwt.claim.sub;
