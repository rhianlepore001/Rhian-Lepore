\ir ../tests/local-only.sql
INSERT INTO profiles (id, role, company_id) VALUES
 ('a0000000-0000-4000-8000-0000000000a0', 'owner', 'a0000000-0000-4000-8000-0000000000a0'),
 ('a0000000-0000-4000-8000-0000000000a1', 'staff', 'a0000000-0000-4000-8000-0000000000a0'),
 ('b0000000-0000-4000-8000-0000000000b0', 'owner', 'b0000000-0000-4000-8000-0000000000b0');
INSERT INTO team_members(user_id,name,staff_user_id,active) VALUES
 ('a0000000-0000-4000-8000-0000000000a0','Fictional inactive staff','a0000000-0000-4000-8000-0000000000a1',false);
INSERT INTO public_clients(business_id,name,phone,email) VALUES
 ('b0000000-0000-4000-8000-0000000000b0','Fictional client B','+55 11 98888-4321','fictional-client@example.invalid'),
 ('a0000000-0000-4000-8000-0000000000a0','Fictional client A','+55 11 97777-1234','fictional-a@example.invalid');

SET ROLE anon;
SET request.jwt.claim.role = 'anon';
SET request.jwt.claim.sub = '';
DO $$
DECLARE observed text;
BEGIN
  SELECT email INTO observed FROM get_public_client_by_phone('b0000000-0000-4000-8000-0000000000b0', '988884321');
  IF observed IS DISTINCT FROM 'fictional-client@example.invalid' THEN
    RAISE EXCEPTION 'PRIVACY_PROBE_NOT_REPRODUCED';
  END IF;
  SELECT name INTO observed FROM upsert_public_client('b0000000-0000-4000-8000-0000000000b0', 'Changed by fictional visitor', '988884321', NULL, NULL);
  IF observed IS DISTINCT FROM 'Changed by fictional visitor' THEN
    RAISE EXCEPTION 'PUBLIC_CLIENT_WRITE_NOT_REPRODUCED';
  END IF;
  RAISE WARNING 'CONFIRMED OPEN: visitor reads PII and changes another client using phone suffix, without possession proof';
END $$;
RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claim.role = 'authenticated';
SET request.jwt.claim.sub = 'a0000000-0000-4000-8000-0000000000a1';
DO $$
BEGIN
  IF (SELECT count(*) FROM public_clients WHERE business_id='a0000000-0000-4000-8000-0000000000a0') <> 1 THEN
    RAISE EXCEPTION 'INACTIVE_STAFF_PROBE_NOT_REPRODUCED';
  END IF;
  RAISE WARNING 'CONFIRMED OPEN: inactive staff retains tenant client SELECT with previously issued identity';
END $$;
RESET ROLE;
