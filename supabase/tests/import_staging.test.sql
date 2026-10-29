BEGIN;
CREATE FUNCTION public.test_staging_denied(query text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE query; EXCEPTION WHEN insufficient_privilege OR foreign_key_violation THEN RETURN; END;
  RAISE EXCEPTION 'expected denial: %', query;
END $$;
CREATE FUNCTION public.test_staging_duplicate(query text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE query; EXCEPTION WHEN unique_violation THEN RETURN; END;
  RAISE EXCEPTION 'expected unique violation: %', query;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a0', true);
INSERT INTO public.import_batches(id, company_id, source, kind, created_by) VALUES
 ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', 'trinks', 'client', '00000000-0000-0000-0000-0000000000a0');
INSERT INTO public.import_staging_rows(id, company_id, batch_id, row_number, raw_data) VALUES
 ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', '40000000-0000-0000-0000-000000000001', 2, '{"nome":"Cliente fictício"}');
INSERT INTO public.import_source_links(company_id, source, kind, source_id, client_id) VALUES
 ('00000000-0000-0000-0000-0000000000a0', 'trinks', 'client', 'cliente-origem-ficticio', '30000000-0000-0000-0000-000000000001');
SELECT public.test_staging_denied($$INSERT INTO public.import_source_links(company_id, source, kind, source_id, client_id) VALUES ('00000000-0000-0000-0000-0000000000a0', 'trinks', 'client', 'outro-ficticio', '30000000-0000-0000-0000-000000000002')$$);
SELECT public.test_staging_duplicate($$INSERT INTO public.import_source_links(company_id, source, kind, source_id, client_id) VALUES ('00000000-0000-0000-0000-0000000000a0', 'trinks', 'client', 'cliente-origem-ficticio', '30000000-0000-0000-0000-000000000001')$$);
INSERT INTO public.import_source_links(company_id, source, kind, source_id, service_id) VALUES ('00000000-0000-0000-0000-0000000000a0', 'trinks', 'service', 'servico-ficticio', '60000000-0000-0000-0000-000000000001');
SELECT public.test_staging_denied($$INSERT INTO public.import_source_links(company_id, source, kind, source_id, service_id) VALUES ('00000000-0000-0000-0000-0000000000a0', 'trinks', 'service', 'servico-outro', '60000000-0000-0000-0000-000000000002')$$);
INSERT INTO public.import_column_mappings(company_id, source, kind, mapping) VALUES ('00000000-0000-0000-0000-0000000000a0', 'trinks', 'client', '{"nome":0}');
SELECT public.test_staging_denied($$INSERT INTO public.import_batches(company_id, source, kind, created_by) VALUES ('00000000-0000-0000-0000-0000000000b0', 'fresha', 'client', '00000000-0000-0000-0000-0000000000a0')$$);
SELECT public.test_staging_denied($$INSERT INTO public.import_batches(company_id, source, kind, created_by) VALUES ('00000000-0000-0000-0000-0000000000a0', 'trinks', 'client', '00000000-0000-0000-0000-0000000000b0')$$);
SELECT public.test_staging_denied($$UPDATE public.import_batches SET company_id='00000000-0000-0000-0000-0000000000b0' WHERE id='40000000-0000-0000-0000-000000000001'$$);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b0', true);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.import_batches) OR EXISTS (SELECT 1 FROM public.import_staging_rows) OR EXISTS (SELECT 1 FROM public.import_column_mappings) OR EXISTS (SELECT 1 FROM public.import_source_links) THEN RAISE EXCEPTION 'cross-company read'; END IF;
END $$;
SELECT public.test_staging_denied($$INSERT INTO public.import_staging_rows(company_id, batch_id, row_number, raw_data) VALUES ('00000000-0000-0000-0000-0000000000b0', '40000000-0000-0000-0000-000000000001', 3, '{}')$$);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.import_batches) OR EXISTS (SELECT 1 FROM public.import_staging_rows) THEN RAISE EXCEPTION 'staff read'; END IF;
END $$;
SELECT public.test_staging_denied($$INSERT INTO public.import_batches(company_id, source, kind, created_by) VALUES ('00000000-0000-0000-0000-0000000000a0', 'trinks', 'client', '00000000-0000-0000-0000-0000000000a1')$$);
RESET ROLE;
SET LOCAL ROLE anon;
SELECT public.test_staging_denied($$SELECT * FROM public.import_batches$$);
RESET ROLE;
ROLLBACK;
