\set ON_ERROR_STOP on
-- Today's rule (kept): any ACTIVE team member of the business may close ANY appointment/queue ticket
-- of that business (colleague's or unassigned). Never another business, never ex/inactive staff.
-- Staff still never reads product costs; product prices come from a cost-free RPC.
RESET ROLE;
-- Production grants (checked 9/11): authenticated has EXECUTE on the legacy queue entrypoint.
GRANT EXECUTE ON FUNCTION public.settle_queue_ticket(uuid,text,numeric,uuid,text) TO authenticated;
-- chair_hour_history.test.sql leaves Ana inactive; she is the active colleague here (restored at the end).
UPDATE public.team_members SET active=true WHERE id='20000000-0000-0000-0000-0000000000a1';
INSERT INTO public.products(id,company_id,name,sale_price,cost_price,stock_quantity,is_active) VALUES
 ('94000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000001','Pomada',35,12,10,true),
 ('94000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000001','Antigo',18,5,3,false),
 ('94000000-0000-0000-0000-000000000013','30000000-0000-0000-0000-000000000001','Outro negócio',99,50,10,true);
INSERT INTO public.appointments(id,user_id,client_id,appointment_time,status,price,professional_id,duration_minutes)
 SELECT ('91000000-0000-0000-0000-0000000000'||n)::uuid,'10000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','2026-11-09 14:00+00','Pending',100,
  CASE WHEN n IN (12) THEN NULL ELSE '20000000-0000-0000-0000-0000000000b1'::uuid END,30 FROM unnest(ARRAY[11,12,13,14,15,16]) n;
INSERT INTO public.queue_entries(id,business_id,status,ticket_status,service_id,service_price_cents,professional_id,client_phone,client_name) VALUES
 ('92000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000001','serving','serving','93000000-0000-0000-0000-000000000001',10000,'20000000-0000-0000-0000-0000000000b1','11999999999','Pessoa teste'),
 ('92000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000001','serving','serving','93000000-0000-0000-0000-000000000001',10000,NULL,'11999999999','Pessoa teste'),
 ('92000000-0000-0000-0000-000000000013','10000000-0000-0000-0000-000000000001','serving','serving','93000000-0000-0000-0000-000000000001',10000,'20000000-0000-0000-0000-0000000000b1','11999999999','Pessoa teste');
-- Ana (active staff) closes Bruno's and unassigned work, on every entrypoint.
SET request.jwt.claim.sub='10000000-0000-0000-0000-0000000000a1';
SET ROLE authenticated;
DO $$ DECLARE r jsonb; BEGIN
 PERFORM public.complete_appointment_checkout_v1('91000000-0000-0000-0000-000000000011',p_received_by=>'20000000-0000-0000-0000-0000000000a1',p_completed_by=>'20000000-0000-0000-0000-0000000000a1',p_actual_duration_minutes=>40,p_products=>'[{"product_id":"94000000-0000-0000-0000-000000000011","quantity":1}]');
 PERFORM public.complete_appointment('91000000-0000-0000-0000-000000000012'::uuid,NULL::text,NULL::uuid,NULL::uuid,0::numeric,0::numeric,NULL::numeric);
 PERFORM public.complete_appointment_with_duration('91000000-0000-0000-0000-000000000013',p_actual_duration_minutes=>30);
 r:=to_jsonb(public.sell_product('94000000-0000-0000-0000-000000000011',1,'91000000-0000-0000-0000-000000000013',NULL,'20000000-0000-0000-0000-0000000000b1',NULL));
 IF r->>'unit_cost_price' IS NOT NULL OR r->>'total_cost' IS NOT NULL THEN RAISE EXCEPTION 'staff sale leaked cost'; END IF;
 PERFORM public.settle_queue_checkout_v1('92000000-0000-0000-0000-000000000011',p_service_name=>'Corte',p_actual_duration_minutes=>20,p_products=>'[{"product_id":"94000000-0000-0000-0000-000000000011","quantity":1}]');
 PERFORM public.settle_queue_ticket('92000000-0000-0000-0000-000000000012'::uuid,'Corte'::text,NULL::numeric,NULL::uuid,NULL::text);
 -- Prices for appointment product lines: sale price only, own business, inactive included.
 r:=public.get_product_sale_prices_v1(ARRAY['94000000-0000-0000-0000-000000000011','94000000-0000-0000-0000-000000000012','94000000-0000-0000-0000-000000000013']::uuid[]);
 IF jsonb_array_length(r)<>2 THEN RAISE EXCEPTION 'price lookup scope: %',r; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(r) e WHERE e ?| ARRAY['cost_price','total_cost','commission_percent','profit']) THEN RAISE EXCEPTION 'price lookup leaked cost: %',r; END IF;
 IF (SELECT (e->>'sale_price')::numeric FROM jsonb_array_elements(r) e WHERE e->>'id'='94000000-0000-0000-0000-000000000011')<>35 THEN RAISE EXCEPTION 'wrong sale price: %',r; END IF;
 IF EXISTS(SELECT 1 FROM public.products) THEN RAISE EXCEPTION 'staff reads product rows (cost_price)'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.appointments WHERE id IN ('91000000-0000-0000-0000-000000000011','91000000-0000-0000-0000-000000000012','91000000-0000-0000-0000-000000000013') AND status='Completed')<>3 THEN RAISE EXCEPTION 'team checkout did not complete'; END IF;
 IF (SELECT count(*) FROM public.queue_entries WHERE id IN ('92000000-0000-0000-0000-000000000011','92000000-0000-0000-0000-000000000012') AND ticket_status='settled')<>2 THEN RAISE EXCEPTION 'team queue settle did not settle'; END IF;
 IF (SELECT stock_quantity FROM public.products WHERE id='94000000-0000-0000-0000-000000000011')<>7 THEN RAISE EXCEPTION 'stock not deducted once per sale'; END IF;
END $$;
-- Ex-staff (deleted) and inactive staff: denied everywhere.
UPDATE public.team_members SET active=false WHERE staff_user_id='10000000-0000-0000-0000-0000000000b1';
DO $$ DECLARE who text; BEGIN
 FOREACH who IN ARRAY ARRAY['10000000-0000-0000-0000-0000000000f1','10000000-0000-0000-0000-0000000000b1'] LOOP
  PERFORM set_config('request.jwt.claim.sub',who,true);
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.complete_appointment_checkout_v1('91000000-0000-0000-0000-000000000014'); RAISE EXCEPTION 'ex/inactive checkout %',who; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.complete_appointment('91000000-0000-0000-0000-000000000015'::uuid,NULL::text,NULL::uuid,NULL::uuid,0::numeric,0::numeric,NULL::numeric); RAISE EXCEPTION 'ex/inactive legacy checkout %',who; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.settle_queue_ticket('92000000-0000-0000-0000-000000000013'::uuid,'Corte'::text,NULL::numeric,NULL::uuid,NULL::text); RAISE EXCEPTION 'ex/inactive settle %',who; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.sell_product('94000000-0000-0000-0000-000000000011',1,NULL,NULL,NULL,NULL); RAISE EXCEPTION 'ex/inactive sale %',who; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.get_product_sale_prices_v1(ARRAY['94000000-0000-0000-0000-000000000011']::uuid[]); RAISE EXCEPTION 'ex/inactive prices %',who; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
 END LOOP;
END $$;
UPDATE public.team_members SET active=true WHERE staff_user_id='10000000-0000-0000-0000-0000000000b1';
-- Other business staff: cannot touch business 1.
SET request.jwt.claim.sub='30000000-0000-0000-0000-0000000000b1';
SET ROLE authenticated;
DO $$ DECLARE r jsonb; BEGIN
 BEGIN PERFORM public.complete_appointment_checkout_v1('91000000-0000-0000-0000-000000000016'); RAISE EXCEPTION 'cross tenant checkout'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.settle_queue_checkout_v1('92000000-0000-0000-0000-000000000013',p_service_name=>'Corte'); RAISE EXCEPTION 'cross tenant settle'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 r:=public.get_product_sale_prices_v1(ARRAY['94000000-0000-0000-0000-000000000011']::uuid[]);
 IF jsonb_array_length(r)<>0 THEN RAISE EXCEPTION 'cross tenant prices: %',r; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT status FROM public.appointments WHERE id='91000000-0000-0000-0000-000000000016')<>'Pending' OR (SELECT ticket_status FROM public.queue_entries WHERE id='92000000-0000-0000-0000-000000000013')<>'serving' THEN RAISE EXCEPTION 'denied calls changed data'; END IF;
END $$;
UPDATE public.team_members SET active=false WHERE id='20000000-0000-0000-0000-0000000000a1';
SELECT 'PASS team checkout (colleague/unassigned, agenda+queue), ex/inactive/cross-tenant denied, cost-free prices' AS result;
