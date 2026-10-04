-- Testes de public.delete_finance_transaction (via scripts/test-sql-finance-delete.sh).
\set OWNER_A 'a0000000-0000-0000-0000-0000000000a0'
\set STAFF_A 'a0000000-0000-0000-0000-0000000000a1'
\set OWNER_B 'b0000000-0000-0000-0000-0000000000b0'
\set ANA '10000000-0000-0000-0000-0000000000a1'
\set CLI '30000000-0000-0000-0000-0000000000c1'
\set APT '40000000-0000-0000-0000-0000000000d1'
\set APT_PAID '40000000-0000-0000-0000-0000000000d2'
\set FIN_SVC '50000000-0000-0000-0000-0000000000e1'
\set FIN_PROD '50000000-0000-0000-0000-0000000000e2'
\set FIN_MAN '50000000-0000-0000-0000-0000000000e3'
\set FIN_EXP '50000000-0000-0000-0000-0000000000e4'
\set FIN_PAID '50000000-0000-0000-0000-0000000000e5'
\set FIN_PAY '50000000-0000-0000-0000-0000000000e6'
\set PROD '60000000-0000-0000-0000-0000000000f1'
\set PAY '70000000-0000-0000-0000-000000000011'

INSERT INTO public.profiles (id, role, company_id) VALUES
  (:'OWNER_A', 'owner', :'OWNER_A'),
  (:'STAFF_A', 'staff', :'OWNER_A'),
  (:'OWNER_B', 'owner', :'OWNER_B');

INSERT INTO public.team_members (id, user_id, name, staff_user_id)
VALUES (:'ANA', :'OWNER_A', 'Ana Souza', :'STAFF_A'::uuid);

INSERT INTO public.clients (id, user_id, name)
VALUES (:'CLI', :'OWNER_A', 'Maria Silva');

INSERT INTO public.appointments (id, user_id, client_id, professional_id, service, status, appointment_time, price)
VALUES
  (:'APT', :'OWNER_A', :'CLI', :'ANA', 'Corte', 'Completed', '2026-10-04 14:00:00+00', 80),
  (:'APT_PAID', :'OWNER_A', :'CLI', :'ANA', 'Barba', 'Completed', '2026-10-03 14:00:00+00', 50);

INSERT INTO public.products (id, company_id, name, stock_quantity)
VALUES (:'PROD', :'OWNER_A'::uuid, 'Pomada', 8);

INSERT INTO public.finance_records (
  id, user_id, professional_id, appointment_id, type, revenue, commission_value,
  commission_paid, commission_paid_at, barber_name, client_name, service_name, description, created_at
) VALUES
  (:'FIN_SVC', :'OWNER_A', :'ANA', :'APT', 'revenue', 80, 32, false, NULL, 'Ana Souza', 'Maria Silva', 'Corte', NULL, '2026-10-04 14:00:00+00'),
  (:'FIN_PROD', :'OWNER_A', :'ANA', :'APT', 'revenue', 40, 0, false, NULL, 'Ana Souza', 'Maria Silva', 'Pomada', 'Venda de produto: Pomada', '2026-10-04 14:05:00+00'),
  (:'FIN_MAN', :'OWNER_A', NULL, NULL, 'revenue', 25, 0, true, NULL, 'Manual', '', 'Caixa extra', 'Caixa extra', '2026-10-04 10:00:00+00'),
  (:'FIN_EXP', :'OWNER_A', NULL, NULL, 'expense', 0, 120, true, NULL, 'Manual', '', 'Aluguel', 'Aluguel', '2026-10-01 10:00:00+00'),
  (:'FIN_PAID', :'OWNER_A', :'ANA', :'APT_PAID', 'revenue', 50, 20, true, '2026-10-02 18:00:00+00', 'Ana Souza', 'Maria Silva', 'Barba', NULL, '2026-10-03 14:00:00+00'),
  (:'FIN_PAY', :'OWNER_A', :'ANA', NULL, 'expense', 0, 20, true, '2026-10-02 18:00:00+00', 'Ana Souza', '', 'Pagamento de Comissão', 'Pagamento de Comissão', '2026-10-02 18:00:00+00');

INSERT INTO public.product_sales (company_id, product_id, appointment_id, finance_record_id, professional_id, quantity)
VALUES (:'OWNER_A'::uuid, :'PROD', :'APT', :'FIN_PROD', :'ANA', 2);

INSERT INTO public.appointment_product_lines (company_id, appointment_id, product_id, quantity)
VALUES (:'OWNER_A'::uuid, :'APT', :'PROD', 1);

INSERT INTO public.appointment_reschedules (appointment_id, user_id, old_appointment_time, new_appointment_time)
VALUES (:'APT', :'OWNER_A', '2026-10-04 13:00:00+00', '2026-10-04 14:00:00+00');

INSERT INTO public.commission_payments (id, user_id, professional_id, amount, status, paid_at, net_amount)
VALUES (:'PAY', :'OWNER_A', :'ANA', 20, 'paid', '2026-10-02 18:00:00+00', 20);

CREATE OR REPLACE FUNCTION public._denied(p_sql text, p_label text) RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN insufficient_privilege THEN
    RETURN 'PASS ' || p_label || ': 42501';
  END;
  RAISE EXCEPTION 'FAIL %: não negou', p_label;
END $$;
GRANT EXECUTE ON FUNCTION public._denied(text, text) TO authenticated;

-- Grants
DO $$
DECLARE
  f text := 'public.delete_finance_transaction(uuid)';
BEGIN
  IF has_function_privilege('anon', f, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL anon executa delete_finance_transaction';
  END IF;
  IF NOT has_function_privilege('authenticated', f, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL authenticated sem EXECUTE';
  END IF;
  IF NOT has_function_privilege('service_role', f, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL service_role sem EXECUTE';
  END IF;
  RAISE NOTICE 'PASS grants: anon sem EXECUTE; authenticated e service_role com EXECUTE';
END $$;

SET ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.delete_finance_transaction('50000000-0000-0000-0000-0000000000e3');
    RAISE EXCEPTION 'FAIL anon chamou a RPC';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS anon não executa';
  END;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'OWNER_A', false) AS _sub \gset

-- 1) Lançamento manual
DO $$
DECLARE r jsonb;
BEGIN
  r := public.delete_finance_transaction('50000000-0000-0000-0000-0000000000e3');
  IF r <> '{"ok": true, "kind": "manual"}'::jsonb THEN
    RAISE EXCEPTION 'FAIL manual: %', r;
  END IF;
  IF EXISTS (SELECT 1 FROM public.finance_records WHERE id = '50000000-0000-0000-0000-0000000000e3') THEN
    RAISE EXCEPTION 'FAIL manual: row ainda existe';
  END IF;
  RAISE NOTICE 'PASS delete manual';
END $$;

-- 2) Despesa comum
DO $$
DECLARE r jsonb;
BEGIN
  r := public.delete_finance_transaction('50000000-0000-0000-0000-0000000000e4');
  IF r <> '{"ok": true, "kind": "expense"}'::jsonb THEN
    RAISE EXCEPTION 'FAIL expense: %', r;
  END IF;
  IF EXISTS (SELECT 1 FROM public.finance_records WHERE id = '50000000-0000-0000-0000-0000000000e4') THEN
    RAISE EXCEPTION 'FAIL expense: row ainda existe';
  END IF;
  RAISE NOTICE 'PASS delete expense';
END $$;

-- 3) Produto vendido no atendimento — só o produto sai
DO $$
DECLARE r jsonb; stock int; apt_left int; svc_left int;
BEGIN
  r := public.delete_finance_transaction('50000000-0000-0000-0000-0000000000e2');
  IF r <> '{"ok": true, "kind": "product_sale"}'::jsonb THEN
    RAISE EXCEPTION 'FAIL product_sale: %', r;
  END IF;
  SELECT stock_quantity INTO stock FROM public.products WHERE id = '60000000-0000-0000-0000-0000000000f1';
  IF stock <> 10 THEN RAISE EXCEPTION 'FAIL product_sale stock=% (esperado 10)', stock; END IF;
  SELECT count(*) INTO apt_left FROM public.appointments WHERE id = '40000000-0000-0000-0000-0000000000d1';
  SELECT count(*) INTO svc_left FROM public.finance_records WHERE id = '50000000-0000-0000-0000-0000000000e1';
  IF apt_left <> 1 OR svc_left <> 1 THEN
    RAISE EXCEPTION 'FAIL product_sale apagou o atendimento (apt=% svc=%)', apt_left, svc_left;
  END IF;
  IF EXISTS (SELECT 1 FROM public.finance_records WHERE id = '50000000-0000-0000-0000-0000000000e2') THEN
    RAISE EXCEPTION 'FAIL product_sale: finance_record ficou';
  END IF;
  IF EXISTS (SELECT 1 FROM public.product_sales WHERE finance_record_id = '50000000-0000-0000-0000-0000000000e2') THEN
    RAISE EXCEPTION 'FAIL product_sale: product_sales ficou';
  END IF;
  RAISE NOTICE 'PASS delete product_sale (atendimento permanece, estoque devolve)';
END $$;

-- 4) Serviço concluído — finance_records primeiro (FK) e depois o appointment
DO $$
DECLARE r jsonb;
BEGIN
  r := public.delete_finance_transaction('40000000-0000-0000-0000-0000000000d1');
  IF r <> '{"ok": true, "kind": "appointment"}'::jsonb THEN
    RAISE EXCEPTION 'FAIL appointment: %', r;
  END IF;
  IF EXISTS (SELECT 1 FROM public.appointments WHERE id = '40000000-0000-0000-0000-0000000000d1') THEN
    RAISE EXCEPTION 'FAIL appointment: atendimento ficou';
  END IF;
  IF EXISTS (SELECT 1 FROM public.finance_records WHERE appointment_id = '40000000-0000-0000-0000-0000000000d1') THEN
    RAISE EXCEPTION 'FAIL appointment: finance_records ficaram';
  END IF;
  IF EXISTS (SELECT 1 FROM public.appointment_product_lines WHERE appointment_id = '40000000-0000-0000-0000-0000000000d1') THEN
    RAISE EXCEPTION 'FAIL appointment: product_lines não cascadearam';
  END IF;
  IF EXISTS (SELECT 1 FROM public.appointment_reschedules WHERE appointment_id = '40000000-0000-0000-0000-0000000000d1') THEN
    RAISE EXCEPTION 'FAIL appointment: reschedules não cascadearam';
  END IF;
  RAISE NOTICE 'PASS delete appointment (FK order + cascade)';
END $$;

-- 5) Comissão já paga bloqueia
DO $$
DECLARE r jsonb;
BEGIN
  r := public.delete_finance_transaction('40000000-0000-0000-0000-0000000000d2');
  IF r->>'ok' <> 'false' OR r->>'error' <> 'commission_already_paid' THEN
    RAISE EXCEPTION 'FAIL paid block: %', r;
  END IF;
  IF r->>'staff_name' <> 'Ana Souza' THEN
    RAISE EXCEPTION 'FAIL paid block staff_name=%', r->>'staff_name';
  END IF;
  IF r->>'paid_at' IS NULL THEN
    RAISE EXCEPTION 'FAIL paid block sem paid_at: %', r;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.appointments WHERE id = '40000000-0000-0000-0000-0000000000d2') THEN
    RAISE EXCEPTION 'FAIL paid block apagou o atendimento';
  END IF;
  RAISE NOTICE 'PASS bloqueio commission_already_paid';
END $$;

-- 6) Despesa de pagamento de comissão bloqueia (pelo vínculo, não pelo texto)
DO $$
DECLARE r jsonb;
BEGIN
  UPDATE public.finance_records
     SET description = 'Repasse equipe'
   WHERE id = '50000000-0000-0000-0000-0000000000e6';
  r := public.delete_finance_transaction('50000000-0000-0000-0000-0000000000e6');
  IF r->>'ok' <> 'false' OR r->>'error' <> 'commission_payment_record' THEN
    RAISE EXCEPTION 'FAIL payment record: %', r;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_records WHERE id = '50000000-0000-0000-0000-0000000000e6') THEN
    RAISE EXCEPTION 'FAIL payment record apagou a despesa';
  END IF;
  RAISE NOTICE 'PASS bloqueio commission_payment_record';
END $$;

-- 7) Staff do mesmo tenant
SELECT set_config('request.jwt.claim.sub', :'STAFF_A', false) AS _sub \gset
SELECT public._denied(
  $q$SELECT public.delete_finance_transaction('50000000-0000-0000-0000-0000000000e6')$q$,
  'staff exclui'
);

-- 8) Outro tenant: not_found, sem revelar existência
SELECT set_config('request.jwt.claim.sub', :'OWNER_B', false) AS _sub \gset
DO $$
DECLARE r jsonb;
BEGIN
  r := public.delete_finance_transaction('50000000-0000-0000-0000-0000000000e6');
  IF r <> '{"ok": false, "error": "not_found"}'::jsonb THEN
    RAISE EXCEPTION 'FAIL other tenant: %', r;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_records WHERE id = '50000000-0000-0000-0000-0000000000e6') THEN
    RAISE EXCEPTION 'FAIL other tenant apagou o registro';
  END IF;
  r := public.delete_finance_transaction('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  IF r <> '{"ok": false, "error": "not_found"}'::jsonb THEN
    RAISE EXCEPTION 'FAIL missing id: %', r;
  END IF;
  RAISE NOTICE 'PASS outro tenant e id inexistente devolvem not_found';
END $$;

RESET ROLE;
DROP FUNCTION public._denied(text, text);
