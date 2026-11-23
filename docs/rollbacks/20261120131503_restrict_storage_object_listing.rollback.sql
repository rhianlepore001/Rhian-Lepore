BEGIN;
DROP POLICY IF EXISTS agendix_public_assets_no_anon_select ON storage.objects;
DROP POLICY IF EXISTS agendix_public_assets_scoped_select ON storage.objects;
COMMIT;
