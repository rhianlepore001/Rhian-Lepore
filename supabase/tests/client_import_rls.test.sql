-- Run after staff_edit_clients.harness.sql in an isolated database.
BEGIN;
CREATE FUNCTION public.test_import_denied(query text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE query;
  EXCEPTION WHEN insufficient_privilege THEN RETURN;
  END;
  RAISE EXCEPTION 'Expected RLS denial: %', query;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a0', true);
INSERT INTO public.clients(id, user_id, name, email) VALUES
 ('30000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-0000000000a0', 'Cliente fictício importado', 'ficticio@example.test');
SELECT public.test_import_denied($$INSERT INTO public.clients(id, user_id, name) VALUES ('30000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000b0', 'Cliente fictício')$$);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.clients WHERE user_id = '00000000-0000-0000-0000-0000000000b0') THEN RAISE EXCEPTION 'Cross-company read'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b0', true);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.clients WHERE id = '30000000-0000-0000-0000-000000000010') THEN RAISE EXCEPTION 'Cross-company read'; END IF;
END $$;
SELECT public.test_import_denied($$INSERT INTO public.clients(id, user_id, name) VALUES ('30000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000a0', 'Cliente fictício')$$);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
SELECT public.test_import_denied($$INSERT INTO public.clients(id, user_id, name) VALUES ('30000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-0000000000b0', 'Cliente fictício')$$);
RESET ROLE;
SET LOCAL ROLE anon;
SELECT public.test_import_denied($$INSERT INTO public.clients(id, user_id, name) VALUES ('30000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-0000000000a0', 'Cliente fictício')$$);
RESET ROLE;
ROLLBACK;
