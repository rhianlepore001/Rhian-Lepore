CREATE TABLE clients(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text, name text);
CREATE TABLE appointments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text);
CREATE TABLE finance_records(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text, commission_value numeric DEFAULT 10);
CREATE TABLE commission_payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text);
CREATE TABLE services(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text);
CREATE TABLE goal_settings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);
CREATE TABLE business_galleries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text);
ALTER TABLE team_members ADD COLUMN commission_rate numeric DEFAULT 10;
ALTER TABLE team_members ALTER COLUMN name SET DEFAULT 'Fictional member';
ALTER TABLE public_clients ALTER COLUMN name SET DEFAULT 'Fictional client';

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients','appointments','finance_records','commission_payments','services','goal_settings','business_galleries','team_members','business_settings','public_clients'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN audit_marker text', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO anon,authenticated', t);
  END LOOP;
END $$;

INSERT INTO profiles(id,role,company_id) VALUES
 ('a0000000-0000-4000-8000-0000000000a0','owner','a0000000-0000-4000-8000-0000000000a0'),
 ('a0000000-0000-4000-8000-0000000000a1','staff','a0000000-0000-4000-8000-0000000000a0'),
 ('b0000000-0000-4000-8000-0000000000b0','owner','b0000000-0000-4000-8000-0000000000b0');

CREATE FUNCTION pg_temp.run_as(p_role text, p_uid text, p_sql text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE v text; s text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_uid, false);
  PERFORM set_config('request.jwt.claim.role', p_role, false);
  EXECUTE format('SET ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
    EXECUTE 'RESET ROLE';
    RETURN jsonb_build_object('state','00000','value',v);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS s = RETURNED_SQLSTATE;
    EXECUTE 'RESET ROLE';
    RETURN jsonb_build_object('state',s,'value',SQLERRM);
  END;
END $$;

CREATE FUNCTION pg_temp.expect(p_name text, p_result jsonb, p_value text, p_denied boolean DEFAULT false) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF (p_result->>'state' = '00000' AND p_result->>'value' = p_value)
     OR (p_denied AND p_result->>'state' = '42501') THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'MATRIX FAIL %: %', p_name, p_result;
END $$;
