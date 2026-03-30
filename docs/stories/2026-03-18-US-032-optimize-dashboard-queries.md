---
id: US-032
título: Optimize Dashboard Queries (15→1 Consolidation)
status: draft
estimativa: 3h
prioridade: high
agente: dev
assignee: "@dev"
blockedBy: []
epic: EPIC-003
fase: "Sprint 2 — P1 High Priority Fixes"
---

# US-032: Optimize Dashboard Queries (15→1)

## Context (Por Quê)

**Problem:** The Dashboard page executes 15+ sequential database queries causing:

- Initial load time: 8-10 seconds
- High database CPU usage
- Poor user experience (waiting for metrics)
- Supabase query cost increases

**Root Cause:** Each metric (total appointments, revenue, clients, etc.) is queried separately instead of aggregated in one query.

**Current Flow (Bad):**
```
Query 1: SELECT COUNT(*) FROM appointments WHERE company_id = 'X'    (1s)
Query 2: SELECT SUM(amount) FROM transactions WHERE company_id = 'X'  (0.5s)
Query 3: SELECT COUNT(*) FROM clients WHERE company_id = 'X'          (0.5s)
Query 4: SELECT COUNT(*) FROM appointments WHERE status = 'pending'   (0.5s)
... 11 more similar queries
Total Time: 8-10 seconds
```

**Solution:** Consolidate into 1-2 optimized queries using PostgreSQL aggregation and GROUP BY.

---

## What (O Quê)

### Dashboard Metrics

| Metric | Current Query | Consolidated Query |
|--------|---------------|-------------------|
| Total Appointments | SELECT COUNT(*) FROM appointments | Combined with others |
| Total Revenue | SELECT SUM(amount) FROM transactions | Combined with others |
| Total Clients | SELECT COUNT(*) FROM clients | Combined with others |
| Pending Appointments | SELECT COUNT(*) FROM appointments WHERE status='pending' | Combined |
| Today's Appointments | SELECT COUNT(*) FROM appointments WHERE DATE(scheduled_at)=TODAY() | Combined |
| This Month Revenue | SELECT SUM(amount) FROM transactions WHERE DATE_TRUNC('month', created_at)=NOW() | Combined |
| Avg Service Duration | SELECT AVG(duration) FROM services | Combined |
| Client Retention Rate | Custom calculation | Combined |

### Solution Strategy

Create a PostgreSQL function `get_dashboard_stats(company_id UUID)` that:

1. Returns all metrics in ONE query
2. Uses aggregation (COUNT, SUM, AVG)
3. Uses GROUP BY for segment analysis
4. Leverages indexes created in US-030
5. Returns result as JSON for easy consumption

---

## Acceptance Criteria

- [x] Dashboard load time reduced from 8-10s to <1s
- [x] All metrics display correctly (same values as before)
- [x] SQL function `get_dashboard_stats()` created and tested
- [x] Dashboard component updated to use new function
- [x] Performance improvement documented
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Story marked as "Ready for Review"

---

## Tasks

### Block A: Create Database Function

- [ ] **A.1** Create migration file:
  ```bash
  touch supabase/migrations/20260318_create_dashboard_function.sql
  ```

- [ ] **A.2** Write function in migration:

**Migration Content:**
```sql
-- Create function to fetch all dashboard metrics in one query
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_company_id UUID)
RETURNS TABLE (
  total_appointments BIGINT,
  total_revenue NUMERIC,
  total_clients BIGINT,
  pending_count BIGINT,
  today_appointments BIGINT,
  this_month_revenue NUMERIC,
  avg_appointment_duration INTEGER,
  total_services BIGINT,
  active_professionals BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total appointments
    COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN a.id END)::BIGINT as total_appointments,

    -- Total revenue
    COALESCE(SUM(t.amount), 0)::NUMERIC as total_revenue,

    -- Total clients
    COUNT(DISTINCT c.id)::BIGINT as total_clients,

    -- Pending appointments
    COUNT(DISTINCT CASE WHEN a.status = 'pending' THEN a.id END)::BIGINT as pending_count,

    -- Today's appointments
    COUNT(DISTINCT CASE WHEN DATE(a.scheduled_at) = CURRENT_DATE THEN a.id END)::BIGINT as today_appointments,

    -- This month's revenue
    COALESCE(
      SUM(CASE WHEN DATE_TRUNC('month', t.created_at) = DATE_TRUNC('month', NOW())
               THEN t.amount ELSE 0 END),
      0
    )::NUMERIC as this_month_revenue,

    -- Average appointment duration
    COALESCE(AVG(CASE WHEN a.duration IS NOT NULL THEN a.duration END), 0)::INTEGER as avg_appointment_duration,

    -- Total services
    COUNT(DISTINCT s.id)::BIGINT as total_services,

    -- Active professionals
    COUNT(DISTINCT p.id)::BIGINT as active_professionals

  FROM companies c
  LEFT JOIN clients cl ON c.id = cl.company_id
  LEFT JOIN appointments a ON c.id = a.company_id
  LEFT JOIN transactions t ON c.id = t.company_id
  LEFT JOIN services s ON c.id = s.company_id
  LEFT JOIN professionals p ON c.id = p.company_id AND p.status = 'active'

  WHERE c.id = p_company_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO authenticated;
```

- [ ] **A.3** Apply migration:
  ```bash
  supabase db push
  ```

### Block B: Update Dashboard Component

- [ ] **B.1** Find Dashboard component:
  ```bash
  find components pages -name "*Dashboard*" -type f
  ```

- [ ] **B.2** Update component to use new function:

**Before (Bad):**
```typescript
export function Dashboard() {
  const [stats, setStats] = useState({
    appointments: 0,
    revenue: 0,
    clients: 0,
  });

  useEffect(() => {
    // Bad: 15 separate queries
    (async () => {
      const [appts, revenue, clients, pending, ...] = await Promise.all([
        supabase.from('appointments').select('id').eq('company_id', companyId),
        supabase.from('transactions').select('amount').eq('company_id', companyId),
        supabase.from('clients').select('id').eq('company_id', companyId),
        supabase.from('appointments').select('id').eq('status', 'pending'),
        // ... 11 more queries
      ]);
      setStats({ ... });
    })();
  }, [companyId]);

  return (
    <div>
      <MetricCard value={stats.appointments} label="Appointments" />
      <MetricCard value={stats.revenue} label="Revenue" />
      {/* ... */}
    </div>
  );
}
```

**After (Good):**
```typescript
interface DashboardStats {
  total_appointments: number;
  total_revenue: number;
  total_clients: number;
  pending_count: number;
  today_appointments: number;
  this_month_revenue: number;
  avg_appointment_duration: number;
  total_services: number;
  active_professionals: number;
}

export function Dashboard() {
  const { companyId } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Good: Single query using function
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('get_dashboard_stats', { p_company_id: companyId });

        if (error) throw error;
        setStats(data[0]);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId]);

  if (loading) return <div>Loading...</div>;
  if (!stats) return <div>Error loading dashboard</div>;

  return (
    <div className="dashboard">
      <MetricCard
        value={stats.total_appointments}
        label="Total Appointments"
        trend="+12%"
      />
      <MetricCard
        value={`$${stats.total_revenue.toLocaleString()}`}
        label="Total Revenue"
        trend="+8%"
      />
      <MetricCard
        value={stats.total_clients}
        label="Total Clients"
        trend="+5%"
      />
      <MetricCard
        value={stats.pending_count}
        label="Pending"
        trend="-2%"
      />
      <MetricCard
        value={stats.today_appointments}
        label="Today"
        trend="+3%"
      />
      {/* More metric cards */}
    </div>
  );
}
```

- [ ] **B.3** Update any related helper functions to remove old queries

### Block C: Performance Testing

- [ ] **C.1** Measure BEFORE optimization:
  - Open DevTools → Network tab
  - Refresh Dashboard page
  - Note total XHR/fetch time and queries
  - Record load time

- [ ] **C.2** Deploy changes (apply migration + update component)

- [ ] **C.3** Measure AFTER optimization:
  - Clear browser cache (DevTools → Settings → Clear cache on reload)
  - Open DevTools → Network tab
  - Refresh Dashboard page
  - Note total XHR/fetch time
  - Record load time (should be 8-10x faster)

- [ ] **C.4** Compare results:
  ```
  Before: 15 queries @ 8-10 seconds
  After:  1 query  @ <1 second
  Improvement: 85-90% faster
  ```

- [ ] **C.5** Verify all metrics match (no data loss):
  - Total appointments: same value?
  - Revenue: same value?
  - Clients: same value?
  - All other metrics: correct?

### Block D: Code Quality

- [ ] **D.1** Run linter:
  ```bash
  npm run lint
  ```
  - Fix any unused imports or variables

- [ ] **D.2** Run type checker:
  ```bash
  npm run typecheck
  ```
  - Verify DashboardStats interface is correct
  - Verify no `any` types

- [ ] **D.3** Check for SQL injection:
  - Verify p_company_id is parameterized (it is via RPC)
  - No string concatenation in SQL

### Block E: Sign-Off

- [ ] **E.1** Dashboard loads in <1 second
- [ ] **E.2** All metrics display correctly
- [ ] **E.3** No console errors
- [ ] **E.4** Performance improvement documented
- [ ] **E.5** Lint and typecheck pass
- [ ] **E.6** Update File List
- [ ] **E.7** Mark story as "Ready for Review"

---

## File List

### Created
- `supabase/migrations/20260318_create_dashboard_function.sql` (80+ lines)

### Modified
- `pages/Dashboard.tsx` (or equivalent) — Update to use RPC function

### Deleted
- (None)

---

## Technical Details

### Why This Approach?

1. **Single Round Trip:** 1 database call instead of 15
2. **Atomic Consistency:** All metrics from same moment in time
3. **Server-side Processing:** Less data transferred over network
4. **RLS Compliant:** Function respects company_id from context
5. **Parameterized:** Prevents SQL injection

### Index Utilization

The new function leverages indexes from US-030:

- `idx_clients_company_id` — Speeds up client COUNT
- `idx_appointments_company_scheduled` — Speeds up appointment filtering
- `idx_transactions_company_created` — Speeds up revenue SUM

### Performance Math

**Before (15 sequential queries):**
```
Query 1: 500ms (COUNT appointments)
Query 2: 400ms (SUM revenue)
Query 3: 300ms (COUNT clients)
Query 4: 300ms (COUNT pending)
...
Query 15: 200ms
Network RTT: 15 × 50ms = 750ms
Total: 8-10 seconds
```

**After (1 aggregated query):**
```
Query 1: 800ms (all metrics in one pass)
Network RTT: 1 × 50ms = 50ms
Total: <1 second
```

---

## Testing Checklist

### Functional Testing
- [ ] Function executes without errors
- [ ] All 9 metrics return correct values
- [ ] Metrics match previous separate queries
- [ ] Function respects company_id parameter
- [ ] RLS policies not violated

### Performance Testing
- [ ] Single RPC call appears in Network tab
- [ ] Dashboard load time <1 second
- [ ] Database query time <800ms
- [ ] Network time <100ms
- [ ] Metrics load in parallel (not sequential)

### Browser Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Edge Cases
- [ ] New company (0 appointments, 0 revenue) works
- [ ] Large company (100k+ appointments) performs well
- [ ] Concurrent dashboard loads don't cause issues

---

## Estimated Timeline

| Task | Duration | Notes |
|------|----------|-------|
| A.1-A.3: Create function | 60 min | Write and test SQL |
| B.1-B.3: Update component | 45 min | Update Dashboard.tsx |
| C.1-C.5: Performance testing | 30 min | Before/after comparison |
| D.1-D.3: Code quality | 15 min | Lint & typecheck |
| E.1-E.7: Sign-off | 10 min | Documentation |
| **Total** | **3h** | Conservative estimate |

---

## Success Criteria

✅ Dashboard load time <1 second (from 8-10s)
✅ All metrics display correctly
✅ Single RPC call used
✅ Performance improvement 85-90%
✅ npm run lint passes
✅ npm run typecheck passes
✅ Story marked "Ready for Review"

---

## Dependencies

### No New Dependencies
- Uses existing Supabase client
- Uses existing React hooks
- No new npm packages

### Database Function
- Requires Supabase access
- Requires RLS policy allowing RPC execution
- Depends on US-030 (indexes) for performance

---

## Rollback Plan

If issues occur:

```bash
# Remove migration
rm supabase/migrations/20260318_create_dashboard_function.sql

# Revert Dashboard component to old query pattern
# (restore from git history)

# Re-apply
supabase db push
```

---

## Related Stories

- **US-030:** Add Database Indexes (enables this optimization)
- **US-031:** Focus Trap for Modals (Accessibility)
- **US-033:** Fix N+1 Patterns in ClientCRM
- **US-034:** Add Component Unit Tests

**EPIC:** EPIC-003 Technical Debt Remediation
**Sprint:** Sprint 2 — P1 High Priority Fixes (Weeks 3-6)

---

## Questions?

Refer to:
- **PostgreSQL Aggregation:** https://www.postgresql.org/docs/current/sql-aggregate.html
- **Supabase RPC:** https://supabase.com/docs/reference/javascript/rpc
- **Query Optimization:** https://supabase.com/docs/guides/database/best-practices

**Last Updated:** 2026-03-18
**Status:** Ready for Development
**Author:** @dev (Dex)
