-- Harness local: storage.objects policies for client_photos ≈ prod 2026-10-13
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
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

-- Minimal storage.foldername (Supabase): split path by /
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT string_to_array(name, '/');
$$;
GRANT EXECUTE ON FUNCTION storage.foldername(text) TO anon, authenticated, service_role;

CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false
);
INSERT INTO storage.buckets (id, name, public) VALUES ('client_photos', 'client_photos', true);

CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bucket_id text REFERENCES storage.buckets(id),
  name text NOT NULL,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (bucket_id, name)
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE storage.objects TO anon, authenticated, service_role;

-- Prod policies (client_photos subset)
CREATE POLICY "Public read access for client_photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'client_photos');

CREATE POLICY "Allow authenticated users to view their own client photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'client_photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users manage client_photos" ON storage.objects
  FOR ALL TO public
  USING ((bucket_id = 'client_photos'::text) AND (auth.role() = 'authenticated'::text))
  WITH CHECK ((bucket_id = 'client_photos'::text) AND (auth.role() = 'authenticated'::text));
