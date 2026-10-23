BEGIN;
SET LOCAL lock_timeout = '5s';

DROP FUNCTION IF EXISTS public.set_stripe_customer_id_for_user(uuid, text);
REVOKE ALL ON FUNCTION public.set_stripe_customer_id_for_caller(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_stripe_customer_id_for_caller(text) TO authenticated, service_role;

COMMIT;
