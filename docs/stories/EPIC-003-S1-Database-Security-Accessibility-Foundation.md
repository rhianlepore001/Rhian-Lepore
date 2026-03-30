---
id: EPIC-003-S1
title: Sprint 1 — Database Security Fundamentals & Accessibility Foundation
status: pending
estimativa: 50.5h
prioridade: critical
agente: dev
assignee: "@dev, @data-engineer"
epic: EPIC-003
startDate: "TBD"
endDate: "TBD"
completedAt: null
verdict: PENDING
---

# EPIC-003-S1: Sprint 1 — Database Security & Accessibility Foundation

**Epic ID:** EPIC-003-S1
**Phase:** 1 of 3 (12-week technical debt execution)
**Duration:** 4 weeks (Weeks 1-4)
**Total Effort:** 50.5 hours (1.5 FTE)
**Target Completion:** Week 4

---

## 📋 Epic Overview

Sprint 1 is the **critical emergency response phase**. We fix the 7 P0 (critical) issues that put customer data at risk and block scaling. Success in Sprint 1 unblocks Sprints 2-3.

**Key Outcome:** Zero critical security vulnerabilities. System is production-hardened for first 50 concurrent users. Focus trap + ARIA labels foundation ready for Sprint 2 expansion.

---

## 🎯 Goals

### Goal 1: Eliminate Data Isolation Risk (RLS Security)
- Fix `company_id` TEXT vs UUID type mismatch
- Remove permissive RLS policies
- Fix audit trail spoofing vulnerability
- **Impact:** Customer data cannot leak cross-tenant

### Goal 2: Performance Foundation (Dashboard)
- Consolidate 15 sequential queries → 1 CTE
- Create unified ClientCRM query
- Apply 5 critical database indexes
- **Impact:** Dashboard loads 5x faster (>5s → <1.5s)

### Goal 3: Accessibility Foundation
- Implement focus trap in Modal.tsx
- Add ARIA labels to 15+ icon buttons
- Fix form label connections (htmlFor/id)
- **Impact:** Keyboard + screen reader users can navigate modals

### Goal 4: Testing Infrastructure
- Setup Vitest component testing
- Write tests for critical path (Auth, Modal)
- Establish coverage baseline
- **Impact:** Foundation for 30%+ coverage by Sprint 3

---

## 📊 Issues Addressed (P0 + P1 Wins)

### P0 Critical Issues (Must Fix — 7 total)

| # | Issue | Effort | Lead | Status |
|---|-------|--------|------|--------|
| 1 | RLS: `company_id` TEXT vs UUID | 8h | Dara (@data-engineer) | TBD |
| 2 | RLS: Policy "Public profiles visible" not removed | 1h | Dara | TBD |
| 3 | RLS: `audit_logs` INSERT without user_id check | 2h | Dara | TBD |
| 4 | Performance: `get_dashboard_stats` 15+ sequential queries | 8h | Dara | TBD |
| 5 | Performance: N+1 ClientCRM without LIMIT | 4h | Dara | TBD |
| 6 | Accessibility: Focus trap absent in modals | 16h | Uma (@ux-design-expert) | TBD |
| 7 | (Reserved) | — | — | — |

### P1 Quick Wins (Early Priority — 5 selected)

| # | Issue | Effort | Lead | Status |
|---|-------|--------|------|--------|
| 8 | Database: Add 5 missing indexes | 1h | Dara | TBD |
| 9 | Accessibility: ARIA labels on icon buttons | 3h | Uma | TBD |
| 10 | Accessibility: Form label htmlFor/id connections | 2h | Uma | TBD |
| 11 | Performance: Replace alert() with toast notification | 30min | Uma | TBD |
| 12 | Testing: Setup component testing infrastructure | 4h | Aria (@architect) | TBD |

**Total P0 + P1 Wins:** 50.5 hours

---

## 📅 Weekly Breakdown

### Week 1: Database Security Fundamentals (11.5h)

**Lead:** Dara (@data-engineer)
**Support:** Aria (@architect) for coordination

**Tasks:**

| Task | Effort | Details |
|------|--------|---------|
| US-0301 | Migrate `company_id` TEXT → UUID in profiles | 8h | Blocker for all RLS reviews. Run migration safely with rollback plan. |
| US-0302 | Remove permissive RLS policy "Public profiles" | 30min | DROP POLICY statement + verify only 1 policy remains SELECT |
| US-0303 | Fix `audit_logs` INSERT policy (user_id check) | 2h | WITH CHECK (user_id = auth.uid()) pattern |
| US-0304 | Apply 5 database indexes | 1h | idx_profiles_business_slug, idx_appointments_user_status, etc. |

**Acceptance Criteria:**
- [ ] `company_id` migration completed, data integrity verified
- [ ] RLS policy conflicts resolved (1 policy per table)
- [ ] Audit trail cannot be spoofed
- [ ] 5 indexes created, EXPLAIN shows they're used
- [ ] All changes tested in staging before production

**Definition of Done:** Database layer fully compliant. Ready for QA review.

---

### Week 2: Accessibility Quick Wins + Foundation (7h)

**Lead:** Uma (@ux-design-expert)
**Support:** Aria (@architect) for testing setup

**Tasks:**

| Task | Effort | Details |
|------|--------|---------|
| US-0305 | Add ARIA labels to icon buttons (Header, Sidebar, Nav) | 3h | aria-label="..." on 15+ buttons. Keyboard users can identify buttons. |
| US-0306 | Connect form labels via htmlFor/id | 2h | <label htmlFor="login-email"> pattern across Login, Register, Settings |
| US-0307 | Setup Vitest component testing + RTL | 2h | Package setup, example test for BrutalButton, CI/CD integration |

**Acceptance Criteria:**
- [ ] At least 15 icon buttons have descriptive aria-label
- [ ] All form labels connected to inputs (no orphan labels)
- [ ] Vitest passing, can run tests locally and in CI
- [ ] Example test written (Modal or BrutalButton)

**Definition of Done:** Accessibility foundation + testing infrastructure ready for Sprint 2 expansion.

---

### Week 3: Performance Foundation (12h)

**Lead:** Dara (@data-engineer)
**Support:** Uma (@ux-design-expert) for UI work

**Tasks:**

| Task | Effort | Details |
|------|--------|---------|
| US-0308 | Refactor `get_dashboard_stats` with CTE | 8h | 15 queries → 1 CTE query. Use EXPLAIN ANALYZE to compare performance. |
| US-0309 | Create `get_client_profile()` consolidated RPC | 4h | Replaces 3 sequential queries with 1 call. Test with CRM page. |

**Acceptance Criteria:**
- [ ] `get_dashboard_stats` loads in <1.5s with 50k+ appointments
- [ ] ClientCRM loads in <500ms without LIMIT issues
- [ ] EXPLAIN ANALYZE shows improvement
- [ ] No regressions in existing queries

**Definition of Done:** Dashboard + CRM queries optimized. Performance foundation ready.

---

### Week 4: Accessibility Advanced + Testing Foundation (20h)

**Lead:** Uma (@ux-design-expert)
**Support:** Aria (@architect) for focus trap library selection

**Tasks:**

| Task | Effort | Details |
|------|--------|---------|
| US-0310 | Implement focus trap in Modal.tsx | 16h | Use focus-trap-react library. Add aria-modal="true", role="dialog". Test keyboard navigation. |
| US-0311 | Write component tests (Modal, BrutalButton basics) | 4h | Expand from Week 2 setup. Cover focus trap, ARIA attributes, basic interactions. |

**Acceptance Criteria:**
- [ ] Focus trap active in Modal.tsx (Tab/Shift+Tab stays within modal)
- [ ] ESC key closes modal, focus returns to opener
- [ ] aria-modal="true" + role="dialog" present
- [ ] Screen readers announce modal title
- [ ] Modal component tests passing (≥80% coverage)

**Definition of Done:** Modals fully accessible. Component testing culture established. Ready for Sprint 2 to expand focus trap to secondary modals.

---

## 🔗 Dependency Graph

```
┌─────────────────────────────────────┐
│ Week 1: Database Security (P0)      │ ← BLOCKER
│ - company_id UUID migration         │
│ - RLS policy fixes                  │
│ - Audit trail repair                │
└─────────────────────────────────────┘
        │
        ├──────────────────┬──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   Week 2 (Accessibility) │            Week 3 (Performance)
   (can run parallel)     │
                    Week 4 (Focus Trap + Testing)
                    (requires Week 2 + Week 3)
```

**Critical Path:** Week 1 → Week 4 (must be sequential)
**Parallel Work:** Week 2 + Week 3 can run in parallel if resources available

---

## 👥 Team Assignments

### Data Engineer (Dara) — 20 hours
- Week 1-3: Database security, migrations, query optimization
- Owns: RLS policies, migration strategy, performance validation

### UX/Accessibility Specialist (Uma) — 20 hours
- Week 2, 4: Accessibility, ARIA, focus trap, form labels
- Owns: WCAG compliance, component accessibility testing

### Architect (Aria) — 5 hours
- Week 1: Coordination, architecture review
- Week 2-4: Testing infrastructure setup, code review
- Week 4: Focus trap library selection + pattern review

### Developer (@dev) — Executes
- Implements all tasks
- Coordinates with Dara, Uma, Aria daily

---

## 📈 Success Metrics (Week 4 Checkpoint)

| Metric | Target | Validation |
|--------|--------|-----------|
| **RLS Compliance** | 0 policy conflicts | Audit by @qa |
| **Performance** | Dashboard <1.5s | Browser DevTools |
| **Accessibility** | Focus trap works, 15+ ARIA labels | Manual keyboard test |
| **Testing** | Vitest setup, 2+ component tests passing | npm test output |
| **Data Integrity** | No test data loss during migrations | Staging environment |

---

## 🚨 Risk Mitigation

### Risk 1: Database Migration Breaks Prod
**Probability:** 20%
**Mitigation:**
- Test migration in staging with production-equivalent data (50k+ rows)
- Prepare rollback plan (DROP COLUMN + old value restoration)
- Schedule during low-traffic window
- Have @qa validate data consistency post-migration

### Risk 2: Focus Trap Library Conflicts
**Probability:** 15%
**Mitigation:**
- Evaluate focus-trap-react vs alternatives in Week 1
- Proof-of-concept in isolated component first
- Test with screen reader (NVDA/JAWS) + keyboard only

### Risk 3: Performance Regression After Refactor
**Probability:** 25%
**Mitigation:**
- EXPLAIN ANALYZE before/after comparison
- Load test with 50k+ appointments
- Monitor query execution time in staging
- Rollback plan ready (revert to old RPC if needed)

---

## 📋 Acceptance Criteria (Epic-Level)

- [x] All 7 P0 issues addressed
- [ ] 5 P1 quick wins completed
- [ ] Database layer fully RLS-compliant
- [ ] Dashboard query reduced from 15 → 1
- [ ] Focus trap working in Modal.tsx
- [ ] 15+ ARIA labels added
- [ ] Vitest infrastructure ready
- [ ] QA Gate Pass (manual security audit)

---

## 📌 Definition of Done (Epic)

- ✅ All issues marked complete in technical-debt-assessment.md
- ✅ Weekly status updates provided to stakeholders
- ✅ Code reviewed by @architect (Aria)
- ✅ Security audit by @qa (Quinn)
- ✅ Performance validated with production data
- ✅ Accessibility tested with keyboard + screen reader
- ✅ Unblocks Sprint 2 (no blockers remaining)

---

## 🔄 Handoff to Sprint 2

**Input to Sprint 2:**
- Database layer production-hardened
- Query performance baseline established
- Accessibility foundation ready for expansion
- Component testing culture established
- All P0 + quick P1 wins complete

**Sprint 2 Builds On:**
- Advanced accessibility fixes (secondary modals, contrast, mobile)
- P1 performance optimization (remaining queries, indexes)
- Design system consolidation
- Test coverage expansion (30-35% target)

---

## 📄 Linked Documents

- **Technical Debt Assessment:** `docs/architecture/technical-debt-assessment.md` (source of truth for P0/P1 issues)
- **Executive Report:** `docs/architecture/TECHNICAL-DEBT-REPORT.md` (board visibility)
- **QA Gate:** `docs/architecture/qa-review.md` (validation framework)

---

## 📝 Story Status

```
Status: IN-PROGRESS (stories criadas, agents atribuídos, desenvolvimento iniciado)

Completed Actions:
✅ @sm (River) quebrou EPIC-003-S1 em 11 stories individuais (US-0301 → US-0311)
✅ @aiox-master configurou linguagem global PT-BR no core-config.yaml
✅ 3 agents ativados em paralelo para execução simultânea

Agents Ativos:
→ @data-engineer (Dara): US-0301, US-0302, US-0303, US-0304, US-0308, US-0309
→ @ux-design-expert (Uma): US-0305, US-0306, US-0307, US-0310, US-0311
→ @architect (Aria): Coordenação técnica, review de arquitetura

Next Action:
→ Dara executa US-0301 (Migrate company_id TEXT → UUID) — BLOCKER P0
→ Uma executa US-0305 (Add ARIA labels) — Acessibilidade
→ Aria revisa infraestrutura de testes (US-0307)
→ Checkpoint de integração: Final Week 4
```

## 📑 Stories Individuais (US-0301 → US-0311)

| Story | Arquivo | Esforço | Lead | Status |
|-------|---------|---------|------|--------|
| US-0301 | `3.1.migrate-company-id-uuid.md` | 8h | @data-engineer | Draft |
| US-0302 | `3.2.remove-permissive-rls-policy.md` | 30min | @data-engineer | Draft |
| US-0303 | `3.3.fix-audit-logs-insert-policy.md` | 2h | @data-engineer | Draft |
| US-0304 | `3.4.create-missing-indexes.md` | 1h | @data-engineer | Draft |
| US-0305 | `3.5.add-aria-labels-icon-buttons.md` | 3h | @ux-design-expert | Draft |
| US-0306 | `3.6.connect-form-labels.md` | 2h | @ux-design-expert | Draft |
| US-0307 | `3.7.setup-vitest-component-testing.md` | 2h | @architect | Draft |
| US-0308 | `3.8.refactor-dashboard-stats-cte.md` | 8h | @data-engineer | Draft |
| US-0309 | `3.9.create-client-profile-rpc.md` | 4h | @data-engineer | Draft |
| US-0310 | `3.10.implement-focus-trap-modal.md` | 16h | @ux-design-expert | Draft |
| US-0311 | `3.11.write-component-tests-modal-button.md` | 4h | @ux-design-expert | Draft |

**Total confirmado:** 50.5h ✅

---

**Created by:** Morgan (@pm)
**Data Source:** US-023 Technical Debt Assessment (consolidado)
**Validation:** QA Gate APPROVED (7/7)
**Created Date:** 18 Mar 2026
**Last Updated:** 18 Mar 2026
**Epic Status:** IN-PROGRESS — Agents Ativos, Desenvolvimento Iniciado

---

*Next: Create EPIC-003-S2 (Sprint 2) and EPIC-003-S3 (Sprint 3) to complete 12-week roadmap.*
