-- Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS for categories
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own categories"
  ON service_categories FOR ALL
  USING (auth.uid() = user_id);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS for services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own services"
  ON services FOR ALL
  USING (auth.uid() = user_id);

-- Create service_upsells table
CREATE TABLE IF NOT EXISTS service_upsells (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  upsell_service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  UNIQUE(parent_service_id, upsell_service_id)
);

-- Enable RLS for upsells
ALTER TABLE service_upsells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own upsells"
  ON service_upsells FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM services
      WHERE services.id = service_upsells.parent_service_id
      AND services.user_id = auth.uid()
    )
  );

-- Create storage bucket for service images
INSERT INTO storage.buckets (id, name, public)
VALUES ('service_images', 'service_images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Service images are publicly accessible
CREATE POLICY "Service images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'service_images' );

-- Policy: Users can upload their own service images
CREATE POLICY "Users can upload service images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service_images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can update their own service images
CREATE POLICY "Users can update service images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'service_images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own service images
CREATE POLICY "Users can delete service images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'service_images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
