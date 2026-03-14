-- ============================================================================
-- US-026: Fix RLS Bug in client_semantic_memory
-- ============================================================================
-- Problem: Users of Tenant A can see data from Tenant B due to missing RLS policy.
-- Solution: Add company_id to clients table and create RLS policy that filters by company_id.
--
-- Security Impact: CRITICAL
-- This fixes a multi-tenant isolation vulnerability where RLS policies used
-- USING (true), allowing any authenticated user to see all records.
-- ============================================================================

-- Step 1: Add company_id column to clients table if it doesn't exist
-- This establishes the multi-tenant relationship
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE clients ADD COLUMN company_id UUID;
    END IF;
END $$;

-- Step 2: Populate company_id for existing clients (from user's profile company_id)
-- This ensures all existing records have proper company isolation
UPDATE clients
SET company_id = (
    SELECT company_id FROM profiles WHERE id = clients.user_id
)
WHERE company_id IS NULL;

-- Step 3: Drop the overly permissive RLS policy on client_semantic_memory
-- The current policy allows ANYONE authenticated to see ALL records (USING (true))
DROP POLICY IF EXISTS "Permitir gestão de memória semântica por barbeiros" ON client_semantic_memory;

-- Step 4: Create proper company-based RLS policy for client_semantic_memory
-- This policy ensures users can ONLY see memories for clients in their company
CREATE POLICY "client_semantic_memory_company_isolation" ON client_semantic_memory
  FOR ALL
  TO authenticated
  USING (
    -- A user can access a client's semantic memory if the client's company_id
    -- matches the user's company_id from their profile
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Ensure INSERT/UPDATE/DELETE also respects company_id
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Step 5: Grant appropriate permissions
-- Ensure authenticated users can perform all operations through the RLS policy
GRANT SELECT, INSERT, UPDATE, DELETE ON client_semantic_memory TO authenticated;

-- Step 6: Add index on company_id for performance
-- This helps the RLS policy execute efficiently
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);

-- Verification query (can be run post-migration to verify):
-- SELECT * FROM pg_policies WHERE tablename = 'client_semantic_memory' AND policyname = 'client_semantic_memory_company_isolation';
