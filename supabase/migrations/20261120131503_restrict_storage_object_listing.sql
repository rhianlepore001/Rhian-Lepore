BEGIN;

CREATE POLICY agendix_public_assets_no_anon_select
  ON storage.objects AS RESTRICTIVE FOR SELECT TO anon
  USING (bucket_id NOT IN (
    'avatars', 'client_photos', 'covers', 'galleries', 'logos',
    'marketing_images', 'product_images', 'service_images', 'team_photos'
  ));

CREATE POLICY agendix_public_assets_scoped_select
  ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    CASE
      WHEN bucket_id = 'product_images' THEN
        (SELECT public.get_auth_role()) = 'owner'
        AND (storage.foldername(name))[1] = (SELECT public.get_auth_company_id())
      WHEN bucket_id = 'service_images' THEN
        (storage.foldername(name))[1] = (SELECT public.get_auth_company_id())
      WHEN bucket_id IN ('avatars', 'client_photos', 'covers', 'galleries', 'logos',
                         'marketing_images', 'team_photos') THEN
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
      ELSE true
    END
  );

COMMIT;
