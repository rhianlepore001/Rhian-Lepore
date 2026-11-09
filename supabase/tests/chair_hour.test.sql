-- Executar apenas em PostgreSQL local descartável após aplicar a migração.
\set ON_ERROR_STOP on
SET request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
INSERT INTO public.fixed_costs (company_id, category, description, amount, start_date)
VALUES ('10000000-0000-0000-0000-000000000001', 'Aluguel', 'Aluguel', 800, '2026-11-01');
INSERT INTO public.fixed_costs (company_id, category, description, amount, start_date, is_owner_salary)
VALUES ('10000000-0000-0000-0000-000000000001', 'Pró-labore', 'Pró-labore', 500, '2026-11-01', true);
DO $$ BEGIN
 IF (SELECT active FROM public.fixed_costs WHERE description='Pró-labore') IS DISTINCT FROM false THEN RAISE EXCEPTION 'pró-labore deve ser desativado por padrão'; END IF;
END $$;
DO $$ BEGIN
 BEGIN
  UPDATE public.fixed_costs SET amount=999 WHERE description='Aluguel';
  RAISE EXCEPTION 'custo histórico não pode ser alterado';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  DELETE FROM public.fixed_costs WHERE description='Aluguel';
  RAISE EXCEPTION 'custo histórico não pode ser excluído';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
INSERT INTO public.chair_hour_settings(company_id, low_margin_pct) VALUES ('10000000-0000-0000-0000-000000000001', 25);
DO $$
DECLARE result jsonb;
BEGIN
  result := public.get_chair_hour_v1('2026-11-01', NULL);
  IF result->>'role' <> 'owner' OR jsonb_typeof(result->'professionals') <> 'array' OR NOT result ? 'total' THEN
    RAISE EXCEPTION 'dono deve receber detalhes e total: %', result;
  END IF;
  IF (result->'total'->>'fixed_cost')::numeric <> 800 THEN
    RAISE EXCEPTION 'custo compartilhado não pode ser duplicado: %', result;
  END IF;
  result := public.get_chair_hour_v1('2026-10-01', NULL);
  IF result->'total'->>'fixed_cost' IS NOT NULL THEN
    RAISE EXCEPTION 'custo futuro não configura período anterior: %', result;
  END IF;
END $$;
RESET ROLE;

-- Bloqueios sobrepostos são descontados uma única vez da disponibilidade.
INSERT INTO public.agenda_blocks(user_id,professional_id,starts_at,ends_at) VALUES
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a1','2026-11-06 13:00+00','2026-11-06 15:00+00'),
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a1','2026-11-06 14:00+00','2026-11-06 16:00+00');
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
DO $$ DECLARE result jsonb; BEGIN
 result := public.get_chair_hour_v1('2026-11-06','20000000-0000-0000-0000-0000000000a1','2026-11-06');
 IF (result->'total'->>'available_minutes')::numeric <> 300 THEN RAISE EXCEPTION 'desconto de bloqueios incorreto: %',result; END IF;
END $$;
RESET ROLE;
-- A estimativa exibida para a fila deve persistir quando vier do serviço.
INSERT INTO public.services (id,user_id,name,duration_minutes,price)
VALUES ('93000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Serviço de teste',50,100);
INSERT INTO public.appointments(id,user_id,client_id,appointment_time,status,price,professional_id,duration_minutes)
VALUES ('91000000-0000-0000-0000-000000000097','10000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','2026-11-02 14:00+00','Completed',100,'20000000-0000-0000-0000-0000000000a1',30);
INSERT INTO public.queue_entries(id,business_id,ticket_status,settled_appointment_id,service_id,duration_minutes)
VALUES ('92000000-0000-0000-0000-000000000097','10000000-0000-0000-0000-000000000001','serving','91000000-0000-0000-0000-000000000097','93000000-0000-0000-0000-000000000001',NULL);
SET request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT public.settle_queue_ticket_with_duration('92000000-0000-0000-0000-000000000097');
RESET ROLE;
DO $$ BEGIN
 IF (SELECT duration_minutes FROM public.appointments WHERE id='91000000-0000-0000-0000-000000000097') IS DISTINCT FROM 50 THEN RAISE EXCEPTION 'duração estimada diverge da tela'; END IF;
 IF (SELECT actual_duration_minutes FROM public.appointments WHERE id='91000000-0000-0000-0000-000000000097') IS NOT NULL THEN RAISE EXCEPTION 'tempo não ajustado deve continuar estimado'; END IF;
END $$;
-- Identificadores informados no fechamento devem pertencer à empresa autenticada.
INSERT INTO public.appointments(id,user_id,client_id,appointment_time,status,price,professional_id,duration_minutes)
VALUES ('91000000-0000-0000-0000-000000000098','10000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','2026-11-02 14:00+00','Pending',100,'20000000-0000-0000-0000-0000000000a1',30);
INSERT INTO public.queue_entries(id,business_id,ticket_status)
VALUES ('92000000-0000-0000-0000-000000000098','10000000-0000-0000-0000-000000000001','serving');
INSERT INTO public.queue_entries(id,business_id,ticket_status,professional_id)
VALUES ('92000000-0000-0000-0000-000000000096','10000000-0000-0000-0000-000000000001','serving','40000000-0000-0000-0000-0000000000b1');
SET request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.complete_appointment_with_duration('91000000-0000-0000-0000-000000000098',p_received_by=>'40000000-0000-0000-0000-0000000000b1');
  RAISE EXCEPTION 'received_by de outra empresa foi aceito';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.complete_appointment_with_duration('91000000-0000-0000-0000-000000000098',p_completed_by=>'40000000-0000-0000-0000-0000000000b1');
  RAISE EXCEPTION 'completed_by de outra empresa foi aceito';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.settle_queue_ticket_with_duration('92000000-0000-0000-0000-000000000098',p_professional_id=>'40000000-0000-0000-0000-0000000000b1');
  RAISE EXCEPTION 'profissional de outra empresa foi aceito';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.settle_queue_ticket_with_duration('92000000-0000-0000-0000-000000000096');
  RAISE EXCEPTION 'profissional anterior de outra empresa foi aceito';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- Um atendimento sem duração não pode produzir taxa de receita por hora enganosa.
INSERT INTO public.appointments(id,user_id,client_id,appointment_time,status,price,professional_id,duration_minutes,service)
VALUES ('91000000-0000-0000-0000-000000000099','10000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','2026-11-05 14:00+00','Completed',100,'20000000-0000-0000-0000-0000000000a1',NULL,'Corte');
INSERT INTO public.finance_records(user_id,appointment_id,professional_id,barber_name,type,revenue,commission_value,created_at)
VALUES ('10000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000099','20000000-0000-0000-0000-0000000000a1','Ana','expense',100,10,'2026-11-05 15:00+00');
SET request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
DO $$ DECLARE result jsonb; BEGIN
 result := public.get_chair_hour_v1('2026-11-05','20000000-0000-0000-0000-0000000000a1','2026-11-05');
 IF result->'total'->>'revenue_per_worked_hour' IS NOT NULL OR result->'total'->>'occupancy' IS NOT NULL THEN
   RAISE EXCEPTION 'duração desconhecida deve impedir cálculo por hora e ocupação: %', result;
 END IF;
END $$;
RESET ROLE;

-- Meia hora e uma hora e meia devem manter precisão nos denominadores.
INSERT INTO public.appointments(id,user_id,client_id,appointment_time,status,price,professional_id,duration_minutes,service)
VALUES
 ('91000000-0000-0000-0000-000000000030','10000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','2026-11-03 14:00+00','Completed',60,'20000000-0000-0000-0000-0000000000a1',30,'Corte'),
 ('91000000-0000-0000-0000-000000000090','10000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','2026-11-04 14:00+00','Completed',90,'20000000-0000-0000-0000-0000000000a1',90,'Corte');
INSERT INTO public.finance_records(user_id,appointment_id,professional_id,barber_name,type,revenue,commission_value,created_at)
VALUES
 ('10000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000030','20000000-0000-0000-0000-0000000000a1','Ana','expense',60,0,'2026-11-03 15:00+00'),
 ('10000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000090','20000000-0000-0000-0000-0000000000a1','Ana','expense',90,0,'2026-11-04 16:00+00');
SET request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
DO $$ DECLARE result jsonb; BEGIN
 result := public.get_chair_hour_v1('2026-11-03','20000000-0000-0000-0000-0000000000a1','2026-11-03');
 IF (result->'total'->>'revenue_per_worked_hour')::numeric <> 120 OR (result->'professionals'->0->>'revenue_per_worked_hour')::numeric <> 120 THEN
   RAISE EXCEPTION 'meia hora deve corresponder a 0.5h: %', result;
 END IF;
 result := public.get_chair_hour_v1('2026-11-04','20000000-0000-0000-0000-0000000000a1','2026-11-04');
 IF (result->'total'->>'revenue_per_worked_hour')::numeric <> 60 OR (result->'professionals'->0->>'revenue_per_worked_hour')::numeric <> 60 THEN
   RAISE EXCEPTION '90 minutos devem corresponder a 1.5h: %', result;
 END IF;
END $$;
RESET ROLE;
-- Chamadas repetidas não podem alterar o tempo de atendimento já finalizado.
INSERT INTO public.appointments(id,user_id,client_id,appointment_time,status,price,professional_id,duration_minutes)
VALUES ('91000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','2026-11-02 14:00+00','Pending',100,'20000000-0000-0000-0000-0000000000a1',30);
INSERT INTO public.queue_entries(id,business_id,ticket_status,settled_appointment_id)
VALUES ('92000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','serving','91000000-0000-0000-0000-000000000001');
SET request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT public.complete_appointment_with_duration('91000000-0000-0000-0000-000000000001',p_actual_duration_minutes=>45);
SELECT public.complete_appointment_with_duration('91000000-0000-0000-0000-000000000001',p_actual_duration_minutes=>NULL);
RESET ROLE;
DO $$ BEGIN
 IF (SELECT actual_duration_minutes FROM public.appointments WHERE id='91000000-0000-0000-0000-000000000001') IS DISTINCT FROM 45 THEN RAISE EXCEPTION 'repetição não pode modificar duração'; END IF;
END $$;
SET ROLE authenticated;
SELECT public.settle_queue_ticket_with_duration('92000000-0000-0000-0000-000000000001',p_actual_duration_minutes=>60);
SELECT public.settle_queue_ticket_with_duration('92000000-0000-0000-0000-000000000001',p_actual_duration_minutes=>NULL);
RESET ROLE;
DO $$ BEGIN
 IF (SELECT actual_duration_minutes FROM public.appointments WHERE id='91000000-0000-0000-0000-000000000001') IS DISTINCT FROM 60 THEN RAISE EXCEPTION 'repetição de fila não pode modificar duração'; END IF;
END $$;
INSERT INTO public.finance_records(user_id,appointment_id,professional_id,barber_name,type,revenue,commission_value,created_at)
VALUES ('10000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a1','Ana','expense',95,25,'2026-11-02 15:00+00');
UPDATE public.appointments SET price=95 WHERE id='91000000-0000-0000-0000-000000000001';
INSERT INTO public.finance_records(user_id,appointment_id,professional_id,barber_name,type,revenue,commission_value,created_at)
VALUES ('10000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a1','Ana','expense',0,10,'2026-11-02 15:30+00');
SET ROLE authenticated;
DO $$ DECLARE result jsonb; BEGIN
 result := public.get_chair_hour_v1('2026-11-02','20000000-0000-0000-0000-0000000000a1','2026-11-02');
 IF (result->'total'->>'revenue')::numeric <> 95 OR (result->'total'->>'commission')::numeric <> 25 THEN
   RAISE EXCEPTION 'financeiro do atendimento deve usar o lançamento não-produto mesmo com tipo padrão expense: %', result;
 END IF;
END $$;
RESET ROLE;
INSERT INTO public.profiles(id,role,company_id,region) VALUES ('10000000-0000-0000-0000-000000000099',NULL,'10000000-0000-0000-0000-000000000001','BR');
SET request.jwt.claim.sub = '10000000-0000-0000-0000-000000000099';
SET ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.complete_appointment_with_duration('91000000-0000-0000-0000-000000000001');
  RAISE EXCEPTION 'papel nulo não pode finalizar atendimento';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.settle_queue_ticket_with_duration('92000000-0000-0000-0000-000000000001');
  RAISE EXCEPTION 'papel nulo não pode finalizar fila';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.get_chair_hour_v1(date,uuid,date)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon não pode executar métrica';
  END IF;
END $$;
SET request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.fixed_costs (company_id, category, description, amount, start_date, professional_id)
    VALUES ('10000000-0000-0000-0000-000000000001', 'Teste', 'Outro tenant', 10, '2026-11-01', '40000000-0000-0000-0000-0000000000b1');
    RAISE EXCEPTION 'profissional de outro tenant foi aceito';
  EXCEPTION WHEN foreign_key_violation OR check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.fixed_costs (company_id, category, description, amount, start_date)
    VALUES ('30000000-0000-0000-0000-000000000001', 'Teste', 'Outro tenant', 10, '2026-11-01');
    RAISE EXCEPTION 'custo para outro tenant foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
SET request.jwt.claim.sub = '10000000-0000-0000-0000-0000000000a1';
SET ROLE authenticated;
DO $$
DECLARE result jsonb;
BEGIN
  BEGIN
    UPDATE public.team_members SET working_hours='{}'::jsonb WHERE id='20000000-0000-0000-0000-0000000000b1';
    RAISE EXCEPTION 'colaborador não pode alterar horário de outro profissional';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.team_members(id,user_id,name,role,working_hours) VALUES ('20000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000001','Teste','Barbeiro','{}'::jsonb);
    RAISE EXCEPTION 'colaborador não pode inserir horário';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.fixed_costs) OR EXISTS (SELECT 1 FROM public.service_costs) OR EXISTS (SELECT 1 FROM public.chair_hour_settings) THEN
    RAISE EXCEPTION 'colaborador não pode ler custos';
  END IF;
  result := public.get_chair_hour_v1('2026-11-01', NULL);
  IF result ? 'total' OR result ? 'services' OR jsonb_array_length(result->'professionals') <> 1 THEN
    RAISE EXCEPTION 'colaborador vê apenas seus próprios indicadores: %', result;
  END IF;
  IF (result->'professionals'->0) ?| ARRAY['fixed_cost','material_cost','commission','cost_per_hour','margin_per_hour','idle_cost'] THEN
    RAISE EXCEPTION 'colaborador recebeu custos: %', result;
  END IF;
  BEGIN
    PERFORM public.get_chair_hour_v1('2026-11-01', '20000000-0000-0000-0000-0000000000b1');
    RAISE EXCEPTION 'acesso a outro profissional deveria falhar';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
SET request.jwt.claim.sub = '30000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.fixed_costs) THEN RAISE EXCEPTION 'outra empresa vê custos'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(public.get_chair_hour_v1('2026-11-01', NULL)->'professionals') x WHERE x->>'id' = '20000000-0000-0000-0000-0000000000a1') THEN
    RAISE EXCEPTION 'outra empresa vê profissional de outro tenant';
  END IF;
END $$;
RESET ROLE;

-- Classificação e limiar configurável: custos ausentes não devem virar sucesso.
SET request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
INSERT INTO public.services(id,user_id,name,duration_minutes,price) VALUES
 ('93000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Corte',30,60),
 ('93000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','Barba',30,3);
SET ROLE authenticated;
INSERT INTO public.service_costs(company_id,service_id,amount) VALUES
 ('10000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000002',5),
 ('10000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000003',5);
RESET ROLE;
INSERT INTO public.appointments(id,user_id,client_id,appointment_time,status,price,professional_id,duration_minutes,service)
VALUES ('91000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','2026-11-03 15:00+00','Completed',3,'20000000-0000-0000-0000-0000000000a1',30,'Barba');
INSERT INTO public.finance_records(user_id,appointment_id,professional_id,barber_name,type,revenue,commission_value,created_at)
VALUES ('10000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-0000000000a1','Ana','expense',3,0,'2026-11-03 16:00+00');
SET ROLE authenticated;
UPDATE public.chair_hour_settings SET low_margin_pct=95 WHERE company_id='10000000-0000-0000-0000-000000000001';
DO $$ DECLARE result jsonb; BEGIN
 result := public.get_chair_hour_v1('2026-11-03','20000000-0000-0000-0000-0000000000a1','2026-11-03');
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(result->'services') s WHERE s->>'name'='Barba' AND s->>'status'='loss') THEN RAISE EXCEPTION 'serviço com prejuízo não classificado: %',result; END IF;
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(result->'services') s WHERE s->>'name'='Corte' AND s->>'status'='low') THEN RAISE EXCEPTION 'margem abaixo do limiar não classificada: %',result; END IF;
 IF (result->>'services_pending_count')::integer <> 0 THEN RAISE EXCEPTION 'atendimentos completos marcados pendentes: %',result; END IF;
 IF (result->'total'->>'occupancy')::numeric <> 0.125 THEN RAISE EXCEPTION 'ocupação incorreta: %',result; END IF;
END $$;
UPDATE public.chair_hour_settings SET low_margin_pct=5 WHERE company_id='10000000-0000-0000-0000-000000000001';
DO $$ DECLARE result jsonb; BEGIN
 result := public.get_chair_hour_v1('2026-11-03','20000000-0000-0000-0000-0000000000a1','2026-11-03');
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(result->'services') s WHERE s->>'name'='Corte') THEN RAISE EXCEPTION 'limiar configurado não foi respeitado: %',result; END IF;
END $$;
RESET ROLE;
