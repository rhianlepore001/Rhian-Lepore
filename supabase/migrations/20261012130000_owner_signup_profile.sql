-- =============================================================================
-- Cadastro de dono: perfil e business_settings voltam a ser criados
-- Spec: docs/specs/owner-signup-profile-SPEC.md
-- Rollback: docs/rollbacks/20261012130000_owner_signup_profile.rollback.sql
--
-- Problema (prod, desde 2026-09-18): o trigger ensure_email_confirmed (BEFORE INSERT em
-- profiles) barra o INSERT do handle_new_user, porque o GoTrue insere o usuário e só
-- depois grava email_confirmed_at. O handle_new_user engole o erro (WARNING) e o usuário
-- fica sem profile e sem business_settings. O upsert direto do front, que antes cobria isso,
-- recebe 42501 desde 20260918142111 (REVOKE INSERT em profiles). Resultado: todo dono novo
-- fica órfão; a 2ª tentativa de cadastro dá "User already registered".
--
-- O que muda (aditivo):
--   1. check_email_confirmed: deixa passar quando o INSERT vem de handle_new_user ou de
--      ensure_owner_profile (ambos SECURITY DEFINER, ligam agendix.allow_profile_identity
--      só na transação). Cliente continua sem INSERT em profiles (grant não muda).
--   2. ensure_owner_profile(): RPC idempotente para o próprio auth.uid(). Cria o profile de
--      dono (company_id = próprio id, trial de 20 dias = TRIAL_DAYS do app) e o
--      business_settings (defaults da tabela, igual ao handle_new_user). Nunca cria para
--      convite de colaborador (metadata role=staff / company_id / member_id) nem para quem
--      já é colaborador em team_members. Só authenticated executa.
-- handle_new_user, protect_profile_identity e os grants de profiles NÃO mudam.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_email_confirmed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Inserção feita por handle_new_user / ensure_owner_profile (SECURITY DEFINER): o GoTrue
    -- só grava email_confirmed_at depois do INSERT em auth.users, então não dá para exigir aqui.
    -- O cliente não tem INSERT em profiles; a flag só é ligada dentro dessas funções.
    IF lower(COALESCE(current_setting('agendix.allow_profile_identity', true), 'off')) = 'on' THEN
        RETURN NEW;
    END IF;
    -- Cast TEXT id to UUID for comparison with auth.users
    IF (SELECT email_confirmed_at FROM auth.users WHERE id = NEW.id::uuid) IS NULL THEN
        RAISE EXCEPTION 'Email not confirmed. Please check your inbox.';
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_owner_profile()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_user auth.users%ROWTYPE;
  v_meta jsonb;
  v_profile public.profiles%ROWTYPE;
  v_bs_created boolean := false;
  v_slug text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_user FROM auth.users WHERE id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;
  v_meta := COALESCE(v_user.raw_user_meta_data, '{}'::jsonb);

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid::text;
  IF FOUND THEN
    -- Perfil já existe: só completa o business_settings de um dono (idempotente).
    IF COALESCE(v_profile.role, 'owner') = 'owner'
       AND COALESCE(NULLIF(btrim(v_profile.company_id), ''), v_profile.id) = v_profile.id
       AND NOT EXISTS (SELECT 1 FROM public.business_settings WHERE user_id = v_uid::text) THEN
      INSERT INTO public.business_settings (user_id) VALUES (v_uid::text) ON CONFLICT (user_id) DO NOTHING;
      v_bs_created := FOUND;
    END IF;
    RETURN jsonb_build_object('status', 'exists', 'role', COALESCE(v_profile.role, 'owner'),
                              'business_settings_created', v_bs_created);
  END IF;

  -- Convite de colaborador ou colaborador já vinculado: nunca vira dono aqui.
  IF COALESCE(v_meta->>'role', 'owner') <> 'owner'
     OR NULLIF(btrim(COALESCE(v_meta->>'company_id', '')), '') IS NOT NULL
     OR NULLIF(btrim(COALESCE(v_meta->>'member_id', '')), '') IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.staff_user_id = v_uid) THEN
    RETURN jsonb_build_object('status', 'skipped_staff');
  END IF;

  -- Mesmo slug do handle_new_user; se já existir (mesmo nome + mesmo prefixo de id), usa o id inteiro.
  v_slug := LOWER(REGEXP_REPLACE(COALESCE(v_meta->>'business_name', 'business'), '[^a-zA-Z0-9]+', '-', 'g'));
  IF EXISTS (SELECT 1 FROM public.profiles WHERE business_slug = v_slug || '-' || SUBSTRING(v_uid::text, 1, 8)) THEN
    v_slug := v_slug || '-' || REPLACE(v_uid::text, '-', '');
  ELSE
    v_slug := v_slug || '-' || SUBSTRING(v_uid::text, 1, 8);
  END IF;

  PERFORM set_config('agendix.allow_profile_identity', 'on', true);

  INSERT INTO public.profiles (
    id, email, full_name, business_name, phone, user_type, region, business_slug, role, company_id,
    subscription_status, trial_ends_at, tutorial_completed, aios_enabled
  )
  VALUES (
    v_uid::text,
    v_user.email,
    COALESCE(v_meta->>'full_name', ''),
    COALESCE(v_meta->>'business_name', ''),
    COALESCE(v_meta->>'phone', ''),
    CASE WHEN v_meta->>'type' IN ('barber', 'beauty') THEN v_meta->>'type' ELSE 'barber' END,
    CASE WHEN v_meta->>'region' IN ('BR', 'PT') THEN v_meta->>'region' ELSE 'BR' END,
    v_slug,
    'owner',
    v_uid::text,
    'trial',
    now() + interval '20 days',
    false,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.business_settings WHERE user_id = v_uid::text) THEN
    INSERT INTO public.business_settings (user_id) VALUES (v_uid::text) ON CONFLICT (user_id) DO NOTHING;
    v_bs_created := FOUND;
  END IF;

  PERFORM set_config('agendix.allow_profile_identity', 'off', true);

  RETURN jsonb_build_object('status', 'created', 'role', 'owner', 'business_settings_created', v_bs_created);
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_owner_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_owner_profile() TO authenticated, service_role;

COMMENT ON FUNCTION public.ensure_owner_profile() IS
  'Cria (idempotente) profile + business_settings de DONO para o próprio auth.uid(); nunca para convite/colaborador. Migration 20261012130000.';
