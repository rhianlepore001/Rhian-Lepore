-- Reconvite: não deixa dono de outra casa assumir convite de colaborador.

CREATE OR REPLACE FUNCTION public.complete_staff_invite(
  p_company_id text,
  p_member_id uuid,
  p_birth_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_member public.team_members%ROWTYPE;
  v_owner_ok boolean;
  v_is_tenant_owner boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_company_id IS NULL OR btrim(p_company_id) = '' OR p_member_id IS NULL THEN
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

  RETURN p_member_id;
END;
$$;
