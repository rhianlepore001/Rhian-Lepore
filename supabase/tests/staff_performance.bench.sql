-- Benchmark local (R9.4). Rodar: scripts/test-sql-staff-performance.sh --bench
CREATE INDEX ON public.appointments (user_id, appointment_time);
CREATE INDEX ON public.appointments (client_id);
CREATE INDEX ON public.finance_records (appointment_id);
CREATE INDEX ON public.finance_records (user_id, created_at);
CREATE INDEX ON public.product_sales (company_id, created_at DESC);
INSERT INTO public.profiles (id, role, company_id, region) VALUES ('90000000-0000-0000-0000-000000000001','owner','90000000-0000-0000-0000-000000000001','BR');
INSERT INTO public.team_members (id, user_id, name, commission_rate)
SELECT ('91000000-0000-0000-0000-00000000000'||g)::uuid, '90000000-0000-0000-0000-000000000001', 'P'||g, 40 FROM generate_series(1,6) g;
INSERT INTO public.appointments (id, user_id, client_id, appointment_time, status, price, professional_id, duration_minutes, created_at)
SELECT gen_random_uuid(), '90000000-0000-0000-0000-000000000001',
  ('92000000-0000-0000-0000-'||lpad((g % 2500)::text,12,'0'))::uuid,
  timestamptz '2025-10-01 12:00-03' + (g * interval '43 minutes'),
  CASE WHEN g % 17 = 0 THEN 'NoShow' WHEN g % 13 = 0 THEN 'Cancelled' ELSE 'Completed' END,
  50 + g % 40, ('91000000-0000-0000-0000-00000000000'||(1 + g % 6))::uuid, 40,
  timestamptz '2025-10-01 12:00-03' + (g * interval '43 minutes') - interval '3 days'
FROM generate_series(1, 12000) g;
INSERT INTO public.finance_records (user_id, professional_id, appointment_id, type, revenue, commission_value, created_at)
SELECT a.user_id, a.professional_id, a.id, 'revenue', a.price, a.price * 0.4, a.appointment_time + interval '40 minutes'
FROM public.appointments a WHERE a.user_id = '90000000-0000-0000-0000-000000000001' AND a.status = 'Completed';
ANALYZE;
-- Orçamento R9.4: < 300 ms para 1 ano. Tenant sintético de 12 mil atendimentos (~70× o maior tenant de prod), índices iguais aos de prod.
\timing on
SELECT length(public._staff_performance_core('90000000-0000-0000-0000-000000000001', '2025-10-01', '2026-09-30', NULL, true, now(), false)::text);
SELECT length(public._staff_performance_core('90000000-0000-0000-0000-000000000001', '2025-10-01', '2026-09-30', NULL, true, now(), false)::text);
SELECT length(public._staff_performance_core('90000000-0000-0000-0000-000000000001', '2025-10-01', '2026-09-30', NULL, true, now(), false)::text);
SELECT length(public._staff_performance_core('90000000-0000-0000-0000-000000000001', '2026-09-01', '2026-09-30', '91000000-0000-0000-0000-000000000001', true, now(), false)::text);
SELECT length(public._commission_cycle_core('90000000-0000-0000-0000-000000000001', NULL, now())::text);
