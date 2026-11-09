-- Run BEFORE the hardening rollback. Restores the legacy product visibility for the team.
BEGIN;
DROP POLICY IF EXISTS chair_products_owner_only ON public.products;
COMMIT;
