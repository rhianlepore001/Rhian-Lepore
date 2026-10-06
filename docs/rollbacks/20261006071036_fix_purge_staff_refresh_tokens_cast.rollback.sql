-- Rollback de 20261006071036_fix_purge_staff_refresh_tokens_cast.
-- Restaura EXATAMENTE a definição de prod anterior (pg_get_functiondef em
-- 2026-10-06; md5(prosrc) = 0bcef78a023f3b03032af24119377b7c,
-- md5(pg_get_functiondef) = 89c06105ce3faaf49878c328d941753e).
-- ATENÇÃO: esta versão tem o bug #42883 (excluir profissional com login falha).
-- ACL esperado depois: {postgres=X/postgres,service_role=X/postgres}.

CREATE OR REPLACE FUNCTION public.purge_staff_auth_user(p_staff_user_id uuid, p_company_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_company_id text;
  v_purged_email text;
BEGIN
  IF p_staff_user_id IS NULL OR p_company_id IS NULL OR btrim(p_company_id) = '' THEN
    RETURN;
  END IF;

  IF p_staff_user_id::text = p_company_id THEN
    RETURN;
  END IF;

  IF auth.uid() IS NOT NULL
     AND p_staff_user_id = auth.uid()
     AND lower(COALESCE(current_setting('agendix.allow_orphan_reinvite_purge', true), 'off'))
         IS DISTINCT FROM 'on' THEN
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
$function$
;

REVOKE ALL ON FUNCTION public.purge_staff_auth_user(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_staff_auth_user(uuid, text) TO service_role;
