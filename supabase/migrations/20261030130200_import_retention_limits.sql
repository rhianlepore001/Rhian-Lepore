BEGIN;
SET LOCAL lock_timeout = '5s';

-- Limites de cada lote aplicados no próprio banco: linhas (até o total anunciado) e tamanho (64 MB).
ALTER TABLE public.import_batches ADD COLUMN IF NOT EXISTS staged_rows integer NOT NULL DEFAULT 0;
ALTER TABLE public.import_batches ADD COLUMN IF NOT EXISTS staged_bytes bigint NOT NULL DEFAULT 0;
UPDATE public.import_batches b SET staged_rows = s.n, staged_bytes = s.bytes
  FROM (SELECT company_id, batch_id, count(*) AS n, COALESCE(sum(octet_length(raw_data::text) + COALESCE(octet_length(normalized_data::text), 0)), 0) AS bytes
        FROM public.import_staging_rows GROUP BY company_id, batch_id) s
  WHERE s.company_id = b.company_id AND s.batch_id = b.id;
ALTER TABLE public.import_batches DROP CONSTRAINT IF EXISTS import_batches_staged_limits;
ALTER TABLE public.import_batches ADD CONSTRAINT import_batches_staged_limits CHECK (
  staged_rows >= 0 AND staged_bytes >= 0 AND staged_bytes <= 64000000 AND (expected_rows IS NULL OR staged_rows <= expected_rows));

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
    IF OLD.status IN ('completed', 'undone') OR NEW.status IN ('completed', 'undone') OR NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.source IS DISTINCT FROM OLD.source OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.expected_rows IS DISTINCT FROM OLD.expected_rows OR NEW.staged_rows IS DISTINCT FROM OLD.staged_rows OR NEW.staged_bytes IS DISTINCT FROM OLD.staged_bytes THEN
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
REVOKE ALL ON FUNCTION public.guard_import_history() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_import_staging() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.import_batches b SET staged_rows = b.staged_rows + d.n, staged_bytes = b.staged_bytes + d.bytes
      FROM (SELECT company_id, batch_id, count(*) AS n, sum(octet_length(raw_data::text) + COALESCE(octet_length(normalized_data::text), 0)) AS bytes FROM new_rows GROUP BY company_id, batch_id) d
      WHERE b.company_id = d.company_id AND b.id = d.batch_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.import_batches b SET staged_rows = b.staged_rows - d.n, staged_bytes = b.staged_bytes - d.bytes
      FROM (SELECT company_id, batch_id, count(*) AS n, sum(octet_length(raw_data::text) + COALESCE(octet_length(normalized_data::text), 0)) AS bytes FROM old_rows GROUP BY company_id, batch_id) d
      WHERE b.company_id = d.company_id AND b.id = d.batch_id;
  ELSE
    UPDATE public.import_batches b SET staged_bytes = b.staged_bytes + d.bytes
      FROM (SELECT company_id, batch_id, sum(bytes) AS bytes FROM (
              SELECT company_id, batch_id, octet_length(raw_data::text) + COALESCE(octet_length(normalized_data::text), 0) AS bytes FROM new_rows
              UNION ALL SELECT company_id, batch_id, -(octet_length(raw_data::text) + COALESCE(octet_length(normalized_data::text), 0)) FROM old_rows) x GROUP BY company_id, batch_id) d
      WHERE b.company_id = d.company_id AND b.id = d.batch_id AND d.bytes <> 0;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.track_import_staging() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS track_import_staging_insert ON public.import_staging_rows;
DROP TRIGGER IF EXISTS track_import_staging_update ON public.import_staging_rows;
DROP TRIGGER IF EXISTS track_import_staging_delete ON public.import_staging_rows;
CREATE TRIGGER track_import_staging_insert AFTER INSERT ON public.import_staging_rows REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.track_import_staging();
CREATE TRIGGER track_import_staging_update AFTER UPDATE ON public.import_staging_rows REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.track_import_staging();
CREATE TRIGGER track_import_staging_delete AFTER DELETE ON public.import_staging_rows REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.track_import_staging();

-- Os dados originais da linha saem junto com o cadastro excluído.
CREATE INDEX IF NOT EXISTS import_created_records_target_idx ON public.import_created_records(company_id, target_id);
CREATE OR REPLACE FUNCTION public.clear_import_source_on_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.import_created_records r SET source_data = '{}'::jsonb
    FROM old_rows o
    WHERE r.company_id = o.user_id AND r.target_id = o.id AND r.kind = TG_ARGV[0] AND r.source_data <> '{}'::jsonb;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.clear_import_source_on_delete() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS clear_import_source_clients ON public.clients;
CREATE TRIGGER clear_import_source_clients AFTER DELETE ON public.clients REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.clear_import_source_on_delete('client');
DROP TRIGGER IF EXISTS clear_import_source_services ON public.services;
CREATE TRIGGER clear_import_source_services AFTER DELETE ON public.services REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.clear_import_source_on_delete('service');

-- Limpeza diária só quando o pg_cron existir (hoje não existe em produção; nesse caso a limpeza roda na próxima importação).
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'import-retention';
    PERFORM cron.schedule('import-retention', '30 3 * * *', 'SELECT public.import_purge_all()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron indisponível; a limpeza roda na próxima importação.';
END
$cron$;

COMMIT;
