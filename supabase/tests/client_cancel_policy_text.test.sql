-- Testes de 20261013200000_client_cancel_policy_text (Postgres local descartável).
-- Falha antes da migration; passa depois. Sem efeito colateral (ROLLBACK no fim).
BEGIN;
CREATE TEMP TABLE r (n serial, ok boolean, name text);
GRANT ALL ON r TO PUBLIC;
GRANT ALL ON SEQUENCE r_n_seq TO PUBLIC;
DO $$
DECLARE
  b uuid := 'c0000000-0000-0000-0000-0000000000a1';
  j json;
  keys text;
  v_ok boolean;
BEGIN
  INSERT INTO r(ok, name) SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='business_settings'
      AND column_name='client_cancel_policy_text' AND data_type='text' AND is_nullable='YES'), 'coluna client_cancel_policy_text text NULL';
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_settings' AND column_name='client_cancel_policy_text') THEN RETURN; END IF;

  INSERT INTO public.profiles (id, role) VALUES (b, 'owner');
  INSERT INTO public.business_settings (user_id) VALUES (b);

  j := public.get_public_business_settings_json(b);
  INSERT INTO r(ok, name) VALUES ((j::jsonb ? 'client_cancel_policy_text') AND (j->>'client_cancel_policy_text') IS NULL, 'sem texto: chave presente e null');

  EXECUTE 'UPDATE public.business_settings SET client_cancel_policy_text = $1 WHERE user_id::text = $2::text'
    USING E'  Cancele com 1 dia de antecedência.\nObrigado!  ', b;
  SET LOCAL ROLE anon;
  j := public.get_public_business_settings_json(b);
  RESET ROLE;
  INSERT INTO r(ok, name) VALUES ((j->>'client_cancel_policy_text') = E'Cancele com 1 dia de antecedência.\nObrigado!', 'anon lê o texto aparado');

  EXECUTE 'UPDATE public.business_settings SET client_cancel_policy_text = $1 WHERE user_id::text = $2::text' USING '   ', b;
  j := public.get_public_business_settings_json(b);
  INSERT INTO r(ok, name) VALUES ((j->>'client_cancel_policy_text') IS NULL, 'só espaços vira null');

  BEGIN
    EXECUTE 'UPDATE public.business_settings SET client_cancel_policy_text = $1 WHERE user_id::text = $2::text' USING repeat('a', 301), b;
    v_ok := false;
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  INSERT INTO r(ok, name) VALUES (v_ok, '301 caracteres rejeitado');
  EXECUTE 'UPDATE public.business_settings SET client_cancel_policy_text = $1 WHERE user_id::text = $2::text' USING repeat('a', 300), b;
  INSERT INTO r(ok, name) VALUES (true, '300 caracteres aceito');

  SELECT string_agg(k, ',' ORDER BY k) INTO keys FROM json_object_keys(public.get_public_business_settings_json(b)) k;
  INSERT INTO r(ok, name) VALUES (keys = 'business_hours,cancellation_policy,client_cancel_cutoff_hours,client_cancel_note,client_cancel_policy_text,enable_self_rescheduling,online_booking_auto_confirm,public_products_enabled,queue_allow_leave,queue_late_minutes,queue_mode,timezone', 'chaves = anteriores + client_cancel_policy_text');

  INSERT INTO r(ok, name) SELECT p.prosecdef AND p.proconfig = ARRAY['search_path=public'], 'SECURITY DEFINER + search_path=public'
  FROM pg_proc p WHERE p.oid = 'public.get_public_business_settings_json(uuid)'::regprocedure;

  INSERT INTO r(ok, name) VALUES (public.get_public_business_settings_json('c0000000-0000-0000-0000-0000000000ff') IS NULL, 'negócio inexistente: null');
END $$;
SELECT CASE WHEN ok THEN 'PASS  ' ELSE 'FAIL  ' END || name FROM r ORDER BY n;
DO $$
DECLARE f int; t int;
BEGIN
  SELECT count(*) FILTER (WHERE NOT ok), count(*) INTO f, t FROM r;
  IF f > 0 OR t < 9 THEN RAISE EXCEPTION 'client_cancel_policy_text: % checks falharam de 9', f + (9 - t); END IF;
  RAISE NOTICE 'client_cancel_policy_text: % checks ok', t;
END $$;
ROLLBACK;
