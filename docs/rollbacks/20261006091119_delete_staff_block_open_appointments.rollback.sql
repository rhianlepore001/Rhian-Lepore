-- Rollback de 20261006091119_delete_staff_block_open_appointments.
-- Restaura EXATAMENTE a delete_staff_collaborator de prod antes da migration
-- (pg_get_functiondef em 2026-10-06; md5(prosrc) 04f5421a5db7f934497b11f6e92e7abf).
-- Efeito: o servidor volta a permitir excluir profissional com atendimento em
-- aberto (a tela continua avisando, mas outro cliente pode pular). Não apaga nem
-- altera dados; CREATE OR REPLACE mantém dono, ACL, SECURITY DEFINER e search_path.

CREATE OR REPLACE FUNCTION public.delete_staff_collaborator(p_member_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staff_user_id uuid;
  v_company_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'OWNER_OR_MISSING_TEAM_MEMBER';
  END IF;

  SELECT staff_user_id, user_id::text
    INTO v_staff_user_id, v_company_id
  FROM public.team_members
  WHERE id = p_member_id
    AND user_id::text = auth.uid()::text
    AND COALESCE(is_owner, false) = false
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OWNER_OR_MISSING_TEAM_MEMBER';
  END IF;

  UPDATE public.team_members
  SET
    deleted_at = now(),
    active = false,
    staff_user_id = NULL,
    slug = CASE
      WHEN slug IS NULL OR btrim(slug) = '' THEN slug
      ELSE left(slug, 80) || '-del-' || replace(id::text, '-', '')
    END,
    updated_at = now()
  WHERE id = p_member_id;

  IF v_staff_user_id IS NOT NULL THEN
    PERFORM public.purge_staff_auth_user(v_staff_user_id, v_company_id);
  END IF;
END;
$function$;
