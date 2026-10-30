-- Testes da revisão do PR #174: desfazer com referências, vínculos por arquivo, duplicidade,
-- retenção e limites. Dados fictícios. Executado depois de import_commit.test.sql.
BEGIN;
CREATE TABLE public.t_failures(message text);
GRANT ALL ON public.t_failures TO authenticated;
-- Registra cada falha e segue adiante, para mostrar todas de uma vez; o teste falha no final.
CREATE FUNCTION public.assert_import(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT COALESCE(ok,false) THEN INSERT INTO public.t_failures VALUES (message); RAISE WARNING 'FALHA: %', message; END IF; END $$;
CREATE FUNCTION public.t_stage(p_batch uuid, p_source text, p_kind text, p_rows jsonb[]) RETURNS void LANGUAGE plpgsql AS $$
DECLARE i integer;
BEGIN
  INSERT INTO public.import_batches(id,company_id,created_by,source,kind,expected_rows)
    VALUES (p_batch,'00000000-0000-0000-0000-0000000000a0','00000000-0000-0000-0000-0000000000a0',p_source,p_kind,array_length(p_rows,1));
  FOR i IN 1..array_length(p_rows,1) LOOP
    INSERT INTO public.import_staging_rows(company_id,batch_id,row_number,raw_data,normalized_data)
      VALUES ('00000000-0000-0000-0000-0000000000a0',p_batch,i,'{"origem":"teste"}',p_rows[i]);
  END LOOP;
END $$;
CREATE FUNCTION public.t_client(p_name text) RETURNS uuid LANGUAGE sql AS $$ SELECT id FROM public.clients WHERE name=p_name AND user_id='00000000-0000-0000-0000-0000000000a0' $$;
CREATE FUNCTION public.t_service(p_name text) RETURNS uuid LANGUAGE sql AS $$ SELECT id FROM public.services WHERE name=p_name AND user_id='00000000-0000-0000-0000-0000000000a0' $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a0',true);

-- B2: clientes usados fora das chaves estrangeiras são preservados no desfazer.
SELECT public.t_stage('50000000-0000-0000-0000-000000000001','fresha','client', ARRAY[
  '{"name":"Cliente Plano Fictício","source_id":"c1"}','{"name":"Cliente Financeiro Fictício","source_id":"c2"}',
  '{"name":"Cliente Fila Fictício","source_id":"c3"}','{"name":"Cliente Livre Fictício","source_id":"c4"}',
  '{"name":"Cliente Memória Fictício","source_id":"c5"}']::jsonb[]);
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000001');
SELECT public.assert_import((SELECT count(*)=5 FROM public.clients WHERE name LIKE 'Cliente % Fictício' AND source='import'),'five clients imported');
INSERT INTO public.client_memberships(user_id,client_id) VALUES ('00000000-0000-0000-0000-0000000000a0',public.t_client('Cliente Plano Fictício'));
INSERT INTO public.finance_records(user_id,client_name) VALUES ('00000000-0000-0000-0000-0000000000a0','CLIENTE FINANCEIRO FICTICIO');
INSERT INTO public.queue_entries(business_id,client_id) VALUES ('00000000-0000-0000-0000-0000000000a0',public.t_client('Cliente Fila Fictício'));
INSERT INTO public.client_semantic_memory(client_id) VALUES (public.t_client('Cliente Memória Fictício'));
SELECT public.undo_import_batch('50000000-0000-0000-0000-000000000001');
SELECT public.assert_import((SELECT count(*)=1 FROM public.clients WHERE name='Cliente Plano Fictício'),'client with membership preserved');
SELECT public.assert_import((SELECT count(*)=1 FROM public.clients WHERE name='Cliente Financeiro Fictício'),'client in finance records preserved');
SELECT public.assert_import((SELECT count(*)=1 FROM public.clients WHERE name='Cliente Fila Fictício'),'client in queue preserved');
SELECT public.assert_import((SELECT count(*)=1 FROM public.clients WHERE name='Cliente Memória Fictício'),'client with memory preserved');
SELECT public.assert_import((SELECT count(*)=0 FROM public.clients WHERE name='Cliente Livre Fictício'),'unused client removed');
SELECT public.assert_import((SELECT count(*)=1 FROM public.client_memberships),'membership still points to a client');

-- B2: serviços usados por planos, reservas, atendimentos (texto livre), financeiro, fila e adicionais.
SELECT public.t_stage('50000000-0000-0000-0000-000000000002','fresha','service', ARRAY[
  '{"name":"Serviço Plano Fictício","source_id":"s1","price":"10","duration":"30"}','{"name":"Serviço Reserva Fictício","source_id":"s2","price":"10","duration":"30"}',
  '{"name":"Serviço Reserva Original Fictício","source_id":"s3","price":"10","duration":"30"}','{"name":"Hidratação Atendida Fictícia","source_id":"s4","price":"10","duration":"30"}',
  '{"name":"Serviço Financeiro Fictício","source_id":"s5","price":"10","duration":"30"}','{"name":"Serviço Fila Fictício","source_id":"s6","price":"10","duration":"30"}',
  '{"name":"Serviço Adicional Fictício","source_id":"s7","price":"10","duration":"30"}','{"name":"Serviço Livre Fictício","source_id":"s8","price":"10","duration":"30"}',
  '{"name":"Serviço Ficha Fictício","source_id":"s9","price":"10","duration":"30"}']::jsonb[]);
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000002');
SELECT public.assert_import((SELECT count(*)=9 FROM public.services WHERE name LIKE '%Fictíci%' AND id IN (SELECT service_id FROM public.import_source_links)),'nine services imported');
INSERT INTO public.membership_plans(user_id,service_ids) VALUES ('00000000-0000-0000-0000-0000000000a0',ARRAY[public.t_service('Serviço Plano Fictício')]);
INSERT INTO public.public_bookings(business_id,service_ids) VALUES ('00000000-0000-0000-0000-0000000000a0',ARRAY[public.t_service('Serviço Reserva Fictício')]);
INSERT INTO public.public_bookings(business_id,service_ids,original_service_ids) VALUES ('00000000-0000-0000-0000-0000000000a0','{}',ARRAY[public.t_service('Serviço Reserva Original Fictício')]);
INSERT INTO public.appointments(user_id,service) VALUES ('00000000-0000-0000-0000-0000000000a0','Corte, HIDRATACAO atendida ficticia');
INSERT INTO public.finance_records(user_id,service_name) VALUES ('00000000-0000-0000-0000-0000000000a0','Serviço Financeiro Fictício');
INSERT INTO public.queue_entries(business_id,service_id) VALUES ('00000000-0000-0000-0000-0000000000a0',public.t_service('Serviço Fila Fictício'));
INSERT INTO public.service_upsells(user_id,parent_service_id,upsell_service_id) VALUES ('00000000-0000-0000-0000-0000000000a0',public.t_service('Serviço Adicional Fictício'),'60000000-0000-0000-0000-000000000001');
INSERT INTO public.hair_records(user_id,client_id,service) VALUES ('00000000-0000-0000-0000-0000000000a0','30000000-0000-0000-0000-000000000001','Serviço Ficha Fictício');
SELECT public.undo_import_batch('50000000-0000-0000-0000-000000000002');
SELECT public.assert_import((SELECT count(*)=8 FROM public.services WHERE name LIKE '%Fictíci%' AND id IN (SELECT service_id FROM public.import_source_links)),'eight used services preserved');
SELECT public.assert_import((SELECT count(*)=0 FROM public.services WHERE name='Serviço Livre Fictício'),'unused service removed');
SELECT public.assert_import((SELECT count(*)=1 FROM public.membership_plans WHERE service_ids <> '{}' AND NOT EXISTS (SELECT 1 FROM unnest(service_ids) u WHERE NOT EXISTS (SELECT 1 FROM public.services s WHERE s.id=u))),'plan has no dangling service');
SELECT public.assert_import((SELECT count(*)=0 FROM public.public_bookings b WHERE EXISTS (SELECT 1 FROM unnest(b.service_ids || COALESCE(b.original_service_ids,'{}')) u WHERE NOT EXISTS (SELECT 1 FROM public.services s WHERE s.id=u))),'booking has no dangling service');

-- B2: o desfazer trabalha em partes de até 200 registros e informa quanto falta.
SELECT public.t_stage('50000000-0000-0000-0000-000000000150','fresha','client', ARRAY(SELECT jsonb_build_object('name','Cliente Parte '||n||' Fictício','source_id','k'||n) FROM generate_series(1,250) n));
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000150');
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000150');
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000150');
SELECT public.assert_import((SELECT count(*)=250 FROM public.clients WHERE name LIKE 'Cliente Parte %'),'250 clients imported in three calls');
DO $$
DECLARE r jsonb; v_total integer := 0; calls integer := 0;
BEGIN
  LOOP
    r := public.undo_import_batch('50000000-0000-0000-0000-000000000150', calls = 0);
    calls := calls + 1;
    v_total := v_total + (r->>'undone')::integer;
    IF calls = 1 AND ((r->>'undone')::integer > 200 OR (r->>'remaining')::integer = 0) THEN RAISE EXCEPTION 'first call must be bounded, got %', r; END IF;
    EXIT WHEN (r->>'remaining')::integer = 0 OR calls > 10;
  END LOOP;
  IF v_total <> 250 OR calls <> 2 THEN RAISE EXCEPTION 'sliced undo wrong: total %, calls %', v_total, calls; END IF;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.t_failures VALUES ('sliced undo: ' || SQLERRM); RAISE WARNING 'FALHA: sliced undo: %', SQLERRM;
END $$;
SELECT public.assert_import((SELECT count(*)=0 FROM public.clients WHERE name LIKE 'Cliente Parte %'),'sliced undo removed every unused client');
SELECT public.assert_import((SELECT status='undone' FROM public.import_batches WHERE id='50000000-0000-0000-0000-000000000150'),'sliced undo completes the batch');

-- B3: identificadores de planilhas diferentes não colidem; o mesmo arquivo continua sendo reconhecido.
SELECT public.t_stage('50000000-0000-0000-0000-000000000201','spreadsheet','client', ARRAY['{"name":"Ana Arquivo Um Fictícia","source_id":"2","source_scope":"arquivo-um"}']::jsonb[]);
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000201');
SELECT public.t_stage('50000000-0000-0000-0000-000000000202','spreadsheet','client', ARRAY['{"name":"Bruna Arquivo Dois Fictícia","source_id":"2","source_scope":"arquivo-dois"}']::jsonb[]);
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000202');
SELECT public.assert_import((SELECT count(*)=1 FROM public.clients WHERE name='Bruna Arquivo Dois Fictícia'),'same ID in another file is imported');
SELECT public.t_stage('50000000-0000-0000-0000-000000000203','spreadsheet','client', ARRAY['{"name":"Ana Arquivo Um Fictícia","source_id":"2","source_scope":"arquivo-um"}']::jsonb[]);
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000203');
SELECT public.assert_import((SELECT outcome='ignored' FROM public.import_staging_rows WHERE batch_id='50000000-0000-0000-0000-000000000203'),'same file imported twice is recognised');
SELECT public.t_stage('50000000-0000-0000-0000-000000000204','spreadsheet','client', ARRAY['{"name":"Carla Sem Escopo Fictícia","source_id":"2"}']::jsonb[]);
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000204');
SELECT public.assert_import((SELECT count(*)=1 FROM public.clients WHERE name='Carla Sem Escopo Fictícia'),'generic source without scope never collides');
SELECT public.t_stage('50000000-0000-0000-0000-000000000205','trinks','client', ARRAY['{"name":"Débora Trinks Fictícia","source_id":"t-77"}']::jsonb[]);
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000205');
SELECT public.t_stage('50000000-0000-0000-0000-000000000206','trinks','client', ARRAY['{"name":"Débora Trinks Outra Fictícia","source_id":"t-77","source_scope":"qualquer"}']::jsonb[]);
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000206');
SELECT public.assert_import((SELECT outcome='ignored' FROM public.import_staging_rows WHERE batch_id='50000000-0000-0000-0000-000000000206'),'stable source IDs keep using the bare ID');

-- Duplicidade: telefone completo com DDD, nomes sem acento e mensagem clara.
INSERT INTO public.clients(user_id,name,phone) VALUES ('00000000-0000-0000-0000-0000000000a0','Existente Telefone Fictício','(11) 99999-7777'),('00000000-0000-0000-0000-0000000000a0','Existente Outro DDD Fictício','(11) 98888-6666'),('00000000-0000-0000-0000-0000000000a0','José Existente Acento Fictício',NULL);
SELECT public.t_stage('50000000-0000-0000-0000-000000000301','avec','client', ARRAY[
  '{"name":"Nome Novo Telefone Fictício","phones":["+5511999997777"],"source_id":"d1"}',
  '{"name":"Nome Novo Outro DDD Fictício","phones":["+5521988886666"],"source_id":"d2"}',
  '{"name":"jose existente acento ficticio","source_id":"d3"}',
  '{"name":"Repetido Um Fictício","phones":["+5511977771111"],"source_id":"d4"}',
  '{"name":"Repetido Dois Fictício","phones":["+5511977771111"],"source_id":"d5"}',
  '{"name":"Sem Contato Fictício","source_id":"d6"}']::jsonb[]);
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000301');
SELECT public.assert_import((SELECT outcome='pending' FROM public.import_staging_rows WHERE batch_id='50000000-0000-0000-0000-000000000301' AND row_number=1),'formatted existing phone is detected');
SELECT public.assert_import((SELECT outcome='imported' FROM public.import_staging_rows WHERE batch_id='50000000-0000-0000-0000-000000000301' AND row_number=2),'same last digits but another area code is not a duplicate');
SELECT public.assert_import((SELECT outcome='pending' FROM public.import_staging_rows WHERE batch_id='50000000-0000-0000-0000-000000000301' AND row_number=3),'accent-insensitive name match on the server');
SELECT public.assert_import((SELECT outcome='imported' FROM public.import_staging_rows WHERE batch_id='50000000-0000-0000-0000-000000000301' AND row_number=4) AND (SELECT outcome='pending' FROM public.import_staging_rows WHERE batch_id='50000000-0000-0000-0000-000000000301' AND row_number=5),'repeated phone in the same file needs review');
SELECT public.assert_import((SELECT email IS NULL AND notes IS NULL FROM public.clients WHERE name='Sem Contato Fictício'),'empty email and notes stored as NULL');
UPDATE public.import_staging_rows SET normalized_data=normalized_data || '{"decision":"create"}' WHERE batch_id='50000000-0000-0000-0000-000000000301' AND row_number IN (1,5);
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000301');
SELECT public.assert_import((SELECT count(*)=0 FROM public.clients WHERE name IN ('Nome Novo Telefone Fictício','Repetido Dois Fictício')),'create is refused when the phone already exists');
SELECT public.assert_import((SELECT outcome='pending' AND reason ILIKE '%telefone%' AND reason NOT ILIKE '%Confira os dados%' AND NOT (normalized_data ? 'decision') FROM public.import_staging_rows WHERE batch_id='50000000-0000-0000-0000-000000000301' AND row_number=1),'clear phone message and no error row');
SELECT public.assert_import((SELECT count(*)=0 FROM public.import_staging_rows WHERE batch_id='50000000-0000-0000-0000-000000000301' AND outcome='error'),'no row ended in error');

-- Gatilho de revisão ignora gravações sem mudança.
SELECT public.t_stage('50000000-0000-0000-0000-000000000401','avec','client', ARRAY['{"name":"Revisão Fictícia","source_id":"r1"}']::jsonb[]);
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000401');
UPDATE public.clients SET name=name WHERE name='Revisão Fictícia';
SELECT public.assert_import((SELECT import_revision=0 FROM public.clients WHERE name='Revisão Fictícia'),'no-op update does not bump revision');
SELECT public.undo_import_batch('50000000-0000-0000-0000-000000000401');
SELECT public.assert_import((SELECT count(*)=0 FROM public.clients WHERE name='Revisão Fictícia'),'client untouched after no-op update is removed');

-- Retenção: dados de origem somem junto com o cliente excluído; vencidos são limpos sob demanda.
SELECT public.t_stage('50000000-0000-0000-0000-000000000501','avec','client', ARRAY['{"name":"Retenção Fictícia","source_id":"x1"}','{"name":"Retenção Dois Fictícia","source_id":"x2"}']::jsonb[]);
SELECT public.commit_import_batch('50000000-0000-0000-0000-000000000501');
SELECT public.assert_import((SELECT source_data <> '{}'::jsonb FROM public.import_created_records WHERE target_id=public.t_client('Retenção Fictícia')),'source data kept while client exists');
DELETE FROM public.clients WHERE name='Retenção Fictícia';
RESET ROLE;
SELECT public.assert_import((SELECT source_data = '{}'::jsonb FROM public.import_created_records WHERE source_id='x1'),'source data cleared when client is deleted');
UPDATE public.import_batches SET created_at = now() - interval '31 days' WHERE id='50000000-0000-0000-0000-000000000501';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a0',true);
SELECT public.t_stage('50000000-0000-0000-0000-000000000502','avec','client', ARRAY['{"name":"Abandonado Fictício","source_id":"y1"}']::jsonb[]);
RESET ROLE;
UPDATE public.import_batches SET created_at = now() - interval '31 days' WHERE id='50000000-0000-0000-0000-000000000502';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a0',true);
SELECT public.purge_expired_import_data();
SELECT public.assert_import((SELECT count(*)=0 FROM public.import_batches WHERE id='50000000-0000-0000-0000-000000000502'),'abandoned batch purged after 30 days');
SELECT public.assert_import((SELECT source_data = '{}'::jsonb FROM public.import_created_records WHERE source_id='x2'),'source data cleared after the retention window');
SELECT public.assert_import((SELECT count(*)=1 FROM public.clients WHERE name='Retenção Dois Fictícia'),'purge keeps imported clients');
SELECT public.assert_import((SELECT count(*)=1 FROM public.import_batches WHERE id='50000000-0000-0000-0000-000000000501'),'purge keeps completed history');

-- Limites por lote aplicados no banco.
DO $$ BEGIN
  INSERT INTO public.import_batches(id,company_id,created_by,source,kind,expected_rows) VALUES ('50000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-0000000000a0','00000000-0000-0000-0000-0000000000a0','avec','client',1);
  INSERT INTO public.import_staging_rows(company_id,batch_id,row_number,raw_data) VALUES ('00000000-0000-0000-0000-0000000000a0','50000000-0000-0000-0000-000000000601',1,'{}');
  BEGIN
    INSERT INTO public.import_staging_rows(company_id,batch_id,row_number,raw_data) VALUES ('00000000-0000-0000-0000-0000000000a0','50000000-0000-0000-0000-000000000601',2,'{}');
    RAISE EXCEPTION 'extra row accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO public.import_batches(id,company_id,created_by,source,kind,expected_rows) VALUES ('50000000-0000-0000-0000-000000000602','00000000-0000-0000-0000-0000000000a0','00000000-0000-0000-0000-0000000000a0','avec','client',100);
  BEGIN
    INSERT INTO public.import_staging_rows(company_id,batch_id,row_number,raw_data) SELECT '00000000-0000-0000-0000-0000000000a0','50000000-0000-0000-0000-000000000602',n,jsonb_build_object('x',repeat('a',900000)) FROM generate_series(1,80) n;
    RAISE EXCEPTION 'oversized batch accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.import_batches SET staged_rows=0, staged_bytes=0 WHERE id='50000000-0000-0000-0000-000000000601';
    RAISE EXCEPTION 'counters edited by user';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.t_failures) THEN RAISE EXCEPTION 'Falhas: %', (SELECT string_agg(message, '; ') FROM public.t_failures); END IF;
END $$;
ROLLBACK;
