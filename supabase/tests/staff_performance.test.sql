-- Testes de 20260929120000_staff_performance_v1 (rodar via scripts/test-sql-staff-performance.sh).
-- "Agora" fixo: 02/10/2026 12:00 BRT. Cada assert imprime PASS ou aborta com FAIL.
CREATE FUNCTION public._t(p_label text, p_got numeric, p_exp numeric) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_got IS DISTINCT FROM p_exp THEN RAISE EXCEPTION 'FAIL %: obtido %, esperado %', p_label, p_got, p_exp; END IF;
END $$;
CREATE FUNCTION public._tt(p_label text, p_got text, p_exp text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_got IS DISTINCT FROM p_exp THEN RAISE EXCEPTION 'FAIL %: obtido %, esperado %', p_label, p_got, p_exp; END IF;
END $$;
CREATE FUNCTION public._denied(p_sql text, p_label text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE p_sql; EXCEPTION WHEN insufficient_privilege THEN RETURN 'PASS ' || p_label || ': 42501'; END;
  RAISE EXCEPTION 'FAIL %: não negou', p_label;
END $$;
GRANT EXECUTE ON FUNCTION public._t(text, numeric, numeric), public._tt(text, text, text), public._denied(text, text) TO authenticated, anon;

CREATE TABLE pg_temp.res AS
SELECT public._staff_performance_core('10000000-0000-0000-0000-000000000001', '2026-09-01', '2026-09-30', NULL, true,
                                      '2026-10-02 12:00:00-03', false) AS j;
CREATE FUNCTION pg_temp.mem(n text) RETURNS jsonb LANGUAGE sql AS $$
  SELECT e FROM pg_temp.res, jsonb_array_elements(j -> 'members') e WHERE e ->> 'name' = n $$;
CREATE FUNCTION pg_temp.v(n text, k text) RETURNS numeric LANGUAGE sql AS $$ SELECT (pg_temp.mem(n) -> 'metrics' ->> k)::numeric $$;

-- 1) Ana = tabela da seção 5
DO $$ BEGIN
  PERFORM public._t('Ana atendimentos', pg_temp.v('Ana','atendimentos'), 12);
  PERFORM public._t('Ana clube', pg_temp.v('Ana','atendimentos_clube'), 2);
  PERFORM public._t('Ana pagos', pg_temp.v('Ana','atendimentos_pagos'), 10);
  PERFORM public._t('Ana receita serviços', pg_temp.v('Ana','receita_servicos'), 620);
  PERFORM public._t('Ana comissão serviços (sem despesa, sem produto)', pg_temp.v('Ana','comissao_servicos'), 248);
  PERFORM public._t('Ana produtos receita', pg_temp.v('Ana','receita_produtos'), 90);
  PERFORM public._t('Ana produtos custo', pg_temp.v('Ana','custo_produtos'), 45);
  PERFORM public._t('Ana produtos comissão', pg_temp.v('Ana','comissao_produtos'), 9);
  PERFORM public._t('M3 Ana retorno', pg_temp.v('Ana','retorno'), 408);
  PERFORM public._t('M4 Ana tempo total', pg_temp.v('Ana','tempo_total_min'), 420);
  PERFORM public._t('M4 Ana tempo clube', pg_temp.v('Ana','tempo_clube_min'), 60);
  PERFORM public._t('M4 Ana tempo pago', pg_temp.v('Ana','tempo_pago_min'), 360);
  PERFORM public._t('M4 Ana faturamento/h', pg_temp.v('Ana','faturamento_por_hora'), 103.33);
  PERFORM public._t('M4 Ana retorno/h', pg_temp.v('Ana','retorno_por_hora'), 68);
  PERFORM public._t('M5 Ana ticket', pg_temp.v('Ana','ticket_medio'), 62);
  PERFORM public._t('M6 Ana faltas', pg_temp.v('Ana','faltas'), 1);
  PERFORM public._t('M6 Ana cancel', pg_temp.v('Ana','cancelamentos'), 1);
  PERFORM public._t('M6 Ana desfechos', pg_temp.v('Ana','desfechos'), 14);
  PERFORM public._t('M6 Ana taxa faltas', pg_temp.v('Ana','taxa_faltas'), 0.0714);
  PERFORM public._t('M6 Ana sem desfecho', pg_temp.v('Ana','sem_desfecho'), 1);
  PERFORM public._t('M7 Ana visitas com produto', pg_temp.v('Ana','visitas_com_produto'), 3);
  PERFORM public._t('M7 Ana attach', pg_temp.v('Ana','attach'), 0.25);
  PERFORM public._t('M9 Ana maduros', pg_temp.v('Ana','maduros'), 11);
  PERFORM public._t('M9 Ana voltou', pg_temp.v('Ana','voltou'), 6);
  PERFORM public._t('M9 Ana taxa', pg_temp.v('Ana','voltou_taxa'), 0.5455);
  PERFORM public._t('M9 Ana imaturos', pg_temp.v('Ana','imaturos'), 1);
  PERFORM public._t('R4.10 Ana receita gerada', pg_temp.v('Ana','receita_gerada'), 710);
  PERFORM public._t('R4.11 Ana comissão do período', pg_temp.v('Ana','comissao_periodo'), 257);
  PERFORM public._t('Ana sem registro financeiro', pg_temp.v('Ana','sem_registro_financeiro'), 0);
  RAISE NOTICE 'PASS Ana (seção 5): 12 atend. · retorno 408 · 68/h · 103,33/h · ticket 62 · faltas 1/14 · voltou 6/11 · attach 3/12 · borda 30/09 23:30 BRT em setembro';
END $$;

-- 2) Ana vs agosto (período anterior = mês cheio anterior); duplicada não duplica
DO $$ DECLARE p jsonb := pg_temp.mem('Ana') -> 'previous'; BEGIN
  PERFORM public._tt('período anterior', (SELECT j -> 'period' -> 'previous' ->> 'start' FROM pg_temp.res), '2026-08-01');
  PERFORM public._tt('período anterior fim', (SELECT j -> 'period' -> 'previous' ->> 'end' FROM pg_temp.res), '2026-08-31');
  PERFORM public._t('Ana agosto retorno (duplicada ignorada)', (p ->> 'retorno')::numeric, 360);
  PERFORM public._t('Ana agosto atendimentos', (p ->> 'atendimentos')::numeric, 12);
  PERFORM public._t('Ana agosto voltou', (p ->> 'voltou_taxa')::numeric, 0.5);
  PERFORM public._t('Ana agosto duplicadas', (p ->> 'duplicadas')::numeric, 1);
  RAISE NOTICE 'PASS Ana agosto: retorno 360 (Δ +48), voltou 50%%, duplicada contada 1× (qualidade = 1)';
END $$;

-- 3) Bruno, Caio (amostra baixa + avulso), Dono (comissão 0), Duda (inativa), Eva (sem dado → não aparece)
DO $$ BEGIN
  PERFORM public._t('Bruno retorno', pg_temp.v('Bruno','retorno'), 300);
  PERFORM public._t('Bruno retorno/h', pg_temp.v('Bruno','retorno_por_hora'), 40);
  PERFORM public._t('Bruno ticket', pg_temp.v('Bruno','ticket_medio'), 40);
  PERFORM public._t('Bruno faltas', pg_temp.v('Bruno','taxa_faltas'), 0.1176);
  PERFORM public._t('Bruno voltou', pg_temp.v('Bruno','voltou_taxa'), 0.6);
  PERFORM public._t('Bruno tempo', pg_temp.v('Bruno','tempo_total_min'), 450);
  PERFORM public._t('Caio atendimentos', pg_temp.v('Caio','atendimentos'), 5);
  PERFORM public._tt('Caio amostra baixa', pg_temp.mem('Caio') ->> 'low_sample', 'true');
  PERFORM public._t('Caio avulso receita', pg_temp.v('Caio','receita_avulsa'), 20);
  PERFORM public._t('Caio retorno (com avulso)', pg_temp.v('Caio','retorno'), 163);
  PERFORM public._t('Caio retorno/h (sem avulso)', pg_temp.v('Caio','retorno_por_hora'), 60);
  PERFORM public._t('Dono comissão tratada como 0', pg_temp.v('Rhian (dono)','comissao_periodo'), 0);
  PERFORM public._t('Dono retorno', pg_temp.v('Rhian (dono)','retorno'), 300);
  PERFORM public._tt('Dono selo', pg_temp.mem('Rhian (dono)') ->> 'is_owner', 'true');
  PERFORM public._tt('Duda inativa', pg_temp.mem('Duda') ->> 'inactive', 'true');
  PERFORM public._tt('Eva sem dado não aparece', (pg_temp.mem('Eva'))::text, NULL);
  RAISE NOTICE 'PASS Bruno 300 · 40/h · faltas 2/17 · voltou 9/15; Caio amostra baixa + avulso fora do /h; dono comissão 0; inativa com dado aparece';
END $$;

-- 4) Ranking por Retorno por hora: 1º Ana, 2º Bruno; o resto sem posição
DO $$ BEGIN
  PERFORM public._tt('ranking disponível', (SELECT j ->> 'ranking_available' FROM pg_temp.res), 'true');
  PERFORM public._t('Ana 1º', (pg_temp.mem('Ana') ->> 'rank')::numeric, 1);
  PERFORM public._t('Bruno 2º', (pg_temp.mem('Bruno') ->> 'rank')::numeric, 2);
  PERFORM public._tt('Caio sem posição', pg_temp.mem('Caio') ->> 'rank', NULL);
  PERFORM public._tt('Dono sem posição', pg_temp.mem('Rhian (dono)') ->> 'rank', NULL);
  PERFORM public._tt('Duda sem posição', pg_temp.mem('Duda') ->> 'rank', NULL);
  PERFORM public._tt('ordem', (SELECT string_agg(e ->> 'name', ',' ORDER BY o) FROM pg_temp.res, jsonb_array_elements(j -> 'members') WITH ORDINALITY x(e, o)),
                     'Ana,Bruno,Caio,Rhian (dono),Duda');
  RAISE NOTICE 'PASS ranking: Ana (68/h) > Bruno (40/h); Caio, Dono e Duda sem posição';
END $$;

-- 5) Sem profissional + reconciliação (cartões + sem profissional = equipe)
DO $$ DECLARE u jsonb; tt jsonb; BEGIN
  SELECT j -> 'unassigned', j -> 'team_totals' INTO u, tt FROM pg_temp.res;
  PERFORM public._t('sem prof. atendimentos (outro tenant + nulo)', (u ->> 'atendimentos')::numeric, 2);
  PERFORM public._t('sem prof. receita', (u ->> 'receita_servicos')::numeric, 100);
  PERFORM public._t('sem prof. balcão', (u ->> 'receita_produtos')::numeric, 20);
  PERFORM public._t('sem prof. retorno', (u ->> 'retorno')::numeric, 112);
  PERFORM public._t('equipe atendimentos', (tt ->> 'atendimentos')::numeric, 38);
  PERFORM public._t('equipe = soma dos cartões + sem prof. (retorno)',
    (tt ->> 'retorno')::numeric,
    (SELECT sum((e -> 'metrics' ->> 'retorno')::numeric) FROM pg_temp.res, jsonb_array_elements(j -> 'members') e) + (u ->> 'retorno')::numeric);
  PERFORM public._t('equipe retorno', (tt ->> 'retorno')::numeric, 1313);
  RAISE NOTICE 'PASS sem profissional (outro tenant, nulo, balcão) e reconciliação equipe = 1313';
END $$;

-- 6) Cenário 2: atendimento sem registro financeiro (sem estimar comissão)
BEGIN;
INSERT INTO public.appointments (user_id, client_id, appointment_time, status, price, professional_id, duration_minutes)
VALUES ('10000000-0000-0000-0000-000000000001', md5('z')::uuid, '2026-09-27 13:00:00+00', 'Completed', 50, '20000000-0000-0000-0000-0000000000a1', 30);
DO $$ DECLARE a jsonb; BEGIN
  SELECT e -> 'metrics' INTO a FROM jsonb_array_elements(public._staff_performance_core('10000000-0000-0000-0000-000000000001',
    '2026-09-01', '2026-09-30', NULL, false, '2026-10-02 12:00:00-03', false) -> 'members') e WHERE e ->> 'name' = 'Ana';
  PERFORM public._t('sem registro: contagem', (a ->> 'sem_registro_financeiro')::numeric, 1);
  PERFORM public._t('sem registro: receita entra', (a ->> 'receita_servicos')::numeric, 670);
  PERFORM public._t('sem registro: comissão NÃO estimada', (a ->> 'comissao_servicos')::numeric, 248);
  RAISE NOTICE 'PASS sem registro financeiro: entra em receita/ticket, comissão não estimada, qualidade = 1';
END $$;
ROLLBACK;

-- 7) Fuso: tenant PT sem business_settings → Europe/Lisbon; 23:30 UTC de 30/09 = 00:30 WEST de 01/10
DO $$ DECLARE s jsonb; o jsonb; BEGIN
  s := public._staff_performance_core('30000000-0000-0000-0000-000000000001', '2026-09-01', '2026-09-30', NULL, false, '2026-10-02 12:00:00+01', false);
  o := public._staff_performance_core('30000000-0000-0000-0000-000000000001', '2026-10-01', '2026-10-31', NULL, false, '2026-10-02 12:00:00+01', false);
  PERFORM public._tt('fuso PT fallback', s -> 'period' ->> 'tz', 'Europe/Lisbon');
  PERFORM public._tt('moeda PT', s -> 'period' ->> 'currency', 'EUR');
  PERFORM public._t('PT setembro', (s -> 'team_totals' ->> 'atendimentos')::numeric, 1);
  PERFORM public._t('PT outubro (borda WEST)', (o -> 'team_totals' ->> 'atendimentos')::numeric, 1);
  PERFORM public._tt('outubro em andamento', o -> 'period' ->> 'partial', 'true');
  RAISE NOTICE 'PASS fuso: BRT (30/09 23:30 em setembro) e WEST (00:30 de 01/10 em outubro); fallback PT → Europe/Lisbon';
END $$;

-- 8) Períodos: N dias → mesmos N dias antes; > 366 dias e início > fim recusados
DO $$ DECLARE s jsonb; BEGIN
  s := public._staff_performance_core('10000000-0000-0000-0000-000000000001', '2026-09-10', '2026-09-19', NULL, true, '2026-10-02 12:00:00-03', false);
  PERFORM public._tt('anterior de 10 dias (início)', s -> 'period' -> 'previous' ->> 'start', '2026-08-31');
  PERFORM public._tt('anterior de 10 dias (fim)', s -> 'period' -> 'previous' ->> 'end', '2026-09-09');
  BEGIN
    PERFORM public._staff_performance_core('10000000-0000-0000-0000-000000000001', '2025-01-01', '2026-01-02', NULL, true, now(), false);
    RAISE EXCEPTION 'FAIL período > 366 aceito';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public._staff_performance_core('10000000-0000-0000-0000-000000000001', '2026-09-30', '2026-09-01', NULL, true, now(), false);
    RAISE EXCEPTION 'FAIL início > fim aceito';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM public._staff_performance_core('10000000-0000-0000-0000-000000000001', '2025-10-01', '2026-09-30', NULL, true, now(), false);
  RAISE NOTICE 'PASS períodos: anterior de N dias; 366 dias ok; > 366 e início > fim → 22023';
END $$;

-- 9) Detalhe de 1 colaborador: tendência de 6 meses e serviços mais feitos
DO $$ DECLARE d jsonb; BEGIN
  d := public._staff_performance_core('10000000-0000-0000-0000-000000000001', '2026-09-01', '2026-09-30', '20000000-0000-0000-0000-0000000000a1', true, '2026-10-02 12:00:00-03', false);
  PERFORM public._t('detalhe só 1 membro', jsonb_array_length(d -> 'members'), 1);
  PERFORM public._t('tendência 6 meses', jsonb_array_length(d -> 'trend'), 6);
  PERFORM public._tt('tendência último mês', d -> 'trend' -> 5 ->> 'month', '2026-09');
  PERFORM public._t('tendência agosto retorno', (d -> 'trend' -> 4 ->> 'retorno')::numeric, 360);
  PERFORM public._tt('tendência abril amostra baixa', d -> 'trend' -> 0 ->> 'low_sample', 'true');
  PERFORM public._tt('top serviço', d -> 'top_services' -> 0 ->> 'service', 'corte');
  PERFORM public._t('top serviço contagem', (d -> 'top_services' -> 0 ->> 'count')::numeric, 8);
  PERFORM public._tt('detalhe sem linha de equipe', d ->> 'team_totals', NULL);
  RAISE NOTICE 'PASS detalhe: 6 meses (abr–set, agosto 360), top 5 serviços (corte 8)';
END $$;

-- 10) Ciclo de comissão (M1, M2): ciclo 06/09–05/10 em aberto
DO $$ DECLARE c jsonb; BEGIN
  c := public._commission_cycle_core('10000000-0000-0000-0000-000000000001', '2026-10-05', '2026-10-02 12:00:00-03');
  PERFORM public._tt('ciclo início', c -> 'cycle' ->> 'start', '2026-09-06');
  PERFORM public._tt('ciclo fim', c -> 'cycle' ->> 'end', '2026-10-05');
  PERFORM public._tt('ciclo aberto', c -> 'cycle' ->> 'open', 'true');
  PERFORM public._tt('ciclo anterior', c ->> 'previous_end', '2026-09-05');
  PERFORM public._tt('próximo ciclo', c ->> 'next_end', '2026-11-05');
  PERFORM public._t('Ana a pagar no ciclo (sem despesa)', (SELECT (e ->> 'a_pagar_ciclo')::numeric FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'name' = 'Ana'), 257);
  PERFORM public._t('Ana serviços/produtos', (SELECT (e ->> 'servicos_ciclo')::numeric * 10 + (e ->> 'produtos_ciclo')::numeric FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'name' = 'Ana'), 103);
  PERFORM public._t('Caio a pagar (avulso de 05/09 23:30 BRT fica no ciclo anterior)', (SELECT (e ->> 'a_pagar_ciclo')::numeric FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'name' = 'Caio'), 100);
  PERFORM public._t('Caio saldo acumulado', (SELECT (e ->> 'saldo_acumulado')::numeric FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'name' = 'Caio'), 107);
  PERFORM public._t('Caio saldo de ciclos anteriores', (SELECT (e ->> 'saldo_anterior')::numeric FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'name' = 'Caio'), 7);
  PERFORM public._t('Eva saldo de ciclos anteriores', (SELECT (e ->> 'saldo_anterior')::numeric FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'name' = 'Eva'), 15);
  PERFORM public._tt('dono fora do repasse', (SELECT e::text FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'name' = 'Rhian (dono)'), NULL);
  PERFORM public._tt('Duda inativa com saldo aparece', (SELECT e ->> 'inactive' FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'name' = 'Duda'), 'true');
  PERFORM public._tt('Eva excluída com saldo antigo aparece', (SELECT e ->> 'status' FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'name' = 'Eva'), 'nada_a_pagar');
  PERFORM public._t('total a pagar', (c -> 'totals' ->> 'a_pagar_ciclo')::numeric, 677);
  PERFORM public._t('pendentes', (c -> 'totals' ->> 'pendentes')::numeric, 4);
  RAISE NOTICE 'PASS ciclo 06/09–05/10: Ana 257 (10 serviços + 3 produtos, sem despesa), Caio 100 (+7 do ciclo anterior), dono fora, inativos com saldo aparecem, total 677';
END $$;

-- 11) Ciclo padrão (último fechado) e status Pago; Pago com ajuste
DO $$ DECLARE c jsonb; BEGIN
  c := public._commission_cycle_core('10000000-0000-0000-0000-000000000001', NULL, '2026-10-02 12:00:00-03');
  PERFORM public._tt('padrão = último fechado', c -> 'cycle' ->> 'end', '2026-09-05');
  PERFORM public._tt('fechado', c -> 'cycle' ->> 'open', 'false');
  PERFORM public._tt('Ana paga', (SELECT e ->> 'status' FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'name' = 'Ana'), 'pago');
  PERFORM public._t('Caio 7 (borda BRT)', (SELECT (e ->> 'a_pagar_ciclo')::numeric FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'name' = 'Caio'), 7);
  PERFORM public._t('Caio: os 100 do ciclo seguinte NÃO são "de ciclos anteriores"', (SELECT (e ->> 'saldo_anterior')::numeric FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'name' = 'Caio'), 0);
  PERFORM public._tt('Ana: data do pagamento DESTE ciclo', (SELECT (e ->> 'pago_ciclo_em') IS NOT NULL FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'name' = 'Ana')::text, 'true');
  PERFORM public._tt('Eva pendente', (SELECT e ->> 'status' FROM jsonb_array_elements(c -> 'members') e WHERE e ->> 'name' = 'Eva'), 'pendente');
  PERFORM public._tt('settle 31 em fev', public._commission_settle_date('2026-02-10', 31)::text, '2026-02-28');
  RAISE NOTICE 'PASS ciclo padrão 06/08–05/09 fechado: Ana Pago (264 = 264), Caio 7, Eva pendente; dia 31 → 28/02';
END $$;
BEGIN;
UPDATE public.finance_records SET commission_paid = true
 WHERE professional_id = '20000000-0000-0000-0000-0000000000a1' AND type = 'revenue'
   AND created_at >= '2026-09-06 00:00:00-03' AND created_at < '2026-10-06 00:00:00-03';
INSERT INTO public.commission_payments (user_id, professional_id, amount, start_date, end_date, status, paid_at)
VALUES ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000a1', 250, '2026-09-06', '2026-10-05', 'paid', now());
DO $$ DECLARE e jsonb; BEGIN
  SELECT x INTO e FROM jsonb_array_elements(public._commission_cycle_core('10000000-0000-0000-0000-000000000001', '2026-10-05', '2026-10-02 12:00:00-03') -> 'members') x WHERE x ->> 'name' = 'Ana';
  PERFORM public._tt('Pago com ajuste', e ->> 'status', 'pago_com_ajuste');
  PERFORM public._t('pago', (e ->> 'pago_ciclo')::numeric, 250);
  PERFORM public._t('calculado', (e ->> 'pago_calculado')::numeric, 257);
  RAISE NOTICE 'PASS Pago com ajuste (pago 250; calculado 257)';
END $$;
ROLLBACK;

-- 12) Permissões pela RPC pública
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false) AS _ \gset
DO $$ DECLARE j jsonb; BEGIN
  j := public.get_staff_performance_v1('2026-09-01', '2026-09-30');
  PERFORM public._tt('dono modo', j ->> 'mode', 'owner');
  PERFORM public._t('dono vê a equipe', jsonb_array_length(j -> 'members'), 5);
  j := public.get_commission_cycle_v1('2026-10-05');
  PERFORM public._t('dono vê o ciclo', (j -> 'totals' ->> 'a_pagar_ciclo')::numeric, 677);
  RAISE NOTICE 'PASS dono: equipe (5) e ciclo';
END $$;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-0000000000a1', false) AS _ \gset
DO $$ DECLARE j jsonb; k text; BEGIN
  j := public.get_staff_performance_v1('2026-09-01', '2026-09-30');
  PERFORM public._tt('staff modo', j ->> 'mode', 'staff');
  PERFORM public._tt('staff é a Ana', j -> 'me' ->> 'professional_id', '20000000-0000-0000-0000-0000000000a1');
  PERFORM public._t('staff atendimentos', (j -> 'me' -> 'metrics' ->> 'atendimentos')::numeric, 12);
  PERFORM public._t('staff comissão do período', (j -> 'me' -> 'metrics' ->> 'comissao_periodo')::numeric, 257);
  FOREACH k IN ARRAY ARRAY['members','unassigned','team_totals','ranking_available'] LOOP
    IF j ? k THEN RAISE EXCEPTION 'FAIL staff recebeu chave proibida %', k; END IF;
  END LOOP;
  FOREACH k IN ARRAY ARRAY['retorno','retorno_por_hora','custo_produtos','comissao_servicos','receita_avulsa','comissao_avulsa'] LOOP
    IF (j -> 'me' -> 'metrics') ? k OR (j -> 'me' -> 'previous') ? k THEN RAISE EXCEPTION 'FAIL staff recebeu métrica proibida %', k; END IF;
  END LOOP;
  IF j -> 'me' ? 'rank' OR j -> 'trend' -> 0 ? 'retorno' OR (j -> 'trend' -> 5 ->> 'comissao')::numeric IS DISTINCT FROM 257 THEN RAISE EXCEPTION 'FAIL staff recebeu posição/retorno'; END IF;
  RAISE NOTICE 'PASS staff: só os próprios números; sem retorno, custo, ranking, equipe (chaves ausentes)';
END $$;
SELECT public._denied($q$SELECT public.get_staff_performance_v1('2026-09-01','2026-09-30','20000000-0000-0000-0000-0000000000b1')$q$, 'staff pede colega');
SELECT public._denied($q$SELECT public.get_commission_cycle_v1()$q$, 'staff pede ciclo');
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-0000000000f1', false) AS _ \gset
SELECT public._denied($q$SELECT public.get_staff_performance_v1('2026-09-01','2026-09-30')$q$, 'ex-staff (vínculo excluído)');
SELECT set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-0000000000b1', false) AS _ \gset
SELECT public._denied($q$SELECT public.get_staff_performance_v1('2026-09-01','2026-09-30','20000000-0000-0000-0000-0000000000a1')$q$, 'staff de outro tenant');
DO $$ BEGIN
  PERFORM public._t('staff B vê só o próprio (tenant B)', (public.get_staff_performance_v1('2026-09-01','2026-09-30') -> 'me' -> 'metrics' ->> 'atendimentos')::numeric, 1);
END $$;
SELECT set_config('request.jwt.claim.sub', '', false) AS _ \gset
SELECT public._denied($q$SELECT public.get_staff_performance_v1('2026-09-01','2026-09-30')$q$, 'sem login');
SELECT public._denied($q$SELECT public._staff_performance_core('10000000-0000-0000-0000-000000000001','2026-09-01','2026-09-30',NULL,true,now(),false)$q$, 'authenticated chama interna');
RESET ROLE;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT p.oid::regprocedure AS f, p.proname, p.prosecdef, p.proconfig FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace
             AND p.proname IN ('get_staff_performance_v1','get_commission_cycle_v1','_staff_performance_core','_commission_cycle_core','_staff_perf_raw','_staff_perf_tz','_commission_settle_date') LOOP
    IF has_function_privilege('anon', r.f, 'EXECUTE') THEN RAISE EXCEPTION 'FAIL anon executa %', r.f; END IF;
    IF r.proname LIKE '\_%' AND has_function_privilege('authenticated', r.f, 'EXECUTE') THEN RAISE EXCEPTION 'FAIL authenticated executa interna %', r.f; END IF;
    IF r.proname LIKE 'get\_%' AND NOT has_function_privilege('authenticated', r.f, 'EXECUTE') THEN RAISE EXCEPTION 'FAIL authenticated sem EXECUTE em %', r.f; END IF;
    IF r.proconfig IS DISTINCT FROM ARRAY['search_path=public'] THEN RAISE EXCEPTION 'FAIL search_path %', r.f; END IF;
    IF r.proname <> '_commission_settle_date' AND NOT r.prosecdef THEN RAISE EXCEPTION 'FAIL não é DEFINER %', r.f; END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_user_client_time') THEN RAISE EXCEPTION 'FAIL índice'; END IF;
  RAISE NOTICE 'PASS grants: anon sem EXECUTE; internas fechadas; search_path=public; DEFINER; índice criado';
END $$;
DROP FUNCTION public._t(text, numeric, numeric);
DROP FUNCTION public._tt(text, text, text);
DROP FUNCTION public._denied(text, text);
