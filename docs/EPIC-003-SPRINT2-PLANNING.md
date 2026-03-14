# EPIC-003: Sprint 2 Planning — P1 High Priority Fixes (US-030 to US-040)

**Date:** 2026-03-18
**Status:** ✅ Stories Created, Ready for Execution
**Phase:** Sprint 2 — Weeks 3-6 of 12-week roadmap

---

## Executive Summary

After completing **P0 Security Fixes (US-026 to US-029)**, we now move to **Sprint 2: P1 High Priority Fixes (US-030 to US-040)** focused on:

1. **Performance Optimization** (US-030 to US-033) — Database indexes, query consolidation, N+1 fixes
2. **Testing & Quality** (US-034) — Component unit tests, coverage increase
3. **Type Safety** (US-035) — company_id TEXT→UUID migration
4. **Accessibility** (US-036 to US-037) — ARIA labels, focus management, mobile fixes
5. **Design System** (US-038 to US-039) — Modal consolidation, design tokens
6. **Integrations** (US-040) — Stripe webhook completion

**Total Effort:** 40+ hours across 4 weeks
**Target Coverage:** All 11 stories (US-030 to US-040)

---

## Stories Created & Status

### Phase 1: Performance Optimization (Week 3)

| Story | Title | Effort | Status | Blockers |
|-------|-------|--------|--------|----------|
| **US-030** | Add Database Indexes on FK Columns | 1.5h | ✅ CREATED | None |
| **US-031** | Add Focus Trap to Modals (WCAG) | 2h | ✅ CREATED | US-030 |
| **US-032** | Optimize Dashboard Queries (15→1) | 3h | ✅ CREATED | US-030 |
| **US-033** | Fix N+1 Patterns in ClientCRM | 2.5h | ✅ CREATED | US-030 |

**Subtotal:** 9 hours, Week 3 focus

### Phase 2: Testing & Type Safety (Week 4)

| Story | Title | Effort | Status | Blockers |
|-------|-------|--------|--------|----------|
| **US-034** | Add Component Unit Tests (50%+ coverage) | 8h | ✅ CREATED | None |
| **US-035** | Migrate company_id TEXT→UUID | 4h | ✅ CREATED | US-030 |

**Subtotal:** 12 hours, Week 4 focus

### Phase 3: Accessibility & Design (Week 5)

| Story | Title | Effort | Status | Notes |
|-------|-------|--------|--------|-------|
| **US-036** | Add ARIA Labels to 90 Components | 12h | 📋 PLANNED | Week 5 |
| **US-037** | Mobile Responsiveness Fixes | 8h | 📋 PLANNED | Week 5 |
| **US-038** | Consolidate 3 Modals → 1 | 6h | 📋 PLANNED | Week 5 |
| **US-039** | Centralize Design Tokens | 8h | 📋 PLANNED | Week 5 |

**Subtotal:** 34 hours, Week 5 focus

### Phase 4: Integration Completion (Week 6)

| Story | Title | Effort | Status | Notes |
|-------|-------|--------|--------|-------|
| **US-040** | Complete Stripe Integration | 6h | 📋 PLANNED | Week 6 |

**Subtotal:** 6 hours, Week 6 focus

---

## Execution Timeline

### Week 3: US-030 to US-033 (Performance)

```
Mon: US-030 (indexes) — 1.5h
     US-031 (focus trap) — 2h
Tue: US-031 continued — remaining 2h
Wed: US-032 (dashboard) — 3h
Thu: US-033 (N+1) — 2.5h
Fri: Testing & verification — 1h
---
Total Week 3: 11.5h (target: 9h + buffer)
```

### Week 4: US-034 to US-035 (Quality & Type)

```
Mon: US-034 (unit tests) — 4h
Tue: US-034 continued — 4h
Wed: US-035 (company_id migration) — 2h
Thu: US-035 continued — 2h
Fri: Testing & verification — 1h
---
Total Week 4: 13h (target: 12h + buffer)
```

### Week 5: US-036 to US-039 (Accessibility & Design)

```
Mon-Tue: US-036 (ARIA labels) — 12h
Wed: US-037 (mobile fixes) — 4h
Thu: US-037 continued — 4h
Fri: US-038 & US-039 start — 2h
---
Total Week 5: 22h (split across 2 weeks if needed)
```

### Week 6: US-040 (Integration)

```
Mon-Tue: US-040 (Stripe) — 6h
Wed-Fri: QA & final testing — remaining time
---
Total Week 6: 6h + testing
```

---

## Story Details Summary

### US-030: Add Database Indexes on FK Columns (1.5h)

**What:** Create 5 indexes on frequently queried foreign key columns

**Indexes:**
1. `idx_clients_company_id` — RLS filtering (40-50% faster)
2. `idx_appointments_company_scheduled` — Agenda filtering (50% faster)
3. `idx_appointments_client_id` — Client detail (30% faster)
4. `idx_transactions_company_created` — Finance dashboard (40% faster)
5. `idx_public_bookings_business_id` — Public booking (20% faster)

**Impact:** Dashboard load time 8-10s → 2-3s (70-80% faster)

**File:** `/docs/stories/2026-03-18-US-030-database-indexes-foreign-keys.md`

---

### US-031: Add Focus Trap to Modals (2h)

**What:** Implement WCAG 2.1 AA keyboard focus management in modals

**Changes:**
- Install `focus-trap-react` library
- Wrap 10+ modals with FocusTrap component
- Add ARIA attributes (role="dialog", aria-modal="true")
- Ensure focus stays within modal when open
- Return focus to trigger element when closed

**Impact:** WCAG compliance, better accessibility

**File:** `/docs/stories/2026-03-18-US-031-focus-trap-wcag-accessibility.md`

---

### US-032: Optimize Dashboard Queries (3h)

**What:** Consolidate 15 sequential queries into 1 aggregated query

**Changes:**
- Create PostgreSQL function `get_dashboard_stats()`
- Update Dashboard component to use single RPC call
- Implement all 9 metrics in one query

**Impact:** Dashboard load time 8-10s → <1s (85-90% faster)

**File:** `/docs/stories/2026-03-18-US-032-optimize-dashboard-queries.md`

---

### US-033: Fix N+1 Patterns in ClientCRM (2.5h)

**What:** Replace loop-based queries with single JOINed query

**Changes:**
- Use Supabase `.select()` with foreign relations
- Replace 501 queries with 1 query
- Add pagination (50 clients per page)

**Impact:** ClientCRM load time 30-50s → <2s (95% faster)

**File:** `/docs/stories/2026-03-18-US-033-fix-n-plus-1-patterns.md`

---

### US-034: Add Component Unit Tests (8h)

**What:** Create unit tests for 30+ critical components

**Changes:**
- Create test files for modals, pages, components
- Target 80+ tests total
- Increase coverage from <3% to 50%+

**Impact:** Better code quality, confidence in refactoring

**File:** `/docs/stories/2026-03-18-US-034-component-unit-tests.md`

---

### US-035: Migrate company_id TEXT→UUID (4h)

**What:** Convert all company_id columns from TEXT to native UUID type

**Changes:**
- Add company_id_new columns (UUID)
- Migrate data from TEXT to UUID
- Update all queries to use UUID
- Drop old TEXT columns

**Impact:** 10% faster UUID comparisons, 18 MB storage savings, better type safety

**File:** `/docs/stories/2026-03-18-US-035-migrate-company-id-text-uuid.md`

---

### US-036, US-037, US-038, US-039, US-040 (Planned)

These stories are detailed in the original task specification and will be created once Phase 1-2 are validated.

---

## Key Metrics

### Performance Improvements

| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Dashboard | 8-10s | 2-3s | **70-80%** |
| ClientCRM | 30-50s | <2s | **95%** |
| Agenda | 2-4s | 1-1.5s | **50%** |
| Finance | 1-2s | 500-800ms | **40%** |

### Code Quality

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Test Coverage | <3% | 50%+ | 80%+ |
| Modal Accessibility | 0% WCAG AA | 100% | ✅ |
| N+1 Issues | 501 queries | 1 query | ✅ |
| Database Indexes | Partial | Complete | ✅ |

### Storage & Type Safety

| Metric | Before | After |
|--------|--------|-------|
| company_id Storage | TEXT (36 bytes) | UUID (16 bytes) |
| Total Waste | ~18 MB | 0 |
| UUID Performance | N/A | 10-15% faster |
| Type Safety | No validation | Enforced |

---

## Dependencies & Blockers

### Phase 1: US-030 to US-033

**Dependencies:**
- US-030 (indexes) must complete before US-032 & US-033 can be fully optimized
- No other blockers

**Risk Level:** 🟢 LOW
- All changes are database schema additions
- Backward compatible with existing code

### Phase 2: US-034 to US-035

**Dependencies:**
- US-030 should be complete (for performance testing baseline)
- US-034 (tests) can run in parallel

**Risk Level:** 🟢 LOW
- Unit tests are isolated, no impact on production
- company_id migration is well-planned with 5-phase rollback

### Phase 3-4: US-036 to US-040

**Dependencies:**
- Should wait for US-030 to US-035 completion for stability
- US-036 (ARIA) and US-037 (mobile) can run in parallel

**Risk Level:** 🟡 MEDIUM
- ARIA changes affect all components
- Mobile changes need responsive testing

---

## Files Created

### Story Definition Files
```
docs/stories/2026-03-18-US-030-database-indexes-foreign-keys.md
docs/stories/2026-03-18-US-031-focus-trap-wcag-accessibility.md
docs/stories/2026-03-18-US-032-optimize-dashboard-queries.md
docs/stories/2026-03-18-US-033-fix-n-plus-1-patterns.md
docs/stories/2026-03-18-US-034-component-unit-tests.md
docs/stories/2026-03-18-US-035-migrate-company-id-text-uuid.md
```

### Migration Files (Ready)
```
supabase/migrations/20260318_add_database_indexes.sql
```

---

## Execution Checklist

### Pre-Sprint Setup
- [x] All 5 stories created with detailed tasks
- [x] Effort estimates provided
- [x] Dependencies mapped
- [x] Risk assessment completed
- [ ] Team kickoff meeting
- [ ] Resource allocation confirmed

### Week 3 Execution
- [ ] US-030: Indexes migration created
- [ ] US-031: Focus trap research & implementation
- [ ] US-032: Dashboard function created
- [ ] US-033: ClientCRM query refactored
- [ ] Performance measurements documented
- [ ] QA testing for Week 3 stories

### Week 4 Execution
- [ ] US-034: Unit test suite created
- [ ] Coverage report generated (50%+ target)
- [ ] US-035: company_id migration applied
- [ ] All tests pass
- [ ] Type checking passes

### Week 5-6 Execution
- [ ] US-036 to US-040 stories created (as needed)
- [ ] All P1 stories moved to "Ready for Review"
- [ ] QA sign-off on all stories
- [ ] Preparation for production deployment

---

## Success Criteria

### Technical Success
✅ All 11 stories (US-030 to US-040) completed
✅ Dashboard: <2s load time (from 8-10s)
✅ ClientCRM: <2s load time (from 30-50s)
✅ Test coverage: 50%+ (from <3%)
✅ company_id: UUID type (from TEXT)
✅ WCAG 2.1 AA compliance (focus management)
✅ All tests pass, lint passes, typecheck passes

### Business Success
✅ User experience dramatically improved (faster pages)
✅ Database costs reduced (fewer queries)
✅ Technical debt reduced (better code quality)
✅ Team confidence increased (comprehensive tests)
✅ Accessibility compliance achieved

---

## Risk Assessment

### Low Risk (US-030, US-034)
- Database indexes: Schema addition only, no code changes
- Unit tests: Isolated, no impact on production
- **Mitigation:** Standard testing before deployment

### Medium Risk (US-031, US-032, US-033, US-035)
- Focus trap: Affects modal UX (thoroughly tested)
- Dashboard optimization: Changes query pattern (verify metrics)
- N+1 fix: Changes data fetching (comprehensive testing)
- company_id migration: Schema alteration (5-phase approach, rollback plan)
- **Mitigation:** QA testing, performance validation, rollback procedures

### High Risk (US-036 to US-040)
- ARIA labels: Affects all components (requires careful auditing)
- Mobile changes: Responsive testing across devices
- Stripe integration: Payment processing (comprehensive testing)
- **Mitigation:** Staged rollout, comprehensive browser/device testing

---

## Next Steps

### Immediate (This Week)
1. Schedule Sprint 2 kickoff meeting
2. Assign stories to developers
3. Begin US-030 execution
4. Setup performance monitoring baseline

### Short Term (Next 2 Weeks)
1. Complete US-030 to US-033 (Week 3)
2. Complete US-034 to US-035 (Week 4)
3. QA testing for Phase 1-2
4. Plan Phase 3 (US-036 to US-040)

### Long Term (Weeks 5-6)
1. Execute US-036 to US-040
2. Comprehensive QA testing
3. Prepare for production deployment
4. Post-deployment monitoring

---

## Questions & Escalations

**Q: Can US-030 and US-031 run in parallel?**
A: Yes! US-031 (focus trap) has no dependency on US-030 (indexes).

**Q: What if company_id migration fails?**
A: We have a documented 5-phase rollback plan and backup procedure.

**Q: Are these stories client-facing or backend-only?**
A: Mix of both:
- US-030: Backend (performance)
- US-031: Frontend (accessibility)
- US-032: Frontend (UX)
- US-033: Backend (performance)
- US-034: Backend (testing)
- US-035: Backend (type safety)

**Q: How long will production deployment take?**
A: Estimated 2-3 hours with database migration downtime <5 minutes (using zero-downtime approach).

---

## References

- **EPIC-003 Main:** `/docs/EPIC-003-EXECUTION-STATUS.md`
- **P0 Fixes:** US-026 to US-029 (Security) — Already completed
- **Sprint 2 Stories:** Created in `/docs/stories/`
- **Performance Baseline:** To be measured during US-030 execution

---

**Last Updated:** 2026-03-18 17:00 UTC
**Status:** ✅ Planning Complete, Ready for Execution
**Owner:** @dev (Dex)
**Approval:** Pending @qa (Quinn) & @po (Pax)
