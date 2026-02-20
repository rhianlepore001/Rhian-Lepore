-- Client CRM Enhancements Migration
-- Adds support for client photos, ratings, visit tracking, and hair history

-- Add missing fields to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_visit TIMESTAMP WITH TIME ZONE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS next_prediction TEXT;

-- Create hair_records table for visual haircut history
CREATE TABLE IF NOT EXISTS hair_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  service TEXT NOT NULL,
  barber TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on hair_records
ALTER TABLE hair_records ENABLE ROW LEVEL SECURITY;

-- RLS Policy for hair_records
CREATE POLICY "Users manage own hair records" ON hair_records
  FOR ALL USING (auth.uid() = user_id);

-- Create storage bucket for client photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client_photos', 'client_photos', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client photos
CREATE POLICY "Public read client photos" ON storage.objects 
  FOR SELECT USING (bucket_id = 'client_photos');
  
CREATE POLICY "Authenticated upload client photos" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'client_photos' AND auth.role() = 'authenticated');
  
CREATE POLICY "Authenticated update client photos" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'client_photos' AND auth.role() = 'authenticated');
  
CREATE POLICY "Authenticated delete client photos" ON storage.objects 
  FOR DELETE USING (bucket_id = 'client_photos' AND auth.role() = 'authenticated');

-- Add professional_id to appointments if not exists (for tracking barber)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES team_members(id) ON DELETE SET NULL;
