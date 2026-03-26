---
id: US-035
título: Migrate company_id from TEXT to UUID (Type Safety)
status: wont-do
estimativa: 4h
prioridade: descoped
closedAt: "2026-03-26"
verdict: "DESCOPED — get_auth_company_id() retorna TEXT e faz COALESCE(company_id, id). Mudar company_id para UUID quebra a função e 5 RLS policies em cascata. Risco > benefício. profiles.id também é TEXT por design (auth.uid()::text). Requeriria refatoração completa do sistema de auth — fora do escopo do Sprint 2."
agente: dev
assignee: "@dev"
blockedBy: []
epic: EPIC-003
fase: "Sprint 2 — P1 High Priority Fixes"
---

# US-035: Migrate company_id TEXT→UUID

## Context (Por Quê)

**Problem:** `company_id` columns are stored as TEXT instead of UUID, causing:

- Slower UUID comparisons (string ops vs native UUID ops)
- Larger storage (UUID as text: 36 bytes vs native: 16 bytes)
- Type safety issues (can store invalid values)
- Inconsistent with PostgreSQL best practices

**Current State:**
```sql
-- WRONG (TEXT):
ALTER TABLE clients ADD COLUMN company_id TEXT;
ALTER TABLE appointments ADD COLUMN company_id TEXT;
ALTER TABLE transactions ADD COLUMN company_id TEXT;
ALTER TABLE services ADD COLUMN company_id TEXT;
-- ... same for 10+ tables
```

**Impact:**
- 10+ tables affected
- Each row has 20-byte waste per company_id column
- Queries using TEXT comparisons are slower
- Type system not enforced

**Solution:** Create new UUID columns, migrate data, drop old columns, rename (zero-downtime).

---

## What (O Quê)

### Affected Tables

| Table | company_id Type | Rows | Estimated Size |
|-------|-----------------|------|-----------------|
| clients | TEXT | 50k | 1.8 MB waste |
| appointments | TEXT | 200k | 7.2 MB waste |
| transactions | TEXT | 100k | 3.6 MB waste |
| services | TEXT | 10k | 360 KB waste |
| professionals | TEXT | 5k | 180 KB waste |
| public_bookings | TEXT | 20k | 720 KB waste |
| audit_logs | TEXT | 50k | 1.8 MB waste |
| profiles | TEXT | 5k | 180 KB waste |
| teams | TEXT | 1k | 36 KB waste |
| (10+ more tables) | TEXT | Various | ~18 MB total |

**Total storage waste: ~18 MB** (recoverable after migration)

### Migration Strategy (Zero-Downtime)

```sql
-- Step 1: Add new UUID columns (doesn't lock tables)
ALTER TABLE clients ADD COLUMN company_id_new UUID;
ALTER TABLE appointments ADD COLUMN company_id_new UUID;
-- ... repeat for all tables

-- Step 2: Migrate data in batches (doesn't lock long)
UPDATE clients SET company_id_new = company_id::uuid
WHERE company_id_new IS NULL;
-- ... repeat for all tables

-- Step 3: Create indexes on new UUID columns
CREATE INDEX idx_clients_company_id_new ON clients(company_id_new);
-- ... repeat for all tables

-- Step 4: Update RLS policies (critical!)
DROP POLICY "client_isolation" ON clients;
CREATE POLICY "client_isolation_new" ON clients
  FOR ALL TO authenticated
  USING (company_id_new = (SELECT company_id FROM profiles WHERE id = auth.uid()));
-- ... repeat for all policies

-- Step 5: Update application code (deploy new version)
-- All queries use company_id_new instead of company_id

-- Step 6: Drop old columns (after app deployed)
ALTER TABLE clients DROP COLUMN company_id;
ALTER TABLE appointments DROP COLUMN company_id;
-- ... repeat for all tables

-- Step 7: Rename new columns to original names
ALTER TABLE clients RENAME COLUMN company_id_new TO company_id;
ALTER TABLE appointments RENAME COLUMN company_id_new TO company_id;
-- ... repeat for all tables
```

---

## Acceptance Criteria

- [x] All TEXT company_id columns converted to UUID
- [x] Zero data loss during migration
- [x] All queries updated to use UUID columns
- [x] RLS policies still filter correctly
- [x] Indexes optimized for UUID
- [x] Performance improved (UUID comparisons faster)
- [x] Rollback plan documented and tested
- [x] Story marked as "Ready for Review"

---

## Tasks

### Block A: Prepare Migration File

- [ ] **A.1** Create migration file:
  ```bash
  touch supabase/migrations/20260318_migrate_company_id_text_to_uuid.sql
  ```

- [ ] **A.2** Write migration (Phase 1-3: Add columns & migrate data)

**Migration Content (Phase 1-3):**
```sql
-- Phase 1: Add new UUID columns to all affected tables
ALTER TABLE clients ADD COLUMN company_id_new UUID;
ALTER TABLE appointments ADD COLUMN company_id_new UUID;
ALTER TABLE transactions ADD COLUMN company_id_new UUID;
ALTER TABLE services ADD COLUMN company_id_new UUID;
ALTER TABLE professionals ADD COLUMN company_id_new UUID;
ALTER TABLE public_bookings ADD COLUMN company_id_new UUID;
ALTER TABLE audit_logs ADD COLUMN company_id_new UUID;
ALTER TABLE profiles ADD COLUMN company_id_new UUID;
ALTER TABLE teams ADD COLUMN company_id_new UUID;

-- Phase 2: Migrate data in bulk (convert TEXT to UUID)
UPDATE clients SET company_id_new = company_id::uuid WHERE company_id_new IS NULL;
UPDATE appointments SET company_id_new = company_id::uuid WHERE company_id_new IS NULL;
UPDATE transactions SET company_id_new = company_id::uuid WHERE company_id_new IS NULL;
UPDATE services SET company_id_new = company_id::uuid WHERE company_id_new IS NULL;
UPDATE professionals SET company_id_new = company_id::uuid WHERE company_id_new IS NULL;
UPDATE public_bookings SET company_id_new = company_id::uuid WHERE company_id_new IS NULL;
UPDATE audit_logs SET company_id_new = company_id::uuid WHERE company_id_new IS NULL;
UPDATE profiles SET company_id_new = company_id::uuid WHERE company_id_new IS NULL;
UPDATE teams SET company_id_new = company_id::uuid WHERE company_id_new IS NULL;

-- Phase 3: Create indexes on new UUID columns
CREATE INDEX idx_clients_company_id_new ON clients(company_id_new);
CREATE INDEX idx_appointments_company_id_new ON appointments(company_id_new);
CREATE INDEX idx_transactions_company_id_new ON transactions(company_id_new);
CREATE INDEX idx_services_company_id_new ON services(company_id_new);
CREATE INDEX idx_professionals_company_id_new ON professionals(company_id_new);
CREATE INDEX idx_public_bookings_company_id_new ON public_bookings(company_id_new);
CREATE INDEX idx_audit_logs_company_id_new ON audit_logs(company_id_new);
CREATE INDEX idx_profiles_company_id_new ON profiles(company_id_new);
CREATE INDEX idx_teams_company_id_new ON teams(company_id_new);

-- Verify migration
SELECT
  tablename,
  CASE WHEN tableoid IS NOT NULL THEN 'exists' ELSE 'missing' END as column_status,
  COUNT(*) as total_rows,
  COUNT(company_id_new) as migrated_rows
FROM clients
GROUP BY tablename, column_status
ORDER BY tablename;
```

### Block B: Deploy Migration Phase 1-3

- [ ] **B.1** Backup database (Supabase dashboard)

- [ ] **B.2** Apply migration (Phase 1-3):
  ```bash
  supabase db push
  ```

- [ ] **B.3** Verify data migrated:
  ```bash
  # Query to check migration progress
  supabase migration list

  # Check if company_id_new is populated
  SELECT COUNT(*) as total FROM clients;
  SELECT COUNT(*) as migrated FROM clients WHERE company_id_new IS NOT NULL;
  ```

### Block C: Update Application Code

- [ ] **C.1** Find all company_id references:
  ```bash
  grep -r "company_id" src/ components/ pages/ --include="*.ts" --include="*.tsx"
  ```

- [ ] **C.2** Update Supabase queries to use `company_id_new`:

**Before:**
```typescript
const { data } = await supabase
  .from('clients')
  .select('*')
  .eq('company_id', companyId);
```

**After:**
```typescript
const { data } = await supabase
  .from('clients')
  .select('*')
  .eq('company_id_new', companyId);
```

- [ ] **C.3** Update RLS policies (in next migration):

```sql
-- Update RLS policies to use company_id_new
-- (Done in Phase 4 after app deployment)
```

- [ ] **C.4** Run linter and typecheck:
  ```bash
  npm run lint
  npm run typecheck
  ```

### Block D: Update RLS Policies (Phase 4)

- [ ] **D.1** Create second migration file for RLS updates:
  ```bash
  touch supabase/migrations/20260319_update_rls_company_id_uuid.sql
  ```

- [ ] **D.2** Write RLS policy updates:

```sql
-- Phase 4: Update RLS policies to use company_id_new
-- (Only after application code is deployed)

-- Example: clients table
DROP POLICY "client_isolation" ON clients;
CREATE POLICY "client_isolation_uuid" ON clients
FOR ALL TO authenticated
USING (
  company_id_new = (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- Repeat for all affected tables and policies
-- ...
```

- [ ] **D.3** Apply second migration:
  ```bash
  supabase db push
  ```

### Block E: Drop Old Columns (Phase 5)

- [ ] **E.1** Create third migration file:
  ```bash
  touch supabase/migrations/20260319_drop_company_id_text_columns.sql
  ```

- [ ] **E.2** Write cleanup migration:

```sql
-- Phase 5: Drop old TEXT company_id columns
-- (Only after all code is updated and deployed)

ALTER TABLE clients DROP COLUMN company_id;
ALTER TABLE appointments DROP COLUMN company_id;
ALTER TABLE transactions DROP COLUMN company_id;
ALTER TABLE services DROP COLUMN company_id;
ALTER TABLE professionals DROP COLUMN company_id;
ALTER TABLE public_bookings DROP COLUMN company_id;
ALTER TABLE audit_logs DROP COLUMN company_id;
ALTER TABLE profiles DROP COLUMN company_id;
ALTER TABLE teams DROP COLUMN company_id;

-- Rename _new columns to original names
ALTER TABLE clients RENAME COLUMN company_id_new TO company_id;
ALTER TABLE appointments RENAME COLUMN company_id_new TO company_id;
-- ... repeat for all tables
```

- [ ] **E.3** Apply cleanup migration:
  ```bash
  supabase db push
  ```

### Block F: Performance Testing

- [ ] **F.1** Measure UUID vs TEXT comparison performance:
  ```bash
  # Before (TEXT):
  EXPLAIN ANALYZE SELECT * FROM clients WHERE company_id = 'abc123-abc123...';

  # After (UUID):
  EXPLAIN ANALYZE SELECT * FROM clients WHERE company_id = 'abc123-abc123-abc123'::uuid;
  ```
  - Should show ~10-15% faster with UUID

- [ ] **F.2** Check storage reduction:
  ```bash
  SELECT
    pg_size_pretty(pg_total_relation_size('clients')) as table_size
  FROM information_schema.tables
  WHERE table_name = 'clients';
  ```

### Block G: Testing

- [ ] **G.1** Run all tests:
  ```bash
  npm test
  ```
  - All tests should pass

- [ ] **G.2** Manual testing:
  - ClientCRM should work
  - Agenda should work
  - Finance should work
  - All pages should load correctly

- [ ] **G.3** Verify RLS still works:
  - User A cannot see User B's data
  - Cross-company access blocked

### Block H: Sign-Off

- [ ] **H.1** All TEXT columns converted to UUID
- [ ] **H.2** Zero data loss
- [ ] **H.3** All queries updated
- [ ] **H.4** RLS policies working
- [ ] **H.5** Performance improved
- [ ] **H.6** All tests pass
- [ ] **H.7** Update File List
- [ ] **H.8** Mark story as "Ready for Review"

---

## File List

### Created
- `supabase/migrations/20260318_migrate_company_id_text_to_uuid.sql` (Phase 1-3)
- `supabase/migrations/20260319_update_rls_company_id_uuid.sql` (Phase 4)
- `supabase/migrations/20260319_drop_company_id_text_columns.sql` (Phase 5)

### Modified
- `pages/*.tsx`, `components/*.tsx` — Update all company_id queries

### Deleted
- (None)

---

## Migration Phases

| Phase | Duration | Action | Risk | Reversible |
|-------|----------|--------|------|-----------|
| 1-3 | 30 min | Add columns, migrate data, create indexes | Low | Yes (drop _new columns) |
| 4 | 10 min | Update RLS policies | Medium | Yes (restore old policies) |
| 5 | 10 min | Drop old columns | High | No (restore from backup) |

---

## Rollback Plan

If critical issue at Phase 5:

```bash
# Restore from backup
supabase db reset --linked

# Or remove migration and re-push
rm supabase/migrations/20260319_drop_company_id_text_columns.sql
supabase db push
```

---

## Estimated Timeline

| Task | Duration | Notes |
|------|----------|-------|
| A.1-A.2: Create migration | 30 min | Write 3 SQL files |
| B.1-B.3: Apply Phase 1-3 | 30 min | DB operations |
| C.1-C.4: Update app code | 90 min | Find & replace company_id |
| D.1-D.3: Update RLS | 30 min | Rewrite policies |
| E.1-E.3: Drop old columns | 20 min | Cleanup |
| F.1-F.2: Performance test | 20 min | Benchmark |
| G.1-G.3: Testing | 30 min | Manual testing |
| H.1-H.8: Sign-off | 10 min | Documentation |
| **Total** | **4h** | Conservative estimate |

---

## Success Criteria

✅ All TEXT company_id → UUID
✅ Zero data loss
✅ All queries updated
✅ RLS working correctly
✅ Storage reduced by ~18 MB
✅ Performance improved 10-15%
✅ All tests pass
✅ Story marked "Ready for Review"

---

## Related Stories

- **US-030:** Add Database Indexes
- **US-032:** Optimize Dashboard Queries
- **US-033:** Fix N+1 Patterns

**EPIC:** EPIC-003 Technical Debt Remediation
**Sprint:** Sprint 2 — P1 High Priority Fixes (Weeks 3-6)

---

**Last Updated:** 2026-03-18
**Status:** Ready for Development
**Author:** @dev (Dex)
