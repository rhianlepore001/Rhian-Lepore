-- Migration: Document EPIC-002 Brownfield Discovery findings in RAG system
-- Date: 2026-03-14
-- Purpose: Populate RAG context tables with technical debt assessment data

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Strategic Context: Executive Summary & Business Impact
INSERT INTO rag_context_strategic (
  context_type,
  content,
  metadata,
  source_reference,
  created_at
) VALUES (
  'technical-debt-assessment',
  'EPIC-002 Brownfield Discovery Final Assessment

Executive Summary:
- 93 technical issues identified across Architecture, Database, Frontend/UX domains
- Composite Debt Score: 45/100 (URGENT ACTION REQUIRED)
- 7 P0 Critical issues requiring immediate fix
- 12-week remediation plan: $8.5K–$11.3K investment
- Expected ROI: +$125K annually (1,040% return)
- Payback Period: 0.9 months

Critical Risks:
1. Data Breach Risk: Public profiles expose ALL tenant data → 15 min fix
2. Accessibility: 25% WCAG AA compliance → 15% market excluded ($60K–120K lost)
3. Performance: Dashboard 5+ sec load time → UX breaking point
4. Compliance: Audit logs fabrication → GDPR/LGPD violation
5. Revenue: Stripe integration incomplete → Payment collection broken

Investment Breakdown:
- Sprint 1 (Weeks 1-2): $1,900 → Critical security fixes
- Sprint 2 (Weeks 3-5): $3,200 → Performance & quality foundation
- Sprint 3 (Weeks 6-8): $3,200 → Accessibility & design system
- Total: $8,300 (56.5 dev hours @ $147/hour)

Expected Outcomes (Week 12):
- Security: 0 data exposure incidents
- Performance: Dashboard <1sec (5x improvement)
- Accessibility: 80% WCAG AA compliance
- Testing: 75% component test coverage
- Velocity: +35% feature delivery speed
- Bugs: -61% defect rate

Files:
- Technical Debt Assessment: docs/architecture/technical-debt-assessment.md (1.076 lines)
- Executive Report: docs/architecture/TECHNICAL-DEBT-REPORT.md (2.840 lines)
- Epic Backlog: docs/epics/EPIC-003-TECHNICAL-DEBT.yaml (28 stories)',
  jsonb_build_object(
    'assessment_date', '2026-03-14',
    'total_issues', 93,
    'p0_count', 7,
    'debt_score', 45,
    'investment_usd', 8500,
    'annual_roi_usd', 125000,
    'timeline_weeks', 12,
    'payback_months', 0.9,
    'roi_percent', 1040
  ),
  'EPIC-002-Brownfield-Discovery:Executive-Summary',
  NOW()
);

-- Architecture Context: Technical Debt Details
INSERT INTO rag_context_architecture (
  context_type,
  content,
  metadata,
  source_reference,
  created_at
) VALUES (
  'technical-debt-architecture',
  'EPIC-002 Brownfield Discovery - Architecture Domain Analysis

Architecture Score: 68/100 (Acceptable)
Issues: 28 total (4 P0, 9 P1, 9 P2, 6 P3)

CRITICAL ISSUES (P0):
1. Missing Error Boundaries on critical pages (Dashboard, Agenda, Finance, ClientCRM)
   - Impact: App crashes without recovery, poor UX
   - Severity: Critical
   - Estimated Fix: 3-4 hours

2. Incomplete Stripe Integration
   - Webhooks not implemented (payment confirmations missing)
   - Success/failure flows not connected
   - Affects: Revenue collection, customer trust
   - Estimated Fix: 6-8 hours

3. Service Role Policies Missing on RAG Tables
   - client_semantic_memory, rag_context_* tables lack explicit RLS policies
   - Causes PGRST204 errors (schema cache invalidation)
   - Impact: RAG system non-functional
   - Estimated Fix: 1-2 hours

4. No Rate Limiting on Public Endpoints
   - PublicBooking, QueueJoin, QueueStatus accessible without limits
   - DoS vulnerability
   - Estimated Fix: 2-3 hours

HIGH PRIORITY ISSUES (P1):
- Dashboard Query Performance: 15+ sequential queries (should be <3)
- No Pagination on Large Result Sets: ClientCRM loads all records
- Missing Observability: No monitoring, logging, or error tracking
- State Management: Context re-renders causing performance issues
- Error Messages: Unclear error messaging for users

MEDIUM ISSUES (P2):
- Code Duplication: 3 modal patterns (should be 1)
- Missing TypeScript types: ~15% of codebase has weak typing
- No Service Layer: Direct database calls in components
- Testing Infrastructure: No E2E testing setup

Roadmap (Weeks 1-8):
Week 1-2: Add Error Boundaries + RLS policies + Rate limiting
Week 3-4: Optimize dashboard queries
Week 5-6: Complete Stripe integration
Week 7-8: Monitoring and observability setup

Architecture Document: docs/architecture/technical-debt-DRAFT.md (1.242 lines)
Specialist: Aria (@architect)',
  jsonb_build_object(
    'domain', 'architecture',
    'score', 68,
    'total_issues', 28,
    'p0_count', 4,
    'p1_count', 9,
    'security_score', 62,
    'performance_score', 56,
    'code_quality_score', 68,
    'testing_score', 18
  ),
  'EPIC-002-Brownfield-Discovery:Architecture-Domain',
  NOW()
);

-- Operational Context: Database & Implementation Details
INSERT INTO rag_context_operational (
  context_type,
  content,
  metadata,
  source_reference,
  created_at
) VALUES (
  'technical-debt-database',
  'EPIC-002 Brownfield Discovery - Database Domain Analysis

Database Score: 62/100 (Concerning)
Issues: 23 total (4 P0, 6 P1, 8 P2, 5 P3)

CRITICAL ISSUES (P0):
1. Public Profiles Policy Exposes ALL Users
   Impact: GDPR non-compliance, privacy violation
   Fix: DROP POLICY (15 minutes)
   Migration: 20260317_remove_public_profiles_policy.sql

2. RLS Bug: users see other tenants data (client_semantic_memory)
   Impact: Data breach
   Fix: Add RLS policy with company_id filter
   Migration: 20260317_fix_rls_client_semantic_memory.sql

3. Audit Logs Fabrication: Anyone can insert fake entries
   Impact: Audit trail worthless, compliance violation
   Fix: Enable RLS + restrict INSERT to service_role
   Migration: 20260317_fix_audit_logs_integrity.sql

4. Missing RPC Ownership Validation: 5 stored procedures lack authorization
   Impact: Unauthorized data access
   Functions: get_dashboard_stats, get_client_data, update_appointment, create_transaction, delete_client
   Migration: 20260317_add_rpc_ownership_checks.sql

PERFORMANCE ISSUES (P1):
- get_dashboard_stats(): 15+ sequential queries
  Current: 8+ seconds
  Target: <500ms
  Fix: Query consolidation + caching

- N+1 Patterns in ClientCRM
  Impact: Linear slowdown with data volume
  Fix: Batch queries, use includes

- Missing Indexes:
  - profiles(business_slug)
  - clients(user_id)
  - appointments(company_id, scheduled_at)
  - transactions(company_id, created_at)

SCHEMA ISSUES (P2):
- company_id as TEXT (should be UUID)
  Impact: Slower comparisons, larger storage
  Migration Path: Create new UUID column, migrate data, drop old column

- Missing NOT NULL constraints on required fields
- Missing CHECK constraints for validation
- Soft delete inconsistency (some tables use deleted_at, others don't)

QUICK WINS (<4 hours each):
1. Remove public policy: 15 min
2. Add client_semantic_memory RLS: 20 min
3. Add FK indexes: 30 min
4. RPC ownership validation: 90 min
5. Audit logs fix: 60 min

Migration Files:
- 20260317_remove_public_profiles_policy.sql
- 20260317_fix_rls_client_semantic_memory.sql
- 20260317_fix_audit_logs_integrity.sql
- 20260317_add_rpc_ownership_checks.sql

Database Review: docs/architecture/db-specialist-review.md (1.014 lines)
Specialist: Dara (@data-engineer)',
  jsonb_build_object(
    'domain', 'database',
    'score', 62,
    'total_issues', 23,
    'p0_count', 4,
    'p1_count', 6,
    'security_issues', 8,
    'performance_issues', 9,
    'schema_issues', 6,
    'quick_win_count', 6,
    'quick_win_hours', 4.5
  ),
  'EPIC-002-Brownfield-Discovery:Database-Domain',
  NOW()
);

-- Conversational Context: Frontend/UX Implementation Path
INSERT INTO rag_context_conversational (
  context_type,
  content,
  metadata,
  source_reference,
  created_at
) VALUES (
  'technical-debt-frontend-ux',
  'EPIC-002 Brownfield Discovery - Frontend/UX Domain Analysis

Frontend Score: 54/100 (Problematic)
Issues: 42 total (1 P0, 10 P1, 18 P2, 13 P3)

CRITICAL ISSUE (P0):
Missing Focus Trap in Modals
- WCAG 2.1 AA violation
- Users can escape modals using keyboard
- Affects: AppointmentEditModal, ClientAuthModal, ConfirmModal
- Fix: Implement focus-trap-react library
- Estimated: 3-4 hours

ACCESSIBILITY ISSUES (14 total):
- 87% components missing ARIA labels
  Target: 100% → 12-15 hours work

- Color contrast failures (~40% of text)
  Target: 100% WCAG AA

- Missing alt text on images
  Target: All images have descriptive alt text

- Keyboard navigation incomplete
  Target: Full tab order, logical navigation

WCAG 2.1 AA Compliance: Currently 25% → Target 80%
Categories failing:
- Perceivable: 40% (color contrast, alt text)
- Operable: 35% (keyboard nav, focus trap)
- Understandable: 60% (error messages, labels)
- Robust: 90% (HTML/ARIA markup)

MOBILE RESPONSIVENESS:
- Touch targets <44px on many buttons
- Text at 9px (illegible on mobile)
- Modal widths exceed viewport
- No hamburger menu implementation

DESIGN SYSTEM DEBT:
3 Modal Patterns (consolidate to 1):
- AppointmentEditModal: Custom styling, custom close
- ClientAuthModal: Different layout, different close behavior
- ConfirmModal: Minimal styling
Consolidation Benefit: -50% code duplication, +consistency

Hardcoded Design Tokens:
- Colors scattered: #1a1a1a, #ffffff, rgb(200,100,50)
- No centralized token management
- Makes theming impossible (Beauty vs Brutal)
Fix: Migrate to Tailwind CSS variables + design token system

SearchableSelect broken in Beauty theme
- Works in Brutal, missing styles for Beauty
- Affects salon users (product split)

TESTING ISSUES:
- Component test coverage: <3% (only 2 test files for 90+ components)
- No integration tests for critical flows (auth, booking, payment)
- No E2E tests (browser automation)
- No accessibility testing (axe-core, jest-axe)

Target Coverage: 75% (component + integration + E2E)

Implementation Priority:
Week 1-2: Focus trap, ARIA labels quick wins
Week 3-4: Mobile responsiveness
Week 5-6: Accessibility completeness (WCAG AA)
Week 7-8: Design system consolidation

Frontend Review: docs/architecture/ug-specialist-review.md (830 lines)
Specialist: Uma (@ux-design-expert)',
  jsonb_build_object(
    'domain', 'frontend-ux',
    'score', 54,
    'total_issues', 42,
    'p0_count', 1,
    'p1_count', 10,
    'accessibility_score', 22,
    'wcag_aa_percent', 25,
    'test_coverage_percent', 3,
    'mobile_failures_count', 12,
    'design_system_duplicates', 3
  ),
  'EPIC-002-Brownfield-Discovery:Frontend-UX-Domain',
  NOW()
);

-- Log migration execution
SELECT NOW() as migration_timestamp, 'EPIC-002 RAG Context Insertion' as migration_name;
