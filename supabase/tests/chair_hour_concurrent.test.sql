\set ON_ERROR_STOP on
DO $$ BEGIN
 IF (SELECT stock_quantity FROM public.products LIMIT 1)<>15 THEN RAISE EXCEPTION 'concurrent duplicate stock deduction'; END IF;
 IF (SELECT count(*) FROM public.product_sales WHERE appointment_id='91000000-0000-0000-0000-000000000005')<>1 THEN RAISE EXCEPTION 'concurrent duplicate sale'; END IF;
 IF (SELECT count(*) FROM public.finance_records WHERE appointment_id='91000000-0000-0000-0000-000000000005')<>2 THEN RAISE EXCEPTION 'concurrent duplicate service receipt'; END IF;
 IF (SELECT actual_duration_minutes FROM public.appointments WHERE id='91000000-0000-0000-0000-000000000005')<>55 THEN RAISE EXCEPTION 'concurrent duration mismatch'; END IF;
END $$;
SELECT 'PASS two independent concurrent PostgreSQL sessions: one completion, one product sale, one stock deduction' AS result;
