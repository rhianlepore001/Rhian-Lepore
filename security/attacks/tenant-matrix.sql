\ir ../tests/local-only.sql
DO $$
DECLARE
  t text; col text; cast_type text; actor record; statement text; result jsonb;
  a text := 'a0000000-0000-4000-8000-0000000000a0';
  b text := 'b0000000-0000-4000-8000-0000000000b0';
  row_a text := 'c0000000-0000-4000-8000-000000000001';
  row_b text := 'c0000000-0000-4000-8000-000000000002';
  checks integer := 0;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients','appointments','finance_records','commission_payments','services','goal_settings','business_galleries','team_members','business_settings','public_clients'] LOOP
    col := CASE WHEN t='public_clients' THEN 'business_id' ELSE 'user_id' END;
    cast_type := CASE WHEN t='goal_settings' THEN 'uuid' ELSE 'text' END;
    EXECUTE format('INSERT INTO %I(id,%I,audit_marker) VALUES(%L,%L::%s,%L),(%L,%L::%s,%L)',t,col,row_a,a,cast_type,'fixture A',row_b,b,cast_type,'fixture B');

    FOR actor IN SELECT * FROM (VALUES
      ('anon','','a0000000-0000-4000-8000-0000000000a0'),
      ('authenticated','a0000000-0000-4000-8000-0000000000a1','b0000000-0000-4000-8000-0000000000b0'),
      ('authenticated','b0000000-0000-4000-8000-0000000000b0','a0000000-0000-4000-8000-0000000000a0')
    ) AS actors(role,uid,foreign_tenant) LOOP
      statement := format('SELECT count(*)::text FROM %I WHERE %I=%L::%s',t,col,actor.foreign_tenant,cast_type);
      PERFORM pg_temp.expect(t||' foreign SELECT',pg_temp.run_as(actor.role,actor.uid,statement),'0',true);
      statement := format('WITH changed AS (UPDATE %I SET audit_marker=%L WHERE %I=%L::%s RETURNING 1) SELECT count(*)::text FROM changed',t,'forbidden',col,actor.foreign_tenant,cast_type);
      PERFORM pg_temp.expect(t||' foreign UPDATE',pg_temp.run_as(actor.role,actor.uid,statement),'0',true);
      statement := format('WITH changed AS (DELETE FROM %I WHERE %I=%L::%s RETURNING 1) SELECT count(*)::text FROM changed',t,col,actor.foreign_tenant,cast_type);
      PERFORM pg_temp.expect(t||' foreign DELETE',pg_temp.run_as(actor.role,actor.uid,statement),'0',true);
      statement := format('INSERT INTO %I(%I,audit_marker) VALUES(%L::%s,%L)',t,col,actor.foreign_tenant,cast_type,'forbidden');
      result := pg_temp.run_as(actor.role,actor.uid,statement);
      IF result->>'state' <> '42501' THEN RAISE EXCEPTION 'MATRIX INSERT %: %',t,result; END IF;
      checks := checks + 4;
    END LOOP;

    statement := format('SELECT audit_marker FROM %I WHERE id=%L',t,row_b);
    PERFORM pg_temp.expect(t||' owner legitimate SELECT',pg_temp.run_as('authenticated',b,statement),'fixture B');
    statement := format('WITH changed AS (UPDATE %I SET audit_marker=%L WHERE id=%L RETURNING 1) SELECT count(*)::text FROM changed',t,'owner update',row_b);
    PERFORM pg_temp.expect(t||' owner legitimate UPDATE',pg_temp.run_as('authenticated',b,statement),'1');
    statement := format('UPDATE %I SET %I=%L::%s WHERE id=%L',t,col,a,cast_type,row_b);
    result := pg_temp.run_as('authenticated',b,statement);
    IF result->>'state' <> '42501' THEN RAISE EXCEPTION 'MATRIX TENANT REASSIGN %: %',t,result; END IF;
    statement := format('INSERT INTO %I(id,%I) VALUES(%L,%L::%s) ON CONFLICT(id) DO UPDATE SET audit_marker=%L',t,col,row_a,b,cast_type,'forbidden upsert');
    result := pg_temp.run_as('authenticated',b,statement);
    IF result->>'state' <> '42501' THEN RAISE EXCEPTION 'MATRIX FOREIGN UPSERT %: %',t,result; END IF;
    statement := format('INSERT INTO %I(id,%I) VALUES(%L,%L::%s) ON CONFLICT(id) DO UPDATE SET audit_marker=%L RETURNING audit_marker',t,col,row_b,b,cast_type,'owner upsert');
    PERFORM pg_temp.expect(t||' owner legitimate UPSERT',pg_temp.run_as('authenticated',b,statement),'owner upsert');
    statement := format('INSERT INTO %I(%I,audit_marker) VALUES(%L::%s,%L),(%L::%s,%L)',t,col,b,cast_type,'batch own',a,cast_type,'batch foreign');
    IF t='business_settings' THEN statement := statement || ' ON CONFLICT(user_id) DO UPDATE SET audit_marker=EXCLUDED.audit_marker'; END IF;
    result := pg_temp.run_as('authenticated',b,statement);
    IF result->>'state' <> '42501' THEN RAISE EXCEPTION 'MATRIX BATCH %: %',t,result; END IF;
    EXECUTE format('SELECT count(*)::text FROM %I WHERE audit_marker IN (%L,%L)',t,'batch own','batch foreign') INTO statement;
    IF statement <> '0' THEN RAISE EXCEPTION 'MATRIX BATCH PARTIAL COMMIT %',t; END IF;
    statement := format('WITH changed AS (DELETE FROM %I WHERE id=%L RETURNING 1) SELECT count(*)::text FROM changed',t,row_b);
    PERFORM pg_temp.expect(t||' owner legitimate DELETE',pg_temp.run_as('authenticated',b,statement),'1');
    statement := format('WITH changed AS (INSERT INTO %I(id,%I,audit_marker) VALUES(%L,%L::%s,%L) RETURNING 1) SELECT count(*)::text FROM changed',t,col,row_b,b,cast_type,'owner insert');
    PERFORM pg_temp.expect(t||' owner legitimate INSERT',pg_temp.run_as('authenticated',b,statement),'1');
    checks := checks + 9;
  END LOOP;
  RAISE NOTICE 'PASS % matrix checks on 10 source-policy fixtures (not a production catalog)',checks;
END $$;

DO $$
DECLARE r jsonb;
BEGIN
  r := pg_temp.run_as('authenticated','a0000000-0000-4000-8000-0000000000a1',
    $q$UPDATE team_members SET commission_rate=99 WHERE user_id='a0000000-0000-4000-8000-0000000000a0' RETURNING commission_rate::text$q$);
  IF r->>'value' <> '99' OR r->>'state' <> '00000' THEN RAISE EXCEPTION 'STAFF_COMMISSION_PROBE_NOT_REPRODUCED %',r; END IF;
  r := pg_temp.run_as('authenticated','a0000000-0000-4000-8000-0000000000a1',
    $q$UPDATE finance_records SET commission_value=999 WHERE user_id='a0000000-0000-4000-8000-0000000000a0' RETURNING commission_value::text$q$);
  IF r->>'value' <> '999' OR r->>'state' <> '00000' THEN RAISE EXCEPTION 'STAFF_FINANCE_PROBE_NOT_REPRODUCED %',r; END IF;
  RAISE WARNING 'CONFIRMED SOURCE-POLICY RISK: staff modifies commission and finance in tenant through ALL policies; full deployed triggers/catalog not assessed';
END $$;
