BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY finance_raw_owner_only ON public.finance_records
  AS RESTRICTIVE FOR SELECT
  USING (
    user_id::text = (SELECT public.get_auth_company_id())
    AND (SELECT public.get_auth_role()) = 'owner'
  );

COMMIT;
