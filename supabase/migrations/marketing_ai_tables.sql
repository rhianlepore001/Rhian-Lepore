-- Marketing AI Features Migration
-- Creates tables for content calendar, marketing assets, and AI campaign data

-- Content Calendar table
CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL,
  content_type TEXT NOT NULL, -- 'carousel', 'reel', 'story', 'post'
  topic TEXT NOT NULL,
  caption TEXT NOT NULL,
  hashtags TEXT[] NOT NULL,
  posting_time TIME,
  status TEXT DEFAULT 'pending', -- 'pending', 'posted', 'skipped'
  ai_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Assets table (for AI-edited photos)
CREATE TABLE IF NOT EXISTS marketing_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  original_image_url TEXT NOT NULL,
  edited_image_url TEXT,
  caption TEXT,
  hashtags TEXT[],
  ai_suggestions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add AI fields to existing campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ai_suggestions JSONB;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS expected_impact TEXT;

-- Enable RLS
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users manage own calendar" ON content_calendar
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own assets" ON marketing_assets
  FOR ALL USING (auth.uid() = user_id);

-- Storage bucket for marketing images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('marketing_images', 'marketing_images', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies for marketing images
CREATE POLICY "Public read marketing images" ON storage.objects 
  FOR SELECT USING (bucket_id = 'marketing_images');
  
CREATE POLICY "Authenticated upload marketing images" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'marketing_images' AND auth.role() = 'authenticated');
  
CREATE POLICY "Authenticated update marketing images" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'marketing_images' AND auth.role() = 'authenticated');
  
CREATE POLICY "Authenticated delete marketing images" ON storage.objects 
  FOR DELETE USING (bucket_id = 'marketing_images' AND auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_calendar_user_date 
  ON content_calendar(user_id, date);

CREATE INDEX IF NOT EXISTS idx_marketing_assets_user_created 
  ON marketing_assets(user_id, created_at);
