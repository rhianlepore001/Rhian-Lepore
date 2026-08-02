-- Convite por profissional + data de nascimento no perfil do colaborador.
-- Link passa a carregar member_id para travar o nome configurado pelo gestor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE;

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
  JOIN public.profiles p ON p.id = tm.user_id
  WHERE tm.id = p_member_id
    AND tm.user_id = p_company_id
    AND tm.active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_team_member_for_invite(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_member_for_invite(text, uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_team_member_for_invite(text, uuid) IS
  'Retorna dados públicos do profissional para a tela de cadastro via convite (sem auth).';
