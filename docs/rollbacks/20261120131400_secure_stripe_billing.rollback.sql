BEGIN;

DROP FUNCTION public.apply_stripe_billing_event(text, text, boolean, timestamptz, text, text, jsonb);
GRANT EXECUTE ON FUNCTION public.set_stripe_customer_id_for_caller(text) TO authenticated;

COMMIT;
