-- Recadastro de colaborador após exclusão lógica + convite que não trava.
--
-- 1) UNIQUE global em slug impedia criar de novo o mesmo profissional
--    (soft delete mantinha a linha e o slug).
-- 2) get_team_member_for_invite exigia JOIN interno em profiles e active=true
--    sem considerar deleted_at.
-- 3) Staff não consegue UPDATE em team_members (RLS é user_id = auth.uid()),
--    então o vínculo do convite precisa de RPC SECURITY DEFINER.

ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_slug_key;
DROP INDEX IF EXISTS public.team_members_slug_key;

CREATE UNIQUE INDEX IF NOT EXISTS team_members_slug_active_key
  ON public.team_members (slug)
  WHERE deleted_at IS NULL
    AND slug IS NOT NULL
    AND btrim(slug) <> '';

CREATE OR REPLACE FUNCTION public.get_company_for_invite(p_company_id text)
RETURNS TABLE (
  user_type text,
  business_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.user_type, p.business_name
  FROM public.profiles p
  WHERE p.id = p_company_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_company_for_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_for_invite(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_team_member_for_invite(
  p_company_id text,
  p_member_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  role text,
  staff_user_id uuid,
  business_name text,
  user_type text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    tm.id,
    tm.name,
    tm.role,
    tm.staff_user_id,
    p.business_name,
    p.user_type
  FROM public.team_members tm
  LEFT JOIN public.profiles p ON p.id = tm.user_id
  WHERE tm.id = p_member_id
    AND tm.user_id = p_company_id
    AND COALESCE(tm.active, true) = true
    AND tm.deleted_at IS NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_team_member_for_invite(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_member_for_invite(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_staff_invite(
  p_company_id text,
  p_member_id uuid
)
RETURNS TABLE (
  id uuid,
  name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida para aceitar o convite.';
  END IF;

  RETURN QUERY
  SELECT tm.id, tm.name
  FROM public.team_members tm
  WHERE tm.id = p_member_id
    AND tm.user_id = p_company_id
    AND tm.deleted_at IS NULL
    AND COALESCE(tm.active, true) = true
    AND tm.staff_user_id = v_uid
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.team_members tm
  SET
    staff_user_id = v_uid,
    updated_at = NOW()
  WHERE tm.id = p_member_id
    AND tm.user_id = p_company_id
    AND tm.deleted_at IS NULL
    AND COALESCE(tm.active, true) = true
    AND tm.staff_user_id IS NULL
  RETURNING tm.id, tm.name;

  IF NOT FOUND THEN
    IF EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.id = p_member_id
        AND tm.user_id = p_company_id
        AND tm.staff_user_id IS NOT NULL
        AND tm.staff_user_id <> v_uid
    ) THEN
      RAISE EXCEPTION 'Este convite já foi utilizado.';
    END IF;

    RAISE EXCEPTION 'Convite inválido ou profissional não encontrado.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_staff_invite(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_staff_invite(text, uuid) TO authenticated;

COMMENT ON FUNCTION public.get_company_for_invite(text) IS
  'Retorna dados públicos da empresa para cadastro via convite (sem auth).';
COMMENT ON FUNCTION public.get_team_member_for_invite(text, uuid) IS
  'Retorna dados públicos do profissional ativo para a tela de cadastro via convite (sem auth).';
COMMENT ON FUNCTION public.accept_staff_invite(text, uuid) IS
  'Vincula o usuário autenticado ao profissional do convite, ignorando RLS do dono.';
