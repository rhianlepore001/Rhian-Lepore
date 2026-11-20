BEGIN;

CREATE FUNCTION public.get_team_roster_v1(p_company_id text, p_include_inactive boolean DEFAULT false)
RETURNS TABLE (id uuid, name text, photo_url text, staff_user_id uuid, active boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_role text := public.get_auth_role();
BEGIN
  IF v_caller IS NULL OR p_company_id IS NULL OR p_company_id IS DISTINCT FROM public.get_auth_company_id()
    OR COALESCE(v_role, '') NOT IN ('owner', 'staff') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF v_role = 'staff' AND NOT EXISTS (
    SELECT 1 FROM public.team_members t
    WHERE t.user_id::text = p_company_id AND t.staff_user_id = v_caller
      AND t.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT t.id, t.name::text, t.photo_url::text, t.staff_user_id, t.active
  FROM public.team_members t
  WHERE t.user_id::text = p_company_id
    AND (p_include_inactive IS TRUE OR (t.active IS TRUE AND t.deleted_at IS NULL))
  ORDER BY t.name, t.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_roster_v1(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_roster_v1(text, boolean) TO authenticated;

COMMIT;
