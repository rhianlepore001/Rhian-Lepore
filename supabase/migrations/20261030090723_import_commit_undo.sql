BEGIN;

ALTER TABLE public.import_batches ADD COLUMN expected_rows integer CHECK (expected_rows BETWEEN 1 AND 10000);
ALTER TABLE public.import_batches ADD COLUMN file_name text CHECK (char_length(file_name) <= 255);
ALTER TABLE public.import_staging_rows ADD COLUMN display_name text CHECK (char_length(display_name) <= 200);
ALTER TABLE public.clients ADD COLUMN additional_phones jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(additional_phones) = 'array');
ALTER TABLE public.clients ADD COLUMN import_revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.services ADD COLUMN import_revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.service_categories ADD COLUMN import_revision bigint NOT NULL DEFAULT 0;

CREATE FUNCTION public.guard_import_history() RETURNS trigger
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
CREATE TRIGGER guard_import_batches BEFORE UPDATE OR DELETE ON public.import_batches FOR EACH ROW EXECUTE FUNCTION public.guard_import_history();
CREATE TRIGGER guard_import_staging BEFORE INSERT OR UPDATE OR DELETE ON public.import_staging_rows FOR EACH ROW EXECUTE FUNCTION public.guard_import_history();

CREATE FUNCTION public.bump_import_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.import_revision := OLD.import_revision + 1;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.bump_import_revision() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER import_revision_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.bump_import_revision();
CREATE TRIGGER import_revision_services BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.bump_import_revision();
CREATE TRIGGER import_revision_categories BEFORE UPDATE ON public.service_categories FOR EACH ROW EXECUTE FUNCTION public.bump_import_revision();

CREATE TABLE public.import_created_records (
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
  FOREIGN KEY (company_id, batch_id) REFERENCES public.import_batches(company_id, id) ON DELETE CASCADE
);
CREATE INDEX import_created_records_batch_idx ON public.import_created_records(company_id, batch_id);
ALTER TABLE public.import_created_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.import_created_records FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.import_created_records TO authenticated;
GRANT ALL ON public.import_created_records TO service_role;
CREATE POLICY "Import created records owner" ON public.import_created_records FOR SELECT TO authenticated
  USING (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');

CREATE TABLE public.import_created_categories (
  company_id text NOT NULL,
  batch_id uuid NOT NULL,
  category_id uuid NOT NULL,
  snapshot_hash text NOT NULL,
  undone boolean NOT NULL DEFAULT false,
  PRIMARY KEY (company_id, batch_id, category_id),
  FOREIGN KEY (company_id, batch_id) REFERENCES public.import_batches(company_id, id) ON DELETE CASCADE
);
ALTER TABLE public.import_created_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.import_created_categories FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.import_created_categories TO authenticated;
GRANT ALL ON public.import_created_categories TO service_role;
CREATE POLICY "Import created categories owner" ON public.import_created_categories FOR SELECT TO authenticated
  USING (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');

CREATE FUNCTION public.commit_import_batch(p_batch_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_company text := public.get_auth_company_id();
  v_batch public.import_batches%ROWTYPE;
  v_row public.import_staging_rows%ROWTYPE;
  v_input jsonb;
  v_name text;
  v_source_id text;
  v_phone text;
  v_email text;
  v_decision text;
  v_target uuid;
  v_category uuid;
  v_duplicate boolean;
  v_created boolean;
  v_snapshot text;
  v_linked uuid;
  v_remaining bigint;
  v_category_count integer;
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
  FOR v_row IN SELECT * FROM public.import_staging_rows WHERE company_id=v_company AND batch_id=p_batch_id AND outcome='pending' AND (reason IS NULL OR COALESCE(normalized_data->>'decision','') <> '') ORDER BY row_number LIMIT 100 FOR UPDATE LOOP
    BEGIN
      v_input := v_row.normalized_data;
      v_name := btrim(COALESCE(v_input->>'name',''));
      v_source_id := btrim(COALESCE(v_input->>'source_id',''));
      v_decision := COALESCE(v_input->>'decision','');
      v_email := btrim(COALESCE(v_input->>'email',''));
      v_phone := COALESCE(v_input->'phones'->>0,'');
      v_target := NULL; v_linked := NULL; v_category := NULL; v_snapshot := NULL; v_created := false;
      IF v_decision='skip' THEN
        UPDATE public.import_staging_rows SET outcome='ignored', reason='Ignorado a pedido.', raw_data='{}'::jsonb, normalized_data=NULL WHERE id=v_row.id;
        CONTINUE;
      END IF;
      IF jsonb_typeof(v_input->'issues') = 'array' AND jsonb_array_length(v_input->'issues') > 0 AND v_decision <> 'skip' THEN
        UPDATE public.import_staging_rows SET reason='Confira os dados desta linha.', normalized_data=normalized_data - 'decision' WHERE id=v_row.id;
        CONTINUE;
      END IF;
      IF v_input IS NULL OR char_length(v_name) NOT BETWEEN 1 AND 200 OR char_length(v_source_id) NOT BETWEEN 1 AND 255 OR v_decision NOT IN ('','create','link','skip') THEN
        UPDATE public.import_staging_rows SET reason='Confira o nome e a identificação deste registro.', normalized_data=normalized_data - 'decision' WHERE id=v_row.id;
        CONTINUE;
      END IF;
      SELECT CASE WHEN v_batch.kind='client' THEN client_id ELSE service_id END INTO v_linked
        FROM public.import_source_links WHERE company_id=v_company AND source=v_batch.source AND kind=v_batch.kind AND source_id=v_source_id;
      IF v_linked IS NOT NULL THEN
        UPDATE public.import_staging_rows SET outcome='ignored', reason='Este registro já foi trazido anteriormente.', raw_data='{}'::jsonb, normalized_data=NULL WHERE id=v_row.id;
        CONTINUE;
      END IF;
      IF v_batch.kind='client' THEN
        IF v_input ? 'phones' AND jsonb_typeof(v_input->'phones') <> 'array' THEN RAISE EXCEPTION 'invalid_phones'; END IF;
        IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_input->'phones','[]'::jsonb)) p WHERE p !~ '^\+[1-9][0-9]{7,14}$') THEN RAISE EXCEPTION 'invalid_phone'; END IF;
        IF v_email<>'' AND v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'invalid_email'; END IF;
        SELECT EXISTS (SELECT 1 FROM public.clients c WHERE c.user_id=v_company AND (lower(btrim(c.name))=lower(v_name) OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_input->'phones','[]'::jsonb)) incoming(phone)
          WHERE (length(regexp_replace(COALESCE(c.phone,''),'[^0-9]','','g'))>=8 AND right(regexp_replace(c.phone,'[^0-9]','','g'),8)=right(regexp_replace(incoming.phone,'[^0-9]','','g'),8))
          OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(c.additional_phones) extra(phone) WHERE length(regexp_replace(extra.phone,'[^0-9]','','g'))>=8 AND right(regexp_replace(extra.phone,'[^0-9]','','g'),8)=right(regexp_replace(incoming.phone,'[^0-9]','','g'),8))) OR (v_email<>'' AND lower(btrim(COALESCE(c.email,'')))=lower(v_email)))) INTO v_duplicate;
      ELSE
        SELECT EXISTS (SELECT 1 FROM public.services s WHERE s.user_id=v_company AND lower(btrim(s.name))=lower(v_name)) INTO v_duplicate;
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
          VALUES (v_company,v_name,NULLIF(v_phone,''),v_email,NULLIF(v_input->>'birth_date','')::date,COALESCE(v_input->>'notes',''),'import',COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements(COALESCE(v_input->'phones','[]'::jsonb)) WITH ORDINALITY p(value,n) WHERE n>1),'[]'::jsonb))
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

CREATE FUNCTION public.clear_import_source_data(p_batch_id uuid) RETURNS integer
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

CREATE FUNCTION public.clear_import_pending(p_batch_id uuid) RETURNS integer
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

CREATE FUNCTION public.undo_import_batch(p_batch_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_company text := public.get_auth_company_id();
  v_batch public.import_batches%ROWTYPE;
  v_item public.import_created_records%ROWTYPE;
  v_cat public.import_created_categories%ROWTYPE;
  v_record jsonb;
  v_related boolean;
  v_has boolean;
  v_constraint record;
  v_predicate text;
  v_undone integer := 0;
  v_preserved integer := 0;
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL OR public.get_auth_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorized'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_company, 0));
  SELECT * INTO v_batch FROM public.import_batches WHERE id=p_batch_id AND company_id=v_company FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorized'; END IF;
  FOR v_item IN SELECT * FROM public.import_created_records WHERE company_id=v_company AND batch_id=p_batch_id AND NOT undone FOR UPDATE LOOP
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
    IF v_record IS NULL OR encode(sha256(convert_to(v_record::text,'UTF8')),'hex') IS DISTINCT FROM v_item.snapshot_hash OR (v_record->>'import_revision')::bigint <> 0 THEN
      v_preserved := v_preserved + 1;
      CONTINUE;
    END IF;
    SELECT EXISTS(SELECT 1 FROM public.import_source_links l WHERE l.company_id=v_company AND ((v_item.kind='client' AND l.client_id=v_item.target_id) OR (v_item.kind='service' AND l.service_id=v_item.target_id)) AND NOT (l.source=v_batch.source AND l.kind=v_item.kind AND l.source_id=v_item.source_id)) INTO v_related;
    FOR v_constraint IN SELECT con.conrelid, con.conkey, con.confkey FROM pg_catalog.pg_constraint con
      WHERE con.contype='f' AND con.confrelid=CASE WHEN v_item.kind='client' THEN 'public.clients'::regclass ELSE 'public.services'::regclass END AND con.conrelid <> 'public.import_source_links'::regclass LOOP
      SELECT string_agg(format('(to_jsonb(t)->>%L) IS NOT DISTINCT FROM ($1->>%L)', child.attname, parent.attname),' AND ' ORDER BY keys.ordinality) INTO v_predicate
        FROM unnest(v_constraint.conkey, v_constraint.confkey) WITH ORDINALITY keys(child_num,parent_num,ordinality)
        JOIN pg_catalog.pg_attribute child ON child.attrelid=v_constraint.conrelid AND child.attnum=keys.child_num
        JOIN pg_catalog.pg_attribute parent ON parent.attrelid=CASE WHEN v_item.kind='client' THEN 'public.clients'::regclass ELSE 'public.services'::regclass END AND parent.attnum=keys.parent_num;
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s t WHERE %s)',v_constraint.conrelid::regclass,v_predicate) INTO v_has USING v_record;
      v_related := v_related OR v_has;
      EXIT WHEN v_related;
    END LOOP;
    IF v_related THEN v_preserved := v_preserved + 1; CONTINUE; END IF;
    DELETE FROM public.import_source_links WHERE company_id=v_company AND source=v_batch.source AND kind=v_item.kind AND source_id=v_item.source_id AND ((v_item.kind='client' AND client_id=v_item.target_id) OR (v_item.kind='service' AND service_id=v_item.target_id));
    IF v_item.kind='client' THEN DELETE FROM public.clients WHERE id=v_item.target_id AND user_id=v_company;
    ELSE DELETE FROM public.services WHERE id=v_item.target_id AND user_id=v_company; END IF;
    UPDATE public.import_created_records SET undone=true, source_data='{}'::jsonb WHERE id=v_item.id;
    v_undone := v_undone + 1;
  END LOOP;
  FOR v_cat IN SELECT * FROM public.import_created_categories WHERE company_id=v_company AND batch_id=p_batch_id AND NOT undone FOR UPDATE LOOP
    v_record := NULL;
    SELECT to_jsonb(c) INTO v_record FROM public.service_categories c WHERE c.id=v_cat.category_id AND c.user_id=v_company FOR UPDATE;
    IF v_record IS NULL OR encode(sha256(convert_to(v_record::text,'UTF8')),'hex') IS DISTINCT FROM v_cat.snapshot_hash OR (v_record->>'import_revision')::bigint <> 0 THEN
      v_preserved := v_preserved + 1; CONTINUE;
    END IF;
    v_related := false;
    FOR v_constraint IN SELECT con.conrelid, con.conkey, con.confkey FROM pg_catalog.pg_constraint con WHERE con.contype='f' AND con.confrelid='public.service_categories'::regclass LOOP
      SELECT string_agg(format('(to_jsonb(t)->>%L) IS NOT DISTINCT FROM ($1->>%L)',child.attname,parent.attname),' AND ' ORDER BY keys.ordinality) INTO v_predicate
        FROM unnest(v_constraint.conkey, v_constraint.confkey) WITH ORDINALITY keys(child_num,parent_num,ordinality)
        JOIN pg_catalog.pg_attribute child ON child.attrelid=v_constraint.conrelid AND child.attnum=keys.child_num
        JOIN pg_catalog.pg_attribute parent ON parent.attrelid='public.service_categories'::regclass AND parent.attnum=keys.parent_num;
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s t WHERE %s)',v_constraint.conrelid::regclass,v_predicate) INTO v_has USING v_record;
      v_related := v_related OR v_has;
      EXIT WHEN v_related;
    END LOOP;
    IF v_related THEN v_preserved := v_preserved + 1; CONTINUE; END IF;
    DELETE FROM public.service_categories WHERE id=v_cat.category_id AND user_id=v_company;
    UPDATE public.import_created_categories SET undone=true WHERE company_id=v_company AND batch_id=p_batch_id AND category_id=v_cat.category_id;
  END LOOP;
  IF v_preserved=0 THEN UPDATE public.import_batches SET status='undone' WHERE id=p_batch_id AND company_id=v_company; END IF;
  RETURN jsonb_build_object('undone',v_undone,'preserved',v_preserved);
END;
$$;
REVOKE ALL ON FUNCTION public.undo_import_batch(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.undo_import_batch(uuid) TO authenticated;

COMMIT;
