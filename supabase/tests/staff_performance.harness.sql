-- Harness (Postgres local descartável) para 20261003110000_staff_performance_v1.
-- Esquema mínimo com as colunas reais de prod usadas pelas RPCs + fixture da
-- seção 5 do ACCEPTANCE.md (tenant BR, fuso America/Sao_Paulo, acerto dia 5).
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE TABLE public.profiles (id text PRIMARY KEY, role text, company_id text, region text);
CREATE TABLE public.business_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL,
  timezone text, commission_settlement_day_of_month int);
CREATE TABLE public.team_members (id uuid PRIMARY KEY, user_id text NOT NULL, name text NOT NULL, photo_url text,
  is_owner boolean DEFAULT false, active boolean DEFAULT true, commission_rate numeric, commission_percent numeric,
  staff_user_id uuid, deleted_at timestamptz);
CREATE TABLE public.appointments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text, client_id uuid NOT NULL,
  service text NOT NULL DEFAULT 'Corte', appointment_time timestamptz NOT NULL, status text NOT NULL, price numeric,
  created_at timestamptz DEFAULT now(), professional_id uuid, duration_minutes int, payment_method text,
  total_price numeric DEFAULT 0, completed_at timestamptz);
CREATE TABLE public.finance_records (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text, professional_id uuid,
  appointment_id uuid, type text, revenue numeric, commission_value numeric, commission_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now());
CREATE TABLE public.product_sales (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL,
  appointment_id uuid, finance_record_id uuid, professional_id uuid, quantity int NOT NULL DEFAULT 1,
  total_revenue numeric NOT NULL, total_cost numeric NOT NULL, commission_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL);
CREATE TABLE public.commission_payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text, professional_id uuid,
  amount numeric NOT NULL, start_date date NOT NULL, end_date date NOT NULL, status text NOT NULL, paid_at timestamptz);

-- Stubs das funções existentes (só para provar que a migration não as altera)
CREATE FUNCTION public.get_auth_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid()::text $$;
CREATE FUNCTION public.get_commissions_due() RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT 1 $$;

-- ---------------------------------------------------------------- fixture
CREATE FUNCTION pg_temp.brt(t text) RETURNS timestamptz LANGUAGE sql AS $$ SELECT (t::timestamp AT TIME ZONE 'America/Sao_Paulo') $$;
CREATE FUNCTION pg_temp.cid(tag text) RETURNS uuid LANGUAGE sql AS $$ SELECT md5('client-' || tag)::uuid $$;

-- Tenant A (BR): dono + equipe
INSERT INTO public.profiles VALUES
  ('10000000-0000-0000-0000-000000000001', 'owner', '10000000-0000-0000-0000-000000000001', 'BR'),
  ('10000000-0000-0000-0000-0000000000a1', 'staff', '10000000-0000-0000-0000-000000000001', 'BR'),  -- Ana
  ('10000000-0000-0000-0000-0000000000b1', 'staff', '10000000-0000-0000-0000-000000000001', 'BR'),  -- Bruno
  ('10000000-0000-0000-0000-0000000000f1', 'staff', '10000000-0000-0000-0000-000000000001', 'BR'),  -- Eva (ex-staff)
  ('30000000-0000-0000-0000-000000000001', 'owner', '30000000-0000-0000-0000-000000000001', 'PT'),  -- dono B (PT, sem business_settings)
  ('30000000-0000-0000-0000-0000000000b1', 'staff', '30000000-0000-0000-0000-000000000001', 'PT');  -- Beto (staff B)
INSERT INTO public.business_settings (user_id, timezone, commission_settlement_day_of_month)
VALUES ('10000000-0000-0000-0000-000000000001', 'America/Sao_Paulo', 5);
INSERT INTO public.team_members (id, user_id, name, is_owner, active, commission_rate, staff_user_id, deleted_at) VALUES
  ('20000000-0000-0000-0000-0000000000d0', '10000000-0000-0000-0000-000000000001', 'Rhian (dono)', true, true, 40, NULL, NULL),
  ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001', 'Ana', false, true, 40, '10000000-0000-0000-0000-0000000000a1', NULL),
  ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-000000000001', 'Bruno', false, true, 50, '10000000-0000-0000-0000-0000000000b1', NULL),
  ('20000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'Caio', false, true, 40, NULL, NULL),
  ('20000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-000000000001', 'Duda', false, false, 40, NULL, NULL),
  ('20000000-0000-0000-0000-0000000000f1', '10000000-0000-0000-0000-000000000001', 'Eva', false, true, 40, '10000000-0000-0000-0000-0000000000f1', '2026-09-01'),
  ('40000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-000000000001', 'Beto', false, true, 30, '30000000-0000-0000-0000-0000000000b1', NULL);

DO $$
DECLARE
  t text := '10000000-0000-0000-0000-000000000001';
  ana uuid := '20000000-0000-0000-0000-0000000000a1';
  bruno uuid := '20000000-0000-0000-0000-0000000000b1';
  caio uuid := '20000000-0000-0000-0000-0000000000c1';
  dono uuid := '20000000-0000-0000-0000-0000000000d0';
  duda uuid := '20000000-0000-0000-0000-0000000000e1';
  eva uuid := '20000000-0000-0000-0000-0000000000f1';
  -- Ana setembro: (tag, horário BRT, serviço, preço, min, clube)
  sep text[][] := ARRAY[
    ['s1','2026-09-08 10:00','Corte','50','30','n'], ['s2','2026-09-09 14:00','Corte+Barba','80','45','n'],
    ['s3','2026-09-10 10:00','Corte','50','30','n'], ['s4','2026-09-11 11:00','Corte','0','30','y'],
    ['s5','2026-09-12 10:00','Corte','50','30','n'], ['s6','2026-09-15 10:00','Corte','50','30','n'],
    ['s7','2026-09-16 14:00','Corte+Barba','80','45','n'], ['s8','2026-09-18 10:00','Corte','50','30','n'],
    ['s9','2026-09-19 11:00','Corte','0','30','y'], ['s10','2026-09-22 14:00','Corte+Barba','80','45','n'],
    ['s11','2026-09-25 14:00','Corte+Barba','80','45','n'], ['s12','2026-09-30 23:30','Corte','50','30','n']];
  r text[];
  k int;
  a_id uuid;
  f_id uuid;
  ts timestamptz;
  aug_anchor timestamptz[] := '{}';
BEGIN
  -- Ana agosto: 10 pagos × 60 (30 min) + 2 clube; comissão 24, já paga; clientes a1..a12 (a1..a6 = s1..s6)
  FOR k IN 1..12 LOOP
    ts := pg_temp.brt('2026-08-' || (17 + k) || ' ' || CASE WHEN k > 10 THEN '15:00' ELSE '10:00' END);
    INSERT INTO public.appointments (user_id, client_id, appointment_time, status, price, professional_id, duration_minutes, payment_method, created_at)
    VALUES (t, pg_temp.cid(CASE WHEN k <= 6 THEN 's' || k ELSE 'a' || k END), ts, 'Completed',
            CASE WHEN k > 10 THEN 0 ELSE 60 END, ana, 30, CASE WHEN k > 10 THEN 'membership' ELSE 'pix' END, ts - interval '2 days')
    RETURNING id INTO a_id;
    aug_anchor := aug_anchor || (ts + interval '30 minutes');
    IF k <= 10 THEN
      INSERT INTO public.finance_records (user_id, professional_id, appointment_id, type, revenue, commission_value, commission_paid, created_at)
      VALUES (t, ana, a_id, 'revenue', 60, 24, true, ts + interval '30 minutes');
      IF k = 7 THEN  -- linha DUPLICADA (F6)
        INSERT INTO public.finance_records (user_id, professional_id, appointment_id, type, revenue, commission_value, commission_paid, created_at)
        VALUES (t, ana, a_id, 'revenue', 60, 24, true, ts + interval '31 minutes');
      END IF;
    END IF;
  END LOOP;
  INSERT INTO public.commission_payments (user_id, professional_id, amount, start_date, end_date, status, paid_at)
  VALUES (t, ana, 264, '2026-08-06', '2026-09-05', 'paid', pg_temp.brt('2026-09-06 10:00'));

  -- Ana setembro
  k := 0;
  FOREACH r SLICE 1 IN ARRAY sep LOOP
    k := k + 1;
    ts := pg_temp.brt(r[2]);
    INSERT INTO public.appointments (user_id, client_id, service, appointment_time, status, price, professional_id, duration_minutes, payment_method, created_at)
    VALUES (t, pg_temp.cid(r[1]), r[3], ts, 'Completed', r[4]::numeric, ana, r[5]::int,
            CASE WHEN r[6] = 'y' THEN 'membership' ELSE 'pix' END,
            CASE WHEN k <= 6 THEN aug_anchor[k] + interval '1 hour' ELSE ts - interval '3 days' END)  -- s1..s6: marcados logo após a visita de agosto
    RETURNING id INTO a_id;
    IF r[6] = 'n' THEN
      INSERT INTO public.finance_records (user_id, professional_id, appointment_id, type, revenue, commission_value, created_at)
      VALUES (t, ana, a_id, 'revenue', r[4]::numeric, round(r[4]::numeric * 0.4, 2), ts + make_interval(mins => r[5]::int));
    ELSIF r[1] = 's4' THEN  -- clube com linha zerada
      INSERT INTO public.finance_records (user_id, professional_id, appointment_id, type, revenue, commission_value, created_at)
      VALUES (t, ana, a_id, 'revenue', 0, 0, ts + interval '30 minutes');
    END IF;
    IF r[1] IN ('s2', 's5', 's10') THEN  -- venda de produto ligada à visita
      INSERT INTO public.finance_records (user_id, professional_id, appointment_id, type, revenue, commission_value, created_at)
      VALUES (t, ana, a_id, 'revenue', 30, 3, ts + interval '40 minutes') RETURNING id INTO f_id;
      INSERT INTO public.product_sales (company_id, appointment_id, finance_record_id, professional_id, total_revenue, total_cost, commission_value, created_at)
      VALUES (t::uuid, a_id, f_id, ana, 30, 15, 3, ts + interval '40 minutes');
    END IF;
    -- próximo horário (voltou a agendar): s1..s6 sim (s1 com o Bruno); s7 marcado tarde; s8 longe demais
    IF k <= 6 THEN
      INSERT INTO public.appointments (user_id, client_id, appointment_time, status, price, professional_id, duration_minutes, created_at)
      VALUES (t, pg_temp.cid(r[1]), pg_temp.brt('2026-10-2' || k || ' 10:00'), 'Confirmed', 50,
              CASE WHEN k = 1 THEN bruno ELSE ana END, 30, ts + make_interval(mins => r[5]::int) + interval '1 hour');
    ELSIF r[1] = 's7' THEN
      INSERT INTO public.appointments (user_id, client_id, appointment_time, status, price, professional_id, duration_minutes, created_at)
      VALUES (t, pg_temp.cid(r[1]), ts + interval '20 days', 'Confirmed', 50, ana, 30, ts + interval '72 hours');
    ELSIF r[1] = 's8' THEN
      INSERT INTO public.appointments (user_id, client_id, appointment_time, status, price, professional_id, duration_minutes, created_at)
      VALUES (t, pg_temp.cid(r[1]), ts + interval '50 days', 'Confirmed', 50, ana, 30, ts + interval '1 hour');
    END IF;
  END LOOP;
  -- Ana: falta, cancelamento, passado sem desfecho, despesa "Pagamento de Comissão"
  INSERT INTO public.appointments (user_id, client_id, appointment_time, status, price, professional_id, duration_minutes) VALUES
    (t, pg_temp.cid('x1'), pg_temp.brt('2026-09-17 10:00'), 'NoShow', 50, ana, 30),
    (t, pg_temp.cid('x2'), pg_temp.brt('2026-09-23 10:00'), 'Cancelled', 50, ana, 30),
    (t, pg_temp.cid('x3'), pg_temp.brt('2026-09-26 10:00'), 'Confirmed', 50, ana, 30);
  INSERT INTO public.finance_records (user_id, professional_id, type, revenue, commission_value, created_at)
  VALUES (t, ana, 'expense', 0, 30, pg_temp.brt('2026-09-20 12:00'));

  -- Bruno: 15 × 40 (30 min), comissão 20; 2 faltas; 9 voltam
  FOR k IN 1..15 LOOP
    ts := pg_temp.brt('2026-09-' || (9 + k) || ' 16:00');
    INSERT INTO public.appointments (user_id, client_id, appointment_time, status, price, professional_id, duration_minutes, payment_method, created_at)
    VALUES (t, pg_temp.cid('b' || k), ts, 'Completed', 40, bruno, 30, 'cash', ts - interval '1 day') RETURNING id INTO a_id;
    INSERT INTO public.finance_records (user_id, professional_id, appointment_id, type, revenue, commission_value, created_at)
    VALUES (t, bruno, a_id, 'revenue', 40, 20, ts + interval '30 minutes');
    IF k <= 9 THEN
      INSERT INTO public.appointments (user_id, client_id, appointment_time, status, price, professional_id, duration_minutes, created_at)
      VALUES (t, pg_temp.cid('b' || k), ts + interval '30 days', 'Confirmed', 40, bruno, 30, ts + interval '2 hours 30 minutes');
    END IF;
  END LOOP;
  INSERT INTO public.appointments (user_id, client_id, appointment_time, status, price, professional_id, duration_minutes) VALUES
    (t, pg_temp.cid('y1'), pg_temp.brt('2026-09-13 17:00'), 'NoShow', 40, bruno, 30),
    (t, pg_temp.cid('y2'), pg_temp.brt('2026-09-20 17:00'), 'NoShow', 40, bruno, 30);

  -- Caio: 5 × 50 (amostra baixa) + 1 receita avulsa às 23:30 BRT de 05/09 (= 02:30 UTC de 06/09)
  FOR k IN 1..5 LOOP
    ts := pg_temp.brt('2026-09-0' || (6 + k % 4) || ' 1' || k || ':00');
    INSERT INTO public.appointments (user_id, client_id, appointment_time, status, price, professional_id, duration_minutes, created_at)
    VALUES (t, pg_temp.cid('c' || k), ts, 'Completed', 50, caio, 30, ts - interval '1 day') RETURNING id INTO a_id;
    INSERT INTO public.finance_records (user_id, professional_id, appointment_id, type, revenue, commission_value, created_at)
    VALUES (t, caio, a_id, 'revenue', 50, 20, ts + interval '30 minutes');
  END LOOP;
  INSERT INTO public.finance_records (user_id, professional_id, type, revenue, commission_value, created_at)
  VALUES (t, caio, 'revenue', 20, 7, '2026-09-06T02:30:00Z');

  -- Dono: 3 × 100 (60 min) com comissão lançada (tratada como 0)
  FOR k IN 1..3 LOOP
    ts := pg_temp.brt('2026-09-' || (7 * k + 7) || ' 12:00');
    INSERT INTO public.appointments (user_id, client_id, appointment_time, status, price, professional_id, duration_minutes, created_at)
    VALUES (t, pg_temp.cid('d' || k), ts, 'Completed', 100, dono, 60, ts - interval '1 day') RETURNING id INTO a_id;
    INSERT INTO public.finance_records (user_id, professional_id, appointment_id, type, revenue, commission_value, created_at)
    VALUES (t, dono, a_id, 'revenue', 100, 40, ts + interval '1 hour');
  END LOOP;

  -- Duda (inativa) com 1 atendimento e comissão pendente; Eva (excluída) com saldo antigo
  ts := pg_temp.brt('2026-09-20 09:00');
  INSERT INTO public.appointments (user_id, client_id, appointment_time, status, price, professional_id, duration_minutes, created_at)
  VALUES (t, pg_temp.cid('e1'), ts, 'Completed', 50, duda, 30, ts - interval '1 day') RETURNING id INTO a_id;
  INSERT INTO public.finance_records (user_id, professional_id, appointment_id, type, revenue, commission_value, created_at)
  VALUES (t, duda, a_id, 'revenue', 50, 20, ts + interval '30 minutes');
  INSERT INTO public.finance_records (user_id, professional_id, type, revenue, commission_value, created_at)
  VALUES (t, eva, 'revenue', 40, 15, pg_temp.brt('2026-08-20 12:00'));

  -- Sem profissional: profissional de OUTRO tenant, sem profissional, venda de balcão
  INSERT INTO public.appointments (user_id, client_id, appointment_time, status, price, professional_id, duration_minutes) VALUES
    (t, pg_temp.cid('u1'), pg_temp.brt('2026-09-17 15:00'), 'Completed', 70, '40000000-0000-0000-0000-0000000000b1', 30),
    (t, pg_temp.cid('u2'), pg_temp.brt('2026-09-18 15:00'), 'Completed', 30, NULL, 30);
  INSERT INTO public.product_sales (company_id, professional_id, total_revenue, total_cost, commission_value, created_at)
  VALUES (t::uuid, NULL, 20, 8, 0, pg_temp.brt('2026-09-19 18:00'));

  -- Tenant B (PT, sem business_settings → Europe/Lisbon): 1 em setembro, 1 às 00:30 WEST de 01/10 (= 23:30 UTC de 30/09)
  INSERT INTO public.appointments (user_id, client_id, appointment_time, status, price, professional_id, duration_minutes) VALUES
    ('30000000-0000-0000-0000-000000000001', pg_temp.cid('p1'), '2026-09-15T12:00:00Z', 'Completed', 25, '40000000-0000-0000-0000-0000000000b1', 30),
    ('30000000-0000-0000-0000-000000000001', pg_temp.cid('p2'), '2026-09-30T23:30:00Z', 'Completed', 25, '40000000-0000-0000-0000-0000000000b1', 30);
END $$;
