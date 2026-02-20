-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users manage their own team
CREATE POLICY "Users manage their own team"
  ON team_members FOR ALL
  USING (auth.uid() = user_id);

-- Create storage bucket for team photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team_photos', 'team_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Team photos are publicly accessible
CREATE POLICY "Team photos are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'team_photos' );

-- Policy: Users can upload their own team photos
CREATE POLICY "Users can upload team photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'team_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can update their own team photos
CREATE POLICY "Users can update team photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'team_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own team photos
CREATE POLICY "Users can delete team photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'team_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
