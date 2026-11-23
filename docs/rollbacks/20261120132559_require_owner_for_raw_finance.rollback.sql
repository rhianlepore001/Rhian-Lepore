BEGIN;
SET LOCAL lock_timeout = '5s';

DROP POLICY IF EXISTS finance_raw_owner_only ON public.finance_records;

COMMIT;
