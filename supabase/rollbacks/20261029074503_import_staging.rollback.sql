BEGIN;
DROP TABLE IF EXISTS public.import_source_links;
DROP INDEX IF EXISTS public.import_clients_tenant_id_idx;
DROP INDEX IF EXISTS public.import_services_tenant_id_idx;
DROP TABLE IF EXISTS public.import_staging_rows;
DROP TABLE IF EXISTS public.import_column_mappings;
DROP TABLE IF EXISTS public.import_batches;
COMMIT;
