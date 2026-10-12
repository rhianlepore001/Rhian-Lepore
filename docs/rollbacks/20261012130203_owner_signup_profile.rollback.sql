-- =============================================================================
-- ROLLBACK de 20261012130203_owner_signup_profile
-- Volta check_email_confirmed ao corpo de prod de 2026-10-12 (md5 c9d96374bdc8f8b0552d779fe1dbc94a,
-- ACL {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}) e remove
-- ensure_owner_profile(). Perfis/business_settings criados enquanto a migração esteve no ar
-- NÃO são apagados (são dados de clientes). ATENÇÃO: depois do rollback o cadastro de dono
-- volta a deixar contas órfãs (bug original).
-- =============================================================================

DROP FUNCTION IF EXISTS public.ensure_owner_profile();

CREATE OR REPLACE FUNCTION public.check_email_confirmed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Cast TEXT id to UUID for comparison with auth.users
    IF (SELECT email_confirmed_at FROM auth.users WHERE id = NEW.id::uuid) IS NULL THEN
        RAISE EXCEPTION 'Email not confirmed. Please check your inbox.';
    END IF;
    RETURN NEW;
END;
$function$
;
