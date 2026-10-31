-- Testes de 20261031160000_trial_promotion_more_slots (via scripts/test-sql-trial-promotion-more-slots.sh).
-- Estado de partida = prod em 31/10/2026: used = 9, max_uses = 10. Ids 0c000000-. Só dados fictícios.
BEGIN;
CREATE TEMP TABLE results (n int, name text, ok boolean, got text, expected text);
CREATE FUNCTION pg_temp.chk(p_n int, p_name text, p_got text, p_exp text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_n, p_name, p_got IS NOT DISTINCT FROM p_exp, p_got, p_exp);
$$;
CREATE FUNCTION pg_temp.signup(p_id uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_id || '@exemplo.invalid', 'x',
          '{"provider":"email","providers":["email"]}',
          jsonb_build_object('full_name','Dono','business_name','Teste ' || p_id,'type','salon','region','BR','role','owner'), now(), now());
  UPDATE auth.users SET email_confirmed_at = now() WHERE id = p_id;
END $$;
CREATE FUNCTION pg_temp.days(p_id uuid) RETURNS text LANGUAGE sql AS $$
  SELECT COALESCE((SELECT round(extract(epoch FROM trial_ends_at - now()) / 86400)::text FROM public.profiles WHERE id = p_id::text), 'none')
$$;
DO $t$
DECLARE i int; n30 int := 0; uid uuid;
BEGIN
  PERFORM pg_temp.chk(1, 'limite subiu para 20, usadas intactas', (SELECT used || '/' || max_uses FROM public.trial_promotions WHERE id='signup_30d_first10'), '9/20');
  PERFORM pg_temp.chk(2, 'promoção continua ativa com 30 dias', (SELECT active::text || '|' || trial_days FROM public.trial_promotions WHERE id='signup_30d_first10'), 'true|30');
  uid := '0c000000-0000-4000-8000-000000000001';
  PERFORM pg_temp.signup(uid);
  PERFORM pg_temp.chk(3, 'próximo cadastro recebe 30 dias', pg_temp.days(uid) || '|' || (SELECT used FROM public.trial_promotions WHERE id='signup_30d_first10'), '30|10');
  FOR i IN 2..11 LOOP
    uid := ('0c000000-0000-4000-8000-0000000000' || lpad(i::text, 2, '0'))::uuid;
    PERFORM pg_temp.signup(uid);
    IF pg_temp.days(uid) = '30' THEN n30 := n30 + 1; END IF;
  END LOOP;
  PERFORM pg_temp.chk(4, 'as 11 vagas restantes (1 antiga + 10 novas) dão 30 dias: 1º + 10', n30::text || '|' || (SELECT used || '/' || max_uses FROM public.trial_promotions WHERE id='signup_30d_first10'), '10|20/20');
  uid := '0c000000-0000-4000-8000-000000000099';
  PERFORM pg_temp.signup(uid);
  PERFORM pg_temp.chk(5, 'depois do limite volta ao padrão (20 dias)', pg_temp.days(uid), '20');
END $t$;
SELECT n, CASE WHEN ok THEN 'ok' ELSE 'FAIL' END, name, CASE WHEN ok THEN '' ELSE 'got=' || got || ' exp=' || expected END FROM results ORDER BY n;
ROLLBACK;
