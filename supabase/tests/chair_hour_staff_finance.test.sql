\set ON_ERROR_STOP on
-- Staff keeps today's access to its OWN commission rows (legacy policy "Staff can view own commissions"),
-- and nothing else: no colleagues, no expenses/other financial types, no other tenant, no writes.
RESET ROLE;
-- Supabase default: table privileges for authenticated; RLS is the only boundary.
GRANT SELECT,INSERT,UPDATE,DELETE ON public.finance_records TO authenticated;
INSERT INTO public.finance_records(id,user_id,professional_id,barber_name,type,revenue,commission_value,commission_paid,created_at) VALUES
 ('95000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a1','Ana','revenue',100,40,false,'2026-11-01 12:00+00'),
 ('95000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a1','Ana','revenue',50,20,false,'2026-11-02 12:00+00'),
 ('95000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a1','Ana','revenue',80,32,true,'2026-11-03 12:00+00'),
 ('95000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000b1','Bruno','revenue',200,100,false,'2026-11-01 12:00+00'),
 ('95000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a1','Ana','expense',0,999,false,'2026-11-01 12:00+00'),
 ('95000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-0000000000b1','Beto','revenue',70,21,false,'2026-11-01 12:00+00');
CREATE TEMP TABLE staff_finance_expected AS
 SELECT COALESCE(sum(commission_value),0) AS pending FROM public.finance_records
 WHERE professional_id='20000000-0000-0000-0000-0000000000a1' AND commission_paid=false AND type='revenue';
GRANT SELECT ON staff_finance_expected TO authenticated;
SET request.jwt.claim.sub='10000000-0000-0000-0000-0000000000a1';
SET ROLE authenticated;
DO $$ DECLARE v numeric; expected numeric; n int; BEGIN
 SELECT pending INTO expected FROM staff_finance_expected;
 -- Same query as services/dashboard.ts fetchStaffUnpaidCommissions.
 SELECT COALESCE(sum(commission_value),0) INTO v FROM public.finance_records
  WHERE professional_id='20000000-0000-0000-0000-0000000000a1' AND commission_paid=false;
 IF v IS DISTINCT FROM expected OR expected=0 THEN RAISE EXCEPTION 'staff pending commission % <> expected %',v,expected; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.finance_records WHERE id='95000000-0000-0000-0000-000000000003') THEN RAISE EXCEPTION 'staff lost own paid commission history'; END IF;
 IF EXISTS(SELECT 1 FROM public.finance_records WHERE professional_id IS DISTINCT FROM '20000000-0000-0000-0000-0000000000a1') THEN RAISE EXCEPTION 'staff reads colleague/tenant finance rows'; END IF;
 IF EXISTS(SELECT 1 FROM public.finance_records WHERE type IS DISTINCT FROM 'revenue') THEN RAISE EXCEPTION 'staff reads expenses/other financial types'; END IF;
 IF EXISTS(SELECT 1 FROM public.finance_records WHERE user_id<>'10000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'staff reads other tenant'; END IF;
 IF EXISTS(SELECT 1 FROM public.products) THEN RAISE EXCEPTION 'staff reads product cost rows'; END IF;
 IF EXISTS(SELECT 1 FROM public.product_sales) THEN RAISE EXCEPTION 'staff reads product sale cost rows'; END IF;
 IF EXISTS(SELECT 1 FROM public.fixed_costs) OR EXISTS(SELECT 1 FROM public.service_costs) THEN RAISE EXCEPTION 'staff reads cost tables'; END IF;
 UPDATE public.finance_records SET commission_paid=true WHERE id='95000000-0000-0000-0000-000000000001'; GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'staff updated own finance row'; END IF;
 DELETE FROM public.finance_records WHERE id='95000000-0000-0000-0000-000000000002'; GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'staff deleted own finance row'; END IF;
 BEGIN
  INSERT INTO public.finance_records(user_id,professional_id,barber_name,type,revenue,commission_value) VALUES ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a1','Ana','revenue',1,1);
  RAISE EXCEPTION 'staff inserted finance row';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
-- Owner keeps full tenant view, never another tenant.
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.finance_records WHERE id::text LIKE '95000000-%')<>5 THEN RAISE EXCEPTION 'owner tenant finance view changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.finance_records WHERE user_id<>'10000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'owner reads other tenant'; END IF;
END $$;
RESET ROLE;
DELETE FROM public.finance_records WHERE id::text LIKE '95000000-%';
SELECT 'PASS staff own commissions preserved; colleagues/expenses/tenant/costs/writes denied' AS result;
