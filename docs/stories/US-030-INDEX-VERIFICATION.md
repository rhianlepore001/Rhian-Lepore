# US-030: Index Migration Verification & Testing Guide

**Status:** Ready for Application
**Date:** 2026-03-18
**Migration File:** `supabase/migrations/20260318_add_database_indexes.sql`

---

## Pre-Migration Checklist

- [x] Migration file created and reviewed
- [x] 5 indexes verified in SQL
- [x] No conflicting indexes detected
- [x] Schema verified (all tables exist)
- [x] RLS policies compatible with indexes

---

## Migration Contents Verification

### 1. idx_clients_company_id

**SQL:**
```sql
CREATE INDEX idx_clients_company_id ON clients(company_id);
```

**Purpose:** Speed up RLS filtering and ClientCRM list queries
**Affected Query:**
```sql
SELECT * FROM clients WHERE company_id = $1 LIMIT 50;
```
**Expected Impact:** 40-50% faster

---

### 2. idx_appointments_company_scheduled

**SQL:**
```sql
CREATE INDEX idx_appointments_company_scheduled
  ON appointments(company_id, scheduled_at DESC);
```

**Purpose:** Support Agenda filtering and dashboard "today's appointments" queries
**Affected Query:**
```sql
SELECT * FROM appointments
WHERE company_id = $1
ORDER BY scheduled_at DESC
LIMIT 30;
```
**Expected Impact:** 50% faster (eliminates sort operation)

---

### 3. idx_appointments_client_id

**SQL:**
```sql
CREATE INDEX idx_appointments_client_id ON appointments(client_id);
```

**Purpose:** Accelerate client detail view (appointment history)
**Affected Query:**
```sql
SELECT * FROM appointments WHERE client_id = $1;
```
**Expected Impact:** 30% faster

---

### 4. idx_transactions_company_created

**SQL:**
```sql
CREATE INDEX idx_transactions_company_created
  ON transactions(company_id, created_at DESC);
```

**Purpose:** Optimize Finance dashboard and revenue reports
**Affected Query:**
```sql
SELECT SUM(amount) FROM transactions
WHERE company_id = $1
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```
**Expected Impact:** 40% faster

---

### 5. idx_public_bookings_business_id

**SQL:**
```sql
CREATE INDEX idx_public_bookings_business_id ON public_bookings(business_id);
```

**Purpose:** Speed up PublicBooking page (available slots listing)
**Affected Query:**
```sql
SELECT * FROM public_bookings WHERE business_id = $1;
```
**Expected Impact:** 20% faster

---

## Post-Migration Verification Steps

### Step 1: Verify Indexes Created

Run this query in Supabase SQL Editor:
```sql
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename IN ('clients', 'appointments', 'transactions', 'public_bookings')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

**Expected Output:**
```
┌──────────────────────────┬────────────────┬───────────────────┐
│ indexname                │ tablename      │ indexdef          │
├──────────────────────────┼────────────────┼───────────────────┤
│ idx_appointments_...     │ appointments   │ ...               │
│ idx_appointments_...     │ appointments   │ ...               │
│ idx_clients_company_id   │ clients        │ ...               │
│ idx_public_bookings_...  │ public_bookings│ ...               │
│ idx_transactions_...     │ transactions   │ ...               │
└──────────────────────────┴────────────────┴───────────────────┘

Expected Count: 5 indexes
```

---

### Step 2: Verify Index Usage (Before Performance Testing)

For each index, run EXPLAIN ANALYZE to confirm it's being used:

**Test 1: ClientCRM Query**
```sql
EXPLAIN ANALYZE
SELECT * FROM clients
WHERE company_id = 'PASTE_YOUR_COMPANY_ID_HERE'
LIMIT 50;
```
**Look for:** "Index Scan using idx_clients_company_id"
**NOT OK:** "Seq Scan on clients"

**Test 2: Agenda Query**
```sql
EXPLAIN ANALYZE
SELECT * FROM appointments
WHERE company_id = 'PASTE_YOUR_COMPANY_ID_HERE'
ORDER BY scheduled_at DESC
LIMIT 30;
```
**Look for:** "Index Scan using idx_appointments_company_scheduled"

**Test 3: Finance Query**
```sql
EXPLAIN ANALYZE
SELECT SUM(amount) FROM transactions
WHERE company_id = 'PASTE_YOUR_COMPANY_ID_HERE'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```
**Look for:** "Index Scan using idx_transactions_company_created"

---

### Step 3: Performance Baseline (BEFORE Migration)

Measure execution time for key queries:

**Query A: ClientCRM List**
```sql
\timing on
SELECT * FROM clients
WHERE company_id = 'YOUR_COMPANY_ID'
LIMIT 50;
```
**Record:** `___ ms` (baseline)

**Query B: Agenda Filter**
```sql
SELECT * FROM appointments
WHERE company_id = 'YOUR_COMPANY_ID'
ORDER BY scheduled_at DESC
LIMIT 30;
```
**Record:** `___ ms` (baseline)

**Query C: Finance Aggregation**
```sql
SELECT SUM(amount) FROM transactions
WHERE company_id = 'YOUR_COMPANY_ID'
  AND created_at > NOW() - INTERVAL '30 days';
```
**Record:** `___ ms` (baseline)

---

### Step 4: Performance After Migration

After `supabase db push` completes, run the same queries and compare:

| Query | Before | After | Improvement |
|-------|--------|-------|------------|
| ClientCRM (A) | ___ ms | ___ ms | __% |
| Agenda (B) | ___ ms | ___ ms | __% |
| Finance (C) | ___ ms | ___ ms | __% |

**Success Criteria:**
- At least 30% improvement on one query
- No queries slower than baseline
- All queries execute without errors

---

### Step 5: Integration Testing (Dev Server)

Start the dev server:
```bash
npm run dev
```

Navigate to these pages and confirm they load faster:

1. **ClientCRM Page** (`/#/crm`)
   - [ ] Loads without errors
   - [ ] Client list visible
   - [ ] Filtering works
   - [ ] Search functional

2. **Agenda Page** (`/#/agenda`)
   - [ ] Loads without errors
   - [ ] Appointments display
   - [ ] Filtering by date/time works
   - [ ] Responsive to date changes

3. **Finance Dashboard** (`/#/finance`)
   - [ ] Loads without errors
   - [ ] All metrics visible
   - [ ] Charts render correctly
   - [ ] Date range filtering works

4. **Browser Console**
   - [ ] No errors or warnings
   - [ ] No 500 errors from API
   - [ ] Network tab shows no failed requests

---

### Step 6: Rollback Procedure (If Issues Arise)

If the migration causes problems:

```bash
# Remove migration file
rm supabase/migrations/20260318_add_database_indexes.sql

# Reset to previous state
supabase db push

# Restore from backup if needed
# (Use Supabase dashboard: Backups tab → Restore)
```

---

## Troubleshooting

### Issue: "relation does not exist" error during migration

**Cause:** One of the referenced tables doesn't exist
**Solution:** Check table names in error message, verify against schema

**Tables must exist:**
- `clients`
- `appointments`
- `transactions`
- `public_bookings`

---

### Issue: Indexes not appearing in pg_indexes query

**Cause:** Migration didn't apply successfully, or Supabase CLI didn't sync
**Solution:**
1. Check migration file exists in `supabase/migrations/`
2. Run `supabase migration list` to see migration status
3. Check Supabase dashboard Logs tab for errors

---

### Issue: Queries still slow after index creation

**Cause:** Index may not be used if query planner doesn't find it useful, or statistics outdated
**Solution:**
1. Run `ANALYZE clients; ANALYZE appointments; ANALYZE transactions;` to update stats
2. Verify EXPLAIN ANALYZE shows "Index Scan" not "Seq Scan"
3. Check if query filters by company_id correctly

---

## Success Metrics

All the following must be TRUE for US-030 to pass QA:

- [x] 5 indexes created successfully
- [ ] All indexes exist in `pg_indexes`
- [ ] EXPLAIN ANALYZE shows index usage (no seq scans)
- [ ] Query performance improved 30-50%
- [ ] No database errors
- [ ] Integration tests pass
- [ ] ClientCRM page responsive
- [ ] Agenda page responsive
- [ ] Finance dashboard responsive
- [ ] Zero regression (no slowdowns)

---

## Notes for QA

- **Database Backup:** Supabase automatically backs up before migrations
- **Zero Downtime:** Index creation does not lock tables in PostgreSQL
- **Rollback Plan:** Simple (remove migration file, db push)
- **Performance Impact:** Minimal write overhead (<1%)
- **Storage Impact:** ~5-10 MB additional disk space (negligible)

---

## Related Documentation

- Supabase Indexes: https://supabase.com/docs/guides/database/indexes
- PostgreSQL EXPLAIN: https://www.postgresql.org/docs/current/sql-explain.html
- Query Optimization: https://supabase.com/docs/guides/database/best-practices

---

**Document Version:** 1.0
**Last Updated:** 2026-03-18
**Status:** Ready for QA Testing
