-- ROLLBACK de 20261013123100_storage_drop_broad_writes (prod 2026-10-13)

DROP POLICY IF EXISTS "Authenticated upload marketing images" ON storage.objects;
CREATE POLICY "Authenticated upload marketing images" ON storage.objects
  FOR INSERT TO public
  WITH CHECK ((bucket_id = 'marketing_images'::text) AND (auth.role() = 'authenticated'::text));

DROP POLICY IF EXISTS "Authenticated update marketing images" ON storage.objects;
CREATE POLICY "Authenticated update marketing images" ON storage.objects
  FOR UPDATE TO public
  USING ((bucket_id = 'marketing_images'::text) AND (auth.role() = 'authenticated'::text));

DROP POLICY IF EXISTS "Authenticated delete marketing images" ON storage.objects;
CREATE POLICY "Authenticated delete marketing images" ON storage.objects
  FOR DELETE TO public
  USING ((bucket_id = 'marketing_images'::text) AND (auth.role() = 'authenticated'::text));

DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete" ON storage.objects
  FOR DELETE TO public
  USING ((auth.role() = 'authenticated'::text) AND (bucket_id = ANY (ARRAY['logos'::text, 'covers'::text, 'team_photos'::text, 'service_images'::text])));
