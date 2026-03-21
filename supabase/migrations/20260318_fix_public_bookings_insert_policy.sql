-- ==========================================================================
-- FIX: Restore INSERT Policy for public_bookings (Anon & Public Access)
-- ==========================================================================
-- Issue: US-021 & earlier migrations removed INSERT policy but never recreated it
-- Impact: Public clients cannot create bookings (RLS violation)
-- Solution: Add back the INSERT policy that allows anonymous and authenticated users
-- ==========================================================================

-- Add INSERT policy for public_bookings (anyone can create)
CREATE POLICY "Public bookings: public insert"
  ON public_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Verification
-- After applying this migration, verify the policy exists:
-- SELECT policyname FROM pg_policies
-- WHERE tablename = 'public_bookings' AND policyname LIKE '%insert%';
