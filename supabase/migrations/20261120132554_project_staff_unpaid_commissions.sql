BEGIN;

CREATE FUNCTION public.get_my_unpaid_commissions_v1(p_professional_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_company text := public.get_auth_company_id();
BEGIN
  IF v_caller IS NULL OR v_company IS NULL OR public.get_auth_role() IS DISTINCT FROM 'staff'
    OR NOT EXISTS (
      SELECT 1 FROM public.team_members t
      WHERE t.id = p_professional_id AND t.user_id::text = v_company AND t.staff_user_id = v_caller
        AND t.deleted_at IS NULL
    ) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT COALESCE(sum(f.commission_value), 0)
    FROM public.finance_records f
    WHERE f.user_id::text = v_company AND f.professional_id = p_professional_id
      AND f.type = 'revenue' AND f.commission_paid IS FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_unpaid_commissions_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_unpaid_commissions_v1(uuid) TO authenticated;

COMMIT;
