\set ON_ERROR_STOP on
INSERT INTO public.clients(id,user_id,name,phone) VALUES ('90000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Pessoa teste','11999999999');
INSERT INTO public.services(id,user_id,name,duration_minutes,price) VALUES ('93000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Corte',50,100);
INSERT INTO public.appointments(id,user_id,client_id,appointment_time,status,price,professional_id,duration_minutes)
VALUES ('91000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001',now(),'Pending',100,'20000000-0000-0000-0000-0000000000a1',30);
INSERT INTO public.queue_entries(id,business_id,status,ticket_status,service_id,service_price_cents,professional_id,client_phone,client_name)
VALUES ('92000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','serving','serving','93000000-0000-0000-0000-000000000001',10000,'20000000-0000-0000-0000-0000000000a1','11999999999','Pessoa teste');
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT public.complete_appointment_with_duration('91000000-0000-0000-0000-000000000001',p_actual_duration_minutes=>45);
SELECT public.complete_appointment_with_duration('91000000-0000-0000-0000-000000000001',p_actual_duration_minutes=>NULL);
SELECT public.settle_queue_ticket_with_duration('92000000-0000-0000-0000-000000000001',p_service_name=>'Corte',p_actual_duration_minutes=>NULL);
SELECT public.settle_queue_ticket_with_duration('92000000-0000-0000-0000-000000000001',p_actual_duration_minutes=>60);
RESET ROLE;
DO $$ DECLARE q public.queue_entries%ROWTYPE; BEGIN
 IF (SELECT actual_duration_minutes FROM public.appointments WHERE id='91000000-0000-0000-0000-000000000001') IS DISTINCT FROM 45 THEN RAISE EXCEPTION 'duração alterada em chamada repetida'; END IF;
 SELECT * INTO q FROM public.queue_entries WHERE id='92000000-0000-0000-0000-000000000001';
 IF q.ticket_status <> 'settled' OR q.settled_appointment_id IS NULL THEN RAISE EXCEPTION 'fila não foi finalizada'; END IF;
 IF (SELECT duration_minutes FROM public.appointments WHERE id=q.settled_appointment_id) IS DISTINCT FROM 50 THEN RAISE EXCEPTION 'duração estimada incorreta'; END IF;
 IF (SELECT actual_duration_minutes FROM public.appointments WHERE id=q.settled_appointment_id) IS NOT NULL THEN RAISE EXCEPTION 'chamada repetida alterou duração'; END IF;
 IF (SELECT count(*) FROM public.finance_records WHERE appointment_id=q.settled_appointment_id) <> 1 THEN RAISE EXCEPTION 'lançamentos duplicados'; END IF;
END $$;

-- Uma falha ao gravar a duração deve reverter fechamento, finanças e fila.
INSERT INTO public.appointments(id,user_id,client_id,appointment_time,status,price,professional_id,duration_minutes)
VALUES ('91000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001',now(),'Pending',100,'20000000-0000-0000-0000-0000000000a1',30);
INSERT INTO public.queue_entries(id,business_id,status,ticket_status,service_id,service_price_cents,professional_id,client_phone,client_name)
VALUES ('92000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','serving','serving','93000000-0000-0000-0000-000000000001',10000,'20000000-0000-0000-0000-0000000000a1','11999999999','Pessoa teste');
CREATE FUNCTION public.test_reject_duration() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actual_duration_minutes=77 THEN RAISE EXCEPTION 'falha simulada'; END IF; RETURN NEW; END $$;
CREATE TRIGGER test_reject_duration BEFORE UPDATE OF actual_duration_minutes ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.test_reject_duration();
SET ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.complete_appointment_with_duration('91000000-0000-0000-0000-000000000002',p_actual_duration_minutes=>77);
  RAISE EXCEPTION 'fechamento deveria falhar';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'falha simulada' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.settle_queue_ticket_with_duration('92000000-0000-0000-0000-000000000002',p_service_name=>'Corte',p_actual_duration_minutes=>77);
  RAISE EXCEPTION 'fila deveria falhar';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'falha simulada' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT status FROM public.appointments WHERE id='91000000-0000-0000-0000-000000000002') <> 'Pending' THEN RAISE EXCEPTION 'atendimento não foi revertido'; END IF;
 IF EXISTS (SELECT 1 FROM public.finance_records WHERE appointment_id='91000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'financeiro não foi revertido'; END IF;
 IF (SELECT ticket_status FROM public.queue_entries WHERE id='92000000-0000-0000-0000-000000000002') <> 'serving' THEN RAISE EXCEPTION 'fila não foi revertida'; END IF;
END $$;
