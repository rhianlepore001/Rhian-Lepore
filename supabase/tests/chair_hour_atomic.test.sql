\set ON_ERROR_STOP on
INSERT INTO public.products(id,company_id,name,sale_price,cost_price,stock_quantity) VALUES ('94000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Produto fictício',20,7,20);
INSERT INTO public.appointments(id,user_id,client_id,appointment_time,status,price,professional_id,duration_minutes)
 SELECT ('91000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'10000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','2026-11-08 14:00+00','Pending',100,'20000000-0000-0000-0000-0000000000a1',30 FROM generate_series(3,5) n;
SET request.jwt.claim.sub='10000000-0000-0000-0000-0000000000a1';
SET ROLE authenticated;
DO $$ DECLARE r jsonb; BEGIN
 IF EXISTS(SELECT 1 FROM public.products) OR EXISTS(SELECT 1 FROM public.product_sales) OR EXISTS(SELECT 1 FROM public.finance_records) THEN RAISE EXCEPTION 'staff reads raw costs'; END IF;
 r:=public.get_checkout_products_v1('10000000-0000-0000-0000-000000000001');
 IF jsonb_array_length(r)<>1 OR r->0 ?| ARRAY['cost_price','commission_percent','profit','total_cost'] THEN RAISE EXCEPTION 'catalog cost leak: %',r; END IF;
 BEGIN PERFORM public.get_finance_stats('10000000-0000-0000-0000-000000000001',NULL,NULL,NULL); RAISE EXCEPTION 'legacy financial RPC accepted staff'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 r:=to_jsonb(public.sell_product('94000000-0000-0000-0000-000000000001',1,NULL,NULL,NULL,NULL));
 IF r->>'unit_cost_price' IS NOT NULL OR r->>'total_cost' IS NOT NULL OR r->>'commission_value' IS NOT NULL THEN RAISE EXCEPTION 'sale cost row leaked'; END IF;
 BEGIN PERFORM public.get_checkout_products_v1('30000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'cross tenant catalog'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT public.complete_appointment_checkout_v1('91000000-0000-0000-0000-000000000003',p_payment_method=>'debit',p_final_price=>100,p_machine_fee_percent=>2,p_machine_fee_amount=>2,p_actual_duration_minutes=>45,p_products=>'[{"product_id":"94000000-0000-0000-0000-000000000001","quantity":2}]');
SELECT public.complete_appointment_checkout_v1('91000000-0000-0000-0000-000000000003',p_final_price=>999,p_actual_duration_minutes=>99,p_products=>'[{"product_id":"94000000-0000-0000-0000-000000000001","quantity":2}]');
-- A legacy retry cannot change the first transaction's amount.
SELECT public.complete_appointment('91000000-0000-0000-0000-000000000003',NULL,NULL,NULL,0,0,999);
DO $$ BEGIN
 BEGIN PERFORM public.complete_appointment_checkout_v1('91000000-0000-0000-0000-000000000004',p_products=>'[{"product_id":"94000000-0000-0000-0000-000000000001","quantity":999}]'); RAISE EXCEPTION 'stock failure expected'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'insufficient_stock' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT stock_quantity FROM public.products LIMIT 1)<>17 THEN RAISE EXCEPTION 'stock duplicate or rollback failed'; END IF;
 IF (SELECT count(*) FROM public.product_sales WHERE appointment_id='91000000-0000-0000-0000-000000000003')<>1 THEN RAISE EXCEPTION 'duplicate sale'; END IF;
 IF (SELECT count(*) FROM public.finance_records WHERE appointment_id='91000000-0000-0000-0000-000000000003')<>2 THEN RAISE EXCEPTION 'receipt total missing/duplicate'; END IF;
 IF (SELECT sum(revenue) FROM public.finance_records WHERE appointment_id='91000000-0000-0000-0000-000000000003')<>140 THEN RAISE EXCEPTION 'service/product receipts overwritten'; END IF;
 IF (SELECT actual_duration_minutes FROM public.appointments WHERE id='91000000-0000-0000-0000-000000000003')<>45 THEN RAISE EXCEPTION 'duration retry changed'; END IF;
 IF (SELECT price FROM public.appointments WHERE id='91000000-0000-0000-0000-000000000003')<>100 THEN RAISE EXCEPTION 'legacy retry changed price'; END IF;
 IF (SELECT status FROM public.appointments WHERE id='91000000-0000-0000-0000-000000000004')<>'Pending' OR EXISTS(SELECT 1 FROM public.finance_records WHERE appointment_id='91000000-0000-0000-0000-000000000004') THEN RAISE EXCEPTION 'cart failure did not roll back completion'; END IF;
END $$;
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
DO $$ DECLARE r json; BEGIN
 r:=public.get_finance_stats('10000000-0000-0000-0000-000000000001','2026-11-08','2026-11-08',NULL);
 IF (r->>'revenue')::numeric<>360 THEN RAISE EXCEPTION 'owner receipts were lost or double-counted: %',r; END IF;
END $$;
RESET ROLE;
SET request.jwt.claim.sub='10000000-0000-0000-0000-0000000000a1';
-- Inactive accounts retain a profile but lose operational access immediately.
UPDATE public.team_members SET active=false WHERE staff_user_id='10000000-0000-0000-0000-0000000000a1';
SET ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.complete_appointment_checkout_v1('91000000-0000-0000-0000-000000000005'); RAISE EXCEPTION 'inactive staff checkout'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.get_chair_hour_v1('2026-09-01'); RAISE EXCEPTION 'inactive staff metrics'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.get_checkout_products_v1('10000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'inactive staff catalog'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE public.team_members SET active=true WHERE staff_user_id='10000000-0000-0000-0000-0000000000a1';
SELECT 'PASS security, retry, legacy retry, receipts, atomic rollback, inactive staff' AS result;
