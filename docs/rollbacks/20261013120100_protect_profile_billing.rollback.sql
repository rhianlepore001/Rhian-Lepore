-- ROLLBACK de 20261013120100_protect_profile_billing
-- Volta protect_profile_identity ao corpo de prod (md5 367809f7…); remove RPC nova;
-- re-concede UPDATE nas colunas de billing.

DROP FUNCTION IF EXISTS public.set_stripe_customer_id_for_caller(text);

CREATE OR REPLACE FUNCTION public.protect_profile_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

GRANT UPDATE (
  subscription_status,
  subscription_plan,
  trial_ends_at,
  stripe_customer_id
) ON TABLE public.profiles TO authenticated, anon;
