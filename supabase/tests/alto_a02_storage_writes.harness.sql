CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    CASE WHEN current_user IN ('authenticated','anon','service_role') THEN current_user ELSE 'anon' END
  )
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(name, '/'); $$;
GRANT EXECUTE ON FUNCTION storage.foldername(text) TO anon, authenticated, service_role;

CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean DEFAULT false);
INSERT INTO storage.buckets (id, name, public) VALUES
  ('marketing_images','marketing_images',true),
  ('logos','logos',true),
  ('covers','covers',true),
  ('team_photos','team_photos',true),
  ('service_images','service_images',true);

CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bucket_id text REFERENCES storage.buckets(id),
  name text NOT NULL,
  UNIQUE (bucket_id, name)
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;

-- Prod-like broad + folder-scoped subset
CREATE POLICY "Public read marketing images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'marketing_images');
CREATE POLICY "Authenticated upload marketing images" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'marketing_images' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated update marketing images" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'marketing_images' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete marketing images" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'marketing_images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Delete" ON storage.objects
  FOR DELETE TO public
  USING (auth.role() = 'authenticated' AND bucket_id = ANY (ARRAY['logos','covers','team_photos','service_images']));

CREATE POLICY "user_upload_logo" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND auth.uid() = ((storage.foldername(name))[1])::uuid);
CREATE POLICY "user_delete_logo" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND auth.uid() = ((storage.foldername(name))[1])::uuid);
CREATE POLICY "public_read_logos" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'logos');

CREATE POLICY "Auth Manage Own Folder Team Photos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'team_photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'team_photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Public Read Access Team Photos" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'team_photos');

CREATE POLICY "Users Manage Own Service Images" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'service_images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'service_images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Public Read Service Images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'service_images');
