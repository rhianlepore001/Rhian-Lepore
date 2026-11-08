\set ON_ERROR_STOP on
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
INSERT INTO public.queue_entries(id,business_id,status,ticket_status,service_id,service_price_cents,professional_id,client_phone,client_name)
VALUES ('92000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','serving','serving','93000000-0000-0000-0000-000000000001',10000,'20000000-0000-0000-0000-0000000000a1','11999999999','Pessoa teste');
SET ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.settle_queue_checkout_v1('92000000-0000-0000-0000-000000000002',p_service_name=>'Corte',p_products=>'[{"product_id":"94000000-0000-0000-0000-000000000001","quantity":999}]'); RAISE EXCEPTION 'queue stock failure expected'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'insufficient_stock' THEN RAISE; END IF; END;
END $$;
SELECT public.settle_queue_checkout_v1('92000000-0000-0000-0000-000000000003',p_service_name=>'Corte',p_actual_duration_minutes=>55,p_products=>'[{"product_id":"94000000-0000-0000-0000-000000000001","quantity":2}]');
SELECT public.settle_queue_checkout_v1('92000000-0000-0000-0000-000000000003',p_service_name=>'Corte',p_actual_duration_minutes=>99,p_products=>'[{"product_id":"94000000-0000-0000-0000-000000000001","quantity":2}]');
RESET ROLE;
DO $$ DECLARE a uuid; BEGIN
 IF (SELECT ticket_status FROM public.queue_entries WHERE id='92000000-0000-0000-0000-000000000002')<>'serving' OR (SELECT settled_appointment_id FROM public.queue_entries WHERE id='92000000-0000-0000-0000-000000000002') IS NOT NULL THEN RAISE EXCEPTION 'failed queue cart was not rolled back'; END IF;
 SELECT settled_appointment_id INTO a FROM public.queue_entries WHERE id='92000000-0000-0000-0000-000000000003';
 IF (SELECT count(*) FROM public.product_sales WHERE appointment_id=a)<>1 OR (SELECT actual_duration_minutes FROM public.appointments WHERE id=a)<>55 THEN RAISE EXCEPTION 'queue retry duplicated sale/changed time'; END IF;
 IF (SELECT sum(revenue) FROM public.finance_records WHERE appointment_id=a)<>140 THEN RAISE EXCEPTION 'queue receipt total'; END IF;
 IF (SELECT stock_quantity FROM public.products LIMIT 1)<>13 THEN RAISE EXCEPTION 'queue stock'; END IF;
END $$;
SELECT 'PASS queue cart atomic rollback, retry, receipt total, duration' AS result;
