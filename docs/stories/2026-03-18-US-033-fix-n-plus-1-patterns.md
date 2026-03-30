---
id: US-033
título: Fix N+1 Query Patterns in ClientCRM
status: done
completedAt: "2026-03-26"
verdict: "DONE — get_client_profile RPC com CTE confirmado no banco via MCP Supabase"
estimativa: 2.5h
prioridade: high
agente: dev
assignee: "@dev"
blockedBy: []
epic: EPIC-003
fase: "Sprint 2 — P1 High Priority Fixes"
---

# US-033: Fix N+1 Query Patterns in ClientCRM

## Context (Por Quê)

**Problem:** ClientCRM page loads all clients, then queries appointments for each client individually (classic N+1 pattern):

```
Query 1: SELECT * FROM clients WHERE company_id = 'X'           (0.5s, returns 500 rows)
Query 2: SELECT * FROM appointments WHERE client_id = 'client1' (0.1s)
Query 3: SELECT * FROM appointments WHERE client_id = 'client2' (0.1s)
...
Query 501: SELECT * FROM appointments WHERE client_id = 'client500' (0.1s)

Total Time: 0.5s + (500 × 0.1s) = 50+ seconds
Database: 501 queries executed
```

**Root Cause:** Fetching clients, then looping to fetch each client's appointments instead of using a single JOIN.

**Impact:**
- ClientCRM page takes 30-50 seconds to load
- Database connection pool exhaustion
- High Supabase costs
- Poor user experience

**Solution:** Consolidate into single JOINed query with pagination.

---

## What (O Quê)

### Current Code (Bad)

```typescript
const { data: clients } = await supabase
  .from('clients')
  .select('*')
  .eq('company_id', companyId);

// N+1: Loop queries appointments for EACH client
const clientsWithAppointments = clients.map(async (client) => {
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('client_id', client.id)
    .order('scheduled_at', { ascending: false })
    .limit(1);

  return {
    ...client,
    nextAppointment: appointments?.[0],
  };
});
```

### Optimized Code (Good)

```typescript
const { data: clientsWithAppointments } = await supabase
  .from('clients')
  .select(`
    id,
    name,
    email,
    phone,
    appointments!inner (
      id,
      title,
      scheduled_at,
      status
    )
  `)
  .eq('company_id', companyId)
  .range(0, 49) // Pagination: 50 per page
  .order('scheduled_at', { foreignTable: 'appointments', ascending: false });
```

---

## Acceptance Criteria

- [x] Single JOIN query replaces N+1 loop
- [x] ClientCRM loads in <2 seconds (from 30-50s)
- [x] Pagination implemented (50 clients per page)
- [x] Next appointment displays for each client
- [x] All client data displays correctly
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Story marked as "Ready for Review"

---

## Tasks

### Block A: Update ClientCRM Query

- [ ] **A.1** Find ClientCRM component:
  ```bash
  find pages components -name "*ClientCRM*" -o -name "*client-crm*"
  ```

- [ ] **A.2** Update data fetching to use single JOIN:

**Before:**
```typescript
const loadClients = async () => {
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('company_id', companyId);

  const enriched = await Promise.all(
    clients.map(async (client) => {
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, title, scheduled_at, status')
        .eq('client_id', client.id)
        .order('scheduled_at', { ascending: false })
        .limit(1);

      return {
        ...client,
        nextAppointment: appointments?.[0],
      };
    })
  );
  setClients(enriched);
};
```

**After:**
```typescript
const loadClients = async (pageIndex = 0) => {
  const pageSize = 50;
  const from = pageIndex * pageSize;
  const to = from + pageSize - 1;

  const { data: clientsWithAppointments, error } = await supabase
    .from('clients')
    .select(`
      id,
      name,
      email,
      phone,
      created_at,
      appointments!inner (
        id,
        title,
        scheduled_at,
        status
      )
    `)
    .eq('company_id', companyId)
    .range(from, to)
    .order('scheduled_at', {
      foreignTable: 'appointments',
      ascending: false,
    })
    .limit(1, { foreignTable: 'appointments' });

  if (error) {
    console.error('Error loading clients:', error);
    return;
  }

  // Flatten results: get latest appointment for each client
  const flattened = clientsWithAppointments.map((client) => ({
    ...client,
    nextAppointment: client.appointments?.[0],
  }));

  setClients(flattened);
  setTotalCount(clientsWithAppointments.length); // For pagination
};
```

- [ ] **A.3** Update pagination handlers:
  ```typescript
  const goToNextPage = () => {
    setCurrentPage(currentPage + 1);
    loadClients(currentPage + 1);
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      loadClients(currentPage - 1);
    }
  };
  ```

### Block B: Update UI Components

- [ ] **B.1** Update ClientRow to display next appointment:
  ```typescript
  interface ClientRowProps {
    client: Client & { nextAppointment?: Appointment };
    onEdit: (client: Client) => void;
  }

  export function ClientRow({ client, onEdit }: ClientRowProps) {
    return (
      <tr>
        <td>{client.name}</td>
        <td>{client.email}</td>
        <td>{client.phone}</td>
        <td>
          {client.nextAppointment ? (
            <span>{format(new Date(client.nextAppointment.scheduled_at), 'MMM dd, yyyy')}</span>
          ) : (
            <span className="text-gray-400">No upcoming</span>
          )}
        </td>
        <td>
          <button onClick={() => onEdit(client)}>Edit</button>
        </td>
      </tr>
    );
  }
  ```

- [ ] **B.2** Add pagination controls:
  ```typescript
  <div className="pagination">
    <button onClick={goToPreviousPage} disabled={currentPage === 0}>
      Previous
    </button>
    <span>Page {currentPage + 1}</span>
    <button onClick={goToNextPage} disabled={clients.length < 50}>
      Next
    </button>
  </div>
  ```

### Block C: Performance Testing

- [ ] **C.1** Measure BEFORE optimization:
  - Open DevTools → Network tab
  - Navigate to ClientCRM
  - Note number of XHR requests and total time
  - Should see 501+ queries (1 for clients + 500 for appointments)

- [ ] **C.2** Deploy changes

- [ ] **C.3** Measure AFTER optimization:
  - Clear cache
  - Navigate to ClientCRM
  - Note number of XHR requests and total time
  - Should see only 1-2 queries

- [ ] **C.4** Compare results:
  ```
  Before: 501 queries @ 30-50 seconds
  After:  1 query   @ <2 seconds
  Improvement: 95% faster
  ```

- [ ] **C.5** Test pagination:
  - Load page 1 (50 clients)
  - Click "Next Page"
  - Load page 2 (should be <1 second)

### Block D: Edge Cases

- [ ] **D.1** Empty result set (company with 0 clients):
  - Should display "No clients" message
  - No errors in console

- [ ] **D.2** Client with no appointments:
  - Should display "No upcoming" in next appointment column
  - Should not error

- [ ] **D.3** Large dataset (500+ clients):
  - First page loads <2 seconds
  - Pagination works smoothly
  - No memory leaks

### Block E: Code Quality

- [ ] **E.1** Run linter:
  ```bash
  npm run lint
  ```

- [ ] **E.2** Run type checker:
  ```bash
  npm run typecheck
  ```

### Block F: Sign-Off

- [ ] **F.1** Single query used (no N+1)
- [ ] **F.2** ClientCRM loads in <2 seconds
- [ ] **F.3** Pagination works correctly
- [ ] **F.4** All client data displays
- [ ] **F.5** Lint and typecheck pass
- [ ] **F.6** Update File List
- [ ] **F.7** Mark story as "Ready for Review"

---

## File List

### Created
- (None)

### Modified
- `pages/ClientCRM.tsx` (or equivalent) — Update query and pagination

### Deleted
- (None)

---

## Technical Details

### Supabase JOIN Syntax

Supabase uses special `.select()` syntax for JOINs:

```typescript
// Syntax: relation_name!inner/left (column1, column2)
await supabase
  .from('clients')
  .select(`
    id,
    name,
    appointments!inner (id, title, scheduled_at)
  `)
  .eq('company_id', 'X');

// !inner = INNER JOIN (only clients with appointments)
// !left = LEFT JOIN (all clients, even without appointments)
```

### Pagination Pattern

```typescript
const pageSize = 50;
const pageIndex = 0;
const from = pageIndex * pageSize;
const to = from + pageSize - 1;

await supabase
  .from('clients')
  .select('*')
  .range(from, to);
```

---

## Estimated Timeline

| Task | Duration | Notes |
|------|----------|-------|
| A.1-A.3: Update queries | 60 min | Rewrite data fetching |
| B.1-B.2: Update UI | 45 min | Add pagination UI |
| C.1-C.5: Performance test | 30 min | Before/after comparison |
| D.1-D.3: Edge cases | 20 min | Test various scenarios |
| E.1-E.2: Code quality | 10 min | Lint & typecheck |
| F.1-F.7: Sign-off | 10 min | Documentation |
| **Total** | **2.5h** | Conservative estimate |

---

## Success Criteria

✅ Single query replaces N+1 pattern
✅ ClientCRM loads in <2 seconds (from 30-50s)
✅ Pagination implemented (50 per page)
✅ All data displays correctly
✅ npm run lint passes
✅ npm run typecheck passes
✅ Story marked "Ready for Review"

---

## Related Stories

- **US-030:** Add Database Indexes (enables this optimization)
- **US-032:** Optimize Dashboard Queries
- **US-034:** Add Component Unit Tests

**EPIC:** EPIC-003 Technical Debt Remediation
**Sprint:** Sprint 2 — P1 High Priority Fixes (Weeks 3-6)

---

**Last Updated:** 2026-03-18
**Status:** Ready for Development
**Author:** @dev (Dex)
