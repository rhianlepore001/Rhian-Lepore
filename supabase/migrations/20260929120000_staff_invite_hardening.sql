-- =============================================================================
-- Convite de colaborador com token secreto (invite hardening)
-- =============================================================================
-- Aplicar DEPOIS de 20260929090000_ex_staff_access.sql (PR #105).
--
-- Antes: o vínculo de um cadastro da equipe a uma conta dependia só de
-- identificadores (empresa + cadastro). Agora cada convite tem um token
-- aleatório (256 bits) guardado em public.staff_invites e o vínculo exige esse
-- token válido (do mesmo cadastro, dentro da validade e não usado).
--
--  1. public.staff_invites: 1 convite por cadastro (member_id), só acessível
--     pelas RPCs do dono (RLS ligada, sem grants para anon/authenticated).
--     O token fica em texto para "Copiar link" mostrar o mesmo link de novo.
--  2. get_or_create_staff_invite(member_id): devolve o token válido do cadastro
--     do próprio dono, ainda sem login (cria/renova se não houver, se venceu ou
--     se já foi usado).
--     rotate_staff_invite(member_id): "Gerar novo link" (o anterior deixa de valer).
--  3. complete_staff_invite: recriada com p_invite_token (DEFAULT NULL; só existe
--     uma versão). Sem token válido: invalid_invite. Marca o token como usado.
--  4. get_team_member_for_invite: recebe o token e não devolve nada sem ele.
--  5. handle_new_user: só cria perfil staff com invite_token válido na metadata.
--  6. relink_staff_if_unbound (versão do #105): também exige o invite_token da
--     metadata e marca o token como usado.
--  7. release_staff_email_for_reinvite: o caminho do próprio convidado exige o
--     token (o caminho do dono não muda).
--  8. accept_staff_invite (sem uso no app): sem EXECUTE para anon/authenticated.
--
-- Links de convite antigos (sem token) deixam de valer: o dono reenvia pela Equipe.
-- Rollback: docs/rollbacks/20260929120000_staff_invite_hardening_rollback.sql
-- =============================================================================

BEGIN;
SET LOCAL lock_timeout = '5s';

-- 1. Tabela ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_invites (
  member_id  uuid PRIMARY KEY REFERENCES public.team_members(id) ON DELETE CASCADE,
  company_id text NOT NULL,
  token      text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at    timestamptz,
  CONSTRAINT staff_invites_token_format CHECK (token ~ '^[0-9a-f]{64}$'),
  CONSTRAINT staff_invites_token_key UNIQUE (token)
);

ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;
-- Sem policies de propósito: nenhum acesso direto por anon/authenticated.
REVOKE ALL ON TABLE public.staff_invites FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.staff_invites TO service_role;

-- Helper interno: token válido para o cadastro/empresa (não usado, não vencido).
CREATE OR REPLACE FUNCTION public.staff_invite_token_is_valid(p_member_id uuid, p_company_id text, p_token text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p_member_id IS NOT NULL
     AND p_company_id IS NOT NULL
     AND p_token IS NOT NULL
     AND p_token ~ '^[0-9a-f]{64}$'
     AND EXISTS (
       SELECT 1
       FROM public.staff_invites si
       WHERE si.member_id = p_member_id
         AND si.company_id = p_company_id
         AND si.token = p_token
         AND si.used_at IS NULL
         AND si.expires_at > now()
     );
$function$;

REVOKE ALL ON FUNCTION public.staff_invite_token_is_valid(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_invite_token_is_valid(uuid, text, text) TO service_role;

-- 2. RPCs do dono --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_staff_invite(p_member_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_token text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Só o dono da empresa, para um cadastro ativo da própria equipe (não o dele).
  PERFORM 1
  FROM public.team_members tm
  WHERE tm.id = p_member_id
    AND tm.user_id = v_uid::text
    AND COALESCE(tm.is_owner, false) = false
    AND tm.deleted_at IS NULL
    AND tm.active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  -- Cadastro que já tem login não precisa de convite.
  IF EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.id = p_member_id AND tm.staff_user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'invite_already_used';
  END IF;

  INSERT INTO public.staff_invites (member_id, company_id, created_by)
  VALUES (p_member_id, v_uid::text, v_uid)
  ON CONFLICT (member_id) DO UPDATE
    SET token = encode(extensions.gen_random_bytes(32), 'hex'),
        company_id = EXCLUDED.company_id,
        created_by = EXCLUDED.created_by,
        created_at = now(),
        expires_at = now() + interval '30 days',
        used_at = NULL
    WHERE staff_invites.used_at IS NOT NULL
       OR staff_invites.expires_at <= now()
       OR staff_invites.company_id IS DISTINCT FROM EXCLUDED.company_id;

  SELECT si.token INTO v_token
  FROM public.staff_invites si
  WHERE si.member_id = p_member_id;

  RETURN v_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rotate_staff_invite(p_member_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_token text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM 1
  FROM public.team_members tm
  WHERE tm.id = p_member_id
    AND tm.user_id = v_uid::text
    AND COALESCE(tm.is_owner, false) = false
    AND tm.deleted_at IS NULL
    AND tm.active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  -- Cadastro que já tem login não precisa de convite.
  IF EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.id = p_member_id AND tm.staff_user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'invite_already_used';
  END IF;

  INSERT INTO public.staff_invites (member_id, company_id, created_by)
  VALUES (p_member_id, v_uid::text, v_uid)
  ON CONFLICT (member_id) DO UPDATE
    SET token = encode(extensions.gen_random_bytes(32), 'hex'),
        company_id = EXCLUDED.company_id,
        created_by = EXCLUDED.created_by,
        created_at = now(),
        expires_at = now() + interval '30 days',
        used_at = NULL
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_or_create_staff_invite(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rotate_staff_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_staff_invite(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rotate_staff_invite(uuid) TO authenticated, service_role;

-- 3. complete_staff_invite (uma única versão, com token) -----------------------
DROP FUNCTION IF EXISTS public.complete_staff_invite(text, uuid, date);

CREATE OR REPLACE FUNCTION public.complete_staff_invite(p_company_id text, p_member_id uuid, p_birth_date date DEFAULT NULL::date, p_invite_token text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_member public.team_members%ROWTYPE;
  v_invite public.staff_invites%ROWTYPE;
  v_owner_ok boolean;
  v_is_tenant_owner boolean;
BEGIN
  PERFORM set_config('agendix.allow_profile_identity', 'on', true);

  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_company_id IS NULL OR btrim(p_company_id) = '' OR p_member_id IS NULL
     OR p_invite_token IS NULL OR p_invite_token !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  -- Token do convite: mesmo cadastro, mesma empresa.
  SELECT * INTO v_invite
  FROM public.staff_invites si
  WHERE si.member_id = p_member_id
    AND si.company_id = p_company_id
    AND si.token = p_invite_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  -- Token já usado só serve para quem o usou (repetir o vínculo é idempotente).
  -- Token vencido e não usado não serve para ninguém.
  IF v_invite.used_at IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = p_member_id
        AND tm.staff_user_id = v_uid
        AND tm.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'invalid_invite';
    END IF;
  ELSIF v_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  IF v_uid::text = p_company_id THEN
    RAISE EXCEPTION 'owner_cannot_claim_staff_invite';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid::text
      AND COALESCE(role, 'owner') = 'owner'
      AND company_id = id
  ) INTO v_is_tenant_owner;

  IF v_is_tenant_owner THEN
    RAISE EXCEPTION 'owner_cannot_claim_staff_invite';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE staff_user_id = v_uid
      AND deleted_at IS NULL
      AND id IS DISTINCT FROM p_member_id
  ) THEN
    RAISE EXCEPTION 'invite_already_used';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_company_id
      AND COALESCE(role, 'owner') = 'owner'
  ) INTO v_owner_ok;

  IF NOT v_owner_ok THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  SELECT * INTO v_member
  FROM public.team_members
  WHERE id = p_member_id
    AND user_id::text = p_company_id
    AND COALESCE(is_owner, false) = false
    AND deleted_at IS NULL
    AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  IF v_member.staff_user_id IS NOT NULL AND v_member.staff_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'invite_already_used';
  END IF;

  UPDATE public.profiles
  SET
    role = 'staff',
    company_id = p_company_id,
    full_name = COALESCE(NULLIF(btrim(v_member.name), ''), full_name),
    business_name = COALESCE(business_name, ''),
    birth_date = COALESCE(p_birth_date, birth_date),
    tutorial_completed = false,
    updated_at = now()
  WHERE id = v_uid::text;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      id, role, company_id, full_name, birth_date, tutorial_completed
    ) VALUES (
      v_uid::text, 'staff', p_company_id, v_member.name, p_birth_date, false
    );
  END IF;

  UPDATE public.team_members
  SET
    staff_user_id = v_uid,
    updated_at = now()
  WHERE id = p_member_id
    AND user_id::text = p_company_id
    AND (staff_user_id IS NULL OR staff_user_id = v_uid);

  UPDATE public.staff_invites
  SET used_at = COALESCE(used_at, now())
  WHERE member_id = p_member_id;

  RETURN p_member_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_staff_invite(text, uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_staff_invite(text, uuid, date, text) TO authenticated, service_role;

-- 4. get_team_member_for_invite (com token) ------------------------------------
DROP FUNCTION IF EXISTS public.get_team_member_for_invite(text, uuid);

CREATE OR REPLACE FUNCTION public.get_team_member_for_invite(p_company_id text, p_member_id uuid, p_invite_token text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, name text, role text, staff_user_id uuid, business_name text, user_type text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Token válido (não usado e na validade) OU já usado por quem está vinculado
  -- (a tela mostra "Este convite já foi utilizado.").
  SELECT
    tm.id,
    tm.name,
    tm.role,
    tm.staff_user_id,
    p.business_name,
    p.user_type
  FROM public.team_members tm
  JOIN public.staff_invites si
    ON si.member_id = tm.id
   AND si.company_id = tm.user_id
   AND si.token = p_invite_token
  LEFT JOIN public.profiles p ON p.id = tm.user_id
  WHERE tm.id = p_member_id
    AND tm.user_id::text = p_company_id
    AND COALESCE(tm.is_owner, false) = false
    AND COALESCE(tm.active, true) = true
    AND tm.deleted_at IS NULL
    AND p_invite_token ~ '^[0-9a-f]{64}$'
    AND (
      (si.used_at IS NULL AND si.expires_at > now())
      OR (si.used_at IS NOT NULL AND tm.staff_user_id IS NOT NULL)
    )
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_team_member_for_invite(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_member_for_invite(text, uuid, text) TO anon, authenticated, service_role;

-- 5. handle_new_user: staff só com invite_token válido -------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_company_id text;
  v_member_id uuid;
  v_invite_ok boolean;
BEGIN
  PERFORM set_config('agendix.allow_profile_identity', 'on', true);

  v_role := COALESCE(new.raw_user_meta_data->>'role', 'owner');
  IF v_role NOT IN ('owner', 'staff') THEN
    v_role := 'owner';
  END IF;

  v_company_id := COALESCE(NULLIF(btrim(new.raw_user_meta_data->>'company_id'), ''), new.id::text);

  BEGIN
    v_member_id := NULLIF(btrim(COALESCE(new.raw_user_meta_data->>'member_id', '')), '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_member_id := NULL;
  END;

  IF v_role = 'staff' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.id = v_member_id
        AND tm.user_id::text = v_company_id
        AND COALESCE(tm.is_owner, false) = false
        AND tm.deleted_at IS NULL
        AND tm.active = true
        AND tm.staff_user_id IS NULL
    ) AND public.staff_invite_token_is_valid(v_member_id, v_company_id, new.raw_user_meta_data->>'invite_token')
    INTO v_invite_ok;

    IF v_member_id IS NULL OR v_company_id = new.id::text OR NOT COALESCE(v_invite_ok, false) THEN
      v_role := 'owner';
      v_company_id := new.id::text;
    END IF;
  ELSE
    v_company_id := new.id::text;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, business_name, phone, user_type, region, business_slug, role, company_id, subscription_status, trial_ends_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'business_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'type', 'barber'),
    COALESCE(new.raw_user_meta_data->>'region', 'BR'),
    LOWER(REGEXP_REPLACE(COALESCE(new.raw_user_meta_data->>'business_name', 'business'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(new.id::text, 1, 8),
    v_role,
    v_company_id,
    'trial',
    now() + interval '20 days'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    business_name = COALESCE(NULLIF(EXCLUDED.business_name, ''), public.profiles.business_name);

  IF v_role IS DISTINCT FROM 'staff' THEN
    INSERT INTO public.business_settings (user_id)
    VALUES (new.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Trigger error: %', SQLERRM;
  RETURN new;
END;
$function$;

-- 6. relink_staff_if_unbound (versão do #105 + token da metadata) ---------------
CREATE OR REPLACE FUNCTION public.relink_staff_if_unbound()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_company_id text;
  v_role text;
  v_member_id uuid;
  v_meta_member text;
  v_meta_token text;
  v_user_created timestamptz;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role, company_id
    INTO v_role, v_company_id
  FROM public.profiles
  WHERE id = v_uid::text;

  IF v_role IS DISTINCT FROM 'staff' OR btrim(COALESCE(v_company_id, '')) = '' THEN
    RETURN NULL;
  END IF;

  SELECT tm.id INTO v_member_id
  FROM public.team_members tm
  WHERE tm.staff_user_id = v_uid
    AND tm.user_id::text = v_company_id
    AND tm.deleted_at IS NULL
  LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    RETURN v_member_id;
  END IF;

  SELECT u.raw_user_meta_data ->> 'member_id', u.raw_user_meta_data ->> 'invite_token', u.created_at
    INTO v_meta_member, v_meta_token, v_user_created
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_user_created IS NULL OR v_user_created < now() - interval '24 hours' THEN
    RETURN NULL;
  END IF;

  IF v_meta_member IS NULL
     OR v_meta_member !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  -- O token do convite (gravado no cadastro) também tem que valer.
  IF NOT public.staff_invite_token_is_valid(v_meta_member::uuid, v_company_id, v_meta_token) THEN
    RETURN NULL;
  END IF;

  UPDATE public.team_members tm
  SET staff_user_id = v_uid, updated_at = now()
  WHERE tm.id = v_meta_member::uuid
    AND tm.user_id::text = v_company_id
    AND COALESCE(tm.is_owner, false) = false
    AND tm.deleted_at IS NULL
    AND tm.active = true
    AND tm.staff_user_id IS NULL
  RETURNING tm.id INTO v_member_id;

  IF v_member_id IS NOT NULL THEN
    UPDATE public.staff_invites
    SET used_at = now()
    WHERE member_id = v_member_id
      AND token = v_meta_token
      AND used_at IS NULL;
  END IF;

  RETURN v_member_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.relink_staff_if_unbound() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relink_staff_if_unbound() TO authenticated, service_role;

-- 7. release_staff_email_for_reinvite: token no caminho do convidado -----------
DROP FUNCTION IF EXISTS public.release_staff_email_for_reinvite(text, uuid, text);

CREATE OR REPLACE FUNCTION public.release_staff_email_for_reinvite(p_company_id text, p_member_id uuid, p_email text, p_invite_token text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_caller_email text;
  v_is_owner boolean;
  v_is_orphan_claimant boolean;
  v_invite_ok boolean;
  v_auth_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  IF p_email IS NULL OR btrim(p_email) = ''
     OR p_company_id IS NULL OR btrim(p_company_id) = ''
     OR p_member_id IS NULL THEN
    RETURN false;
  END IF;

  v_is_owner := (v_uid::text = p_company_id);

  SELECT lower(email) INTO v_caller_email
  FROM auth.users
  WHERE id = v_uid;

  v_is_orphan_claimant := (
    NOT v_is_owner
    AND v_caller_email IS NOT NULL
    AND v_caller_email = lower(btrim(p_email))
    AND public.staff_invite_token_is_valid(p_member_id, p_company_id, p_invite_token)
  );

  IF NOT v_is_owner AND NOT v_is_orphan_claimant THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.id = p_member_id
      AND tm.user_id::text = p_company_id
      AND COALESCE(tm.is_owner, false) = false
      AND tm.deleted_at IS NULL
      AND tm.active = true
      AND tm.staff_user_id IS NULL
  ) INTO v_invite_ok;

  IF NOT v_invite_ok THEN
    RETURN false;
  END IF;

  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE lower(email) = lower(btrim(p_email))
  LIMIT 1;

  IF v_auth_id IS NULL THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE staff_user_id = v_auth_id
      AND deleted_at IS NULL
  ) THEN
    RETURN false;
  END IF;

  IF v_is_orphan_claimant AND v_auth_id IS DISTINCT FROM v_uid THEN
    RETURN false;
  END IF;

  PERFORM set_config('agendix.allow_orphan_reinvite_purge', 'on', true);
  PERFORM public.purge_staff_auth_user(v_auth_id, p_company_id);

  RETURN NOT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(btrim(p_email))
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text, text) TO authenticated, service_role;

-- 8. accept_staff_invite: sem uso no app; fica só para service_role -------------
REVOKE ALL ON FUNCTION public.accept_staff_invite(text, uuid) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
