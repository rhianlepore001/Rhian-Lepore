-- Rollback de 20261030130000_import_staging.sql
-- Execute ANTES os rollbacks de 20261030130200 e 20261030130100. Faça o backup indicado no .md antes de executar.
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TABLE IF EXISTS public.import_source_links;
DROP INDEX IF EXISTS public.import_services_tenant_id_idx;
DROP TABLE IF EXISTS public.import_staging_rows;
DROP TABLE IF EXISTS public.import_column_mappings;
DROP TABLE IF EXISTS public.import_batches;
COMMIT;
