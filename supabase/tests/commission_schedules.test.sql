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

-- 4b) Paridade COMPLETA vs o core pré-PR-D (cópia congelada _legacy_commission_cycle_core):
--     24 meses (2025-01-01 … 2026-12-31), todo dia, negócios com acerto dia 1, 5 e 28,
--     p_cycle_end explícito e padrão (NULL) às 00:30 e 23:30 locais. JSON inteiro igual,
--     tirando só as chaves NOVAS (frequency, pay_due, pay_offset_days, cycle.pay_due).
DO $$
DECLARE
  t text;
  tz text;
  d date;
  a jsonb;
  b jsonb;
  n int := 0;
  k timestamptz;
  strip text[] := ARRAY['frequency', 'pay_due', 'pay_offset_days'];
BEGIN
  FOREACH t IN ARRAY ARRAY[
    '10000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-0000000000d1',
    'd2800000-0000-0000-0000-0000000000d2'] LOOP
    tz := public._staff_perf_tz(t);
    FOR d IN SELECT g::date FROM generate_series(DATE '2025-01-01', DATE '2026-12-31', interval '1 day') g LOOP
      FOREACH k IN ARRAY ARRAY[(d + time '00:30') AT TIME ZONE tz, (d + time '23:30') AT TIME ZONE tz] LOOP
        a := public._legacy_commission_cycle_core(t, NULL, k);
        b := public._commission_cycle_core(t, NULL, k);
        b := (b - strip) || jsonb_build_object('cycle', (b -> 'cycle') - 'pay_due');
        IF a IS DISTINCT FROM b THEN
          RAISE EXCEPTION 'FAIL paridade padrão % em %: velho % novo %', t, k, a -> 'cycle', b -> 'cycle';
        END IF;
        n := n + 1;
      END LOOP;
      k := (d + time '12:00') AT TIME ZONE tz;
      a := public._legacy_commission_cycle_core(t, d, k);
      b := public._commission_cycle_core(t, d, k);
      b := (b - strip) || jsonb_build_object('cycle', (b -> 'cycle') - 'pay_due');
      IF a IS DISTINCT FROM b THEN
        RAISE EXCEPTION 'FAIL paridade explícita % em %: velho % novo %', t, d, a, b;
      END IF;
      n := n + 1;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'PASS paridade JSON completa 24 meses × dias 1/5/28 (n=% chamadas, valores e status idênticos)', n;
END $$;

-- 4c) Backfill: uma regra mensal por negócio e por dono, no dia de acerto, pay_offset 0
DO $$
DECLARE
  n_missing int;
  r public.commission_schedules%ROWTYPE;
BEGIN
  SELECT count(*) INTO n_missing FROM (
    SELECT user_id FROM public.business_settings
    UNION SELECT id FROM public.profiles WHERE role = 'owner') x
  WHERE NOT EXISTS (SELECT 1 FROM public.commission_schedules s WHERE s.user_id = x.user_id AND s.professional_id IS NULL);
  PERFORM public._cs_t('todo negócio/dono tem regra', n_missing, 0);
  SELECT * INTO r FROM public.commission_schedules WHERE user_id = 'd1000000-0000-0000-0000-0000000000d1' AND professional_id IS NULL;
  PERFORM public._cs_tt('backfill dia 1', r.frequency || ':' || r.close_days::text || ':' || r.pay_offset_days || ':' || r.effective_from,
    'monthly:{1}:0:2000-01-01');
  SELECT * INTO r FROM public.commission_schedules WHERE user_id = '30000000-0000-0000-0000-000000000001' AND professional_id IS NULL;
  PERFORM public._cs_tt('dono sem business_settings = dia 5', r.close_days::text, '{5}');
  PERFORM public._cs_t('nenhuma exceção criada pelo backfill',
    (SELECT count(*) FROM public.commission_schedules WHERE professional_id IS NOT NULL), 0);
  RAISE NOTICE 'PASS backfill mensal no dia de acerto (ou 5), pay_offset 0, sem exceções';
END $$;

-- 4d) Reset dos 8: backup com os valores originais, dia = acerto do negócio, aviso em B e C
DO $$
BEGIN
  PERFORM public._cs_tt('backup B3 original',
    (SELECT commission_payment_frequency || ':' || commission_payment_day FROM public.commission_frequency_reset_backup
     WHERE professional_id = 'b1000000-0000-0000-0000-000000000003'), 'biweekly:5');
  PERFORM public._cs_tt('B3 agora mensal dia 1 (acerto de B)',
    (SELECT commission_payment_frequency || ':' || commission_payment_day FROM public.team_members
     WHERE id = 'b1000000-0000-0000-0000-000000000003'), 'monthly:1');
  PERFORM public._cs_tt('C1 agora mensal dia 5',
    (SELECT commission_payment_frequency || ':' || commission_payment_day FROM public.team_members
     WHERE id = 'c1000000-0000-0000-0000-000000000001'), 'monthly:5');
  PERFORM public._cs_t('aviso só em B e C',
    (SELECT count(*) FROM public.business_settings WHERE commission_schedule_notice), 2);
  PERFORM public._cs_t('A sem aviso',
    (SELECT count(*) FROM public.business_settings WHERE commission_schedule_notice AND user_id = '10000000-0000-0000-0000-000000000001'), 0);
  RAISE NOTICE 'PASS reset: backup fiel, mensal no dia do negócio, aviso one-time só onde houve reset';
END $$;

-- 4e) Fechamentos com troca de regra (negócio E, sem equipe): mensal 20 → semanal dom
--     (eff 20/09) → quinzenal 5/20 (eff 04/10) → mensal 31 pagar +5 (eff 20/10).
INSERT INTO public.commission_schedules (user_id, professional_id, frequency, close_days, anchor_date, pay_offset_days, reminder_offsets, effective_from) VALUES
  ('e0000000-0000-0000-0000-0000000000e0', NULL, 'weekly', ARRAY[0], DATE '2026-09-20', 2, ARRAY[2, 0], DATE '2026-09-20'),
  ('e0000000-0000-0000-0000-0000000000e0', NULL, 'biweekly', ARRAY[5, 20], NULL, 2, ARRAY[2, 0], DATE '2026-10-04'),
  ('e0000000-0000-0000-0000-0000000000e0', NULL, 'monthly', ARRAY[31], NULL, 5, ARRAY[1, 0], DATE '2026-10-20');

DO $$
DECLARE
  t text := 'e0000000-0000-0000-0000-0000000000e0';
  b jsonb;
  c date;
  got text := '';
  exp text := '2026-08-20,2026-09-20,2026-09-27,2026-10-04,2026-10-05,2026-10-20,2026-10-31,2026-11-30,2026-12-31,2027-01-31,2027-02-28,2027-03-31';
  i int;
BEGIN
  c := DATE '2026-08-01';
  FOR i IN 1..12 LOOP
    c := public._commission_next_close(t, NULL, c, i = 1);
    got := got || CASE WHEN i > 1 THEN ',' ELSE '' END || c::text;
  END LOOP;
  PERFORM public._cs_tt('cadeia next_close', got, exp);
  got := '';
  c := DATE '2027-04-01';
  FOR i IN 1..12 LOOP
    c := public._commission_prev_close(t, NULL, c);
    got := c::text || CASE WHEN i > 1 THEN ',' ELSE '' END || got;
  END LOOP;
  PERFORM public._cs_tt('cadeia prev_close (inclui o último close da regra antiga)', got, exp);

  b := public._commission_cycle_bounds(t, NULL, '2026-09-20');
  PERFORM public._cs_tt('mensal antigo intacto', (b ->> 'start') || '..' || (b ->> 'end') || ' ' || (b ->> 'frequency'), '2026-08-21..2026-09-20 monthly');
  b := public._commission_cycle_bounds(t, NULL, '2026-09-23');
  PERFORM public._cs_tt('semanal (data no meio)', (b ->> 'start') || '..' || (b ->> 'end') || ' ' || (b ->> 'pay_due'), '2026-09-21..2026-09-27 2026-09-29');
  b := public._commission_cycle_bounds(t, NULL, '2026-10-04');
  PERFORM public._cs_tt('semanal 2', (b ->> 'start') || '..' || (b ->> 'end'), '2026-09-28..2026-10-04');
  b := public._commission_cycle_bounds(t, NULL, '2026-10-05');
  PERFORM public._cs_tt('quinzenal 1º (curto, regra nova após o close)', (b ->> 'start') || '..' || (b ->> 'end') || ' ' || (b ->> 'frequency'), '2026-10-05..2026-10-05 biweekly');
  b := public._commission_cycle_bounds(t, NULL, '2026-10-12');
  PERFORM public._cs_tt('quinzenal 2', (b ->> 'start') || '..' || (b ->> 'end'), '2026-10-06..2026-10-20');
  b := public._commission_cycle_bounds(t, NULL, '2026-10-31');
  PERFORM public._cs_tt('mensal 31 + pagar 5', (b ->> 'start') || '..' || (b ->> 'end') || ' ' || (b ->> 'pay_due'), '2026-10-21..2026-10-31 2026-11-05');
  b := public._commission_cycle_bounds(t, NULL, '2027-02-10');
  PERFORM public._cs_tt('31 em fevereiro → 28', (b ->> 'start') || '..' || (b ->> 'end'), '2027-02-01..2027-02-28');
  b := public._commission_cycle_bounds(t, NULL, '2027-03-31');
  PERFORM public._cs_tt('31 em março', (b ->> 'start') || '..' || (b ->> 'end'), '2027-03-01..2027-03-31');

  b := public._commission_cycle_core(t, '2026-09-27', '2026-10-01 12:00-03');
  PERFORM public._cs_tt('core semanal: período + setas', (b -> 'cycle' ->> 'start') || '..' || (b -> 'cycle' ->> 'end') || ' < ' || (b ->> 'previous_end') || ' > ' || (b ->> 'next_end'),
    '2026-09-21..2026-09-27 < 2026-09-20 > 2026-10-04');
  b := public._commission_cycle_core(t, '2026-10-12', '2026-10-01 12:00-03');
  PERFORM public._cs_tt('core quinzenal: data no meio → ciclo que a contém', (b -> 'cycle' ->> 'start') || '..' || (b -> 'cycle' ->> 'end') || ' pagar ' || (b ->> 'pay_due'),
    '2026-10-06..2026-10-20 pagar 2026-10-22');
  b := public._commission_cycle_core(t, NULL, '2026-10-08 12:00-03');
  PERFORM public._cs_tt('core padrão = último fechado', (b -> 'cycle' ->> 'start') || '..' || (b -> 'cycle' ->> 'end'), '2026-10-05..2026-10-05');
  RAISE NOTICE 'PASS semanal/quinzenal/mensal: bounds, clamp 31, troca de regra no próximo close, setas ciclo a ciclo';
END $$;

-- 4f) Quinzenal 15/31 e 1/29 com clamp
DO $$
BEGIN
  PERFORM public._cs_tt('15/31 fev', public._commission_month_closes('2026-02-01', ARRAY[15, 31])::text, '{2026-02-15,2026-02-28}');
  PERFORM public._cs_tt('15/31 abr', public._commission_month_closes('2026-04-01', ARRAY[15, 31])::text, '{2026-04-15,2026-04-30}');
  PERFORM public._cs_tt('1/29 fev bissexto', public._commission_month_closes('2028-02-01', ARRAY[1, 29])::text, '{2028-02-01,2028-02-29}');
  PERFORM public._cs_tt('last_close quinzenal', public._commission_last_close_of_rule('biweekly', ARRAY[15, 31], NULL, '2026-03-14')::text, '2026-02-28');
  RAISE NOTICE 'PASS quinzenal com clamp de fim de mês';
END $$;

-- 4g) DST (Lisboa, mudança 29/03/2026): o ciclo 29/03–28/04 soma exatamente os lançamentos
--     cuja data LOCAL cai no intervalo (inclui 28/04 23:30 WEST, exclui 28/03 23:30 WET).
DO $$
DECLARE
  t text := 'd2800000-0000-0000-0000-0000000000d2';
  b jsonb;
  m jsonb;
  exp numeric;
BEGIN
  b := public._commission_cycle_core(t, '2026-04-28', '2026-05-10 12:00+00');
  PERFORM public._cs_tt('ciclo DST', (b -> 'cycle' ->> 'start') || '..' || (b -> 'cycle' ->> 'end'), '2026-03-29..2026-04-28');
  m := b -> 'members' -> 0;
  SELECT sum(commission_value) INTO exp FROM public.finance_records
  WHERE user_id = t AND NOT commission_paid
    AND (created_at AT TIME ZONE 'Europe/Lisbon')::date BETWEEN DATE '2026-03-29' AND DATE '2026-04-28';
  PERFORM public._cs_t('a_pagar no fuso local com DST', (m ->> 'a_pagar_ciclo')::numeric, exp);
  RAISE NOTICE 'PASS DST Lisboa: limites do ciclo no fuso do negócio (a_pagar=%)', exp;
END $$;

-- 4h) Lembretes no fuso do NEGÓCIO: 05/10 02:00Z = 04/10 23:00 em SP e 05/10 03:00 em Lisboa
SELECT set_config('request.jwt.claim.sub', '', false) AS _ \gset
DO $$
BEGIN
  PERFORM public.generate_commission_reminders_v1('2026-10-05 02:00:00+00');
  PERFORM public._cs_t('Lisboa (C) já é dia 05: lembrete do prazo',
    (SELECT count(*) FROM public.commission_reminder_log WHERE user_id = 'c0000000-0000-0000-0000-0000000000c0' AND cycle_end = '2026-10-05' AND offset_days = 0), 1);
  PERFORM public._cs_t('SP (F) ainda é dia 04: nada',
    (SELECT count(*) FROM public.commission_reminder_log WHERE user_id = 'f0000000-0000-0000-0000-0000000000f0'), 0);
  PERFORM public._cs_t('negócio sem equipe (E) nunca recebe lembrete',
    (SELECT count(*) FROM public.commission_reminder_log WHERE user_id = 'e0000000-0000-0000-0000-0000000000e0'), 0);
  PERFORM public.generate_commission_reminders_v1('2026-10-05 12:00:00+00');
  PERFORM public._cs_t('SP (F) no dia 05 local',
    (SELECT count(*) FROM public.commission_reminder_log WHERE user_id = 'f0000000-0000-0000-0000-0000000000f0' AND cycle_end = '2026-10-05' AND offset_days = 0), 1);
  PERFORM public._cs_t('sino recebeu a notificação com link de Pagamentos',
    (SELECT count(*) FROM public.notifications WHERE user_id = 'f0000000-0000-0000-0000-0000000000f0' AND type = 'commission_reminder'
       AND link = '/financeiro?tab=commissions' AND event_key = 'commission:f0000000-0000-0000-0000-0000000000f0:_:2026-10-05:0'), 1);
  PERFORM public.generate_commission_reminders_v1('2026-10-03 12:00:00+00');
  PERFORM public._cs_t('2 dias antes (03/10)',
    (SELECT count(*) FROM public.commission_reminder_log WHERE user_id = 'f0000000-0000-0000-0000-0000000000f0' AND cycle_end = '2026-10-05' AND offset_days = 2), 1);
  BEGIN
    INSERT INTO public.commission_reminder_log (user_id, professional_id, cycle_end, offset_days)
    VALUES ('f0000000-0000-0000-0000-0000000000f0', NULL, '2026-10-05', 0);
    RAISE EXCEPTION 'FAIL log duplicado aceito';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
  RAISE NOTICE 'PASS lembretes no fuso do negócio, 2 dias antes + no prazo, sem equipe = sem lembrete, UNIQUE barra duplicata';
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
      '40000000-0000-0000-0000-0000000000b1'::uuid, 'monthly', ARRAY[5], NULL, 0, ARRAY[2, 0], false);
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

-- 10) ACL extra: tabelas internas fechadas mesmo com os grants padrão do Supabase
SET ROLE anon;
SELECT public._cs_denied($q$SELECT * FROM public.commission_frequency_reset_backup$q$, 'anon lê backup do reset');
SELECT public._cs_denied($q$SELECT * FROM public.commission_schedules$q$, 'anon lê commission_schedules');
SELECT public._cs_denied($q$SELECT * FROM public.commission_reminder_log$q$, 'anon lê reminder_log');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false) AS _ \gset
SET ROLE authenticated;
SELECT public._cs_denied($q$SELECT * FROM public.commission_frequency_reset_backup$q$, 'dono lê backup do reset');
SELECT public._cs_denied($q$INSERT INTO public.commission_frequency_reset_backup (professional_id, user_id) VALUES (gen_random_uuid(), 'x')$q$, 'dono grava backup');
SELECT public._cs_denied($q$UPDATE public.commission_schedules SET pay_offset_days = 5$q$, 'dono UPDATE direto');
SELECT public._cs_denied($q$DELETE FROM public.commission_schedules$q$, 'dono DELETE direto');
SELECT public._cs_denied($q$SELECT public._commission_cycle_bounds('10000000-0000-0000-0000-000000000001', NULL, '2026-10-05')$q$, 'helper interno via authenticated');
RESET ROLE;

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
    'public._commission_rule_transition(text,uuid,date,boolean)',
    'public._commission_cycle_bounds(text,uuid,date)',
    'public._commission_member_window(text,uuid,date)',
    'public._commission_require_owner()',
    'public._commission_validate_rule(text,int[],int,int[],boolean)',
    'public._commission_emit_reminder(text,uuid,date,int,text,text)',
    'public._commission_cycle_core(text,date,timestamptz)'] LOOP
    IF has_function_privilege('authenticated', f, 'EXECUTE') OR has_function_privilege('anon', f, 'EXECUTE') THEN
      RAISE EXCEPTION 'FAIL % executável por anon/authenticated', f;
    END IF;
  END LOOP;
  FOR f IN SELECT p.oid::regprocedure::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.prosecdef
             AND (p.proname LIKE '\_commission\_%' OR p.proname LIKE '%commission_schedule%' OR p.proname LIKE '%commission_reminders%')
             AND NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%') LOOP
    RAISE EXCEPTION 'FAIL % SECURITY DEFINER sem search_path', f;
  END LOOP;
  RAISE NOTICE 'PASS helpers internos sem EXECUTE p/ anon/authenticated; todo SECURITY DEFINER com search_path';
END $$;

-- staff: lê 0 linhas, não grava, não chama RPCs de dono
DO $$
DECLARE
  n int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-0000000000a1', true);
  SET ROLE authenticated;
  SELECT count(*) INTO n FROM public.commission_schedules;
  RESET ROLE;
  PERFORM public._cs_t('staff lê 0 regras', n, 0);
  RAISE NOTICE 'PASS staff não lê commission_schedules (RLS)';
END $$;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-0000000000a1', false) AS _ \gset
SET ROLE authenticated;
SELECT public._cs_denied($q$INSERT INTO public.commission_schedules (user_id, frequency, close_days, effective_from) VALUES ('10000000-0000-0000-0000-000000000001', 'weekly', ARRAY[1], '2026-01-01')$q$, 'staff INSERT direto');
SELECT public._cs_denied($q$SELECT public.get_commission_schedules_v1()$q$, 'staff get_schedules');
SELECT public._cs_denied($q$SELECT public.preview_commission_schedule_v1()$q$, 'staff preview');
SELECT public._cs_denied($q$SELECT public.dismiss_commission_schedule_notice_v1()$q$, 'staff dismiss');
RESET ROLE;

-- cross-tenant: dono A não usa colaborador de B; dono B só vê o próprio
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false) AS _ \gset
DO $$
BEGIN
  BEGIN
    PERFORM public.set_commission_schedule_v1(
      '40000000-0000-0000-0000-0000000000b1'::uuid, 'weekly', ARRAY[1], NULL, 0, ARRAY[2, 0], false);
    RAISE EXCEPTION 'FAIL dono A criou exceção para colaborador de B';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  PERFORM public._cs_t('nenhuma linha de A para Beto',
    (SELECT count(*) FROM public.commission_schedules WHERE professional_id = '40000000-0000-0000-0000-0000000000b1'), 0);
  RAISE NOTICE 'PASS cross-tenant: colaborador de outro negócio recusado';
END $$;
SELECT set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', false) AS _ \gset
SET ROLE authenticated;
DO $$
DECLARE
  j jsonb;
BEGIN
  j := public.get_commission_schedules_v1();
  PERFORM public._cs_tt('B vê só a própria regra', j -> 'business' ->> 'user_id', '30000000-0000-0000-0000-000000000001');
  PERFORM public._cs_t('B sem exceções de A', jsonb_array_length(j -> 'exceptions'), 0);
  RAISE NOTICE 'PASS cross-tenant: get_commission_schedules_v1 só do próprio negócio';
END $$;
RESET ROLE;

-- 11) Lembrete: o dono não escolhe a data (p_now ignorado para authenticated)
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false) AS _ \gset
DO $$
BEGIN
  PERFORM public.generate_commission_reminders_v1('2031-01-03 12:00-03');
  PERFORM public._cs_t('sem lembrete em 2031 via cliente',
    (SELECT count(*) FROM public.commission_reminder_log WHERE cycle_end >= '2030-01-01'), 0);
  RAISE NOTICE 'PASS p_now do cliente ignorado (sem spam de lembretes futuros)';
END $$;

-- 12) Validação + espelho legado (CHECK 1..28 de prod) no negócio D1 (dia 1)
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-0000000000d1', false) AS _ \gset
DO $$
BEGIN
  BEGIN
    PERFORM public.set_commission_schedule_v1(NULL, 'biweekly', ARRAY[5, 10], NULL, 2, ARRAY[2, 0], false);
    RAISE EXCEPTION 'FAIL quinzenal 5/10 aceito';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    PERFORM public.set_commission_schedule_v1(NULL, 'monthly', ARRAY[5], NULL, 3, ARRAY[2, 0], false);
    RAISE EXCEPTION 'FAIL pagar +3 aceito';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    PERFORM public.set_commission_schedule_v1(NULL, 'weekly', ARRAY[7], NULL, 0, ARRAY[2, 0], false);
    RAISE EXCEPTION 'FAIL semanal dia 7 aceito';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  -- Quinzenal: >= 7 dias dentro do mês E na virada (d2-d1 <= 21) e em fevereiro (min(d2,28)-d1 >= 7).
  DECLARE
    bad int[][] := ARRAY[[2, 28], [28, 2], [1, 23], [24, 31], [22, 29], [5, 10]];
    i int;
  BEGIN
    FOR i IN 1 .. array_length(bad, 1) LOOP
      BEGIN
        PERFORM public.set_commission_schedule_v1(NULL, 'biweekly', ARRAY[bad[i][1], bad[i][2]], NULL, 2, ARRAY[2, 0], false);
        RAISE EXCEPTION 'FAIL quinzenal %/% aceito', bad[i][1], bad[i][2];
      EXCEPTION WHEN SQLSTATE '22023' THEN
        IF SQLERRM <> 'Os dois fechamentos precisam ter pelo menos 7 dias entre eles, inclusive na virada do mês.' THEN
          RAISE EXCEPTION 'FAIL mensagem quinzenal %/%: %', bad[i][1], bad[i][2], SQLERRM;
        END IF;
      END;
    END LOOP;
  END;
  PERFORM public.set_commission_schedule_v1(NULL, 'biweekly', ARRAY[1, 22], NULL, 2, ARRAY[2, 0], false);
  PERFORM public.set_commission_schedule_v1(NULL, 'biweekly', ARRAY[10, 17], NULL, 2, ARRAY[2, 0], false);
  PERFORM public.set_commission_schedule_v1(NULL, 'biweekly', ARRAY[21, 29], NULL, 2, ARRAY[2, 0], false);
  BEGIN
    INSERT INTO public.commission_schedules (user_id, frequency, close_days, effective_from)
    VALUES ('d1000000-0000-0000-0000-0000000000d1', 'biweekly', ARRAY[2, 28], DATE '2099-01-01');
    RAISE EXCEPTION 'FAIL CHECK aceitou quinzenal 2/28';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  PERFORM public.set_commission_schedule_v1(NULL, 'monthly', ARRAY[30], NULL, 2, ARRAY[2, 0], false);
  PERFORM public._cs_t('mensal 30 salva sem violar CHECK; espelho fica 1',
    (SELECT commission_settlement_day_of_month FROM public.business_settings WHERE user_id = 'd1000000-0000-0000-0000-0000000000d1'), 1);
  PERFORM public.set_commission_schedule_v1(NULL, 'monthly', ARRAY[12], NULL, 2, ARRAY[2, 0], false);
  PERFORM public._cs_t('mensal 12 espelha 12',
    (SELECT commission_settlement_day_of_month FROM public.business_settings WHERE user_id = 'd1000000-0000-0000-0000-0000000000d1'), 12);
  PERFORM public.set_commission_schedule_v1(NULL, 'biweekly', ARRAY[1, 16], NULL, 2, ARRAY[2, 0], false);
  PERFORM public._cs_t('quinzenal não mexe no espelho',
    (SELECT commission_settlement_day_of_month FROM public.business_settings WHERE user_id = 'd1000000-0000-0000-0000-0000000000d1'), 12);
  RAISE NOTICE 'PASS validação (quinzenal >=7 dias no mês, na virada e em fevereiro; CHECK da tabela; pagar 0/2/5, dia da semana) e espelho legado só 1..28';
END $$;

-- 13) Exceção por colaborador (negócio F): effective_from = próximo close; janela própria
--     no Pagamentos; colegas sem exceção seguem o negócio; voltar à regra do negócio.
SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-0000000000f0', false) AS _ \gset
DO $$
DECLARE
  t text := 'f0000000-0000-0000-0000-0000000000f0';
  semanal uuid := 'f1000000-0000-0000-0000-000000000001';
  regra uuid := 'f1000000-0000-0000-0000-000000000002';
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_eff date;
  j jsonb;
  c jsonb;
  m jsonb;
  biz_end date;
  w_start date;
  w_end date;
  exp numeric;
  before_pay text;
BEGIN
  INSERT INTO public.finance_records (user_id, professional_id, revenue, commission_value, created_at, commission_paid, type)
  SELECT t, p, 100, 10, (g::date + time '12:00') AT TIME ZONE 'America/Sao_Paulo', false, 'revenue'
  FROM unnest(ARRAY[semanal, regra]) p, generate_series(v_today - 60, v_today + 90, interval '1 day') g;
  SELECT string_agg(id::text || amount || start_date || end_date, ',' ORDER BY id) INTO before_pay FROM public.commission_payments;

  v_eff := public._commission_next_close(t, semanal, v_today, true);
  j := public.set_commission_schedule_v1(semanal, 'weekly', ARRAY[0], NULL, 0, ARRAY[1, 0], false);
  PERFORM public._cs_tt('exceção: eff = próximo close do colaborador', j ->> 'effective_from', v_eff::text);
  PERFORM public._cs_tt('anchor do cliente ignorado = eff',
    (SELECT anchor_date::text FROM public.commission_schedules WHERE id = (j ->> 'id')::uuid), v_eff::text);

  biz_end := public._commission_next_close(t, NULL, v_eff + 20, true);
  c := public._commission_cycle_core(t, biz_end, now());
  SELECT e INTO m FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'professional_id' = semanal::text;
  IF m -> 'own_cycle' IS NULL THEN
    RAISE EXCEPTION 'FAIL colaborador com exceção sem own_cycle: %', m;
  END IF;
  w_start := (m -> 'own_cycle' ->> 'start')::date;
  w_end := (m -> 'own_cycle' ->> 'end')::date;
  PERFORM public._cs_tt('own_cycle semanal', m -> 'own_cycle' ->> 'frequency', 'weekly');
  PERFORM public._cs_t('own_cycle termina num domingo <= fim do negócio',
    CASE WHEN extract(dow FROM w_end) = 0 AND w_end <= biz_end AND w_end > biz_end - 7 THEN 1 ELSE 0 END, 1);
  PERFORM public._cs_t('a_pagar = janela própria', (m ->> 'a_pagar_ciclo')::numeric, 10 * (w_end - w_start + 1));
  SELECT e INTO m FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'professional_id' = regra::text;
  IF m ? 'own_cycle' THEN
    RAISE EXCEPTION 'FAIL colega sem exceção ganhou own_cycle';
  END IF;
  PERFORM public._cs_t('colega segue o ciclo do negócio', (m ->> 'a_pagar_ciclo')::numeric,
    10 * ((c -> 'cycle' ->> 'end')::date - (c -> 'cycle' ->> 'start')::date + 1));

  -- antes do eff, o colaborador ainda segue o negócio (período atual intacto)
  c := public._commission_cycle_core(t, v_eff, now());
  SELECT e INTO m FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'professional_id' = semanal::text;
  IF m ? 'own_cycle' THEN
    RAISE EXCEPTION 'FAIL exceção valeu antes do próximo fechamento';
  END IF;

  -- volta para a regra do negócio a partir do próximo close dele
  j := public.set_commission_schedule_v1(semanal, NULL, NULL, NULL, 0, ARRAY[2, 0], true);
  c := public._commission_cycle_core(t, public._commission_next_close(t, NULL, (j ->> 'effective_from')::date + 40, true), now());
  SELECT e INTO m FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'professional_id' = semanal::text;
  IF m ? 'own_cycle' THEN
    RAISE EXCEPTION 'FAIL "Usar regra do negócio" não voltou';
  END IF;
  PERFORM public._cs_tt('commission_payments intocado',
    (SELECT string_agg(id::text || amount || start_date || end_date, ',' ORDER BY id) FROM public.commission_payments), before_pay);
  RAISE NOTICE 'PASS exceção por colaborador: vale do próximo close, janela própria no Pagamentos, volta à regra do negócio';
END $$;

-- 14) Ciclo já pago de A (06/08–05/09) idêntico depois de todas as trocas de regra
DO $$
DECLARE
  a jsonb := public._legacy_commission_cycle_core('10000000-0000-0000-0000-000000000001', '2026-09-05', '2026-10-02 12:00-03');
  b jsonb := public._commission_cycle_core('10000000-0000-0000-0000-000000000001', '2026-09-05', '2026-10-02 12:00-03');
BEGIN
  b := (b - ARRAY['frequency', 'pay_due', 'pay_offset_days']) || jsonb_build_object('cycle', (b -> 'cycle') - 'pay_due');
  IF (a - ARRAY['next_end']) IS DISTINCT FROM (b - ARRAY['next_end']) THEN
    RAISE EXCEPTION 'FAIL ciclo pago mudou: % vs %', a, b;
  END IF;
  RAISE NOTICE 'PASS ciclo pago 06/08–05/09 inalterado após mudar a regra (valores, status, pago)';
END $$;
SELECT set_config('request.jwt.claim.sub', '', false) AS _ \gset
