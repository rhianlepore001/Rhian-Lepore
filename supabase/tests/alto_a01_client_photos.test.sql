-- A-01 proofs. [S]=security hole closed after mig; [F]=legit flows still work.
SET client_min_messages = warning;
CREATE TEMP TABLE a01_result (n serial, name text, ok boolean, detail text);
GRANT ALL ON a01_result TO PUBLIC;
GRANT ALL ON SEQUENCE a01_result_n_seq TO PUBLIC;

CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_exp text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO a01_result(name, ok, detail)
  VALUES (p_name, p_got IS NOT DISTINCT FROM p_exp,
          'got=' || COALESCE(p_got, 'NULL') || ' expected=' || COALESCE(p_exp, 'NULL'));
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.run_as(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), false);
  PERFORM set_config('request.jwt.claim.role', p_role, false);
  EXECUTE format('SET ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', false);
    RETURN COALESCE(v, 'ok');
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', false);
    RETURN 'error:' || SQLERRM;
  END;
END;
$$;

-- Seed objects as superuser (bypass RLS)
INSERT INTO storage.objects (bucket_id, name) VALUES
  ('client_photos', 'a0000000-0000-4000-8000-0000000000a0/crm1.jpg'),
  ('client_photos', 'b0000000-0000-4000-8000-0000000000b0/crm1.jpg'),
  ('client_photos', 'a0000000-0000-4000-8000-0000000000a0/public_111.jpg');

-- [S] owner A cannot INSERT into B's folder
SELECT pg_temp.check(
  'S A cannot insert into B folder',
  CASE WHEN pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a0',
    $$INSERT INTO storage.objects (bucket_id, name)
      VALUES ('client_photos','b0000000-0000-4000-8000-0000000000b0/hack.jpg')
      RETURNING 'ins'$$
  ) = 'ins' THEN 'leaked' ELSE 'blocked' END,
  'blocked'
);

-- [S] owner A cannot DELETE B's object
SELECT pg_temp.check(
  'S A cannot delete B object',
  CASE WHEN pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a0',
    $$DELETE FROM storage.objects
      WHERE bucket_id='client_photos' AND name='b0000000-0000-4000-8000-0000000000b0/crm1.jpg'
      RETURNING 'del'$$
  ) = 'del' THEN 'leaked' ELSE 'blocked' END,
  'blocked'
);

-- [S] owner A cannot UPDATE B's object name/path
SELECT pg_temp.check(
  'S A cannot update B object',
  CASE WHEN pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a0',
    $$UPDATE storage.objects SET name = name
      WHERE bucket_id='client_photos' AND name='b0000000-0000-4000-8000-0000000000b0/crm1.jpg'
      RETURNING 'upd'$$
  ) = 'upd' THEN 'leaked' ELSE 'blocked' END,
  'blocked'
);

-- [S] anon cannot INSERT
SELECT pg_temp.check(
  'S anon insert blocked',
  CASE WHEN pg_temp.run_as('anon', NULL,
    $$INSERT INTO storage.objects (bucket_id, name)
      VALUES ('client_photos','a0000000-0000-4000-8000-0000000000a0/anon.jpg')
      RETURNING 'ins'$$
  ) = 'ins' THEN 'leaked' ELSE 'blocked' END,
  'blocked'
);

-- [F] owner A can INSERT into own folder (CRM)
SELECT pg_temp.check(
  'F A insert own folder',
  CASE WHEN pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a0',
    $$INSERT INTO storage.objects (bucket_id, name)
      VALUES ('client_photos','a0000000-0000-4000-8000-0000000000a0/crm_new.jpg')
      RETURNING 'ins'$$
  ) = 'ins' THEN 'ok' ELSE 'fail' END,
  'ok'
);

-- [F] owner A can INSERT public_ under own folder (booking path)
SELECT pg_temp.check(
  'F A insert public_ under own folder',
  CASE WHEN pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a0',
    $$INSERT INTO storage.objects (bucket_id, name)
      VALUES ('client_photos','a0000000-0000-4000-8000-0000000000a0/public_999.jpg')
      RETURNING 'ins'$$
  ) = 'ins' THEN 'ok' ELSE 'fail' END,
  'ok'
);

-- [F] owner A can DELETE own object
SELECT pg_temp.check(
  'F A delete own object',
  CASE WHEN pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a0',
    $$DELETE FROM storage.objects
      WHERE bucket_id='client_photos' AND name='a0000000-0000-4000-8000-0000000000a0/crm1.jpg'
      RETURNING 'del'$$
  ) = 'del' THEN 'ok' ELSE 'fail' END,
  'ok'
);

-- [F] public SELECT still works (anon reads)
SELECT pg_temp.check(
  'F anon select public read',
  CASE WHEN pg_temp.run_as('anon', NULL,
    $$SELECT count(*)::text FROM storage.objects WHERE bucket_id='client_photos'$$
  ) ~ '^[0-9]+$' AND pg_temp.run_as('anon', NULL,
    $$SELECT count(*)::text FROM storage.objects WHERE bucket_id='client_photos'$$
  ) <> '0' THEN 'ok' ELSE 'fail' END,
  'ok'
);

DO $$
DECLARE
  bad int;
  msg text;
  total int;
BEGIN
  SELECT count(*) INTO bad FROM a01_result WHERE NOT ok;
  SELECT count(*) INTO total FROM a01_result;
  IF bad > 0 THEN
    SELECT string_agg(name || ' → ' || detail, ' | ' ORDER BY n) INTO msg
    FROM a01_result WHERE NOT ok;
    RAISE EXCEPTION 'alto_a01_client_photos: % checks falharam: %', bad, msg;
  END IF;
  -- WARNING so aparece com client_min_messages=warning
  RAISE WARNING 'alto_a01_client_photos: %/% checks ok', total, total;
END $$;
