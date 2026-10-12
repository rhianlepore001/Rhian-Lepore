-- Testes de 20261012145609_signup_trial_promotion (rodar via scripts/test-sql-signup-trial-promotion.sh).
-- Ids com prefixo 0b000000-. Estado de prod: harness de owner_signup_profile + 20261012130157 + 20261012130203.
BEGIN;
CREATE TEMP TABLE results (n int, name text, ok boolean, got text, expected text);
CREATE FUNCTION pg_temp.chk(p_n int, p_name text, p_got text, p_exp text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_n, p_name, p_got IS NOT DISTINCT FROM p_exp, p_got, p_exp);
$$;
CREATE FUNCTION pg_temp.signup(p_id uuid, p_meta jsonb, p_created timestamptz DEFAULT now()) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_id || '@exemplo.invalid', 'x',
          '{"provider":"email","providers":["email"]}',
          CASE WHEN p_meta ? 'business_name' THEN p_meta || jsonb_build_object('business_name', (p_meta->>'business_name') || ' ' || p_id) ELSE p_meta END, p_created, now());
  UPDATE auth.users SET email_confirmed_at = now() WHERE id = p_id;
END $$;
CREATE FUNCTION pg_temp.days(p_id uuid) RETURNS text LANGUAGE sql AS $$
  SELECT COALESCE((SELECT round(extract(epoch FROM trial_ends_at - now()) / 86400)::text FROM public.profiles WHERE id = p_id::text), 'none')
$$;
CREATE FUNCTION pg_temp.used() RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  IF to_regclass('public.trial_promotions') IS NULL THEN RETURN 'none'; END IF;
  EXECUTE 'SELECT used || ''/'' || max_uses FROM public.trial_promotions WHERE id = ''signup_30d_first10''' INTO v;
  RETURN COALESCE(v, 'none');
END $$;
CREATE FUNCTION pg_temp.run_as(p_role text, p_uid uuid, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid::text, ''), true);
  PERFORM set_config('request.jwt.claims', CASE WHEN p_uid IS NULL THEN '' ELSE json_build_object('sub', p_uid, 'role', p_role)::text END, true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN EXECUTE p_sql INTO v; EXCEPTION WHEN OTHERS THEN v := 'error:' || SQLSTATE; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
  RETURN v;
END $$;

DO $t$
DECLARE
  owner_meta jsonb := '{"full_name":"Dono","business_name":"Barbearia Promo","type":"barber","region":"BR","role":"owner"}';
  i int; ok30 int := 0; v text; old_orphan uuid := '0b000000-0000-4000-8000-0000000000a1';
  owner_tm text;
BEGIN
  -- Órfão criado ANTES da promoção (como os de prod): ensure_owner_profile não consome vaga.
  ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
  PERFORM pg_temp.signup(old_orphan, owner_meta, now() - interval '3 days');
  ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

  PERFORM pg_temp.chk(1, 'promoção começa 0/10', pg_temp.used(), '0/10');

  v := pg_temp.run_as('authenticated', old_orphan, 'SELECT public.ensure_owner_profile()->>''status''');
  PERFORM pg_temp.chk(2, 'órfão antigo via RPC: 20 dias, sem vaga', v || '|' || pg_temp.days(old_orphan) || '|' || pg_temp.used(), 'created|20|0/10');

  -- Colaborador por convite: não consome vaga.
  INSERT INTO public.team_members (id, user_id, name, role, active, is_owner) VALUES ('0b000000-0000-4000-8000-0000000000c1', '0b000000-0000-4000-8000-0000000000a1', 'Staff', 'Barbeiro', true, false);
  PERFORM pg_temp.signup('0b000000-0000-4000-8000-0000000000b1',
    '{"full_name":"Staff","role":"staff","company_id":"0b000000-0000-4000-8000-0000000000a1","member_id":"0b000000-0000-4000-8000-0000000000c1"}');
  PERFORM pg_temp.chk(3, 'convite de staff não consome vaga', pg_temp.used() || '|' || COALESCE((SELECT role FROM public.profiles WHERE id = '0b000000-0000-4000-8000-0000000000b1'), 'none'), '0/10|staff');

  -- Cadastro que falha no meio: vaga devolvida.
  BEGIN
    PERFORM pg_temp.signup('0b000000-0000-4000-8000-0000000000f1', owner_meta);
    RAISE EXCEPTION 'falha simulada';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
  PERFORM pg_temp.chk(4, 'cadastro que falha devolve a vaga', pg_temp.used(), '0/10');

  -- 10 donos novos: 30 dias cada.
  FOR i IN 1..10 LOOP
    PERFORM pg_temp.signup(('0b000000-0000-4000-8000-0000000001' || lpad(i::text, 2, '0'))::uuid, owner_meta);
    IF pg_temp.days(('0b000000-0000-4000-8000-0000000001' || lpad(i::text, 2, '0'))::uuid) = '30' THEN ok30 := ok30 + 1; END IF;
  END LOOP;
  PERFORM pg_temp.chk(5, '10 primeiros donos com 30 dias', ok30 || '|' || pg_temp.used() || '|' || (SELECT count(*) FROM public.trial_promotion_grants), '10|10/10|10');

  -- 11º e 12º: voltam a 20.
  PERFORM pg_temp.signup('0b000000-0000-4000-8000-000000000111', owner_meta);
  PERFORM pg_temp.signup('0b000000-0000-4000-8000-000000000112', owner_meta);
  PERFORM pg_temp.chk(6, '11º e 12º voltam a 20 dias', pg_temp.days('0b000000-0000-4000-8000-000000000111') || '|' || pg_temp.days('0b000000-0000-4000-8000-000000000112') || '|' || pg_temp.used(), '20|20|10/10');

  -- ensure_owner_profile para quem já tem perfil (exists) não mexe no prazo nem na vaga.
  v := pg_temp.run_as('authenticated', '0b000000-0000-4000-8000-000000000101', 'SELECT public.ensure_owner_profile()->>''status''');
  PERFORM pg_temp.chk(7, 'RPC em perfil existente: idempotente', v || '|' || pg_temp.days('0b000000-0000-4000-8000-000000000101') || '|' || pg_temp.used(), 'exists|30|10/10');

  -- INSERT ... ON CONFLICT em perfil existente (caminho do handle_new_user) não consome vaga.
  UPDATE public.trial_promotions SET max_uses = 11 WHERE id = 'signup_30d_first10';
  INSERT INTO public.profiles (id, role, company_id, subscription_status, business_name, email)
  VALUES ('0b000000-0000-4000-8000-000000000111', 'owner', '0b000000-0000-4000-8000-000000000111', 'trial', 'x', 'x')
  ON CONFLICT (id) DO NOTHING;
  PERFORM pg_temp.chk(8, 'ON CONFLICT em perfil existente não consome vaga', pg_temp.used() || '|' || pg_temp.days('0b000000-0000-4000-8000-000000000111'), '10/11|20');
  UPDATE public.trial_promotions SET max_uses = 10 WHERE id = 'signup_30d_first10';

  -- Cliente (anon / authenticated) não lê nem altera a promoção, nem chama a função.
  PERFORM pg_temp.chk(9, 'anon não lê trial_promotions', pg_temp.run_as('anon', NULL, 'SELECT count(*)::text FROM public.trial_promotions'), 'error:42501');
  PERFORM pg_temp.chk(10, 'authenticated não lê grants', pg_temp.run_as('authenticated', '0b000000-0000-4000-8000-000000000101', 'SELECT count(*)::text FROM public.trial_promotion_grants'), 'error:42501');
  PERFORM pg_temp.chk(11, 'authenticated não altera a promoção', pg_temp.run_as('authenticated', '0b000000-0000-4000-8000-000000000101', 'UPDATE public.trial_promotions SET used = 0 RETURNING used::text'), 'error:42501');
  PERFORM pg_temp.chk(12, 'ACL da função sem anon/authenticated',
    ((SELECT COALESCE(proacl::text, '') FROM pg_proc WHERE proname = 'apply_signup_trial_promotion') ~ '(anon|authenticated)=')::text, 'false');
  PERFORM pg_temp.chk(13, 'profiles continua sem INSERT de cliente',
    (has_table_privilege('authenticated', 'public.profiles', 'INSERT') OR has_table_privilege('anon', 'public.profiles', 'INSERT'))::text, 'false');
  -- Profile de staff/dono legado com company diferente não passa pelo ajuste.
  PERFORM pg_temp.chk(14, 'grant único por usuário', (SELECT count(DISTINCT user_id) = count(*) FROM public.trial_promotion_grants)::text, 'true');
EXCEPTION WHEN OTHERS THEN
  INSERT INTO results VALUES (0, 'erro: ' || SQLERRM, false, NULL, NULL);
END $t$;

SELECT n, CASE WHEN ok THEN 'ok' ELSE 'FAIL' END, name, COALESCE(got, ''), COALESCE(expected, '') FROM results ORDER BY n;
ROLLBACK;
