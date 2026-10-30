BEGIN;

CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  created_by uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('trinks', 'fresha', 'appbarber', 'booksy', 'avec', 'spreadsheet', 'contacts')),
  kind text NOT NULL CHECK (kind IN ('client', 'service')),
  status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'review', 'completed', 'undone')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id)
);

CREATE TABLE public.import_staging_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  batch_id uuid NOT NULL,
  row_number integer NOT NULL CHECK (row_number BETWEEN 1 AND 1000000),
  raw_data jsonb NOT NULL CHECK (jsonb_typeof(raw_data) = 'object' AND pg_column_size(raw_data) <= 1048576),
  normalized_data jsonb CHECK (normalized_data IS NULL OR (jsonb_typeof(normalized_data) = 'object' AND pg_column_size(normalized_data) <= 65536)),
  outcome text NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'imported', 'updated', 'ignored', 'error')),
  reason text CHECK (char_length(reason) <= 1000),
  FOREIGN KEY (company_id, batch_id) REFERENCES public.import_batches(company_id, id) ON DELETE CASCADE,
  UNIQUE (batch_id, row_number)
);
CREATE INDEX import_staging_company_batch_idx ON public.import_staging_rows(company_id, batch_id);

CREATE TABLE public.import_column_mappings (
  company_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('trinks', 'fresha', 'appbarber', 'booksy', 'avec', 'spreadsheet', 'contacts')),
  kind text NOT NULL CHECK (kind IN ('client', 'service')),
  mapping jsonb NOT NULL CHECK (jsonb_typeof(mapping) = 'object' AND pg_column_size(mapping) <= 16384),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, source, kind)
);

CREATE UNIQUE INDEX import_clients_tenant_id_idx ON public.clients(user_id, id);
CREATE UNIQUE INDEX import_services_tenant_id_idx ON public.services(user_id, id);
CREATE TABLE public.import_source_links (
  company_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('trinks', 'fresha', 'appbarber', 'booksy', 'avec', 'spreadsheet', 'contacts')),
  kind text NOT NULL CHECK (kind IN ('client', 'service')),
  source_id text NOT NULL CHECK (char_length(btrim(source_id)) BETWEEN 1 AND 255),
  client_id uuid,
  service_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, source, kind, source_id),
  CHECK ((kind = 'client' AND client_id IS NOT NULL AND service_id IS NULL) OR (kind = 'service' AND service_id IS NOT NULL AND client_id IS NULL)),
  FOREIGN KEY (company_id, client_id) REFERENCES public.clients(user_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, service_id) REFERENCES public.services(user_id, id) ON DELETE CASCADE
);
CREATE INDEX import_source_links_client_idx ON public.import_source_links(company_id, client_id) WHERE client_id IS NOT NULL;
CREATE INDEX import_source_links_service_idx ON public.import_source_links(company_id, service_id) WHERE service_id IS NOT NULL;

ALTER TABLE public.import_source_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_staging_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_column_mappings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.import_batches, public.import_staging_rows, public.import_column_mappings, public.import_source_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batches, public.import_staging_rows, public.import_column_mappings, public.import_source_links TO authenticated;
GRANT ALL ON public.import_batches, public.import_staging_rows, public.import_column_mappings, public.import_source_links TO service_role;

CREATE POLICY "Import batches owner" ON public.import_batches FOR ALL TO authenticated
  USING (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner')
  WITH CHECK (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner' AND created_by = (SELECT auth.uid()));
CREATE POLICY "Import staging owner" ON public.import_staging_rows FOR ALL TO authenticated
  USING (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner')
  WITH CHECK (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');
CREATE POLICY "Import source links owner" ON public.import_source_links FOR ALL TO authenticated
  USING (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner')
  WITH CHECK (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');
CREATE POLICY "Import mappings owner" ON public.import_column_mappings FOR ALL TO authenticated
  USING (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner')
  WITH CHECK (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');

COMMIT;
