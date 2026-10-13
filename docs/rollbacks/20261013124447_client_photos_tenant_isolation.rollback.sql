-- ROLLBACK de 20261013124447_client_photos_tenant_isolation
-- Restaura policy ALL ampla de prod (2026-10-13). Idempotente.

DROP POLICY IF EXISTS "client_photos_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "client_photos_update_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "client_photos_delete_own_folder" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users manage client_photos" ON storage.objects;
CREATE POLICY "Authenticated users manage client_photos"
  ON storage.objects
  FOR ALL
  TO public
  USING ((bucket_id = 'client_photos'::text) AND (auth.role() = 'authenticated'::text))
  WITH CHECK ((bucket_id = 'client_photos'::text) AND (auth.role() = 'authenticated'::text));
