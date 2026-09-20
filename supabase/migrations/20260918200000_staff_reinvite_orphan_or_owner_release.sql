-- P0: reconvite dirty após #78.
-- release_staff_email_for_reinvite ficou owner-only (auth.uid() = company_id).
-- O cadastro dirty chama a RPC autenticado como o staff órfão (signIn + claim
-- falhou) → released nunca true → sem signUp retry.
--
-- Authz novo (authenticated only; anon continua sem EXECUTE):
--   1. dono da casa: auth.uid()::text = p_company_id
--   2. órfão com prova: e-mail da sessão = p_email, convite unbound válido,
--      conta Auth ocupante é a do caller e não está ligada a member ativo
-- purge_staff_auth_user continua sem EXECUTE para anon/authenticated.
-- Auto-purge do órfão só via GUC setada por esta RPC (não reabre self-delete).

CREATE OR REPLACE FUNCTION public.release_staff_email_for_reinvite(
  p_company_id text,
  p_member_id uuid,
  p_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Órfão só libera a própria conta; dono pode purgar o ocupante do e-mail.
  IF v_is_orphan_claimant AND v_auth_id IS DISTINCT FROM v_uid THEN
    RETURN false;
  END IF;

  PERFORM set_config('agendix.allow_orphan_reinvite_purge', 'on', true);
  PERFORM public.purge_staff_auth_user(v_auth_id, p_company_id);

  RETURN NOT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(btrim(p_email))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_staff_auth_user(
  p_staff_user_id uuid,
  p_company_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_company_id text;
  v_purged_email text;
BEGIN
  IF p_staff_user_id IS NULL OR p_company_id IS NULL OR btrim(p_company_id) = '' THEN
    RETURN;
  END IF;

  -- Nunca apaga o dono da casa alvo do convite.
  IF p_staff_user_id::text = p_company_id THEN
    RETURN;
  END IF;

  -- Bloqueia auto-purge, exceto quando release_staff_email_for_reinvite
  -- já validou convite + e-mail (GUC local à transação).
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
$$;

REVOKE ALL ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.purge_staff_auth_user(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_staff_collaborator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_staff_collaborator(uuid) TO authenticated;

COMMENT ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) IS
  'Libera e-mail de colaborador órfão para convite unbound. Caller: dono (uid=company_id) ou órfão autenticado cujo e-mail prova o convite. Anon não executa.';

COMMENT ON FUNCTION public.purge_staff_auth_user(uuid, text) IS
  'Remove conta Auth de staff órfão. Sem EXECUTE para anon/authenticated; só via DEFINER (delete/release). Auto-purge exige GUC de reconvite.';
