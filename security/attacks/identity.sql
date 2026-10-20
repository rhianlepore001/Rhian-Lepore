\ir ../tests/local-only.sql
BEGIN;
INSERT INTO profiles(id,role,company_id) VALUES
 ('a0000000-0000-4000-8000-0000000000a0','owner','a0000000-0000-4000-8000-0000000000a0'),
 ('a0000000-0000-4000-8000-0000000000a1','staff','a0000000-0000-4000-8000-0000000000a0'),
 ('b0000000-0000-4000-8000-0000000000b0','owner','b0000000-0000-4000-8000-0000000000b0');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL request.jwt.claim.sub = 'a0000000-0000-4000-8000-0000000000a1';
DO $$
DECLARE statement text;
BEGIN
  FOREACH statement IN ARRAY ARRAY[
    $q$UPDATE profiles SET role='owner' WHERE id=auth.uid()::text$q$,
    $q$UPDATE profiles SET company_id='b0000000-0000-4000-8000-0000000000b0' WHERE id=auth.uid()::text$q$,
    $q$UPDATE profiles SET id='a0000000-0000-4000-8000-0000000000a2' WHERE id=auth.uid()::text$q$,
    $q$INSERT INTO profiles(id,role,company_id) VALUES(auth.uid()::text,'owner',auth.uid()::text)$q$,
    $q$INSERT INTO profiles(id,role,company_id) VALUES(auth.uid()::text,'owner',auth.uid()::text) ON CONFLICT(id) DO UPDATE SET role='owner'$q$,
    $q$DELETE FROM profiles WHERE id=auth.uid()::text$q$
  ] LOOP
    BEGIN
      EXECUTE statement;
      RAISE EXCEPTION 'UNAUTHORIZED_IDENTITY_CHANGE_SUCCEEDED';
    EXCEPTION
      WHEN insufficient_privilege THEN NULL;
      WHEN raise_exception THEN
        IF SQLERRM <> 'PROFILE_IDENTITY_IMMUTABLE' THEN RAISE; END IF;
    END;
  END LOOP;
  IF EXISTS(SELECT 1 FROM profiles WHERE id='b0000000-0000-4000-8000-0000000000b0') THEN
    RAISE EXCEPTION 'STAFF_CAN_READ_FOREIGN_PROFILE';
  END IF;
  UPDATE profiles SET business_name='Unauthorized foreign update' WHERE id='b0000000-0000-4000-8000-0000000000b0';
  IF FOUND THEN RAISE EXCEPTION 'STAFF_CAN_UPDATE_FOREIGN_PROFILE'; END IF;
END $$;

SET LOCAL request.jwt.claim.sub = 'b0000000-0000-4000-8000-0000000000b0';
DO $$
BEGIN
  UPDATE profiles SET business_name='Legitimate owner update' WHERE id=auth.uid()::text;
  IF NOT FOUND THEN RAISE EXCEPTION 'OWNER_UPDATE_REGRESSED'; END IF;
  RAISE NOTICE 'PASS identity: role, company, id, insert/upsert/delete, foreign profile and legitimate owner update';
END $$;
ROLLBACK;
