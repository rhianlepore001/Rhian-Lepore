-- Known fictitious historical configuration exists before the new migration.
INSERT INTO public.services(id,user_id,name,duration_minutes,price) VALUES ('93000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000001','Serviço histórico',60,100);
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
INSERT INTO public.service_costs(company_id,service_id,amount) VALUES ('10000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000008',5);
INSERT INTO public.fixed_costs(company_id,category,description,amount,start_date) VALUES ('10000000-0000-0000-0000-000000000001','Aluguel','Fixture histórica',3100,'2026-10-01');
INSERT INTO public.appointments(id,user_id,client_id,appointment_time,status,price,professional_id,duration_minutes,service,machine_fee_amount)
 VALUES ('91000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','2026-10-02 14:00+00','Completed',100,'20000000-0000-0000-0000-0000000000a1',60,'Serviço histórico',2);
INSERT INTO public.finance_records(user_id,professional_id,appointment_id,type,revenue,commission_value)
 VALUES ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a1','91000000-0000-0000-0000-000000000008','revenue',100,20);
