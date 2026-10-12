-- Testes de 20261012130000_owner_signup_profile (rodar via scripts/test-sql-owner-signup-profile.sh).
-- Ids com prefixo 0a000000-. Cada check grava em pg_temp.results; o script falha se algum der FAIL.
BEGIN;
CREATE TEMP TABLE results (n int, name text, ok boolean, got text, expected text);
CREATE FUNCTION pg_temp.chk(p_n int, p_name text, p_got text, p_exp text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO results VALUES (p_n, p_name, p_got IS NOT DISTINCT FROM p_exp, p_got, p_exp);
$$;
-- "GoTrue" com confirmação desligada: INSERT com email_confirmed_at NULL e confirmação logo depois.
CREATE FUNCTION pg_temp.gotrue_signup(p_id uuid, p_email text, p_meta jsonb) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_sent_at)
  VALUES ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email, 'x',
          '{"provider":"email","providers":["email"]}', p_meta, now(), now(), NULL);
  UPDATE auth.users SET email_confirmed_at = now(), last_sign_in_at = now() WHERE id = p_id;
END $$;
-- Órfão como os de prod: usuário criado sem o trigger conseguir criar o perfil.
CREATE FUNCTION pg_temp.make_orphan(p_id uuid, p_email text, p_meta jsonb) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
  PERFORM pg_temp.gotrue_signup(p_id, p_email, p_meta);
  ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
END $$;
-- Executa SQL como role/usuário do PostgREST e devolve o resultado ou 'error:<msg>'.
CREATE FUNCTION pg_temp.run_as(p_role text, p_uid uuid, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid::text, ''), true);
  PERFORM set_config('request.jwt.claims', CASE WHEN p_uid IS NULL THEN '' ELSE json_build_object('sub', p_uid, 'role', p_role)::text END, true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
  EXCEPTION WHEN OTHERS THEN
    v := 'error:' || SQLERRM;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
  RETURN v;
END $$;
CREATE FUNCTION pg_temp.prof(p_id uuid) RETURNS text LANGUAGE sql AS $$
  SELECT COALESCE((SELECT concat_ws('|', role, company_id = id, user_type, region, business_name, full_name, phone, email,
                     subscription_status, tutorial_completed, aios_enabled,
                     abs(extract(epoch FROM trial_ends_at - (now() + interval '20 days'))) < 60,
                     business_slug LIKE lower(regexp_replace(business_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(id, 1, 8) || '%')
                   FROM public.profiles WHERE id = p_id::text), 'none')
$$;
CREATE FUNCTION pg_temp.bs(p_id uuid) RETURNS text LANGUAGE sql AS $$
  SELECT count(*) || '|' || COALESCE(max(online_booking_requires_approval::text || '/' || staff_agenda_block_scope || '/' || staff_can_block_agenda::text), '-')
  FROM public.business_settings WHERE user_id = p_id::text
$$;

DO $t$
DECLARE
  owner_new uuid := '0a000000-0000-4000-8000-000000000001';
  orphan    uuid := '0a000000-0000-4000-8000-000000000002';
  orphan2   uuid := '0a000000-0000-4000-8000-000000000003';
  st_meta   uuid := '0a000000-0000-4000-8000-000000000004';
  st_member uuid := '0a000000-0000-4000-8000-000000000005';
  staff_ok  uuid := '0a000000-0000-4000-8000-000000000006';
  owner_old uuid := '0a000000-0000-4000-8000-000000000007';
  member_id uuid := '0a000000-0000-4000-8000-0000000000a1';
  meta jsonb := '{"full_name":"Rafael Teste","business_name":"Oliveira cortes","phone":"+5511999990001","type":"barber","region":"BR","role":"owner"}';
  v text;
BEGIN
  -- 1. Cadastro novo de dono (GoTrue + trigger real): profile + business_settings.
  PERFORM pg_temp.gotrue_signup(owner_new, 'novo@ex.com', meta);
  PERFORM pg_temp.chk(1, 'cadastro novo cria profile de dono (handle_new_user)', split_part(pg_temp.prof(owner_new), '|', 1) || '|' || split_part(pg_temp.prof(owner_new), '|', 2), 'owner|t');
  PERFORM pg_temp.chk(2, 'cadastro novo cria business_settings com defaults', pg_temp.bs(owner_new), '1|true/own/true');

  -- 3-6. Órfão (como c804ea7a) recebe perfil pela RPC, com os dados do metadata.
  PERFORM pg_temp.make_orphan(orphan, 'orfao@ex.com', meta || '{"region":"PT","type":"beauty"}');
  PERFORM pg_temp.chk(3, 'órfão sem profile antes da RPC', pg_temp.prof(orphan), 'none');
  v := pg_temp.run_as('authenticated', orphan, 'SELECT public.ensure_owner_profile()->>''status''');
  PERFORM pg_temp.chk(4, 'RPC cria para o órfão', v, 'created');
  PERFORM pg_temp.chk(5, 'perfil do órfão: owner, company=id, metadata, trial 20d, slug',
    pg_temp.prof(orphan), 'owner|t|beauty|PT|Oliveira cortes|Rafael Teste|+5511999990001|orfao@ex.com|trial|f|t|t|t');
  PERFORM pg_temp.chk(6, 'business_settings do órfão', pg_temp.bs(orphan), '1|true/own/true');
  PERFORM pg_temp.chk(20, 'slug colidindo (mesmo nome + mesmo prefixo de id): usa o id inteiro, sem erro',
    (SELECT business_slug FROM public.profiles WHERE id = orphan::text), 'oliveira-cortes-0a000000000040008000000000000002');

  -- 7. Idempotente.
  v := pg_temp.run_as('authenticated', orphan, 'SELECT public.ensure_owner_profile()->>''status''');
  PERFORM pg_temp.chk(7, 'RPC 2x = exists, sem duplicar', v || ' ' || (SELECT count(*) FROM public.profiles WHERE id = orphan::text) || ' ' || pg_temp.bs(orphan), 'exists 1 1|true/own/true');

  -- 8. Só para o próprio auth.uid(): chamar como outro usuário não cria nada para o órfão2.
  PERFORM pg_temp.make_orphan(orphan2, 'orfao2@ex.com', meta);
  v := pg_temp.run_as('authenticated', owner_new, 'SELECT public.ensure_owner_profile()->>''status''');
  PERFORM pg_temp.chk(8, 'outro usuário chama a RPC: só o próprio (exists) e órfão2 continua sem perfil', v || ' ' || pg_temp.prof(orphan2), 'exists none');

  -- 9. anon negado.
  v := pg_temp.run_as('anon', NULL, 'SELECT public.ensure_owner_profile()::text');
  PERFORM pg_temp.chk(9, 'anon não executa a RPC', v, 'error:permission denied for function ensure_owner_profile');

  -- 10. Convite (metadata de colaborador) nunca vira dono.
  PERFORM pg_temp.make_orphan(st_meta, 'staff-meta@ex.com', '{"full_name":"Colab","role":"staff","company_id":"0a000000-0000-4000-8000-000000000001","member_id":"0a000000-0000-4000-8000-0000000000a9"}');
  v := pg_temp.run_as('authenticated', st_meta, 'SELECT public.ensure_owner_profile()->>''status''');
  PERFORM pg_temp.chk(10, 'metadata de convite: skipped_staff, sem profile/bs', v || ' ' || pg_temp.prof(st_meta) || ' ' || pg_temp.bs(st_meta), 'skipped_staff none 0|-');

  -- 11. Quem já é colaborador em team_members (metadata de dono) também não vira dono.
  PERFORM pg_temp.make_orphan(st_member, 'staff-member@ex.com', meta);
  INSERT INTO public.team_members (id, user_id, name, role, staff_user_id) VALUES (gen_random_uuid(), owner_new::text, 'Colab', 'Barbeiro', st_member);
  v := pg_temp.run_as('authenticated', st_member, 'SELECT public.ensure_owner_profile()->>''status''');
  PERFORM pg_temp.chk(11, 'membership em team_members: skipped_staff', v || ' ' || pg_temp.prof(st_member), 'skipped_staff none');

  -- 12. Convite válido pelo handle_new_user continua virando staff (sem business_settings).
  INSERT INTO public.team_members (id, user_id, name, role, active, is_owner) VALUES (member_id, owner_new::text, 'Novo colab', 'Barbeiro', true, false);
  PERFORM pg_temp.gotrue_signup(staff_ok, 'colab@ex.com', jsonb_build_object('full_name', 'Novo colab', 'role', 'staff', 'company_id', owner_new::text, 'member_id', member_id::text));
  PERFORM pg_temp.chk(12, 'convite válido: profile staff da empresa, sem bs',
    (SELECT role || '|' || (company_id = owner_new::text)::text FROM public.profiles WHERE id = staff_ok::text) || ' ' || pg_temp.bs(staff_ok), 'staff|true 0|-');
  v := pg_temp.run_as('authenticated', staff_ok, 'SELECT public.ensure_owner_profile()->>''status''');
  PERFORM pg_temp.chk(13, 'RPC em staff existente: exists, sem bs', v || ' ' || pg_temp.bs(staff_ok), 'exists 0|-');

  -- 14. Dono antigo com profile mas sem business_settings: RPC completa só o bs.
  INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES (owner_old, 'antigo@ex.com', now(), meta || '{"business_name":"Barbearia Antiga"}');
  PERFORM pg_temp.chk(21, 'dono antigo: profile criado pelo trigger', split_part(pg_temp.prof(owner_old), '|', 1), 'owner');
  DELETE FROM public.business_settings WHERE user_id = owner_old::text;
  v := pg_temp.run_as('authenticated', owner_old, 'SELECT public.ensure_owner_profile()::text');
  PERFORM pg_temp.chk(14, 'profile existente sem bs: completa bs', CASE WHEN v LIKE 'error:%' THEN v ELSE (v::jsonb->>'status') || ' ' || (v::jsonb->>'business_settings_created') END || ' ' || pg_temp.bs(owner_old), 'exists true 1|true/own/true');

  -- 15-16. Cliente continua sem escrita direta em profiles.
  v := pg_temp.run_as('authenticated', orphan2, format($q$INSERT INTO public.profiles (id, role) VALUES (%L, 'owner') RETURNING id$q$, orphan2));
  PERFORM pg_temp.chk(15, 'authenticated: INSERT direto em profiles negado', v, 'error:permission denied for table profiles');
  PERFORM set_config('agendix.allow_profile_identity', 'on', true);
  v := pg_temp.run_as('authenticated', orphan2, format($q$INSERT INTO public.profiles (id, role) VALUES (%L, 'owner') RETURNING id$q$, orphan2));
  PERFORM set_config('agendix.allow_profile_identity', 'off', true);
  PERFORM pg_temp.chk(16, 'authenticated com a flag: INSERT direto continua negado', v, 'error:permission denied for table profiles');

  -- 17. Sem a flag, profile para e-mail não confirmado continua barrado (trigger mantém a regra).
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ('0a000000-0000-4000-8000-000000000008', 'naoconf@ex.com', '{}');
  BEGIN
    PERFORM set_config('agendix.allow_profile_identity', 'off', true);
    INSERT INTO public.profiles (id) VALUES ('0a000000-0000-4000-8000-000000000008');
    v := 'inserted';
  EXCEPTION WHEN OTHERS THEN v := SQLERRM; END;
  PERFORM pg_temp.chk(17, 'sem flag: e-mail não confirmado continua barrado', v, 'Email not confirmed. Please check your inbox.');

  -- 18. A flag não vaza para fora da RPC (fica 'off' na transação depois).
  PERFORM pg_temp.chk(18, 'flag desligada depois da RPC', COALESCE(current_setting('agendix.allow_profile_identity', true), 'off'), 'off');

  -- 19. ACL / definer.
  PERFORM pg_temp.chk(19, 'ensure_owner_profile: definer, search_path, ACL sem anon',
    (SELECT prosecdef::text || ' ' || proconfig::text || ' ' || proacl::text FROM pg_proc WHERE proname = 'ensure_owner_profile' AND pronamespace = 'public'::regnamespace),
    'true {search_path=public} {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}');
END
$t$;

SELECT n, CASE WHEN ok THEN 'ok  ' ELSE 'FAIL' END AS r, name, CASE WHEN ok THEN '' ELSE '(got=' || COALESCE(got, 'NULL') || ' expected=' || COALESCE(expected, 'NULL') || ')' END AS detail
FROM results ORDER BY n;
ROLLBACK;
