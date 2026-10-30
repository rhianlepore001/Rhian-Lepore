DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace
      AND relname IN ('import_batches','import_staging_rows','import_column_mappings','import_source_links',
                      'import_created_records','import_created_categories','import_services_tenant_id_idx')
  ) THEN RAISE EXCEPTION 'Os objetos da importação não foram removidos.'; END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public'
      AND ((table_name='clients' AND column_name IN ('additional_phones','import_revision'))
        OR (table_name IN ('services','service_categories') AND column_name='import_revision'))
  ) THEN RAISE EXCEPTION 'As colunas da importação não foram removidas.'; END IF;
  IF (SELECT count(*) FROM public.clients WHERE name IN ('Ana Fictícia','Carla Fictícia','Cliente Existente Fictício')) <> 3 THEN
    RAISE EXCEPTION 'Um cliente foi removido indevidamente pelo rollback.';
  END IF;
  IF (SELECT count(*) FROM public.services WHERE name='Serviço fictício') <> 1 THEN
    RAISE EXCEPTION 'O serviço foi removido indevidamente pelo rollback.';
  END IF;
END;
$$;
