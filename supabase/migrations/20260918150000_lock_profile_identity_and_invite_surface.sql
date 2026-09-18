-- CRITICAL: impede staff/owner spoof via profiles + convite sem slot válido + listing público.
-- Produção (BARBER/Beauty OS) confirmou:
--   - policy "Users can manage their own profile" FOR ALL (id = auth.uid())
--   - handle_new_user copia role/company_id do user_metadata
--   - "Public can view active team members" USING (active = true) ainda ativa
--   - EXECUTE de complete/delete/relink concedido a anon (REVOKE FROM PUBLIC não tira grant direto)

CREATE OR REPLACE FUNCTION public.protect_profile_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       NEW.id IS DISTINCT FROM OLD.id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
     )
     AND lower(COALESCE(current_setting('agendix.allow_profile_identity', true), 'off'))
         IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'PROFILE_IDENTITY_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_identity ON public.profiles;
CREATE TRIGGER protect_profile_identity
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_identity();

DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Profiles: users cant insert" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: users can't insert" ON public.profiles;
CREATE POLICY "Profiles: users cant insert"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Profiles: users cant delete" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: users can't delete" ON public.profiles;
CREATE POLICY "Profiles: users cant delete"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, DELETE ON TABLE public.profiles FROM anon, authenticated, PUBLIC;

-- Convite: listing público de profissionais vazava company_id + member_id (link de convite).
DROP POLICY IF EXISTS "Public can view active team members" ON public.team_members;
DROP POLICY IF EXISTS "Public can view team members" ON public.team_members;

DROP POLICY IF EXISTS "Tenant can view team members" ON public.team_members;
CREATE POLICY "Tenant can view team members"
  ON public.team_members
  FOR SELECT
  TO authenticated
  USING (user_id = get_auth_company_id());

DROP POLICY IF EXISTS "Staff can register self in team_members" ON public.team_members;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_company_id text;
  v_member_id uuid;
  v_invite_ok boolean;
BEGIN
  PERFORM set_config('agendix.allow_profile_identity', 'on', true);

  v_role := COALESCE(new.raw_user_meta_data->>'role', 'owner');
  IF v_role NOT IN ('owner', 'staff') THEN
    v_role := 'owner';
  END IF;

  v_company_id := COALESCE(NULLIF(btrim(new.raw_user_meta_data->>'company_id'), ''), new.id::text);

  BEGIN
    v_member_id := NULLIF(btrim(COALESCE(new.raw_user_meta_data->>'member_id', '')), '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_member_id := NULL;
  END;

  IF v_role = 'staff' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.id = v_member_id
        AND tm.user_id::text = v_company_id
        AND COALESCE(tm.is_owner, false) = false
        AND tm.deleted_at IS NULL
        AND tm.active = true
        AND tm.staff_user_id IS NULL
    ) INTO v_invite_ok;

    IF v_member_id IS NULL OR v_company_id = new.id::text OR NOT COALESCE(v_invite_ok, false) THEN
      v_role := 'owner';
      v_company_id := new.id::text;
    END IF;
  ELSE
    v_company_id := new.id::text;
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
    company_id,
    subscription_status,
    trial_ends_at
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
    v_company_id,
    'trial',
    now() + interval '20 days'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
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
  PERFORM set_config('agendix.allow_profile_identity', 'on', true);

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
  IF auth.uid() IS NULL OR auth.uid()::text IS DISTINCT FROM p_company_id THEN
    RETURN false;
  END IF;

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
    AND tm.user_id::text = p_company_id
    AND COALESCE(tm.is_owner, false) = false
    AND COALESCE(tm.active, true) = true
    AND tm.deleted_at IS NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_staff_auth_user(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_staff_collaborator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_staff_collaborator(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.complete_staff_invite(text, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_staff_invite(text, uuid, date) TO authenticated;
REVOKE ALL ON FUNCTION public.relink_staff_if_unbound() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relink_staff_if_unbound() TO authenticated;
REVOKE ALL ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.get_team_member_for_invite(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_member_for_invite(text, uuid) TO anon, authenticated;
