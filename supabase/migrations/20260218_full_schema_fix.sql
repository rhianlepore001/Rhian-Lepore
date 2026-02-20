-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE & TRIGGER
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  business_name TEXT,
  phone TEXT,
  user_type TEXT DEFAULT 'barber', -- 'barber' or 'beauty'
  region TEXT DEFAULT 'BR', -- 'BR' or 'PT'
  logo_url TEXT,
  cover_photo_url TEXT,
  address_street TEXT,
  instagram_handle TEXT,
  public_booking_enabled BOOLEAN DEFAULT false,
  booking_lead_time_hours INTEGER DEFAULT 2,
  max_bookings_per_day INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true); -- Adjust if you want strict privacy, but usually public booking needs this.

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, business_name, phone, user_type, region)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'type', 'barber'),
    COALESCE(new.raw_user_meta_data->>'region', 'BR')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. BUSINESS SETTINGS
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  business_hours JSONB DEFAULT '{}'::jsonb,
  cancellation_policy TEXT DEFAULT 'flexible',
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON business_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON business_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON business_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update onboarding step
CREATE OR REPLACE FUNCTION update_onboarding_step(
  p_user_id UUID,
  p_step INTEGER,
  p_completed BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO business_settings (user_id, onboarding_step, onboarding_completed)
  VALUES (p_user_id, p_step, p_completed)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    onboarding_step = GREATEST(business_settings.onboarding_step, p_step),
    onboarding_completed = CASE WHEN p_completed THEN true ELSE business_settings.onboarding_completed END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own team" ON team_members
  FOR ALL USING (auth.uid() = user_id);


-- 4. SERVICE CATEGORIES
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own categories" ON service_categories
  FOR ALL USING (auth.uid() = user_id);


-- 5. SERVICES
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own services" ON services
  FOR ALL USING (auth.uid() = user_id);


-- 6. SERVICE UPSELLS
CREATE TABLE IF NOT EXISTS service_upsells (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  parent_service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  upsell_service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE service_upsells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own upsells" ON service_upsells
  FOR ALL USING (auth.uid() = user_id);


-- 7. CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  loyalty_tier TEXT DEFAULT 'Bronze',
  total_visits INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own clients" ON clients
  FOR ALL USING (auth.uid() = user_id);


-- 8. APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  service TEXT NOT NULL, -- Keeping as text for now as per frontend, or link to services table if preferred
  appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'Pending', -- 'Pending', 'Confirmed', 'Completed', 'Cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own appointments" ON appointments
  FOR ALL USING (auth.uid() = user_id);


-- 9. FINANCE RECORDS
CREATE TABLE IF NOT EXISTS finance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  barber_name TEXT,
  revenue DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  commission_value DECIMAL(10,2) DEFAULT 0,
  auto_split BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE finance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own finance" ON finance_records
  FOR ALL USING (auth.uid() = user_id);


-- 10. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('team_photos', 'team_photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('service_images', 'service_images', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Generic for all buckets for simplicity, or specific if preferred)
-- Allow public read
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id IN ('logos', 'covers', 'team_photos', 'service_images') );
-- Allow authenticated upload/update/delete
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK ( auth.role() = 'authenticated' );
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING ( auth.role() = 'authenticated' );
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING ( auth.role() = 'authenticated' );
