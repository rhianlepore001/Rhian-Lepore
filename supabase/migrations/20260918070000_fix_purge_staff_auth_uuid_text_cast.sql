-- Hotfix: purge_staff_auth_user comparava profiles.id (TEXT) com uuid.
-- Produção: operator does not exist: text = uuid (#42883) ao excluir colaborador.
-- A 20260918000001 já rodou no remoto; esta migration aplica o CREATE OR REPLACE.

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
  WHERE id = p_staff_user_id::text;

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
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_staff_auth_user(uuid, text) FROM PUBLIC;
