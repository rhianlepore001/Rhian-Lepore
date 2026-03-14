# EPIC-003: Technical Debt Remediation — P0 Security Fixes Test Plan

**Date:** 2026-03-18
**Status:** Ready for Testing
**Total Effort:** 8 hours

## Overview

This test plan covers 4 critical security fixes (US-026 through US-029) that address multi-tenant isolation vulnerabilities, RLS policy gaps, and audit trail integrity issues.

**Risk Level:** CRITICAL
**Test Type:** Security & Integration Testing

---

## Migration Files Created

All migrations use timestamp `20260318_*` (March 18, 2026):

1. `20260318_fix_rls_client_semantic_memory.sql` — US-026
2. `20260318_remove_public_profiles_policy.sql` — US-027
3. `20260318_add_rpc_ownership_checks.sql` — US-028
4. `20260318_fix_audit_logs_integrity.sql` — US-029

---

## US-026: Fix RLS Bug in client_semantic_memory

### Problem
Users of Tenant A can see data from Tenant B because the RLS policy used `USING (true)`.

### Solution
Add `company_id` column to `clients` table and create RLS policy that filters by company_id.

### Acceptance Criteria

- [x] **Migration Creates Company Isolation**
  - Migration file created: `20260318_fix_rls_client_semantic_memory.sql`
  - Adds `company_id` column to `clients` table
  - Populates existing clients with company_id from user's profile
  - Creates proper RLS policy filtering by company_id

- [ ] **Apply Migration**
  ```bash
  supabase db push
  ```
  - Migration applies without errors
  - No SQL syntax errors
  - All ALTER TABLE statements succeed

- [ ] **Verify Policy Exists**
  ```sql
  SELECT policyname FROM pg_policies
  WHERE tablename = 'client_semantic_memory'
  AND policyname = 'client_semantic_memory_company_isolation';
  ```
  - Query returns exactly 1 row
  - Policy name: `client_semantic_memory_company_isolation`

- [ ] **Test Positive Case: Own Company's Data**
  - Login as User A (Company A)
  - Query: `SELECT * FROM client_semantic_memory WHERE ...`
  - Result: Can see ONLY client memories for Company A's clients
  - Expected: All returned records belong to User A's company

- [ ] **Test Negative Case: Other Company's Data**
  - Setup: Two test users (User A in Company A, User B in Company B)
  - User A logged in
  - Attempt: Query client_semantic_memory for Company B's client
  - Result: Query returns 0 rows OR raises permission error
  - Expected: User A cannot see User B's client memories

- [ ] **Test INSERT with Proper RLS**
  - User A tries to insert a memory for Company A client
  - Result: INSERT succeeds
  - User A tries to insert memory for Company B client
  - Result: INSERT fails with permission denied

- [ ] **Performance Check**
  - Query time for SELECT on client_semantic_memory: < 100ms
  - Index `idx_clients_company_id` is created and used

**Time Estimate:** 2 hours

---

## US-027: Remove Public Profiles Data Exposure

### Problem
The policy `"Public profiles are viewable by everyone"` allows any authenticated user to see all profiles (GDPR violation).

### Solution
Drop the public policy and ensure RLS restricts profiles to company-level access.

### Acceptance Criteria

- [x] **Migration Removes Public Policy**
  - Migration file created: `20260318_remove_public_profiles_policy.sql`
  - Drops policy: `"Public profiles are viewable by everyone"`
  - Creates company-based policies for SELECT/UPDATE/INSERT/DELETE

- [ ] **Apply Migration**
  ```bash
  supabase db push
  ```
  - Migration applies without errors
  - No foreign key violations

- [ ] **Verify Public Policy is Gone**
  ```sql
  SELECT policyname FROM pg_policies
  WHERE tablename = 'profiles'
  AND policyname = 'Public profiles are viewable by everyone';
  ```
  - Query returns 0 rows
  - Confirm policy was successfully dropped

- [ ] **Test Unauthenticated Access BLOCKED**
  - Unauthenticated request: `SELECT * FROM profiles`
  - Result: 401 Unauthorized OR 403 Forbidden
  - Expected: Cannot access profiles without authentication

- [ ] **Test Authenticated Access - Own Profile**
  - User A logs in
  - Query: `SELECT * FROM profiles WHERE id = auth.uid()`
  - Result: Returns User A's own profile
  - Expected: User can see their own profile

- [ ] **Test Authenticated Access - Company Profiles**
  - User A (Company A) queries profiles
  - Result: Can see User B (also Company A)
  - User A tries to see User C (Company B)
  - Result: User C's profile not returned
  - Expected: Can see only company members

- [ ] **Test UPDATE Own Profile Only**
  - User A updates their own profile: ✅ SUCCESS
  - User A tries to update User B's profile: ❌ PERMISSION DENIED
  - Expected: Can only update own profile

- [ ] **Test INSERT/DELETE Blocked**
  - User A tries to INSERT new profile: ❌ PERMISSION DENIED
  - User A tries to DELETE a profile: ❌ PERMISSION DENIED
  - Expected: Regular users cannot create/delete profiles

- [ ] **PublicBooking Still Works**
  - PublicBooking page loads without errors
  - Can still book appointments as unauthenticated user
  - Confirm this uses public_clients table, not profiles
  - Expected: Public booking flow unaffected

**Time Estimate:** 1.5 hours

---

## US-028: Validate RPC Ownership Checks

### Problem
Stored procedures (get_dashboard_stats, soft_delete_client, soft_delete_appointment) lack company_id validation.
Users could call: `SELECT get_dashboard_stats('attacker-company-id')`

### Solution
Add JWT company_id validation to each RPC.

### Acceptance Criteria

- [x] **Migration Adds Validation Functions**
  - Migration file created: `20260318_add_rpc_ownership_checks.sql`
  - New functions:
    - `get_dashboard_stats(TEXT)` — with company_id check
    - `soft_delete_client(UUID)` — with company_id check
    - `soft_delete_appointment(UUID)` — with company_id check
    - `validate_company_access(UUID, TEXT)` — helper function
    - `log_rpc_call(TEXT, UUID, TEXT, UUID)` — audit logging

- [ ] **Apply Migration**
  ```bash
  supabase db push
  ```
  - Migration applies without errors
  - Functions compile without syntax errors

- [ ] **Verify Functions Exist**
  ```sql
  SELECT routine_name FROM information_schema.routines
  WHERE routine_name IN ('get_dashboard_stats', 'soft_delete_client',
                          'soft_delete_appointment', 'validate_company_access');
  ```
  - Query returns 4 rows
  - All functions created successfully

- [ ] **Test get_dashboard_stats - Authorized Call**
  - User A (Company A) calls: `SELECT get_dashboard_stats('user-a-id')`
  - Result: Returns JSON with dashboard metrics
  - Expected: User can access their own company's stats

- [ ] **Test get_dashboard_stats - Unauthorized Call**
  - User A (Company A) calls: `SELECT get_dashboard_stats('user-b-id')` (User B in Company B)
  - Result: Raises exception: `"Unauthorized: Cannot access data from a different company"`
  - Expected: Call is blocked with clear error message

- [ ] **Test soft_delete_client - Authorized**
  - User A (Company A) deletes their own client
  - Query: `SELECT soft_delete_client(client-a-id)`
  - Result: Returns true, client.deleted_at is set
  - Expected: Deletion succeeds

- [ ] **Test soft_delete_client - Unauthorized**
  - User A tries to delete Company B's client
  - Query: `SELECT soft_delete_client(client-b-id)`
  - Result: Raises exception: `"Unauthorized: Cannot delete client from a different company"`
  - Expected: Deletion is blocked

- [ ] **Test soft_delete_appointment - Authorized**
  - User A deletes their own company's appointment
  - Result: Returns true, appointment deleted
  - Expected: Deletion succeeds

- [ ] **Test soft_delete_appointment - Unauthorized**
  - User A tries to delete Company B's appointment
  - Result: Raises exception
  - Expected: Deletion is blocked

- [ ] **Test Missing JWT**
  - Call RPC with NULL JWT company_id (e.g., via test client without auth)
  - Result: Raises exception: `"No valid JWT company_id. User must be authenticated..."`
  - Expected: All RPCs require valid JWT

- [ ] **Verify Grants**
  ```sql
  SELECT privilege, grantee FROM role_table_grants
  WHERE table_name IN ('clients', 'appointments')
  AND privilege IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  ```
  - service_role has full permissions
  - authenticated has restricted permissions via RLS

**Time Estimate:** 2.5 hours

---

## US-029: Fix audit_logs Fabrication Vulnerability

### Problem
Anyone can INSERT fake records into audit_logs (no RLS, no integrity checks).

### Solution
Enable RLS and restrict INSERT to service_role only.

### Acceptance Criteria

- [x] **Migration Enables RLS & Creates Policies**
  - Migration file created: `20260318_fix_audit_logs_integrity.sql`
  - Enables RLS on audit_logs table
  - Creates 4 policies: read, insert, update, delete
  - Revokes INSERT/UPDATE/DELETE from authenticated
  - Grants SELECT only to authenticated (via RLS)

- [ ] **Apply Migration**
  ```bash
  supabase db push
  ```
  - Migration applies without errors
  - RLS enabled successfully

- [ ] **Verify RLS Enabled**
  ```sql
  SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'audit_logs';
  ```
  - relrowsecurity: t (true)
  - Expected: RLS is active

- [ ] **Verify Policies**
  ```sql
  SELECT policyname FROM pg_policies
  WHERE tablename = 'audit_logs'
  ORDER BY policyname;
  ```
  - Returns 4 policies: audit_logs_delete, audit_logs_insert, audit_logs_read, audit_logs_update
  - Expected: All security policies in place

- [ ] **Test User INSERT BLOCKED**
  - Authenticated user attempts:
    ```sql
    INSERT INTO audit_logs (company_id, user_id, resource_type, action)
    VALUES ('...',auth.uid(),'test','insert')
    ```
  - Result: Permission denied OR policy violation
  - Expected: User cannot insert fake records

- [ ] **Test User SELECT Works**
  - Authenticated user from Company A queries:
    ```sql
    SELECT * FROM audit_logs
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    ```
  - Result: Returns only Company A's audit logs
  - Expected: User can read own company's audit trail

- [ ] **Test User Cannot See Other Company Logs**
  - User A (Company A) attempts to read Company B's logs
  - Query returns 0 rows
  - Expected: RLS blocks cross-company access

- [ ] **Test Service Role INSERT Works (backend)**
  - Backend trigger/function inserts via service_role
  - Result: INSERT succeeds
  - Audit record appears in audit_logs
  - Expected: Service role can create audit entries

- [ ] **Test Audit Trail Integrity**
  - Perform action in app (create appointment, delete client, etc.)
  - Verify audit_logs contains entry
  - Check user_id, action, resource_id, timestamps are correct
  - Expected: Audit trail accurately captures all changes

- [ ] **Test Constraint - company_id NOT NULL**
  - Attempt to insert audit_log with NULL company_id
  - Result: CHECK constraint violation
  - Expected: All audit records must belong to a company

- [ ] **Verify Permissions Summary**
  ```sql
  SELECT grantee, privilege
  FROM role_table_grants
  WHERE table_name = 'audit_logs'
  ORDER BY grantee, privilege;
  ```
  - service_role: SELECT, INSERT, UPDATE, DELETE
  - authenticated: SELECT only (via RLS policy)
  - anon: nothing
  - Expected: Proper permission hierarchy

**Time Estimate:** 1 hour

---

## Integration Testing (All 4 Fixes Together)

### Test Scenario: Complete Multi-Tenant Workflow

**Scenario:** Two businesses (Company A and Company B) use the platform simultaneously.

1. **Setup**
   - Create Company A with User A
   - Create Company B with User B
   - User A creates Client A1, books appointment, adds notes
   - User B creates Client B1, books appointment, adds notes

2. **Test Isolation**
   - User A queries client_semantic_memory: Should see ONLY A1's memories ✅
   - User B queries client_semantic_memory: Should see ONLY B1's memories ✅
   - User A cannot see User B in profiles (via RLS) ✅
   - User A cannot see User B's appointments ✅

3. **Test RPC Security**
   - User A calls get_dashboard_stats for Company B: ❌ BLOCKED
   - User A calls soft_delete_client for Company B's client: ❌ BLOCKED
   - User A deletes their own client: ✅ WORKS

4. **Test Audit Integrity**
   - User A creates an audit record manually: ❌ PERMISSION DENIED
   - Backend triggers create audit record: ✅ WORKS
   - User A reads audit_logs: ✅ Sees only Company A's logs

5. **Expected Result**
   - Complete isolation between companies
   - No data leakage
   - No unauthorized operations
   - Audit trail is tamper-proof

---

## Pre-Testing Checklist

- [ ] Git branch is clean (no uncommitted changes other than migrations)
- [ ] All 4 migration files are present in `supabase/migrations/`
- [ ] Environment variables are configured (SUPABASE_URL, SERVICE_ROLE_KEY, etc.)
- [ ] Supabase project is running and accessible
- [ ] Test data with multiple companies is available
- [ ] Database backups are current (in case rollback is needed)

---

## Testing Environment

| Variable | Value |
|----------|-------|
| Database | Supabase (PostgreSQL) |
| Test Users | 2+ (different companies) |
| Migration Tool | `supabase db push` |
| Verification | SQL queries via psql or dashboard |

---

## Expected Outcomes

### After All Migrations Applied

✅ **Security Improvements:**
- Multi-tenant data is completely isolated
- No cross-company data leakage possible
- Audit logs cannot be fabricated by users
- RPC calls are validated for company ownership
- Public profile exposure eliminated

✅ **Compliance:**
- GDPR compliance improved (data isolation, audit trail)
- Audit trail integrity guaranteed
- User permissions properly enforced at database level

✅ **Performance:**
- New indexes on company_id columns
- RLS policies optimized with proper indexes
- Query performance unchanged or improved

---

## Rollback Plan

If any test fails critically:

```bash
# Option 1: Rollback last migration
supabase db push --dry-run  # Preview what will be rolled back
supabase db reset           # Reset to previous state

# Option 2: Revert specific migration
# Remove the migration file and run:
supabase db push
```

---

## Sign-Off

**When all tests pass:**

- [ ] All 4 migrations apply successfully
- [ ] Security tests confirm isolation
- [ ] RPC authorization tests pass
- [ ] Audit integrity tests pass
- [ ] Integration tests pass with no cross-company data leakage
- [ ] Performance benchmarks acceptable
- [ ] Documentation updated

**Approval:**
- Dev: @dev (Dex)
- QA: @qa (Quinn)
- Data: @data-engineer (Dara)

---

## Notes

1. **US-026** requires clients table modification — verify no dependent code breaks
2. **US-027** removes public profile access — ensure PublicBooking uses public_clients, not profiles
3. **US-028** adds authorization to RPCs — all error messages must be descriptive
4. **US-029** restricts audit_logs — service_role must have bypass for triggers

All migrations are backwards-compatible. No application code changes required for these tests.
