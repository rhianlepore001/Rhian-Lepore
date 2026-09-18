-- Excluir colaborador: soft-delete em team_members + remove a conta Auth
-- para o e-mail poder ser convocado de novo. Dono nunca é apagado.

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

  -- Nunca apaga o dono da casa nem a sessão de quem chama.
  IF p_staff_user_id::text = p_company_id
     OR (auth.uid() IS NOT NULL AND p_staff_user_id = auth.uid()) THEN
    RETURN;
  END IF;

  SELECT role::text, company_id::text
    INTO v_role, v_company_id
  FROM public.profiles
  WHERE id = p_staff_user_id;

  IF FOUND THEN
    IF v_role IS DISTINCT FROM 'staff' THEN
      RETURN;
    END IF;
    IF v_company_id IS DISTINCT FROM p_company_id THEN
      RETURN;
    END IF;
  END IF;

  -- Ainda vinculado a um profissional ativo? Não mexe na conta.
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
  WHERE id = p_staff_user_id
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
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_staff_auth_user(uuid, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.delete_staff_collaborator(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.delete_staff_collaborator(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_staff_collaborator(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_staff_collaborator(uuid) IS
  'Soft-delete do profissional (não dono) e remove a conta Auth do colaborador para reutilizar o e-mail.';

-- Convidar de novo o mesmo e-mail após exclusão antiga (órfãos em auth.users).
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
  v_invite_ok boolean;
  v_auth_id uuid;
BEGIN
  IF p_email IS NULL OR btrim(p_email) = '' OR p_company_id IS NULL OR btrim(p_company_id) = '' THEN
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

  PERFORM public.purge_staff_auth_user(v_auth_id, p_company_id);

  RETURN NOT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(btrim(p_email))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) TO anon, authenticated;

COMMENT ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) IS
  'Libera e-mail de colaborador órfão (já excluído da equipe) para um convite válido. Não apaga dono nem staff ativo.';
