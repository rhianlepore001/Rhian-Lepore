-- Add client_photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('client_photos', 'client_photos', true) ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

-- Recreate policies with client_photos included
CREATE POLICY "Public Access" ON storage.objects 
  FOR SELECT 
  USING ( bucket_id IN ('logos', 'covers', 'team_photos', 'service_images', 'client_photos') );

CREATE POLICY "Auth Upload" ON storage.objects 
  FOR INSERT 
  WITH CHECK ( auth.role() = 'authenticated' AND bucket_id IN ('logos', 'covers', 'team_photos', 'service_images', 'client_photos') );

CREATE POLICY "Auth Update" ON storage.objects 
  FOR UPDATE 
  USING ( auth.role() = 'authenticated' AND bucket_id IN ('logos', 'covers', 'team_photos', 'service_images', 'client_photos') );

CREATE POLICY "Auth Delete" ON storage.objects 
  FOR DELETE 
  USING ( auth.role() = 'authenticated' AND bucket_id IN ('logos', 'covers', 'team_photos', 'service_images', 'client_photos') );
