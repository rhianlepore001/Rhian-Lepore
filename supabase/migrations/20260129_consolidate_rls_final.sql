-- ==========================================================================
-- CONSOLIDATED RLS SECURITY MIGRATION - FINAL FIX
-- ==========================================================================
-- This migration consolidates all previous attempt at fixing RLS policies
-- and creates a clean, secure multi-tenant isolation system.
--
-- Applied: 2026-01-29
-- Replaces: fix_rls_policies_authenticated.sql, security_fix.sql, cleanup_policies.sql
-- ==========================================================================

-- ========================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ========================================

-- Appointments
DROP POLICY IF EXISTS "Users can only see their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users manage own appointments" ON appointments;
DROP POLICY IF EXISTS "Appointments isolation" ON appointments;

-- Clients
DROP POLICY IF EXISTS "Users can only see their own clients" ON clients;
DROP POLICY IF EXISTS "Users can manage their own clients" ON clients;
DROP POLICY IF EXISTS "Users manage own clients" ON clients;
DROP POLICY IF EXISTS "Clients isolation" ON clients;

-- Services
DROP POLICY IF EXISTS "Users can only see their own services" ON services;
DROP POLICY IF EXISTS "Users manage own services" ON services;
DROP POLICY IF EXISTS "Services isolation" ON services;

-- Service Categories
DROP POLICY IF EXISTS "Users can only see their own categories" ON service_categories;
DROP POLICY IF EXISTS "Users manage own categories" ON service_categories;
DROP POLICY IF EXISTS "Categories isolation" ON service_categories;

-- Team Members
DROP POLICY IF EXISTS "Users can only see their own team" ON team_members;
DROP POLICY IF EXISTS "Users manage own team" ON team_members;
DROP POLICY IF EXISTS "Team isolation" ON team_members;

-- Business Settings
DROP POLICY IF EXISTS "Users can only see their own settings" ON business_settings;
DROP POLICY IF EXISTS "Users manage own settings" ON business_settings;
DROP POLICY IF EXISTS "Settings isolation" ON business_settings;

-- Profiles
DROP POLICY IF EXISTS "Users can only see their own profile" ON profiles;
DROP POLICY IF EXISTS "Users manage own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles isolation" ON profiles;

-- Public Bookings
DROP POLICY IF EXISTS "Businesses can see their bookings" ON public_bookings;
DROP POLICY IF EXISTS "Businesses can update their bookings" ON public_bookings;
DROP POLICY IF EXISTS "Anyone can create bookings" ON public_bookings;
DROP POLICY IF EXISTS "Public booking isolation read" ON public_bookings;
DROP POLICY IF EXISTS "Public booking isolation write" ON public_bookings;

-- Queue Management
DROP POLICY IF EXISTS "Users manage own queue" ON queue_management;
DROP POLICY IF EXISTS "Queue isolation" ON queue_management;

-- Finance Records
DROP POLICY IF EXISTS "Users can only see their own finance records" ON finance_records;
DROP POLICY IF EXISTS "Users manage own finance" ON finance_records;
DROP POLICY IF EXISTS "Finance isolation" ON finance_records;

-- Campaigns
DROP POLICY IF EXISTS "Users can only see their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users manage own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Campaigns isolation" ON campaigns;

-- Hair Records
DROP POLICY IF EXISTS "Users can only see their own records" ON hair_records;
DROP POLICY IF EXISTS "Users manage own hair records" ON hair_records;
DROP POLICY IF EXISTS "Hair records isolation" ON hair_records;

-- ========================================
-- STEP 2: ENSURE RLS IS ENABLED
-- ========================================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE hair_records ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 3: CREATE CLEAN, CONSOLIDATED POLICIES
-- ========================================

-- APPOINTMENTS - User ID isolation
CREATE POLICY "Appointments: user isolation"
  ON appointments
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- CLIENTS - User ID isolation
CREATE POLICY "Clients: user isolation"
  ON clients
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- SERVICES - User ID isolation
CREATE POLICY "Services: user isolation"
  ON services
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- SERVICE CATEGORIES - User ID isolation
CREATE POLICY "Categories: user isolation"
  ON service_categories
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- TEAM MEMBERS - User ID isolation
CREATE POLICY "Team: user isolation"
  ON team_members
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- BUSINESS SETTINGS - User ID isolation
CREATE POLICY "Settings: user isolation"
  ON business_settings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- PROFILES - Profile ID isolation (id = user_id)
CREATE POLICY "Profiles: user isolation"
  ON profiles
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- PUBLIC BOOKINGS - Business can read, anyone can create
CREATE POLICY "Public bookings: business read"
  ON public_bookings
  FOR SELECT
  TO authenticated
  USING (business_id = auth.uid());

CREATE POLICY "Public bookings: business update"
  ON public_bookings
  FOR UPDATE
  TO authenticated
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

CREATE POLICY "Public bookings: public create"
  ON public_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- QUEUE MANAGEMENT - User ID isolation
CREATE POLICY "Queue: user isolation"
  ON queue_management
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- FINANCE RECORDS - User ID isolation
CREATE POLICY "Finance: user isolation"
  ON finance_records
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- CAMPAIGNS - User ID isolation
CREATE POLICY "Campaigns: user isolation"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- HAIR RECORDS - User ID isolation
CREATE POLICY "Hair records: user isolation"
  ON hair_records
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- STEP 4: VERIFY RPC FUNCTIONS SECURITY
-- ========================================

-- Verify get_dashboard_stats has proper security checks
-- This function already has auth.uid() filtering in the code (verified in security_fix.sql)
-- No changes needed, SECURITY DEFINER is appropriate here

-- Verify get_finance_stats has proper security checks
-- This function already has IF p_user_id != auth.uid() THEN RAISE EXCEPTION check
-- No changes needed, SECURITY DEFINER is appropriate here

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Show RLS status for all tables
SELECT 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'appointments', 'clients', 'services', 'service_categories',
    'team_members', 'business_settings', 'profiles', 'public_bookings',
    'queue_management', 'finance_records', 'campaigns', 'hair_records'
  )
ORDER BY tablename;

-- Show all active policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as "USING expression",
  with_check as "WITH CHECK expression"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==========================================================================
-- TESTING RECOMMENDATIONS
-- ==========================================================================
-- After applying this migration:
-- 1. Create 2 test users (User A and User B)
-- 2. Insert data for each user
-- 3. Verify User A cannot see User B's data
-- 4. Verify User B cannot see User A's data
-- 5. Test public_bookings: anyone can create, only business_id can read their own
-- ==========================================================================
