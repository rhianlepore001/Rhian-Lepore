-- Cadastro de colaborador: o UPDATE em team_members é bloqueado por RLS
-- (só o dono pode gerenciar). A conta Auth era criada e o vínculo falhava
-- em silêncio — Agenda órfã + loading preso no signUp.

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

REVOKE ALL ON FUNCTION public.complete_staff_invite(text, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_staff_invite(text, uuid, date) TO authenticated;

COMMENT ON FUNCTION public.complete_staff_invite(text, uuid, date) IS
  'Colaborador autenticado assume o convite: vira staff da casa e vincula team_members.staff_user_id.';

CREATE OR REPLACE FUNCTION public.relink_staff_if_unbound()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_company_id text;
  v_name text;
  v_role text;
  v_member_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role, company_id, full_name
    INTO v_role, v_company_id, v_name
  FROM public.profiles
  WHERE id = v_uid::text;

  IF v_role IS DISTINCT FROM 'staff' OR v_company_id IS NULL OR btrim(COALESCE(v_name, '')) = '' THEN
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

  SELECT tm.id INTO v_member_id
  FROM public.team_members tm
  WHERE tm.user_id::text = v_company_id
    AND COALESCE(tm.is_owner, false) = false
    AND tm.deleted_at IS NULL
    AND tm.active = true
    AND tm.staff_user_id IS NULL
    AND lower(btrim(tm.name)) = lower(btrim(v_name))
  LIMIT 2;

  IF v_member_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF (
    SELECT count(*) FROM public.team_members tm
    WHERE tm.user_id::text = v_company_id
      AND COALESCE(tm.is_owner, false) = false
      AND tm.deleted_at IS NULL
      AND tm.active = true
      AND tm.staff_user_id IS NULL
      AND lower(btrim(tm.name)) = lower(btrim(v_name))
  ) <> 1 THEN
    RETURN NULL;
  END IF;

  UPDATE public.team_members
  SET staff_user_id = v_uid, updated_at = now()
  WHERE id = v_member_id
    AND staff_user_id IS NULL;

  RETURN v_member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.relink_staff_if_unbound() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.relink_staff_if_unbound() TO authenticated;

-- Trigger de signup: colaborador já nasce staff da casa (metadata do signUp).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_company_id text;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'owner');
  IF v_role NOT IN ('owner', 'staff') THEN
    v_role := 'owner';
  END IF;
  v_company_id := COALESCE(NULLIF(btrim(new.raw_user_meta_data->>'company_id'), ''), new.id::text);
  IF v_role = 'staff' AND v_company_id = new.id::text THEN
    v_role := 'owner';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    business_name,
    phone,
    user_type,
    region,
    business_slug,
    role,
    company_id
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
    v_company_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
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
$$;

