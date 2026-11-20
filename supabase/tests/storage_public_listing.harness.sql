CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE FUNCTION public.get_auth_company_id() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT current_setting('test.company_id', true);
$$;
CREATE FUNCTION public.get_auth_role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT current_setting('test.company_role', true);
$$;
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT (string_to_array($1, '/'))[:cardinality(string_to_array($1, '/')) - 1];
$$;
CREATE TABLE storage.objects (bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage, auth TO anon, authenticated;
GRANT SELECT ON storage.objects TO anon, authenticated;
CREATE POLICY fixture_public_select ON storage.objects FOR SELECT USING (true);

INSERT INTO storage.objects (bucket_id, name) VALUES
  ('product_images', '10000000-0000-4000-8000-000000000001/product.webp'),
  ('product_images', '10000000-0000-4000-8000-000000000002/product.webp'),
  ('service_images', '10000000-0000-4000-8000-000000000001/service.webp'),
  ('service_images', '10000000-0000-4000-8000-000000000002/service.webp'),
  ('client_photos', '10000000-0000-4000-8000-000000000002/client.webp'),
  ('galleries', '10000000-0000-4000-8000-000000000001/gallery.webp'),
  ('bug-screenshots', 'fixture.webp');

\ir ../migrations/20261120131503_restrict_storage_object_listing.sql
\ir storage_public_listing.test.sql
\ir ../../docs/rollbacks/20261120131503_restrict_storage_object_listing.rollback.sql

SET ROLE anon;
DO $$
BEGIN
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'product_images') <> 2 THEN
    RAISE EXCEPTION 'Rollback did not restore the fixture policy';
  END IF;
END;
$$;
RESET ROLE;
