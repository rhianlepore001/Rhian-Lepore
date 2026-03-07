-- ==========================================================================
-- US-015B: STAFF AUTH AND MULTI-TENANT RLS FOUNDATION
-- ==========================================================================
-- This migration updates the database to support multiple users per business.
-- It adds `role` and `company_id` to profiles and updates all RLS policies
-- to allow staff members to access their company's data.
-- ==========================================================================

-- ========================================
-- STEP 1: UPDATE PROFILES TABLE
-- ========================================

-- Add columns to profiles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'staff'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_id') THEN
        ALTER TABLE profiles ADD COLUMN company_id TEXT;
        
        -- Automatically set company_id to the user's own id for existing owners
        UPDATE profiles SET company_id = id WHERE role = 'owner' AND company_id IS NULL;
    END IF;
END $$;

-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- We need a function to easily get the user's company_id for use in RLS policies.
-- This is critical for performance to avoid infinite recursion or complex joins in every query.
CREATE OR REPLACE FUNCTION get_auth_company_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id TEXT;
BEGIN
  SELECT COALESCE(company_id, id) INTO v_company_id FROM profiles WHERE id = auth.uid();
  RETURN v_company_id;
END;
$$;

-- We also need a function to get the user's role
CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  RETURN v_role;
END;
$$;

-- ========================================
-- STEP 2: DROP EXISTING USER-ONLY POLICIES
-- ========================================
-- We drop the policies created in 20260129_consolidate_rls_final.sql

DROP POLICY IF EXISTS "Appointments: user isolation" ON appointments;
DROP POLICY IF EXISTS "Clients: user isolation" ON clients;
DROP POLICY IF EXISTS "Services: user isolation" ON services;
DROP POLICY IF EXISTS "Categories: user isolation" ON service_categories;
DROP POLICY IF EXISTS "Team: user isolation" ON team_members;
DROP POLICY IF EXISTS "Settings: user isolation" ON business_settings;
DROP POLICY IF EXISTS "Profiles: user isolation" ON profiles;
DROP POLICY IF EXISTS "Queue: user isolation" ON queue_entries;
DROP POLICY IF EXISTS "Finance: user isolation" ON finance_records;
DROP POLICY IF EXISTS "Campaigns: user isolation" ON campaigns;
DROP POLICY IF EXISTS "Hair records: user isolation" ON hair_records;

-- ========================================
-- STEP 3: CREATE NEW COMPANY-BASED POLICIES
-- ========================================

-- PROFILES
-- Users can read their own profile OR the profiles of users in their company (owners can see staff, staff can see owners/other staff for scheduling)
CREATE POLICY "Profiles: company isolation"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR 
    company_id = get_auth_company_id() OR
    id = get_auth_company_id() -- In case they are staff looking at the owner's profile
  );

-- Users can only UPDATE their own profile
CREATE POLICY "Profiles: own update"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- APPOINTMENTS - Company isolation
CREATE POLICY "Appointments: company isolation"
  ON appointments
  FOR ALL
  TO authenticated
  USING (user_id = get_auth_company_id())
  WITH CHECK (user_id = get_auth_company_id());

-- CLIENTS - Company isolation
CREATE POLICY "Clients: company isolation"
  ON clients
  FOR ALL
  TO authenticated
  USING (user_id = get_auth_company_id())
  WITH CHECK (user_id = get_auth_company_id());

-- SERVICES - Company isolation
CREATE POLICY "Services: company isolation"
  ON services
  FOR ALL
  TO authenticated
  USING (user_id = get_auth_company_id())
  WITH CHECK (user_id = get_auth_company_id());

-- SERVICE CATEGORIES - Company isolation
CREATE POLICY "Categories: company isolation"
  ON service_categories
  FOR ALL
  TO authenticated
  USING (user_id = get_auth_company_id())
  WITH CHECK (user_id = get_auth_company_id());

-- TEAM MEMBERS (PROFESSIONALS) - Company isolation
CREATE POLICY "Team: company isolation"
  ON team_members
  FOR ALL
  TO authenticated
  USING (user_id = get_auth_company_id())
  WITH CHECK (user_id = get_auth_company_id());

-- BUSINESS SETTINGS - Company isolation
-- Read for everyone in the company. Update ONLY for owners.
CREATE POLICY "Settings: company read"
  ON business_settings
  FOR SELECT
  TO authenticated
  USING (user_id = get_auth_company_id());

CREATE POLICY "Settings: owner update"
  ON business_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = get_auth_company_id() AND get_auth_role() = 'owner')
  WITH CHECK (user_id = get_auth_company_id() AND get_auth_role() = 'owner');

-- QUEUE MANAGEMENT - Company isolation
CREATE POLICY "Queue: company isolation"
  ON queue_entries
  FOR ALL
  TO authenticated
  USING (user_id = get_auth_company_id())
  WITH CHECK (user_id = get_auth_company_id());

-- FINANCE RECORDS - Company isolation
-- TODO: Refine this later to hide overall financials from staff if needed. 
-- For now, company isolation base. We can restrict views on the frontend or create a specific read policy.
-- Assuming we want strict privacy: Owners can see all, staff can see only their own if linked (finance table doesn't have staff_id yet, usually linked to professional).
-- Let's stick to base company isolation and handle specific filtering in the UI/RPCs first to avoid breaking existing flows.
CREATE POLICY "Finance: company isolation"
  ON finance_records
  FOR ALL
  TO authenticated
  USING (user_id = get_auth_company_id())
  WITH CHECK (user_id = get_auth_company_id());

-- CAMPAIGNS - Company isolation
CREATE POLICY "Campaigns: company isolation"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (user_id = get_auth_company_id())
  WITH CHECK (user_id = get_auth_company_id());

-- HAIR RECORDS - Company isolation
CREATE POLICY "Hair records: company isolation"
  ON hair_records
  FOR ALL
  TO authenticated
  USING (user_id = get_auth_company_id())
  WITH CHECK (user_id = get_auth_company_id());

-- ========================================
-- VERIFICATION
-- ========================================
-- The public_bookings policies don't need user_id changes because they use business_id 
-- which maps directly to the owner's user_id anyway, but we should make sure staff can manage them.

DROP POLICY IF EXISTS "Public bookings: business read" ON public_bookings;
DROP POLICY IF EXISTS "Public bookings: business update" ON public_bookings;

CREATE POLICY "Public bookings: company read"
  ON public_bookings
  FOR SELECT
  TO authenticated
  USING (business_id = get_auth_company_id());

CREATE POLICY "Public bookings: company update"
  ON public_bookings
  FOR UPDATE
  TO authenticated
  USING (business_id = get_auth_company_id())
  WITH CHECK (business_id = get_auth_company_id());
