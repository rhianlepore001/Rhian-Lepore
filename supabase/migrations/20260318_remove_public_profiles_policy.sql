-- ============================================================================
-- US-027: Remove Public Profiles Data Exposure
-- ============================================================================
-- Problem: Policy allows ANYONE (authenticated) to see ALL user profiles.
-- This exposes PII and violates GDPR/privacy requirements.
--
-- Solution: Drop the overly permissive public policy and ensure authenticated users
-- can ONLY see profiles from their own company.
--
-- Security Impact: CRITICAL (GDPR/Privacy Violation)
-- This fixes unauthorized data exposure of all profiles to any authenticated user.
-- ============================================================================

-- Step 1: Drop the overly permissive "Public profiles are viewable by everyone" policy
-- This policy allows ANYONE authenticated to see ALL user profiles (privacy violation)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Step 2: Ensure proper authenticated RLS policy exists
-- Create (or keep existing) company isolation policy for profiles
CREATE POLICY IF NOT EXISTS "Profiles: company isolation"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see:
    -- 1. Their own profile
    id = auth.uid() OR
    -- 2. Profiles from their company (staff can see other staff, owners can see staff)
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    ) OR
    -- 3. The company owner's profile (for staff members)
    id = (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Step 3: Ensure UPDATE/DELETE/INSERT policies exist for proper company isolation
-- Users should only UPDATE their own profile
DROP POLICY IF EXISTS "Profiles: own update" ON profiles;
CREATE POLICY "Profiles: own update"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users cannot INSERT profiles (handled by auth trigger)
DROP POLICY IF EXISTS "Profiles: users can't insert" ON profiles;
CREATE POLICY "Profiles: users can't insert"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Users cannot DELETE profiles
DROP POLICY IF EXISTS "Profiles: users can't delete" ON profiles;
CREATE POLICY "Profiles: users can't delete"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (false);

-- Step 4: Grant appropriate permissions (SELECT only for authenticated)
GRANT SELECT ON profiles TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON profiles FROM authenticated;
-- Note: UPDATE to own profile will be allowed by specific update policy above

-- Verification:
-- SELECT policyname, qual FROM pg_policies WHERE tablename = 'profiles' AND policyname LIKE 'Profiles%';
-- SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone';
-- (Should return no rows after this migration)
