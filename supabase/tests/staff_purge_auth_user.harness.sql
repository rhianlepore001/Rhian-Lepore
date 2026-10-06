-- Harness mínimo que reproduz o que importa de prod para testar a migration
-- *_fix_purge_staff_refresh_tokens_cast num Postgres descartável (local).
-- Tipos de coluna copiados de prod (information_schema, 2026-10-06). Em especial:
--   auth.refresh_tokens.user_id é character varying (NÃO uuid) — igual a prod.
--   auth.identities/sessions.user_id e auth.users.id são uuid.
--   public.profiles.id / team_members.user_id / notifications.user_id são text.
-- Funções purge_staff_auth_user / delete_staff_collaborator /
-- release_staff_email_for_reinvite copiadas de prod (pg_get_functiondef,
-- 2026-10-06), com os mesmos ACLs. Nada aqui toca prod.

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
-- auth.uid() de prod (lê request.jwt.claim.sub ou request.jwt.claims->>sub).
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email character varying(255),
  phone text,
  raw_user_meta_data jsonb
);
CREATE TABLE auth.identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id text NOT NULL,
  provider text NOT NULL DEFAULT 'email',
  identity_data jsonb NOT NULL
);
CREATE TABLE auth.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);
-- Como em prod: user_id varchar, sem FK para auth.users; session_id -> sessions CASCADE.
CREATE TABLE auth.refresh_tokens (
  id bigserial PRIMARY KEY,
  token character varying(255) UNIQUE,
  user_id character varying(255),
  revoked boolean,
  session_id uuid REFERENCES auth.sessions(id) ON DELETE CASCADE
);

CREATE TABLE public.profiles (id text PRIMARY KEY, role text, company_id text);
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.profiles(id) ON UPDATE CASCADE,
  name text,
  staff_user_id uuid REFERENCES auth.users(id),
  is_owner boolean,
  active boolean DEFAULT true,
  slug text,
  deleted_at timestamptz,
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX team_members_slug_active_key ON public.team_members USING btree (slug)
  WHERE ((deleted_at IS NULL) AND (slug IS NOT NULL) AND (btrim(slug) <> ''::text));
-- notifications de prod (FK NO ACTION no delete -> profiles).
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.profiles(id) ON UPDATE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  link text,
  booking_id uuid,
  event_key text
);
-- aios_logs: FK NO ACTION -> auth.users (em prod). Usada para forçar o
-- caminho EXCEPTION (DELETE em auth.users falha -> anonimiza).
CREATE TABLE public.aios_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  agent_name text NOT NULL DEFAULT 'test',
  action_type text NOT NULL DEFAULT 'test',
  content jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- ===== Definições atuais de prod (verbatim, pg_get_functiondef 2026-10-06) =====
CREATE OR REPLACE FUNCTION public.purge_staff_auth_user(p_staff_user_id uuid, p_company_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_company_id text;
  v_purged_email text;
BEGIN
  IF p_staff_user_id IS NULL OR p_company_id IS NULL OR btrim(p_company_id) = '' THEN
    RETURN;
  END IF;

  IF p_staff_user_id::text = p_company_id THEN
    RETURN;
  END IF;

  IF auth.uid() IS NOT NULL
     AND p_staff_user_id = auth.uid()
     AND lower(COALESCE(current_setting('agendix.allow_orphan_reinvite_purge', true), 'off'))
         IS DISTINCT FROM 'on' THEN
    RETURN;
  END IF;

  SELECT role::text, company_id::text
  INTO v_role, v_company_id
  FROM public.profiles
  WHERE id = p_staff_user_id::text;

  IF FOUND THEN
    IF v_role IS DISTINCT FROM 'staff' THEN
      RETURN;
    END IF;
    IF v_company_id IS DISTINCT FROM p_company_id THEN
      RETURN;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE staff_user_id = p_staff_user_id
      AND deleted_at IS NULL
  ) THEN
    RETURN;
  END IF;

  UPDATE public.team_members
  SET staff_user_id = NULL,
      updated_at = now()
  WHERE staff_user_id = p_staff_user_id;

  DELETE FROM public.profiles
  WHERE id = p_staff_user_id::text
    AND role = 'staff';

  v_purged_email := 'deleted-' || p_staff_user_id::text || '@purged.invalid';

  BEGIN
    DELETE FROM auth.identities WHERE user_id = p_staff_user_id;
    DELETE FROM auth.sessions WHERE user_id = p_staff_user_id;
    DELETE FROM auth.refresh_tokens WHERE user_id = p_staff_user_id;
    DELETE FROM auth.users WHERE id = p_staff_user_id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE auth.users
    SET
      email = v_purged_email,
      phone = NULL,
      raw_user_meta_data = '{}'::jsonb
    WHERE id = p_staff_user_id;

    UPDATE auth.identities
    SET
      provider_id = v_purged_email,
      identity_data = jsonb_set(
        COALESCE(identity_data, '{}'::jsonb),
        '{email}',
        to_jsonb(v_purged_email)
      )
    WHERE user_id = p_staff_user_id;

    DELETE FROM auth.sessions WHERE user_id = p_staff_user_id;
    DELETE FROM auth.refresh_tokens WHERE user_id = p_staff_user_id;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_staff_collaborator(p_member_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staff_user_id uuid;
  v_company_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'OWNER_OR_MISSING_TEAM_MEMBER';
  END IF;

  SELECT staff_user_id, user_id::text
    INTO v_staff_user_id, v_company_id
  FROM public.team_members
  WHERE id = p_member_id
    AND user_id::text = auth.uid()::text
    AND COALESCE(is_owner, false) = false
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OWNER_OR_MISSING_TEAM_MEMBER';
  END IF;

  UPDATE public.team_members
  SET
    deleted_at = now(),
    active = false,
    staff_user_id = NULL,
    slug = CASE
      WHEN slug IS NULL OR btrim(slug) = '' THEN slug
      ELSE left(slug, 80) || '-del-' || replace(id::text, '-', '')
    END,
    updated_at = now()
  WHERE id = p_member_id;

  IF v_staff_user_id IS NOT NULL THEN
    PERFORM public.purge_staff_auth_user(v_staff_user_id, v_company_id);
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.release_staff_email_for_reinvite(p_company_id text, p_member_id uuid, p_email text)
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
$function$
;

-- ACLs de prod (proacl 2026-10-06):
--   purge_staff_auth_user            {postgres=X/postgres,service_role=X/postgres}
--   delete_staff_collaborator        {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   release_staff_email_for_reinvite {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
REVOKE ALL ON FUNCTION public.purge_staff_auth_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_staff_auth_user(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.delete_staff_collaborator(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_staff_collaborator(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.delete_staff_collaborator(uuid) IS
  'Soft-delete do profissional (não dono) e remove a conta Auth do colaborador para reutilizar o e-mail.';
COMMENT ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) IS
  'Libera e-mail de colaborador órfão (já excluído da equipe) para um convite válido. Não apaga dono nem staff ativo.';
