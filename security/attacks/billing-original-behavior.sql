\ir ../tests/local-only.sql
BEGIN;
INSERT INTO profiles(id,role,company_id) VALUES
 ('b0000000-0000-4000-8000-0000000000b0','owner','b0000000-0000-4000-8000-0000000000b0');
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL request.jwt.claim.sub = 'b0000000-0000-4000-8000-0000000000b0';
SELECT public.set_stripe_customer_id_for_caller('cus_ArbitraryFixture');
DO $$
BEGIN
  IF (SELECT stripe_customer_id FROM profiles WHERE id=auth.uid()::text) IS DISTINCT FROM 'cus_ArbitraryFixture' THEN
    RAISE EXCEPTION 'ORIGINAL_CUSTOMER_BINDING_NOT_REPRODUCED';
  END IF;
  RAISE WARNING 'CONFIRMED ORIGINAL BEHAVIOR: authenticated caller binds arbitrary customer via RPC';
END $$;
ROLLBACK;
