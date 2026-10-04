-- Testes de 20261004123000_commission_schedules (via scripts/test-sql-commission-schedules.sh).
CREATE FUNCTION public._cs_t(p_label text, p_got numeric, p_exp numeric) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_got IS DISTINCT FROM p_exp THEN RAISE EXCEPTION 'FAIL %: obtido %, esperado %', p_label, p_got, p_exp; END IF;
END $$;
CREATE FUNCTION public._cs_tt(p_label text, p_got text, p_exp text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_got IS DISTINCT FROM p_exp THEN RAISE EXCEPTION 'FAIL %: obtido %, esperado %', p_label, p_got, p_exp; END IF;
END $$;
CREATE FUNCTION public._cs_denied(p_sql text, p_label text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE p_sql; EXCEPTION WHEN insufficient_privilege THEN RETURN 'PASS ' || p_label || ': 42501'; END;
  RAISE EXCEPTION 'FAIL %: não negou', p_label;
END $$;
GRANT EXECUTE ON FUNCTION public._cs_t(text, numeric, numeric), public._cs_tt(text, text, text), public._cs_denied(text, text) TO authenticated, anon;

GRANT SELECT ON public.commission_schedules TO authenticated;
GRANT SELECT ON public.commission_reminder_log TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;

-- 1) Backfill mensal dia 5 = ciclo antigo
DO $$
DECLARE
  b jsonb;
BEGIN
  b := public._commission_cycle_bounds('10000000-0000-0000-0000-000000000001', NULL, '2026-10-05');
  PERFORM public._cs_tt('backfill start', b ->> 'start', '2026-09-06');
  PERFORM public._cs_tt('backfill end', b ->> 'end', '2026-10-05');
  PERFORM public._cs_tt('backfill pay_due (offset 0)', b ->> 'pay_due', '2026-10-05');
  RAISE NOTICE 'PASS backfill mensal dia 5: 06/09–05/10 pagar até 05/10';
END $$;

-- 2) Paridade 24 meses vs regra antiga (todo dia 5)
DO $$
DECLARE
  t text := '10000000-0000-0000-0000-000000000001';
  m date := DATE '2025-01-05';
  old_end date;
  old_start date;
  b jsonb;
  n int := 0;
  i int;
BEGIN
  FOR i IN 0..23 LOOP
    old_end := public._commission_settle_date(m, 5);
    old_start := public._commission_settle_date((date_trunc('month', old_end) - interval '1 month')::date, 5) + 1;
    b := public._commission_cycle_bounds(t, NULL, old_end);
    IF (b ->> 'start')::date IS DISTINCT FROM old_start OR (b ->> 'end')::date IS DISTINCT FROM old_end THEN
      RAISE EXCEPTION 'FAIL paridade %: novo %–% velho %–%', old_end, b ->> 'start', b ->> 'end', old_start, old_end;
    END IF;
    m := (m + interval '1 month')::date;
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'PASS paridade 24 meses (n=%) todo dia 5', n;
END $$;

-- 3) Core default = último fechado (igual ao antigo em 02/10/2026)
DO $$
DECLARE
  c jsonb;
BEGIN
  c := public._commission_cycle_core('10000000-0000-0000-0000-000000000001', NULL, '2026-10-02 12:00:00-03');
  PERFORM public._cs_tt('core padrão end', c -> 'cycle' ->> 'end', '2026-09-05');
  PERFORM public._cs_tt('core padrão start', c -> 'cycle' ->> 'start', '2026-08-06');
  PERFORM public._cs_tt('core previous', c ->> 'previous_end', '2026-08-05');
  PERFORM public._cs_tt('core next', c ->> 'next_end', '2026-10-05');
  RAISE NOTICE 'PASS core mensal inalterado em 02/10: último fechado 06/08–05/09';
END $$;

-- 4) Clamp fim do mês + quinzenal 15/30 em fevereiro
DO $$
DECLARE
  d1 date;
  d2 date;
BEGIN
  PERFORM public._cs_tt('31 em fev/26', public._commission_settle_date('2026-02-01', 31)::text, '2026-02-28');
  PERFORM public._cs_tt('31 em fev/28', public._commission_settle_date('2028-02-01', 31)::text, '2028-02-29');
  d1 := (public._commission_month_closes('2026-02-01', ARRAY[15, 30]))[1];
  d2 := (public._commission_month_closes('2026-02-01', ARRAY[15, 30]))[2];
  PERFORM public._cs_tt('quinzenal fev 15', d1::text, '2026-02-15');
  PERFORM public._cs_tt('quinzenal fev 30→28', d2::text, '2026-02-28');
  RAISE NOTICE 'PASS clamp 31→último dia; quinzenal 15/30 em fev = 15 e 28';
END $$;

-- 5) Semanal / quinzenal / mensal via set (effective_from = próximo close)
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false) AS _ \gset

DO $$
DECLARE
  t text := '10000000-0000-0000-0000-000000000001';
  j jsonb;
  b jsonb;
  v_today date;
  v_eff date;
  v_end date;
BEGIN
  v_today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_eff := public._commission_next_close(t, NULL, v_today, true);

  j := public.set_commission_schedule_v1(
    NULL, 'biweekly', ARRAY[5, 20], NULL, 2, ARRAY[2, 0], false);
  PERFORM public._cs_tt('eff = next close atual', j ->> 'effective_from', v_eff::text);

  b := public._commission_cycle_bounds(t, NULL, v_eff);
  PERFORM public._cs_tt('período atual segue mensal', b ->> 'frequency', 'monthly');

  v_end := public._commission_next_close(t, NULL, v_eff, false);
  b := public._commission_cycle_bounds(t, NULL, v_end);
  PERFORM public._cs_tt('próximo close quinzenal', b ->> 'frequency', 'biweekly');
  PERFORM public._cs_t('pay_offset 2', (b ->> 'pay_offset_days')::numeric, 2);

  j := public.set_commission_schedule_v1(
    NULL, 'weekly', ARRAY[3], v_eff, 0, ARRAY[1, 0], false);
  v_end := public._commission_next_close(t, NULL, v_eff, false);
  b := public._commission_cycle_bounds(t, NULL, v_end);
  PERFORM public._cs_tt('depois weekly', b ->> 'frequency', 'weekly');

  j := public.set_commission_schedule_v1(
    NULL, 'monthly', ARRAY[5], NULL, 0, ARRAY[2, 0], false);
  RAISE NOTICE 'PASS effective_from = próximo fechamento; período atual intacto; weekly/biweekly/monthly';
END $$;

-- 6) Ciclos pagos não mudam
DO $$
DECLARE
  t text := '10000000-0000-0000-0000-000000000001';
  n int;
BEGIN
  SELECT count(*) INTO n FROM public.commission_payments
  WHERE user_id = t AND start_date = '2026-08-06' AND end_date = '2026-09-05' AND status = 'paid';
  PERFORM public._cs_t('pagamento Ana 06/08–05/09 intacto', n, 1);
  RAISE NOTICE 'PASS ciclos já pagos (commission_payments) intactos';
END $$;

-- 7) Reset dos 8 colaboradores weekly/biweekly
DO $$
DECLARE
  n_left int;
  n_backup int;
  notice boolean;
BEGIN
  SELECT count(*) INTO n_left FROM public.team_members
  WHERE lower(COALESCE(commission_payment_frequency, '')) IN ('weekly', 'biweekly');
  SELECT count(*) INTO n_backup FROM public.commission_frequency_reset_backup;
  SELECT commission_schedule_notice INTO notice
  FROM public.business_settings WHERE user_id = 'c0000000-0000-0000-0000-0000000000c0';
  PERFORM public._cs_t('ninguém ficou weekly/biweekly', n_left, 0);
  PERFORM public._cs_t('backup dos 8', n_backup, 8);
  IF notice IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL aviso one-time não marcado no negócio C';
  END IF;
  RAISE NOTICE 'PASS reset 8 colaboradores + aviso one-time';
END $$;

-- 8) Lembrete idempotente + fuso
DO $$
DECLARE
  t text := '10000000-0000-0000-0000-000000000001';
  j1 jsonb;
  j2 jsonb;
  n int;
BEGIN
  j1 := public.generate_commission_reminders_v1('2026-10-05 15:00:00-03');
  j2 := public.generate_commission_reminders_v1('2026-10-05 15:00:00-03');
  PERFORM public._cs_t('segunda chamada não duplica', (j2 ->> 'inserted')::numeric, 0);
  SELECT count(*) INTO n FROM public.commission_reminder_log
  WHERE user_id = t AND cycle_end = '2026-10-05' AND offset_days = 0;
  IF n < 1 THEN
    RAISE EXCEPTION 'FAIL lembrete não inseriu (inserted=%)', j1 ->> 'inserted';
  END IF;
  PERFORM public._cs_t('um log por chave', n, 1);
  RAISE NOTICE 'PASS lembrete idempotente (tenant, ciclo, offset)';
END $$;

DO $$
DECLARE
  br_date date;
  pt_date date;
BEGIN
  br_date := ('2026-10-25 00:30:00+00'::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date;
  pt_date := ('2026-10-25 00:30:00+00'::timestamptz AT TIME ZONE 'Europe/Lisbon')::date;
  PERFORM public._cs_tt('BRT data', br_date::text, '2026-10-24');
  PERFORM public._cs_tt('Lisboa data', pt_date::text, '2026-10-25');
  RAISE NOTICE 'PASS DST: mesmo instante → 24/10 em SP e 25/10 em Lisboa';
END $$;

-- 9) RLS / ACL
SELECT set_config('request.jwt.claim.sub', '', false) AS _ \gset
SELECT public._cs_denied($q$SELECT public.set_commission_schedule_v1()$q$, 'sem jwt set_commission');

SET ROLE anon;
SELECT public._cs_denied($q$SELECT public.get_commission_schedules_v1()$q$, 'anon get_schedules');
SELECT public._cs_denied($q$SELECT public.set_commission_schedule_v1()$q$, 'anon set_commission');
SELECT public._cs_denied($q$SELECT public.generate_commission_reminders_v1()$q$, 'anon generate_reminders');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-0000000000a1', false) AS _ \gset
SET ROLE authenticated;
SELECT public._cs_denied($q$SELECT public.set_commission_schedule_v1()$q$, 'staff set_commission');
SELECT public._cs_denied($q$SELECT public.generate_commission_reminders_v1()$q$, 'staff generate_reminders');
RESET ROLE;

DO $$
DECLARE
  n int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-0000000000b0', true);
  SET ROLE authenticated;
  SELECT count(*) INTO n FROM public.commission_schedules
  WHERE user_id = '10000000-0000-0000-0000-000000000001';
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM public._cs_t('dono B não lê tenant A', n, 0);
  RAISE NOTICE 'PASS RLS cross-tenant SELECT vazio';
END $$;

DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
  SET ROLE authenticated;
  BEGIN
    INSERT INTO public.commission_schedules (user_id, frequency, close_days, effective_from)
    VALUES ('10000000-0000-0000-0000-000000000001', 'monthly', ARRAY[5], '2026-01-01');
    RESET ROLE;
    RAISE EXCEPTION 'FAIL owner insert direto deveria ser bloqueado pelo RLS';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'PASS owner não grava commission_schedules direto (só RPC)';
  WHEN others THEN
    RESET ROLE;
    RAISE NOTICE 'PASS owner insert direto recusado (%)', SQLERRM;
  END;
  PERFORM set_config('request.jwt.claim.sub', '', true);
END $$;

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false) AS _ \gset
DO $$
BEGIN
  BEGIN
    PERFORM public.set_commission_schedule_v1(
      '20000000-0000-0000-0000-00000000dead'::uuid, 'monthly', ARRAY[5], NULL, 0, ARRAY[2, 0], false);
    RAISE EXCEPTION 'FAIL aceitou professional de outro tenant';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%não encontrado%' OR SQLERRM LIKE '%Colaborador%' THEN
      RAISE NOTICE 'PASS cross-tenant professional recusado';
    ELSE
      RAISE;
    END IF;
  END;
END $$;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.set_commission_schedule_v1(uuid,text,int[],date,int,int[],boolean)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.generate_commission_reminders_v1(timestamptz)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL anon tem EXECUTE';
  END IF;
  RAISE NOTICE 'PASS anon sem EXECUTE nas RPCs novas';
END $$;
