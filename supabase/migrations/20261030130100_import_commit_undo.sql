BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.import_batches ADD COLUMN IF NOT EXISTS expected_rows integer CHECK (expected_rows BETWEEN 1 AND 10000);
ALTER TABLE public.import_batches ADD COLUMN IF NOT EXISTS file_name text CHECK (char_length(file_name) <= 255);
ALTER TABLE public.import_staging_rows ADD COLUMN IF NOT EXISTS display_name text CHECK (char_length(display_name) <= 200);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS additional_phones jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(additional_phones) = 'array');
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS import_revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS import_revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS import_revision bigint NOT NULL DEFAULT 0;

-- Comparação de textos sem acento, sem diferença de maiúsculas e sem espaços repetidos (igual à do navegador).
CREATE OR REPLACE FUNCTION public.import_fold_text(p_text text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
  SELECT pg_catalog.btrim(pg_catalog.regexp_replace(
    pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.translate(COALESCE(p_text, ''), 'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäåçèéêëìíîïñòóôõöùúûüýÿĀāĂăĄąĆćĈĉĊċČčĎďĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĨĩĪīĬĭĮįİĴĵĶķĹĺĻļĽľŃńŅņŇňŌōŎŏŐőŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽž', 'AAAAAACEEEEIIIINOOOOOUUUUYaaaaaaceeeeiiiinooooouuuuyyAaAaAaCcCcCcCcDdEeEeEeEeEeGgGgGgGgHhIiIiIiIiIJjKkLlLlLlNnNnNnOoOoOoRrRrRrSsSsSsSsTtTtUuUuUuUuUuUuWwYyYZzZzZz'), '[\u0300-\u036f]', '', 'g')),
    '\s+', ' ', 'g'))
$$;
REVOKE ALL ON FUNCTION public.import_fold_text(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_fold_text(text) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_clients_user_name_folded ON public.clients(user_id, public.import_fold_text(name));
CREATE INDEX IF NOT EXISTS idx_clients_user_email_lower ON public.clients(user_id, (pg_catalog.lower(pg_catalog.btrim(email)))) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_user_extra_phones ON public.clients(user_id) WHERE additional_phones <> '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_services_user_name_folded ON public.services(user_id, public.import_fold_text(name));

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
REVOKE ALL ON FUNCTION public.guard_import_history() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_import_batches ON public.import_batches;
CREATE TRIGGER guard_import_batches BEFORE UPDATE OR DELETE ON public.import_batches FOR EACH ROW EXECUTE FUNCTION public.guard_import_history();
DROP TRIGGER IF EXISTS guard_import_staging ON public.import_staging_rows;
CREATE TRIGGER guard_import_staging BEFORE INSERT OR UPDATE OR DELETE ON public.import_staging_rows FOR EACH ROW EXECUTE FUNCTION public.guard_import_history();

-- A revisão só sobe quando o cadastro realmente muda (gravações sem alteração não contam).
CREATE OR REPLACE FUNCTION public.bump_import_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF to_jsonb(NEW) IS NOT DISTINCT FROM to_jsonb(OLD) THEN RETURN NEW; END IF;
  NEW.import_revision := OLD.import_revision + 1;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.bump_import_revision() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS import_revision_clients ON public.clients;
CREATE TRIGGER import_revision_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.bump_import_revision();
DROP TRIGGER IF EXISTS import_revision_services ON public.services;
CREATE TRIGGER import_revision_services BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.bump_import_revision();
DROP TRIGGER IF EXISTS import_revision_categories ON public.service_categories;
CREATE TRIGGER import_revision_categories BEFORE UPDATE ON public.service_categories FOR EACH ROW EXECUTE FUNCTION public.bump_import_revision();

CREATE TABLE IF NOT EXISTS public.import_created_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  batch_id uuid NOT NULL,
  row_id uuid NOT NULL UNIQUE REFERENCES public.import_staging_rows(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('client', 'service')),
  target_id uuid NOT NULL,
  source_id text NOT NULL,
  was_created boolean NOT NULL,
  snapshot_hash text,
  source_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  undone boolean NOT NULL DEFAULT false,
  preserved boolean NOT NULL DEFAULT false,
  FOREIGN KEY (company_id, batch_id) REFERENCES public.import_batches(company_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS import_created_records_batch_idx ON public.import_created_records(company_id, batch_id);
ALTER TABLE public.import_created_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.import_created_records FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.import_created_records TO authenticated;
GRANT ALL ON public.import_created_records TO service_role;
DROP POLICY IF EXISTS "Import created records owner" ON public.import_created_records;
CREATE POLICY "Import created records owner" ON public.import_created_records FOR SELECT TO authenticated
  USING (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');

CREATE TABLE IF NOT EXISTS public.import_created_categories (
  company_id text NOT NULL,
  batch_id uuid NOT NULL,
  category_id uuid NOT NULL,
  snapshot_hash text NOT NULL,
  undone boolean NOT NULL DEFAULT false,
  preserved boolean NOT NULL DEFAULT false,
  PRIMARY KEY (company_id, batch_id, category_id),
  FOREIGN KEY (company_id, batch_id) REFERENCES public.import_batches(company_id, id) ON DELETE CASCADE
);
ALTER TABLE public.import_created_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.import_created_categories FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.import_created_categories TO authenticated;
GRANT ALL ON public.import_created_categories TO service_role;
DROP POLICY IF EXISTS "Import created categories owner" ON public.import_created_categories;
CREATE POLICY "Import created categories owner" ON public.import_created_categories FOR SELECT TO authenticated
  USING (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');


-- Procura, em lote e com índices, tudo o que ainda usa os cadastros que o desfazer quer remover.
-- p_kind: 'client', 'service' ou 'category'. Retorna os códigos que NÃO podem ser removidos.
CREATE OR REPLACE FUNCTION public.import_find_references(p_company text, p_kind text, p_ids uuid[], p_keys text[], p_names text[], p_source text) RETURNS uuid[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_target regclass;
  v_parent_id smallint;
  v_con record;
  v_col text;
  v_sql text;
  v_part uuid[];
  v_result uuid[] := '{}';
BEGIN
  IF p_ids IS NULL OR cardinality(p_ids) = 0 THEN RETURN v_result; END IF;
  v_target := CASE p_kind WHEN 'client' THEN 'public.clients'::regclass WHEN 'service' THEN 'public.services'::regclass ELSE 'public.service_categories'::regclass END;
  -- Vínculos de outras importações com o mesmo cadastro.
  IF p_kind = 'client' THEN
    SELECT COALESCE(array_agg(DISTINCT l.client_id), '{}') INTO v_part FROM public.import_source_links l
      JOIN unnest(p_ids, p_keys) u(id, key) ON l.client_id = u.id
      WHERE l.company_id = p_company AND NOT (l.source = p_source AND l.source_id = u.key);
    v_result := v_result || v_part;
  ELSIF p_kind = 'service' THEN
    SELECT COALESCE(array_agg(DISTINCT l.service_id), '{}') INTO v_part FROM public.import_source_links l
      JOIN unnest(p_ids, p_keys) u(id, key) ON l.service_id = u.id
      WHERE l.company_id = p_company AND NOT (l.source = p_source AND l.source_id = u.key);
    v_result := v_result || v_part;
  END IF;
  -- Toda tabela que aponta para o cadastro por chave estrangeira (uma consulta por tabela, não por cadastro).
  SELECT attnum INTO v_parent_id FROM pg_catalog.pg_attribute WHERE attrelid = v_target AND attname = 'id' AND NOT attisdropped;
  FOR v_con IN SELECT con.conrelid, con.conrelid::regclass AS tbl, con.conkey, con.confkey FROM pg_catalog.pg_constraint con
    WHERE con.contype = 'f' AND con.confrelid = v_target AND con.conrelid <> 'public.import_source_links'::regclass LOOP
    SELECT child.attname INTO v_col FROM unnest(v_con.conkey, v_con.confkey) k(child_num, parent_num)
      JOIN pg_catalog.pg_attribute child ON child.attrelid = v_con.conrelid AND child.attnum = k.child_num
      WHERE k.parent_num = v_parent_id;
    IF v_col IS NULL THEN RETURN p_ids; END IF;  -- relação desconhecida: por segurança, nada é removido
    EXECUTE format('SELECT COALESCE(array_agg(DISTINCT %I), ''{}'') FROM %s WHERE %I = ANY($1)', v_col, v_con.tbl, v_col) INTO v_part USING p_ids;
    v_result := v_result || v_part;
  END LOOP;
  -- Tabelas que usam o cadastro sem chave estrangeira. Textos livres são comparados sem acento e a correspondência é conservadora.
  FOR v_sql IN SELECT q FROM (VALUES
    ('client', 'public.client_memberships', 'SELECT client_id FROM public.client_memberships WHERE user_id = $2 AND client_id = ANY($1)'),
    ('client', 'public.finance_records', 'WITH d AS MATERIALIZED (SELECT DISTINCT public.import_fold_text(client_name) AS f FROM public.finance_records WHERE user_id = $2 AND client_name IS NOT NULL) SELECT u.id FROM unnest($1, $3) u(id, nm) WHERE u.nm <> '''' AND EXISTS (SELECT 1 FROM d WHERE d.f = u.nm)'),
    ('service', 'public.membership_plans', 'SELECT x FROM public.membership_plans p CROSS JOIN LATERAL unnest(p.service_ids) AS x WHERE p.user_id = $2 AND p.service_ids && $1 AND x = ANY($1)'),
    ('service', 'public.public_bookings', 'SELECT x FROM public.public_bookings b CROSS JOIN LATERAL unnest(b.service_ids || COALESCE(b.original_service_ids, ''{}'')) AS x WHERE b.business_id = $2 AND (b.service_ids && $1 OR b.original_service_ids && $1) AND x = ANY($1)'),
    ('service', 'public.appointments', 'WITH d AS MATERIALIZED (SELECT DISTINCT public.import_fold_text(service) AS f FROM public.appointments WHERE user_id = $2 AND service IS NOT NULL) SELECT u.id FROM unnest($1, $3) u(id, nm) WHERE u.nm <> '''' AND EXISTS (SELECT 1 FROM d WHERE strpos(d.f, u.nm) > 0)'),
    ('service', 'public.finance_records', 'WITH d AS MATERIALIZED (SELECT DISTINCT public.import_fold_text(service_name) AS f FROM public.finance_records WHERE user_id = $2 AND service_name IS NOT NULL) SELECT u.id FROM unnest($1, $3) u(id, nm) WHERE u.nm <> '''' AND EXISTS (SELECT 1 FROM d WHERE strpos(d.f, u.nm) > 0)'),
    ('service', 'public.hair_records', 'WITH d AS MATERIALIZED (SELECT DISTINCT public.import_fold_text(service) AS f FROM public.hair_records WHERE user_id = $2 AND service IS NOT NULL) SELECT u.id FROM unnest($1, $3) u(id, nm) WHERE u.nm <> '''' AND EXISTS (SELECT 1 FROM d WHERE strpos(d.f, u.nm) > 0)')
  ) t(kind, tbl, q) WHERE t.kind = p_kind AND to_regclass(t.tbl) IS NOT NULL LOOP
    EXECUTE 'SELECT COALESCE(array_agg(DISTINCT r), ''{}'') FROM (' || v_sql || ') s(r)' INTO v_part USING p_ids, p_company, p_names;
    v_result := v_result || v_part;
  END LOOP;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.import_find_references(text, text, uuid[], text[], text[], text) FROM PUBLIC, anon, authenticated;


-- Retenção: depois de 30 dias, linhas pendentes ou com erro, lotes abandonados e dados originais são apagados.
-- O pg_cron não está instalado em produção; por isso a limpeza roda na próxima importação (e ao abrir o assistente).
CREATE OR REPLACE FUNCTION public.import_purge_company(p_company text, p_keep uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_cutoff timestamptz := now() - interval '30 days';
  v_limit constant integer := 500;
  v_source integer; v_deleted integer; v_rows integer; v_closed integer;
BEGIN
  WITH t AS (
    SELECT r.id FROM public.import_created_records r JOIN public.import_batches b ON b.company_id = r.company_id AND b.id = r.batch_id
    WHERE r.company_id = p_company AND b.created_at < v_cutoff AND r.source_data <> '{}'::jsonb LIMIT v_limit)
  UPDATE public.import_created_records r SET source_data = '{}'::jsonb FROM t WHERE r.id = t.id;
  GET DIAGNOSTICS v_source = ROW_COUNT;
  -- Lotes abandonados, sem nada criado: removidos por inteiro.
  WITH t AS (
    SELECT b.id FROM public.import_batches b
    WHERE b.company_id = p_company AND b.created_at < v_cutoff AND b.status IN ('preparing', 'review') AND b.id IS DISTINCT FROM p_keep
      AND NOT EXISTS (SELECT 1 FROM public.import_created_records r WHERE r.company_id = b.company_id AND r.batch_id = b.id)
      AND NOT EXISTS (SELECT 1 FROM public.import_staging_rows s WHERE s.company_id = b.company_id AND s.batch_id = b.id AND s.outcome NOT IN ('pending', 'error'))
    LIMIT v_limit)
  DELETE FROM public.import_batches b USING t WHERE b.id = t.id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  -- Pendências e erros antigos: os dados da linha são apagados.
  WITH t AS (
    SELECT s.id FROM public.import_staging_rows s JOIN public.import_batches b ON b.company_id = s.company_id AND b.id = s.batch_id
    WHERE s.company_id = p_company AND b.created_at < v_cutoff AND b.id IS DISTINCT FROM p_keep AND s.outcome IN ('pending', 'error') LIMIT v_limit)
  UPDATE public.import_staging_rows s SET outcome = 'ignored', reason = 'Pendência removida automaticamente.', raw_data = '{}'::jsonb, normalized_data = NULL FROM t WHERE s.id = t.id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  UPDATE public.import_batches b SET status = 'completed'
    WHERE b.company_id = p_company AND b.created_at < v_cutoff AND b.status IN ('preparing', 'review') AND b.id IS DISTINCT FROM p_keep
      AND NOT EXISTS (SELECT 1 FROM public.import_staging_rows s WHERE s.company_id = b.company_id AND s.batch_id = b.id AND s.outcome = 'pending');
  GET DIAGNOSTICS v_closed = ROW_COUNT;
  RETURN jsonb_build_object('source_data_cleared', v_source, 'batches_deleted', v_deleted, 'rows_cleared', v_rows, 'batches_closed', v_closed);
END;
$$;
REVOKE ALL ON FUNCTION public.import_purge_company(text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.purge_expired_import_data() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_company text := public.get_auth_company_id();
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL OR public.get_auth_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorized'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_company, 0));
  RETURN public.import_purge_company(v_company, NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.purge_expired_import_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_import_data() TO authenticated;

-- Para ambientes com pg_cron: limpeza de todas as empresas (agendada na terceira migração, somente se a extensão existir).
CREATE OR REPLACE FUNCTION public.import_purge_all() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_company text; v_count integer := 0;
BEGIN
  FOR v_company IN SELECT DISTINCT company_id FROM public.import_batches WHERE created_at < now() - interval '30 days' LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_company, 0));
    PERFORM public.import_purge_company(v_company, NULL);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.import_purge_all() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_purge_all() TO service_role;

CREATE OR REPLACE FUNCTION public.commit_import_batch(p_batch_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_company text := public.get_auth_company_id();
  v_batch public.import_batches%ROWTYPE;
  v_row public.import_staging_rows%ROWTYPE;
  v_input jsonb;
  v_name text;
  v_raw_id text;
  v_source_id text;
  v_scope text;
  v_phone text;
  v_email text;
  v_notes text;
  v_decision text;
  v_target uuid;
  v_category uuid;
  v_duplicate boolean;
  v_phone_duplicate boolean;
  v_digits text[];
  v_created boolean;
  v_snapshot text;
  v_linked uuid;
  v_remaining bigint;
  v_category_count integer;
  v_label text;
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL OR public.get_auth_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorized';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_company, 0));
  SELECT * INTO v_batch FROM public.import_batches WHERE id=p_batch_id AND company_id=v_company FOR UPDATE;
  IF NOT FOUND OR v_batch.status='undone' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorized'; END IF;
  IF v_batch.expected_rows IS NULL OR v_batch.expected_rows <> (SELECT count(*) FROM public.import_staging_rows WHERE company_id=v_company AND batch_id=p_batch_id) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='incomplete_import';
  END IF;
  -- Retenção: aproveita a importação para limpar dados vencidos (30 dias) desta empresa.
  PERFORM public.import_purge_company(v_company, p_batch_id);
  v_label := CASE WHEN v_batch.kind='client' THEN 'cliente' ELSE 'serviço' END;
  FOR v_row IN SELECT * FROM public.import_staging_rows WHERE company_id=v_company AND batch_id=p_batch_id AND outcome='pending' AND (reason IS NULL OR COALESCE(normalized_data->>'decision','') <> '') ORDER BY row_number LIMIT 100 FOR UPDATE LOOP
    BEGIN
      v_input := v_row.normalized_data;
      v_name := btrim(COALESCE(v_input->>'name',''));
      v_raw_id := btrim(COALESCE(v_input->>'source_id',''));
      v_decision := COALESCE(v_input->>'decision','');
      v_email := btrim(COALESCE(v_input->>'email',''));
      v_notes := btrim(COALESCE(v_input->>'notes',''));
      v_phone := COALESCE(v_input->'phones'->>0,'');
      v_target := NULL; v_linked := NULL; v_category := NULL; v_snapshot := NULL; v_created := false; v_phone_duplicate := false;
      -- Fontes com código estável (sistemas) usam o código puro; planilhas e contatos recebem o escopo do arquivo (ou do lote).
      IF v_batch.source IN ('trinks', 'fresha', 'appbarber', 'booksy', 'avec') THEN
        v_source_id := v_raw_id;
      ELSE
        v_scope := left(COALESCE(NULLIF(btrim(COALESCE(v_input->>'source_scope','')), ''), p_batch_id::text), 64);
        v_source_id := CASE WHEN v_raw_id = '' THEN '' ELSE v_scope || ':' || v_raw_id END;
      END IF;
      IF v_decision='skip' THEN
        UPDATE public.import_staging_rows SET outcome='ignored', reason='Ignorado a pedido.', raw_data='{}'::jsonb, normalized_data=NULL WHERE id=v_row.id;
        CONTINUE;
      END IF;
      IF jsonb_typeof(v_input->'issues') = 'array' AND jsonb_array_length(v_input->'issues') > 0 AND v_decision <> 'skip' THEN
        UPDATE public.import_staging_rows SET reason='Confira os dados desta linha.', normalized_data=normalized_data - 'decision' WHERE id=v_row.id;
        CONTINUE;
      END IF;
      IF v_input IS NULL OR char_length(v_name) NOT BETWEEN 1 AND 200 OR char_length(v_source_id) NOT BETWEEN 1 AND 255 OR v_decision NOT IN ('','create','link','skip') THEN
        UPDATE public.import_staging_rows SET reason='Confira o nome e o código desta linha.', normalized_data=normalized_data - 'decision' WHERE id=v_row.id;
        CONTINUE;
      END IF;
      SELECT CASE WHEN v_batch.kind='client' THEN client_id ELSE service_id END INTO v_linked
        FROM public.import_source_links WHERE company_id=v_company AND source=v_batch.source AND kind=v_batch.kind AND source_id=v_source_id;
      IF v_linked IS NOT NULL THEN
        UPDATE public.import_staging_rows SET outcome='ignored', reason='Este '||v_label||' já foi trazido anteriormente.', raw_data='{}'::jsonb, normalized_data=NULL WHERE id=v_row.id;
        CONTINUE;
      END IF;
      IF v_batch.kind='client' THEN
        IF v_input ? 'phones' AND jsonb_typeof(v_input->'phones') <> 'array' THEN RAISE EXCEPTION 'invalid_phones'; END IF;
        IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_input->'phones','[]'::jsonb)) p WHERE p !~ '^\+[1-9][0-9]{7,14}$') THEN RAISE EXCEPTION 'invalid_phone'; END IF;
        IF v_email<>'' AND v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'invalid_email'; END IF;
        -- Telefone: números completos, com DDD; aceita o cadastro com ou sem o 55 do Brasil. Usa o índice idx_clients_user_phone_digits.
        SELECT COALESCE(array_agg(DISTINCT d), '{}') INTO v_digits FROM (
          SELECT public.normalize_phone_digits(p) AS d FROM jsonb_array_elements_text(COALESCE(v_input->'phones','[]'::jsonb)) p
          UNION SELECT substr(public.normalize_phone_digits(p), 3) FROM jsonb_array_elements_text(COALESCE(v_input->'phones','[]'::jsonb)) p
            WHERE public.normalize_phone_digits(p) ~ '^55[0-9]{10,11}$') s WHERE d <> '';
        v_phone_duplicate := cardinality(v_digits) > 0 AND (
          EXISTS (SELECT 1 FROM public.clients c WHERE c.user_id=v_company AND public.normalize_phone_digits(c.phone) = ANY(v_digits))
          OR EXISTS (SELECT 1 FROM public.clients c CROSS JOIN LATERAL jsonb_array_elements_text(c.additional_phones) extra(phone)
                     WHERE c.user_id=v_company AND c.additional_phones <> '[]'::jsonb AND public.normalize_phone_digits(extra.phone) = ANY(v_digits)));
        v_duplicate := v_phone_duplicate
          OR EXISTS (SELECT 1 FROM public.clients c WHERE c.user_id=v_company AND public.import_fold_text(c.name) = public.import_fold_text(v_name))
          OR (v_email<>'' AND EXISTS (SELECT 1 FROM public.clients c WHERE c.user_id=v_company AND c.email IS NOT NULL AND pg_catalog.lower(pg_catalog.btrim(c.email)) = pg_catalog.lower(v_email)));
      ELSE
        SELECT EXISTS (SELECT 1 FROM public.services s WHERE s.user_id=v_company AND public.import_fold_text(s.name) = public.import_fold_text(v_name)) INTO v_duplicate;
      END IF;
      IF v_phone_duplicate AND v_decision IN ('', 'create') THEN
        UPDATE public.import_staging_rows SET reason='Este telefone já está cadastrado em outro cliente. Vincule ao cadastro existente ou ignore esta linha.', normalized_data=normalized_data - 'decision' WHERE id=v_row.id;
        CONTINUE;
      END IF;
      IF v_decision='' AND v_duplicate THEN
        UPDATE public.import_staging_rows SET reason='Há um cadastro parecido. Escolha como continuar.' WHERE id=v_row.id;
        CONTINUE;
      END IF;
      IF v_decision='link' THEN
        v_target := (v_input->>'target_id')::uuid;
        IF v_batch.kind='client' THEN
          PERFORM 1 FROM public.clients WHERE id=v_target AND user_id=v_company;
        ELSE
          PERFORM 1 FROM public.services WHERE id=v_target AND user_id=v_company;
        END IF;
        IF NOT FOUND THEN RAISE EXCEPTION 'invalid_target'; END IF;
      ELSIF v_batch.kind='client' THEN
        INSERT INTO public.clients(user_id,name,phone,email,birth_date,notes,source,additional_phones)
          VALUES (v_company,v_name,NULLIF(v_phone,''),NULLIF(v_email,''),NULLIF(v_input->>'birth_date','')::date,NULLIF(v_notes,''),'import',COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements(COALESCE(v_input->'phones','[]'::jsonb)) WITH ORDINALITY p(value,n) WHERE n>1),'[]'::jsonb))
          RETURNING id INTO v_target;
        SELECT encode(sha256(convert_to(to_jsonb(c)::text,'UTF8')),'hex') INTO v_snapshot FROM public.clients c WHERE c.id=v_target AND c.user_id=v_company;
        v_created := true;
      ELSE
        IF NULLIF(v_input->>'category_id','') IS NOT NULL THEN
          v_category := (v_input->>'category_id')::uuid;
          PERFORM 1 FROM public.service_categories WHERE id=v_category AND user_id=v_company;
          IF NOT FOUND THEN RAISE EXCEPTION 'invalid_category'; END IF;
        ELSIF btrim(COALESCE(v_input->>'category',''))<>'' THEN
          SELECT count(*) INTO v_category_count FROM public.service_categories WHERE user_id=v_company AND lower(btrim(name))=lower(btrim(v_input->>'category'));
          IF v_category_count > 1 THEN
            UPDATE public.import_staging_rows SET reason='Escolha uma categoria para este serviço.', normalized_data=normalized_data - 'decision' WHERE id=v_row.id;
            CONTINUE;
          ELSIF v_category_count = 1 THEN
            SELECT id INTO v_category FROM public.service_categories WHERE user_id=v_company AND lower(btrim(name))=lower(btrim(v_input->>'category')) LIMIT 1;
          ELSE
            INSERT INTO public.service_categories(user_id,name) VALUES (v_company,btrim(v_input->>'category')) RETURNING id INTO v_category;
            INSERT INTO public.import_created_categories(company_id,batch_id,category_id,snapshot_hash)
              SELECT v_company,p_batch_id,v_category,encode(sha256(convert_to(to_jsonb(c)::text,'UTF8')),'hex') FROM public.service_categories c WHERE c.id=v_category AND c.user_id=v_company;
          END IF;
        END IF;
        IF COALESCE(v_input->>'price','') !~ '^[0-9]{1,8}(\.[0-9]{1,2})?$' OR COALESCE(v_input->>'duration','') !~ '^[0-9]{1,4}$' OR (v_input->>'duration')::integer NOT BETWEEN 1 AND 1440 THEN RAISE EXCEPTION 'invalid_service'; END IF;
        INSERT INTO public.services(user_id,name,price,duration_minutes,category_id,active)
          VALUES (v_company,v_name,(v_input->>'price')::numeric,(v_input->>'duration')::integer,v_category,true) RETURNING id INTO v_target;
        SELECT encode(sha256(convert_to(to_jsonb(s)::text,'UTF8')),'hex') INTO v_snapshot FROM public.services s WHERE s.id=v_target AND s.user_id=v_company;
        v_created := true;
      END IF;
      INSERT INTO public.import_source_links(company_id,source,kind,source_id,client_id,service_id)
        VALUES(v_company,v_batch.source,v_batch.kind,v_source_id,CASE WHEN v_batch.kind='client' THEN v_target END,CASE WHEN v_batch.kind='service' THEN v_target END);
      INSERT INTO public.import_created_records(company_id,batch_id,row_id,kind,target_id,source_id,was_created,snapshot_hash,source_data)
        VALUES(v_company,p_batch_id,v_row.id,v_batch.kind,v_target,v_source_id,v_created,v_snapshot,v_row.raw_data);
      UPDATE public.import_staging_rows SET outcome=CASE WHEN v_created THEN 'imported' ELSE 'ignored' END, display_name=v_name,
        reason=CASE WHEN v_created THEN 'Cadastro criado.' ELSE 'Vinculado ao cadastro escolhido; nenhum dado foi alterado.' END, raw_data='{}'::jsonb, normalized_data=NULL WHERE id=v_row.id;
    EXCEPTION WHEN data_exception OR integrity_constraint_violation OR raise_exception THEN
      UPDATE public.import_staging_rows SET outcome='error', reason='Não foi possível importar esta linha. Confira os dados.' WHERE id=v_row.id;
    END;
  END LOOP;
  SELECT count(*) INTO v_remaining FROM public.import_staging_rows WHERE company_id=v_company AND batch_id=p_batch_id AND outcome='pending' AND (reason IS NULL OR COALESCE(normalized_data->>'decision','') <> '');
  UPDATE public.import_batches SET status=CASE WHEN v_remaining>0 THEN 'review' ELSE 'completed' END WHERE id=p_batch_id AND company_id=v_company;
  RETURN (SELECT jsonb_build_object('remaining',v_remaining,'total',count(*),'imported',count(*) FILTER (WHERE outcome='imported'),'updated',count(*) FILTER (WHERE outcome='updated'),'ignored',count(*) FILTER (WHERE outcome='ignored'),'pending',count(*) FILTER (WHERE outcome='pending'),'error',count(*) FILTER (WHERE outcome='error')) FROM public.import_staging_rows WHERE company_id=v_company AND batch_id=p_batch_id);
END;
$$;
REVOKE ALL ON FUNCTION public.commit_import_batch(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_import_batch(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_import_source_data(p_batch_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_company text := public.get_auth_company_id(); v_count integer;
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL OR public.get_auth_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorized'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_company, 0));
  PERFORM 1 FROM public.import_batches WHERE id=p_batch_id AND company_id=v_company AND status IN ('completed','undone') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorized'; END IF;
  UPDATE public.import_created_records SET source_data='{}'::jsonb WHERE company_id=v_company AND batch_id=p_batch_id AND source_data <> '{}'::jsonb;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.clear_import_source_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_import_source_data(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_import_pending(p_batch_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_company text := public.get_auth_company_id(); v_count integer;
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL OR public.get_auth_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorized'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_company, 0));
  PERFORM 1 FROM public.import_batches WHERE id=p_batch_id AND company_id=v_company AND status IN ('completed','undone') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorized'; END IF;
  UPDATE public.import_staging_rows SET outcome='ignored', reason='Pendência removida a pedido.', raw_data='{}'::jsonb, normalized_data=NULL
    WHERE company_id=v_company AND batch_id=p_batch_id AND outcome IN ('pending', 'error');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.clear_import_pending(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_import_pending(uuid) TO authenticated;

-- Desfazer em partes de até 200 cadastros por chamada. Retorna quantos foram removidos, quantos foram mantidos e quantos faltam.
-- p_restart reinicia a conferência dos cadastros mantidos (usado na primeira chamada de um novo pedido de desfazer).
CREATE OR REPLACE FUNCTION public.undo_import_batch(p_batch_id uuid, p_restart boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_company text := public.get_auth_company_id();
  v_batch public.import_batches%ROWTYPE;
  v_item public.import_created_records%ROWTYPE;
  v_cat public.import_created_categories%ROWTYPE;
  v_record jsonb;
  v_limit constant integer := 200;
  v_ids uuid[] := '{}'; v_keys text[] := '{}'; v_names text[] := '{}';
  v_refs uuid[]; v_del uuid[];
  v_undone integer := 0; v_count integer; v_remaining integer; v_preserved integer;
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL OR public.get_auth_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorized'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_company, 0));
  SELECT * INTO v_batch FROM public.import_batches WHERE id=p_batch_id AND company_id=v_company FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorized'; END IF;
  IF p_restart THEN
    UPDATE public.import_created_records SET preserved=false WHERE company_id=v_company AND batch_id=p_batch_id AND preserved AND NOT undone;
    UPDATE public.import_created_categories SET preserved=false WHERE company_id=v_company AND batch_id=p_batch_id AND preserved AND NOT undone;
  END IF;
  FOR v_item IN SELECT * FROM public.import_created_records WHERE company_id=v_company AND batch_id=p_batch_id AND NOT undone AND NOT preserved ORDER BY id LIMIT v_limit FOR UPDATE LOOP
    IF NOT v_item.was_created THEN
      DELETE FROM public.import_source_links WHERE company_id=v_company AND source=v_batch.source AND kind=v_item.kind AND source_id=v_item.source_id AND ((v_item.kind='client' AND client_id=v_item.target_id) OR (v_item.kind='service' AND service_id=v_item.target_id));
      UPDATE public.import_created_records SET undone=true, source_data='{}'::jsonb WHERE id=v_item.id;
      v_undone := v_undone + 1;
      CONTINUE;
    END IF;
    v_record := NULL;
    IF v_item.kind='client' THEN
      SELECT to_jsonb(c) INTO v_record FROM public.clients c WHERE c.id=v_item.target_id AND c.user_id=v_company FOR UPDATE;
    ELSE
      SELECT to_jsonb(s) INTO v_record FROM public.services s WHERE s.id=v_item.target_id AND s.user_id=v_company FOR UPDATE;
    END IF;
    IF v_record IS NULL THEN
      -- O cadastro já não existe: não há nada a remover.
      UPDATE public.import_created_records SET undone=true, source_data='{}'::jsonb WHERE id=v_item.id;
      CONTINUE;
    END IF;
    IF encode(sha256(convert_to(v_record::text,'UTF8')),'hex') IS DISTINCT FROM v_item.snapshot_hash OR (v_record->>'import_revision')::bigint <> 0 THEN
      UPDATE public.import_created_records SET preserved=true WHERE id=v_item.id;
      CONTINUE;
    END IF;
    v_ids := v_ids || v_item.target_id; v_keys := v_keys || v_item.source_id; v_names := v_names || public.import_fold_text(v_record->>'name');
  END LOOP;
  IF cardinality(v_ids) > 0 THEN
    v_refs := public.import_find_references(v_company, v_batch.kind, v_ids, v_keys, v_names, v_batch.source);
    UPDATE public.import_created_records SET preserved=true WHERE company_id=v_company AND batch_id=p_batch_id AND target_id = ANY(v_refs) AND NOT undone AND NOT preserved;
    SELECT COALESCE(array_agg(x), '{}') INTO v_del FROM unnest(v_ids) x WHERE NOT (x = ANY(v_refs));
    IF cardinality(v_del) > 0 THEN
      IF v_batch.kind='client' THEN
        DELETE FROM public.import_source_links WHERE company_id=v_company AND client_id = ANY(v_del);
        DELETE FROM public.clients WHERE user_id=v_company AND id = ANY(v_del);
      ELSE
        DELETE FROM public.import_source_links WHERE company_id=v_company AND service_id = ANY(v_del);
        DELETE FROM public.services WHERE user_id=v_company AND id = ANY(v_del);
      END IF;
      UPDATE public.import_created_records SET undone=true, source_data='{}'::jsonb WHERE company_id=v_company AND batch_id=p_batch_id AND target_id = ANY(v_del) AND NOT undone AND NOT preserved;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_undone := v_undone + v_count;
    END IF;
  END IF;
  SELECT count(*) INTO v_remaining FROM public.import_created_records WHERE company_id=v_company AND batch_id=p_batch_id AND NOT undone AND NOT preserved;
  IF v_remaining = 0 THEN
    -- Categorias criadas por esta importação: removidas só se continuarem intactas e sem uso.
    v_ids := '{}';
    FOR v_cat IN SELECT * FROM public.import_created_categories WHERE company_id=v_company AND batch_id=p_batch_id AND NOT undone AND NOT preserved FOR UPDATE LOOP
      SELECT to_jsonb(c) INTO v_record FROM public.service_categories c WHERE c.id=v_cat.category_id AND c.user_id=v_company FOR UPDATE;
      IF v_record IS NULL THEN
        UPDATE public.import_created_categories SET undone=true WHERE company_id=v_company AND batch_id=p_batch_id AND category_id=v_cat.category_id;
      ELSIF encode(sha256(convert_to(v_record::text,'UTF8')),'hex') IS DISTINCT FROM v_cat.snapshot_hash OR (v_record->>'import_revision')::bigint <> 0 THEN
        UPDATE public.import_created_categories SET preserved=true WHERE company_id=v_company AND batch_id=p_batch_id AND category_id=v_cat.category_id;
      ELSE
        v_ids := v_ids || v_cat.category_id;
      END IF;
    END LOOP;
    IF cardinality(v_ids) > 0 THEN
      v_refs := public.import_find_references(v_company, 'category', v_ids, NULL, NULL, v_batch.source);
      UPDATE public.import_created_categories SET preserved=true WHERE company_id=v_company AND batch_id=p_batch_id AND category_id = ANY(v_refs) AND NOT undone;
      SELECT COALESCE(array_agg(x), '{}') INTO v_del FROM unnest(v_ids) x WHERE NOT (x = ANY(v_refs));
      DELETE FROM public.service_categories WHERE user_id=v_company AND id = ANY(v_del);
      UPDATE public.import_created_categories SET undone=true WHERE company_id=v_company AND batch_id=p_batch_id AND category_id = ANY(v_del) AND NOT preserved;
    END IF;
  END IF;
  SELECT (SELECT count(*) FROM public.import_created_records WHERE company_id=v_company AND batch_id=p_batch_id AND NOT undone AND NOT preserved)
       + (SELECT count(*) FROM public.import_created_categories WHERE company_id=v_company AND batch_id=p_batch_id AND NOT undone AND NOT preserved) INTO v_remaining;
  SELECT (SELECT count(*) FROM public.import_created_records WHERE company_id=v_company AND batch_id=p_batch_id AND preserved AND NOT undone)
       + (SELECT count(*) FROM public.import_created_categories WHERE company_id=v_company AND batch_id=p_batch_id AND preserved AND NOT undone) INTO v_preserved;
  IF v_remaining = 0 AND v_preserved = 0 THEN UPDATE public.import_batches SET status='undone' WHERE id=p_batch_id AND company_id=v_company; END IF;
  RETURN jsonb_build_object('undone',v_undone,'preserved',v_preserved,'remaining',v_remaining);
END;
$$;
REVOKE ALL ON FUNCTION public.undo_import_batch(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.undo_import_batch(uuid, boolean) TO authenticated;

COMMIT;
