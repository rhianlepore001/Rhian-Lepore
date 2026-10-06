-- Corrige exclusão de profissional COM login (toast "#42883").
--
-- Causa: auth.refresh_tokens.user_id é character varying (não uuid) no Auth do
-- Supabase. purge_staff_auth_user fazia `user_id = p_staff_user_id` (varchar = uuid)
-- -> 42883 "operator does not exist: character varying = uuid":
--   - no bloco principal o erro era engolido pelo EXCEPTION WHEN OTHERS;
--   - no handler (desde 20260918150000 / #78) o mesmo DELETE não tem proteção ->
--     a RPC delete_staff_collaborator inteira falhava.
-- Correção: comparar como texto (`user_id = p_staff_user_id::text`) nos 2 lugares.
--
-- Também: notify_booking_recipients (20261004112214, PR-7) grava notificações com
-- user_id = staff_user_id do profissional. notifications.user_id -> profiles(id) é
-- NO ACTION no delete, então o DELETE do profile do staff falharia (23503). Antes
-- de apagar o profile do staff, apaga só as notificações endereçadas a ele
-- (as do dono ficam intactas; nenhum dado de negócio é tocado).
--
-- Corpo idêntico ao de prod (pg_get_functiondef em 2026-10-06, md5(prosrc)
-- 0bcef78a023f3b03032af24119377b7c) exceto essas 3 linhas. SECURITY DEFINER,
-- search_path, dono e ACL preservados (CREATE OR REPLACE mantém dono/ACL; o
-- REVOKE/GRANT abaixo só reafirma o ACL atual de prod:
-- {postgres=X/postgres,service_role=X/postgres}).
-- Rollback: docs/rollbacks/20261006075444_fix_purge_staff_refresh_tokens_cast.rollback.sql

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

  DELETE FROM public.notifications
  WHERE user_id = p_staff_user_id::text;

  DELETE FROM public.profiles
  WHERE id = p_staff_user_id::text
    AND role = 'staff';

  v_purged_email := 'deleted-' || p_staff_user_id::text || '@purged.invalid';

  BEGIN
    DELETE FROM auth.identities WHERE user_id = p_staff_user_id;
    DELETE FROM auth.sessions WHERE user_id = p_staff_user_id;
    DELETE FROM auth.refresh_tokens WHERE user_id = p_staff_user_id::text;
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
    DELETE FROM auth.refresh_tokens WHERE user_id = p_staff_user_id::text;
  END;
END;
$function$
;

REVOKE ALL ON FUNCTION public.purge_staff_auth_user(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_staff_auth_user(uuid, text) TO service_role;
