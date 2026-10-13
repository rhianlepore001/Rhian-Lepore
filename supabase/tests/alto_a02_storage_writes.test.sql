SET client_min_messages = warning;
CREATE TEMP TABLE a02_result (n serial, name text, ok boolean, detail text);
GRANT ALL ON a02_result TO PUBLIC;
GRANT ALL ON SEQUENCE a02_result_n_seq TO PUBLIC;

CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_exp text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO a02_result(name, ok, detail)
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

INSERT INTO storage.objects (bucket_id, name) VALUES
  ('logos', 'b0000000-0000-4000-8000-0000000000b0/logo.png'),
  ('team_photos', 'b0000000-0000-4000-8000-0000000000b0/t.jpg'),
  ('marketing_images', 'any/m.png');

-- [S] A cannot delete B logo via broad delete
SELECT pg_temp.check(
  'S A cannot delete B logo',
  CASE WHEN pg_temp.run_as('authenticated','a0000000-0000-4000-8000-0000000000a0',
    $$DELETE FROM storage.objects WHERE bucket_id='logos' AND name='b0000000-0000-4000-8000-0000000000b0/logo.png' RETURNING 'del'$$
  ) = 'del' THEN 'leaked' ELSE 'blocked' END,
  'blocked'
);

-- [S] A cannot upload marketing
SELECT pg_temp.check(
  'S A cannot upload marketing',
  CASE WHEN pg_temp.run_as('authenticated','a0000000-0000-4000-8000-0000000000a0',
    $$INSERT INTO storage.objects(bucket_id,name) VALUES ('marketing_images','hack.png') RETURNING 'ins'$$
  ) = 'ins' THEN 'leaked' ELSE 'blocked' END,
  'blocked'
);

-- [S] A cannot delete marketing
SELECT pg_temp.check(
  'S A cannot delete marketing',
  CASE WHEN pg_temp.run_as('authenticated','a0000000-0000-4000-8000-0000000000a0',
    $$DELETE FROM storage.objects WHERE bucket_id='marketing_images' AND name='any/m.png' RETURNING 'del'$$
  ) = 'del' THEN 'leaked' ELSE 'blocked' END,
  'blocked'
);

-- [F] A can upload own logo
SELECT pg_temp.check(
  'F A upload own logo',
  CASE WHEN pg_temp.run_as('authenticated','a0000000-0000-4000-8000-0000000000a0',
    $$INSERT INTO storage.objects(bucket_id,name) VALUES ('logos','a0000000-0000-4000-8000-0000000000a0/logo.png') RETURNING 'ins'$$
  ) = 'ins' THEN 'ok' ELSE 'fail' END,
  'ok'
);

-- [F] A can delete own logo
SELECT pg_temp.check(
  'F A delete own logo',
  CASE WHEN pg_temp.run_as('authenticated','a0000000-0000-4000-8000-0000000000a0',
    $$DELETE FROM storage.objects WHERE bucket_id='logos' AND name='a0000000-0000-4000-8000-0000000000a0/logo.png' RETURNING 'del'$$
  ) = 'del' THEN 'ok' ELSE 'fail' END,
  'ok'
);

-- [F] A can manage own team photo
SELECT pg_temp.check(
  'F A team photo own folder',
  CASE WHEN pg_temp.run_as('authenticated','a0000000-0000-4000-8000-0000000000a0',
    $$INSERT INTO storage.objects(bucket_id,name) VALUES ('team_photos','a0000000-0000-4000-8000-0000000000a0/t.jpg') RETURNING 'ins'$$
  ) = 'ins' THEN 'ok' ELSE 'fail' END,
  'ok'
);

-- [F] public read marketing still works
SELECT pg_temp.check(
  'F anon read marketing',
  CASE WHEN pg_temp.run_as('anon', NULL,
    $$SELECT count(*)::text FROM storage.objects WHERE bucket_id='marketing_images'$$
  ) = '1' THEN 'ok' ELSE 'fail' END,
  'ok'
);

DO $$
DECLARE fail int; total int;
BEGIN
  SELECT count(*) FILTER (WHERE NOT ok), count(*) INTO fail, total FROM a02_result;
  RAISE WARNING 'alto_a02_storage_writes: %/% checks ok', total - fail, total;
  IF fail > 0 THEN
    RAISE EXCEPTION 'alto_a02_storage_writes: % checks falharam: %', fail,
      (SELECT string_agg(name || ' → ' || detail, ' | ') FROM a02_result WHERE NOT ok);
  END IF;
END $$;
