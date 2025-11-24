-- Create storage buckets for business branding
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('logos', 'logos', true),
  ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Logos are publicly accessible
CREATE POLICY "Logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'logos' );

-- Policy: Users can upload their own logo
CREATE POLICY "Users can upload their own logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can update their own logo
CREATE POLICY "Users can update their own logo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own logo
CREATE POLICY "Users can delete their own logo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Covers are publicly accessible
CREATE POLICY "Covers are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'covers' );

-- Policy: Users can upload their own cover
CREATE POLICY "Users can upload their own cover"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'covers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can update their own cover
CREATE POLICY "Users can update their own cover"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'covers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own cover
CREATE POLICY "Users can delete their own cover"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'covers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
