-- Rollback de 20261030130200_import_retention_limits.sql
-- Faça o backup indicado no .md antes de executar.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'import-retention';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END
$cron$;
DROP TRIGGER IF EXISTS clear_import_source_clients ON public.clients;
DROP TRIGGER IF EXISTS clear_import_source_services ON public.services;
DROP FUNCTION IF EXISTS public.clear_import_source_on_delete();
DROP INDEX IF EXISTS public.import_created_records_target_idx;
DROP TRIGGER IF EXISTS track_import_staging_insert ON public.import_staging_rows;
DROP TRIGGER IF EXISTS track_import_staging_update ON public.import_staging_rows;
DROP TRIGGER IF EXISTS track_import_staging_delete ON public.import_staging_rows;
DROP FUNCTION IF EXISTS public.track_import_staging();
ALTER TABLE public.import_batches DROP CONSTRAINT IF EXISTS import_batches_staged_limits;
ALTER TABLE public.import_batches DROP COLUMN IF EXISTS staged_rows;
ALTER TABLE public.import_batches DROP COLUMN IF EXISTS staged_bytes;
-- Volta a proteção do histórico para a versão anterior (sem os contadores).
CREATE OR REPLACE FUNCTION public.guard_import_history() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_status text;
BEGIN
  IF current_user <> 'authenticated' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_TABLE_NAME = 'import_batches' THEN
    IF TG_OP = 'DELETE' THEN
      IF OLD.status IN ('completed', 'undone') OR EXISTS (
        SELECT 1 FROM public.import_staging_rows
        WHERE company_id=OLD.company_id AND batch_id=OLD.id AND outcome <> 'pending'
      ) THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='completed_import'; END IF;
      RETURN OLD;
    END IF;
    IF OLD.status IN ('completed', 'undone') OR NEW.status IN ('completed', 'undone') OR NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.source IS DISTINCT FROM OLD.source OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.expected_rows IS DISTINCT FROM OLD.expected_rows THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='completed_import';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT status INTO v_status FROM public.import_batches WHERE id=NEW.batch_id AND company_id=NEW.company_id;
    IF v_status NOT IN ('preparing', 'review') OR NEW.outcome <> 'pending' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='completed_import'; END IF;
    RETURN NEW;
  END IF;
  SELECT status INTO v_status FROM public.import_batches WHERE id=OLD.batch_id AND company_id=OLD.company_id;
  IF TG_OP = 'DELETE' THEN
    IF v_status IN ('completed', 'undone') OR OLD.outcome NOT IN ('pending', 'error') THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='completed_import'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.outcome NOT IN ('pending', 'error') OR NEW.outcome NOT IN ('pending', 'error') OR NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.batch_id IS DISTINCT FROM OLD.batch_id OR NEW.id IS DISTINCT FROM OLD.id OR NEW.row_number IS DISTINCT FROM OLD.row_number THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='completed_import';
  END IF;
  RETURN NEW;
END;
$$;
COMMIT;
