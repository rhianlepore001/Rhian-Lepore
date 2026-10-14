-- Testes de 20261013141528_booking_lead_time_minutes (Postgres local descartável).
-- Falha antes da migration; passa depois. Tudo em transação com ROLLBACK.
BEGIN;
CREATE TEMP TABLE r (n serial, ok boolean, name text);

-- get_available_slots (base) vira stub determinístico: um slot a cada 10 min, dia inteiro.
DROP FUNCTION IF EXISTS public.get_available_slots(uuid, date, uuid, integer, boolean);
CREATE FUNCTION public.get_available_slots(p_business_id uuid, p_date date, p_professional_id uuid DEFAULT NULL, p_duration_min integer DEFAULT 30, p_is_professional boolean DEFAULT false)
RETURNS json LANGUAGE sql AS $$
  SELECT json_build_object('slots', ARRAY(SELECT to_char(t, 'HH24:MI') FROM generate_series(p_date::timestamp, p_date::timestamp + interval '23 hours 50 minutes', interval '10 minutes') t));
$$;

-- Tabela-espelho para rodar o trigger real de prod sem os outros triggers de public_bookings.
CREATE TEMP TABLE lt_probe (LIKE public.public_bookings INCLUDING DEFAULTS);
DO $$ DECLARE c text; BEGIN FOR c IN SELECT attname FROM pg_attribute WHERE attrelid = 'lt_probe'::regclass AND attnum > 0 AND attnotnull AND NOT attisdropped AND attname NOT IN ('id') LOOP EXECUTE format('ALTER TABLE lt_probe ALTER COLUMN %I DROP NOT NULL', c); END LOOP; END $$;
CREATE TRIGGER lt_probe_lead BEFORE INSERT OR UPDATE ON lt_probe
  FOR EACH ROW EXECUTE FUNCTION public.enforce_lead_time_on_public_bookings();

DO $$
DECLARE
  b text := 'd0000000-0000-0000-0000-0000000000a1';
  has_col boolean;
  j json;
  d date;
  v_ok boolean;
  v_detail text;
  f_try text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='booking_lead_time_minutes') INTO has_col;
  INSERT INTO r(ok, name) VALUES (has_col, 'coluna profiles.booking_lead_time_minutes');
  IF NOT has_col THEN RETURN; END IF;

  INSERT INTO public.profiles (id, role, booking_lead_time_hours) VALUES (b, 'owner', 2);
  INSERT INTO public.business_settings (user_id, timezone) VALUES (b, 'UTC') ON CONFLICT DO NOTHING;
  UPDATE public.business_settings SET timezone = 'UTC' WHERE user_id::text = b;

  -- Função interna: valores atuais (minutos NULL) = horas * 60
  INSERT INTO r(ok, name) VALUES (public.public_booking_lead_time_minutes(b) = 120, 'minutos NULL → horas*60 (2h = 120)');
  INSERT INTO r(ok, name) VALUES (public.public_booking_lead_time_minutes('d0000000-0000-0000-0000-0000000000ff') = 120, 'negócio sem perfil → padrão 120');
  INSERT INTO r(ok, name) VALUES (NOT has_function_privilege('anon', 'public.public_booking_lead_time_minutes(text)', 'EXECUTE')
                           AND NOT has_function_privilege('authenticated', 'public.public_booking_lead_time_minutes(text)', 'EXECUTE'), 'função interna fechada para anon/authenticated');

  -- Ranges
  BEGIN UPDATE public.profiles SET booking_lead_time_minutes = 43201 WHERE id = b; v_ok := false;
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  INSERT INTO r(ok, name) VALUES (v_ok, '43201 min rejeitado');
  BEGIN UPDATE public.profiles SET booking_lead_time_minutes = -1 WHERE id = b; v_ok := false;
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  INSERT INTO r(ok, name) VALUES (v_ok, '-1 min rejeitado');

  -- 1h30: slots v2 com precisão de minuto (hoje e amanhã, UTC)
  UPDATE public.profiles SET booking_lead_time_minutes = 90 WHERE id = b;
  FOR d IN SELECT (now() AT TIME ZONE 'UTC')::date + g FROM generate_series(0, 1) g LOOP
    j := public.get_available_slots_v2(b::uuid, d, NULL, 30, false);
    INSERT INTO r(ok, name) VALUES (NOT EXISTS (
      SELECT 1 FROM json_array_elements_text(j->'slots') s WHERE (d::text || ' ' || s)::timestamp AT TIME ZONE 'UTC' < now() + interval '90 minutes'),
      '90 min: nenhum slot antes de agora+90min (' || (d - (now() AT TIME ZONE 'UTC')::date) || ')');
  END LOOP;
  j := public.get_available_slots_v2(b::uuid, (now() AT TIME ZONE 'UTC' + interval '2 days')::date, NULL, 30, false);
  INSERT INTO r(ok, name) VALUES ((j->>'lead_time_minutes')::int = 90 AND (j->>'lead_time_hours')::int = 2, '90 min: lead_time_minutes=90, lead_time_hours=2 (teto, compat)');
  -- o primeiro slot de amanhã cedo depois do corte: entre agora+90 e agora+100 existe um slot (grade de 10 min)
  d := (now() AT TIME ZONE 'UTC' + interval '95 minutes')::date;
  j := public.get_available_slots_v2(b::uuid, d, NULL, 30, false);
  INSERT INTO r(ok, name) VALUES (EXISTS (
    SELECT 1 FROM json_array_elements_text(j->'slots') s
    WHERE (d::text || ' ' || s)::timestamp AT TIME ZONE 'UTC' BETWEEN now() + interval '90 minutes' AND now() + interval '100 minutes'),
    '90 min: slot entre +90 e +100 min continua disponível (não arredonda para 2h)');

  -- 20 min
  UPDATE public.profiles SET booking_lead_time_minutes = 20 WHERE id = b;
  d := (now() AT TIME ZONE 'UTC' + interval '25 minutes')::date;
  j := public.get_available_slots_v2(b::uuid, d, NULL, 30, false);
  INSERT INTO r(ok, name) VALUES (EXISTS (
    SELECT 1 FROM json_array_elements_text(j->'slots') s
    WHERE (d::text || ' ' || s)::timestamp AT TIME ZONE 'UTC' BETWEEN now() + interval '20 minutes' AND now() + interval '30 minutes'),
    '20 min: slot entre +20 e +30 min disponível');
  INSERT INTO r(ok, name) VALUES (NOT EXISTS (
    SELECT 1 FROM json_array_elements_text(j->'slots') s
    WHERE (d::text || ' ' || s)::timestamp AT TIME ZONE 'UTC' < now() + interval '20 minutes'), '20 min: nada antes de +20 min');
  INSERT INTO r(ok, name) VALUES ((j->>'lead_time_hours')::int = 1 AND (j->>'lead_time_minutes')::int = 20, '20 min: lead_time_hours=1 (teto), minutes=20');

  -- Profissional ignora antecedência
  j := public.get_available_slots_v2(b::uuid, (now() AT TIME ZONE 'UTC')::date, NULL, 30, true);
  INSERT INTO r(ok, name) VALUES (json_array_length(j->'slots') = 144 AND (j->>'lead_time_minutes')::int = 0, 'profissional: todos os slots, lead 0');

  -- Trigger real (tabela-espelho), como anônimo
  PERFORM set_config('request.jwt.claim.sub', '', true);
  UPDATE public.profiles SET booking_lead_time_minutes = 90 WHERE id = b;
  BEGIN
    INSERT INTO lt_probe (id, business_id, customer_name, customer_phone, appointment_time, status)
      VALUES (gen_random_uuid(), b, 'A', '1', now() + interval '80 minutes', 'pending');
    v_detail := 'sem erro';
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL; v_detail := SQLERRM || '|' || v_detail;
  END;
  INSERT INTO r(ok, name) VALUES (v_detail = 'lead_time_violation|minutes=90', '90 min: +80 min recusado (DETAIL minutes=90) [' || v_detail || ']');
  BEGIN
    INSERT INTO lt_probe (id, business_id, customer_name, customer_phone, appointment_time, status)
      VALUES (gen_random_uuid(), b, 'A', '1', now() + interval '95 minutes', 'pending');
    v_detail := 'ok';
  EXCEPTION WHEN OTHERS THEN v_detail := SQLERRM;
  END;
  INSERT INTO r(ok, name) VALUES (v_detail = 'ok', '90 min: +95 min aceito [' || v_detail || ']');

  UPDATE public.profiles SET booking_lead_time_minutes = NULL, booking_lead_time_hours = 2 WHERE id = b;
  BEGIN
    INSERT INTO lt_probe (id, business_id, customer_name, customer_phone, appointment_time, status)
      VALUES (gen_random_uuid(), b, 'A', '1', now() + interval '110 minutes', 'pending');
    v_detail := 'sem erro';
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
  END;
  INSERT INTO r(ok, name) VALUES (v_detail = '2', 'legado 2h: DETAIL continua "2"');

  UPDATE public.profiles SET booking_lead_time_minutes = 0 WHERE id = b;
  BEGIN
    INSERT INTO lt_probe (id, business_id, customer_name, customer_phone, appointment_time, status)
      VALUES (gen_random_uuid(), b, 'A', '1', now() + interval '1 minute', 'pending');
    v_detail := 'ok';
  EXCEPTION WHEN OTHERS THEN v_detail := SQLERRM;
  END;
  INSERT INTO r(ok, name) VALUES (v_detail = 'ok', 'minutos=0 (sem mínimo) mesmo com horas=2: +1 min aceito [' || v_detail || ']');
END $$;
SELECT CASE WHEN ok THEN 'PASS  ' ELSE 'FAIL  ' END || name FROM r ORDER BY n;
ROLLBACK;
