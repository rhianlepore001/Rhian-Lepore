-- Fix RLS for public access to services, categories and business settings
-- This migration ensures that the public booking page can display the necessary information.

-- 1. Ensure public read access to service categories
DROP POLICY IF EXISTS "Public can view categories" ON service_categories;
CREATE POLICY "Public can view categories"
  ON service_categories FOR SELECT
  USING (true);

-- 2. Ensure public read access to services (double check)
DROP POLICY IF EXISTS "Public can view services" ON services;
CREATE POLICY "Public can view services"
  ON services FOR SELECT
  USING (active = true);

-- 3. Ensure public read access to business settings
DROP POLICY IF EXISTS "Public can view business settings" ON business_settings;
CREATE POLICY "Public can view business settings"
  ON business_settings FOR SELECT
  USING (true);

-- 4. Ensure public read access to team members (if not already there)
DROP POLICY IF EXISTS "Public can view team members" ON team_members;
CREATE POLICY "Public can view team members"
  ON team_members FOR SELECT
  USING (active = true);

-- 5. Ensure public read access to profiles (if not already there)
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
CREATE POLICY "Public can view profiles"
  ON profiles FOR SELECT
  USING (true);
