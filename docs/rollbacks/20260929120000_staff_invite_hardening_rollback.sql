-- Rollback de 20260929120000_staff_invite_hardening.sql
-- Volta EXATAMENTE às definições e ACLs lidas em prod em 29/09/2026
-- (pg_get_functiondef / proacl, leitura apenas) e, para o relink, à versão do
-- #105 (20260929090000_ex_staff_access.sql). Depois remove staff_invites.
-- md5(pg_get_functiondef) esperado depois do rollback (conferido no fim, dentro
-- da transação; se algo divergir, nada é aplicado):
--   complete_staff_invite(text,uuid,date)            a5809f9a449e6acdf373538ee31bd27c
--   accept_staff_invite(text,uuid)                   1d4a305c3109970f0e004e26fa8ad025
--   get_team_member_for_invite(text,uuid)            344eaa113c0f5cdc29c763a5ac926c8c
--   handle_new_user()                                75b03967cb6677fe891bf1d784572f30
--   release_staff_email_for_reinvite(text,uuid,text) b06c5aa6c727be241fb73372ebd4635d
--   relink_staff_if_unbound()  (versão do #105)      c64e25092ddda0841c28c1dee441d617
--
-- ORDEM DO ROLLBACK (obrigatória):
--   1. ESTE arquivo (#108, 20260929120000_staff_invite_hardening_rollback.sql).
--   2. Só depois, se o #105 também for revertido:
--      20260929090000_ex_staff_access_rollback.sql (relink -> dc16b8a4...).
-- Nunca o inverso: o rollback do #105 primeiro devolveria o relink de prod (sem
-- token) com o convite do #108 ainda ativo, e este arquivo, rodado depois,
-- reinstalaria o relink do #105 (desfazendo o rollback do #105).
-- Sem mudança em team_members/profiles: o rollback é imediato. Os tokens
-- emitidos se perdem (os links voltam ao formato antigo).

BEGIN;
SET LOCAL lock_timeout = '5s';

DROP FUNCTION IF EXISTS public.get_or_create_staff_invite(uuid);
DROP FUNCTION IF EXISTS public.rotate_staff_invite(uuid);

-- complete_staff_invite (prod, 3 args)
DROP FUNCTION IF EXISTS public.complete_staff_invite(text, uuid, date, text);
CREATE OR REPLACE FUNCTION public.complete_staff_invite(p_company_id text, p_member_id uuid, p_birth_date date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.complete_staff_invite(text, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_staff_invite(text, uuid, date) TO authenticated, service_role;

-- get_team_member_for_invite (prod, 2 args; anon executa)
DROP FUNCTION IF EXISTS public.get_team_member_for_invite(text, uuid, text);
CREATE OR REPLACE FUNCTION public.get_team_member_for_invite(p_company_id text, p_member_id uuid)
 RETURNS TABLE(id uuid, name text, role text, staff_user_id uuid, business_name text, user_type text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.get_team_member_for_invite(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_member_for_invite(text, uuid) TO anon, authenticated, service_role;

-- release_staff_email_for_reinvite (prod, 3 args)
DROP FUNCTION IF EXISTS public.release_staff_email_for_reinvite(text, uuid, text, text);
CREATE OR REPLACE FUNCTION public.release_staff_email_for_reinvite(p_company_id text, p_member_id uuid, p_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF v_is_orphan_claimant AND v_auth_id IS DISTINCT FROM v_uid THEN
    RETURN false;
  END IF;

  PERFORM set_config('agendix.allow_orphan_reinvite_purge', 'on', true);
  PERFORM public.purge_staff_auth_user(v_auth_id, p_company_id);

  RETURN NOT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(btrim(p_email))
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_staff_email_for_reinvite(text, uuid, text) TO authenticated, service_role;

-- handle_new_user (prod)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    id, email, full_name, business_name, phone, user_type, region, business_slug, role, company_id, subscription_status, trial_ends_at
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
$function$;

-- relink_staff_if_unbound (versão do #105)
CREATE OR REPLACE FUNCTION public.relink_staff_if_unbound()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_company_id text;
  v_role text;
  v_member_id uuid;
  v_meta_member text;
  v_user_created timestamptz;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role, company_id
    INTO v_role, v_company_id
  FROM public.profiles
  WHERE id = v_uid::text;

  IF v_role IS DISTINCT FROM 'staff' OR btrim(COALESCE(v_company_id, '')) = '' THEN
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

  SELECT u.raw_user_meta_data ->> 'member_id', u.created_at
    INTO v_meta_member, v_user_created
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_user_created IS NULL OR v_user_created < now() - interval '24 hours' THEN
    RETURN NULL;
  END IF;

  IF v_meta_member IS NULL
     OR v_meta_member !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  UPDATE public.team_members tm
  SET staff_user_id = v_uid, updated_at = now()
  WHERE tm.id = v_meta_member::uuid
    AND tm.user_id::text = v_company_id
    AND COALESCE(tm.is_owner, false) = false
    AND tm.deleted_at IS NULL
    AND tm.active = true
    AND tm.staff_user_id IS NULL
  RETURNING tm.id INTO v_member_id;

  RETURN v_member_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.relink_staff_if_unbound() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relink_staff_if_unbound() TO authenticated, service_role;

-- accept_staff_invite (prod: definição e ACL authenticated + service_role)
CREATE OR REPLACE FUNCTION public.accept_staff_invite(p_company_id text, p_member_id uuid)
 RETURNS TABLE(id uuid, name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.accept_staff_invite(text, uuid) FROM PUBLIC, anon, authenticated, service_role; -- ordem da ACL igual à de prod
GRANT EXECUTE ON FUNCTION public.accept_staff_invite(text, uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.staff_invite_token_is_valid(uuid, text, text);
DROP TABLE IF EXISTS public.staff_invites;

-- Conferência: md5 e ACL. Qualquer divergência aborta a transação inteira.
DO $check$
DECLARE
  r record;
  v_bad text := '';
BEGIN
  FOR r IN
    SELECT e.sig, e.md5 AS want, md5(pg_get_functiondef(to_regprocedure(e.sig))) AS got,
           (SELECT string_agg(a.grantee::regrole::text, ',' ORDER BY a.grantee::regrole::text)
              FROM aclexplode((SELECT proacl FROM pg_proc WHERE oid = to_regprocedure(e.sig))) a
             WHERE a.privilege_type = 'EXECUTE' AND a.grantee <> 0) AS acl_got,
           EXISTS (SELECT 1 FROM aclexplode((SELECT proacl FROM pg_proc WHERE oid = to_regprocedure(e.sig))) a
                    WHERE a.grantee = 0) AS has_public,
           e.acl AS acl_want
    FROM (VALUES
      ('public.complete_staff_invite(text,uuid,date)', 'a5809f9a449e6acdf373538ee31bd27c', 'authenticated,postgres,service_role'),
      ('public.accept_staff_invite(text,uuid)', '1d4a305c3109970f0e004e26fa8ad025', 'authenticated,postgres,service_role'),
      ('public.get_team_member_for_invite(text,uuid)', '344eaa113c0f5cdc29c763a5ac926c8c', 'anon,authenticated,postgres,service_role'),
      ('public.handle_new_user()', '75b03967cb6677fe891bf1d784572f30', 'authenticated,postgres,service_role'),
      ('public.release_staff_email_for_reinvite(text,uuid,text)', 'b06c5aa6c727be241fb73372ebd4635d', 'authenticated,postgres,service_role'),
      ('public.relink_staff_if_unbound()', 'c64e25092ddda0841c28c1dee441d617', 'authenticated,postgres,service_role')
    ) AS e(sig, md5, acl)
  LOOP
    IF r.got IS DISTINCT FROM r.want THEN
      v_bad := v_bad || format(' %s md5=%s (esperado %s);', r.sig, r.got, r.want);
    END IF;
    IF r.acl_got IS DISTINCT FROM r.acl_want OR r.has_public THEN
      v_bad := v_bad || format(' %s acl=%s public=%s (esperado %s);', r.sig, r.acl_got, r.has_public, r.acl_want);
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('complete_staff_invite', 'get_team_member_for_invite', 'release_staff_email_for_reinvite')) <> 3 THEN
    v_bad := v_bad || ' sobrou mais de uma versão de alguma função;';
  END IF;
  IF v_bad <> '' THEN
    RAISE EXCEPTION 'rollback 20260929120000 divergente:%', v_bad;
  END IF;
  RAISE NOTICE 'rollback 20260929120000: md5 e ACL das 6 funções conferem';
END
$check$;

NOTIFY pgrst, 'reload schema';

COMMIT;
