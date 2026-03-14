# System Architecture — Beauty OS / AgenX AIOX

**Mapeado em:** 14 Mar 2026 | **Fase:** 4.1 (Architecture Analysis) | **Agent:** @architect (Aria)

---

## 1. Frontend Architecture

### Entry Point & Routing
```
App.tsx
├── React Router 7
│   └── HashRouter pattern (#/dashboard, #/agenda, etc.)
├── 20+ lazy-loaded pages via React.lazy()
├── Protected routes via ProtectedLayout
└── Suspense boundaries with fallbacks
```

**Routing Pattern:**
- Client-side: HashRouter (not traditional URL paths)
- Example: `/#/dashboard`, `/#/agenda`, `/#/finance`
- Advantage: Works on static hosting (Vercel)
- Trade-off: Not SEO-friendly (fine for SaaS internal app)

### State Management
```
React Context API (no Redux, no Zustand)
├── AuthContext
│   ├── User authentication state
│   ├── Permission checks
│   └── Session management
├── AlertsContext
│   ├── Toast notifications
│   └── Alert queuing system
├── PublicClientContext
│   ├── Public booking client data
│   └── Session-less state (public portal)
└── UIContext
    ├── Theme (Brutal vs Beauty)
    └── UI preferences
```

**Why Context over Redux:**
- Simpler for small teams
- Less boilerplate
- Sufficient for this scale
- Downside: Potential re-render performance issues if not optimized

### Component Architecture
```
Directory Structure:
pages/                          (20+ pages)
├── Dashboard.tsx              (main entry)
├── Agenda.tsx                 (scheduling)
├── Finance.tsx                (financials)
├── Reports.tsx                (analytics)
├── ClientCRM.tsx              (client management)
├── Marketing.tsx              (campaigns)
├── settings/                  (7 settings pages)
│   ├── Team.tsx
│   ├── Services.tsx
│   ├── Subscriptions.tsx
│   ├── Security.tsx
│   ├── Audit Logs.tsx
│   └── ...
├── public/                    (public portal pages)
│   ├── PublicBooking.tsx
│   ├── QueueJoin.tsx
│   ├── QueueStatus.tsx
│   └── ProfessionalPortfolio.tsx
└── ...

components/                     (50+ components)
├── Modal components
│   ├── AppointmentEditModal.tsx
│   ├── ClientAuthModal.tsx
│   └── ...
├── Feature components
│   ├── CommissionsManagement.tsx
│   ├── BusinessHoursEditor.tsx
│   └── ...
├── Styled components (Brutal theme)
│   ├── BrutalCard.tsx
│   ├── BrutalButton.tsx
│   └── BrutalBackground.tsx
└── ...

hooks/                          (custom React hooks)
├── useAuth()
├── useAlerts()
├── useDashboardData()
├── useOnboardingState()
└── ...

contexts/                       (context providers)
├── AuthContext.tsx
├── AlertsContext.tsx
├── PublicClientContext.tsx
└── UIContext.tsx

utils/                          (utilities)
├── formatters.ts              (currency, dates)
├── date.ts                    (date calculations)
├── Logger.ts                  (custom logging)
├── tierSystem.ts              (subscription tiers)
└── ...

lib/                            (library clients)
├── supabase.ts                (Supabase client)
├── gemini.ts                  (Gemini API integration)
└── auditLogs.ts               (audit logging)
```

### Design System

**Theme System:**
```
Brutal Theme (Barbershops)
├── Colors: Dark, bold, masculine aesthetic
├── Vibe: Modern, high-contrast
└── Target: Professional barber shops

Beauty Theme (Salons)
├── Colors: Elegant, clean, feminine aesthetic
├── Vibe: Sophisticated, refined
└── Target: Beauty salons, nail spas
```

**Styling Approach:**
- **Framework:** Tailwind CSS (utility-first)
- **Custom theme colors:** CSS variables `--color-*`
- **Glassmorphism effects:** For premium feel
- **Grid system:** 8px-based spacing

**Icons:**
- **Library:** Lucide React
- **Count:** 50+ icons used throughout
- **Customization:** Color/size props

**Charts:**
- **Library:** Recharts
- **Usage:** Finance dashboard, analytics, reports
- **Type:** Line, bar, pie charts

---

## 2. Backend Architecture

### Database Layer
```
Supabase PostgreSQL
├── 19 core tables
├── 21 auxiliary tables (audit, system, semantic)
├── 41+ RPC functions (business logic)
├── pgvector extension (768-dim embeddings)
└── Row Level Security (RLS) on all tables
```

**Multi-Tenancy Model:**
```
Isolation by:
├── user_id (owner of business)
├── company_id (derived from auth session)
└── business_id (for public booking)

RLS enforces:
├── Users can only see their own data
├── Staff can see team data (via is_staff_of())
├── Public clients can book via business_id
└── All at database level (not application)
```

### RPC Functions (41+)

**By Domain:**

1. **Finance (7 RPCs)**
   - `get_finance_stats` → Revenue, expenses, profit
   - `get_monthly_finance_history` → Historical trends
   - `mark_expense_as_paid` → Expense tracking
   - `get_commissions_due` → Professional commissions
   - `mark_commissions_as_paid` → Commission payment
   - `complete_appointment` → Finalize booking + auto-generate revenue record
   - `update_commission_record` → Commission updates

2. **Public Booking (5 RPCs)**
   - `get_available_slots` → Available times for booking
   - `create_secure_booking` → Safe booking creation (prevents double-booking)
   - `get_active_booking_by_phone` → Track public booking status
   - `get_public_client_by_phone` → Identify returning clients
   - `get_client_bookings_history` → Public client's past bookings

3. **Dashboard & Analytics (4 RPCs)**
   - `get_dashboard_stats` → Main KPIs (revenue, appointments, growth)
   - `get_dashboard_insights` → Detailed analytics
   - `get_client_insights` → Client metrics
   - `get_aios_diagnostic` → AI agent performance metrics

4. **Queue System (1 RPC)**
   - `get_queue_position` → Real-time queue tracking

5. **Audit (2 RPCs)**
   - `create_audit_log` → Log all changes
   - `get_audit_logs` → Retrieve audit history

6. **Semantic Memory (2 RPCs)**
   - `match_kb_content` → Vector search in knowledge base
   - `match_client_memories` → Vector search in client preferences

7. **Soft Delete (11 RPCs)**
   - `soft_delete_*` (5) → Mark as deleted
   - `restore_*` (5) → Restore deleted items
   - `get_deleted_items` → Lixeira (recycle bin)

8. **Onboarding (1 RPC)**
   - `update_onboarding_step` → Track setup progress

9. **Security (3 RPCs)**
   - `check_login_rate_limit` → Prevent brute force
   - `check_rate_limit` → Generic rate limiting
   - `is_staff_of` → Check team membership

10. **AIOS & Errors (2 RPCs)**
    - `log_aios_campaign` → AI campaign tracking
    - `log_error` → Error reporting

**Architecture Pattern:**
```sql
CREATE OR REPLACE FUNCTION exemplo(p_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SECURITY: Derive user_id from auth.uid(), never from parameter
  -- ATOMICITY: All operations in one transaction
  -- AUDIT: Log via audit_logs table
  RETURN jsonb_build_object(...);
END;
$$;

GRANT EXECUTE ON FUNCTION exemplo(TEXT) TO authenticated;
```

### Storage Layer

**6 Buckets:**
```
logos (public)
├── Business logos
├── Used by: profiles.logo_url
└── Size: ~1-2MB per business

covers (public)
├── Cover photos
├── Used by: profiles.cover_photo_url
└── Size: ~2-5MB per business

team_photos (public)
├── Professional photos
├── Used by: team_members.photo_url
└── Size: ~1-2MB per professional

service_images (public)
├── Service photos
├── Used by: services.image_url
└── Size: ~1-3MB per service

client_photos (public)
├── Client profile pictures
├── Used by: clients.photo_url
└── Size: ~500KB-1MB per client

marketing_images (public)
├── AI-generated marketing assets
├── Used by: marketing_assets
└── Size: ~2-5MB per asset
```

---

## 3. Integration Points

### Gemini API (Google AI)
```
Purpose: Content generation, analysis, semantic search
└── Used in:
    ├── Marketing content generation
    ├── Client preference analysis (semantic memory)
    ├── AI-powered recommendations
    └── Predictive analytics

Integration:
├── lib/gemini.ts
└── Frontend direct calls (API key exposed but restricted)
    └── Google restricts by domain/origin (security)
```

### Stripe
```
Purpose: Payment processing
└── Used in:
    ├── Subscription management
    ├── Service payments
    └── Commission payouts

Integration:
├── Not yet fully integrated in codebase
└── Likely in pages/settings/Subscriptions.tsx (in progress)
```

### Supabase Storage
```
6 public buckets (see Storage Layer above)
└── All buckets require authenticated requests for writes
    (public read, authenticated write)
```

---

## 4. Data Flow Diagrams

### User Authentication Flow
```
1. User clicks "Login"
   ↓
2. Supabase Auth modal
   ↓
3. Credentials validated
   ↓
4. JWT token issued
   ↓
5. AuthContext updated
   ↓
6. ProtectedLayout checks isAuthenticated
   ↓
7. Dashboard loads (lazy-loaded)
   ↓
8. useDashboardData() fetches via Supabase RPC
   ↓
9. Data displayed in Dashboard
```

### Booking Flow (Public)
```
1. Customer visits /b/{business-slug}
   ↓
2. PublicBooking.tsx loads
   ↓
3. get_available_slots() → Show available times
   ↓
4. Customer selects time + services
   ↓
5. create_secure_booking() → Create in public_bookings
   ↓
6. Confirmation email sent
   ↓
7. Business owner sees in Dashboard
   ↓
8. Owner confirms → appointment created
   ↓
9. Customer gets SMS/email update
```

### Financial Flow
```
1. Appointment marked "Completed"
   ↓
2. complete_appointment() RPC triggered
   ↓
3. Auto-generates finance_records entry (revenue)
   ↓
4. If professional has commission → calculates auto-split
   ↓
5. get_finance_stats() updates dashboard
   ↓
6. Owner can view in Finance page
   ↓
7. Mark commission as paid → Updates status
```

---

## 5. Security Model

### Authentication
```
Current: Supabase Auth (Email/Password)
History: Attempted Clerk integration (rejected, see ADR)
└── Reason: Security sufficient, complexity not worth it

Session:
├── JWT token stored in browser
├── Passed in Authorization header
└── Verified server-side via RLS
```

### Authorization (RLS)
```
Row Level Security (Database-level):
├── Every SELECT/INSERT/UPDATE/DELETE enforced
├── Policies check auth.uid() against row owner
├── Multi-tenant isolation guaranteed at DB layer
└── Application layer filtering is defense-in-depth

RLS Policies by table:
├── Owned tables: auth.uid() = user_id
├── Team tables: auth.uid() = user_id OR is_staff_of(user_id)
├── Public tables: No RLS (public read)
└── Audit tables: SELECT limited to own records
```

### Rate Limiting
```
Token Bucket pattern:
├── Login attempts: 5 attempts / 1 hour per email
├── API calls: Configurable per endpoint
└── Implementation: check_login_rate_limit(), check_rate_limit()

Table: rate_limits (UNLOGGED for performance)
```

### Secrets Management
```
Environment Variables (.env.local):
├── VITE_SUPABASE_URL (frontend-safe)
├── VITE_SUPABASE_ANON_KEY (frontend-safe, RLS protects)
├── VITE_GEMINI_API_KEY (frontend-safe, domain-restricted)
└── No sensitive keys exposed in frontend

Reference: .env.example
```

---

## 6. Performance Considerations

### Code Splitting
```
Vite automatically splits lazy-loaded pages:
├── App bundle: ~150KB (gzipped)
├── Per page: ~30-50KB (gzipped)
├── On-demand loading via React.lazy()
└── Suspense fallbacks for smooth UX
```

### Database Optimization
```
Indexes (to audit in Phase 4.2):
├── (user_id, status, created_at) on appointments
├── (user_id, created_at DESC) on finance_records
├── (business_id, status) on public_bookings
└── (created_at DESC) on audit_logs

Missing indexes likely:
├── Soft-delete queries
├── Vector searches (need HNSW)
└── Time-range queries
```

### Realtime Sync
```
Supabase Realtime API:
├── Powers live updates (queue status, notifications)
├── Uses PostgreSQL LISTEN/NOTIFY
└── May need optimization for high-traffic scenarios
```

---

## 7. Scaling Concerns

### Current Bottlenecks
```
1. Context API re-renders
   ├── AlertsContext changes → full app re-render
   ├── Mitigation: Could split into smaller contexts
   └── Priority: Low (not critical until 1000+ DAU)

2. N+1 query patterns
   ├── Example: Loop fetching client data
   ├── Mitigation: Batch queries or denormalization
   └── Priority: High (audit in Phase 4.2)

3. Unindexed queries
   ├── Soft-delete queries on large tables
   ├── Mitigation: Add missing indexes
   └── Priority: High (audit in Phase 4.2)

4. Storage bucket limits
   ├── Current: ~100-200MB estimated
   ├── Limit: Supabase free tier 1GB
   └── Priority: Medium (future concern)
```

### Scaling Path (6-12 months)
```
If reaching 5000+ DAU:
├── Migrate from Context to Zustand/Redux (optional)
├── Add database connection pooling (PgBouncer)
├── Enable query result caching (Redis)
├── Implement pagination (currently not consistent)
└── CDN for static assets + image optimization
```

---

## 8. Architecture Decision Records (ADRs)

### ADR-001: Supabase Auth (NOT Clerk)
**Decision:** Use Supabase Auth instead of Clerk
**Rationale:**
- Supabase Auth is secure enough for current scale
- Clerk adds complexity without corresponding security gains
- Migration costs 20h+ for 10% UX improvement
- See: `docs/archive/CLERK_DECISION.md`

### ADR-002: HashRouter (NOT BrowserRouter)
**Decision:** Use HashRouter for client-side routing
**Rationale:**
- Works on static hosting (Vercel doesn't require rewrites)
- Simpler deployment
- Trade-off: Not SEO-friendly (acceptable for internal SaaS)

### ADR-003: Direct Supabase Calls (NOT API Layer)
**Decision:** Call Supabase directly from components
**Rationale:**
- Reduces boilerplate for SaaS internal app
- RLS provides security layer
- Trade-off: Tightly coupled to Supabase
- Migration path: Easy to extract to API layer if needed

---

## 9. Technology Choices

### Frontend
- **React 19** - Latest features (Actions, etc.)
- **TypeScript 5.8** - Type safety
- **Vite 6** - Fast bundler
- **Tailwind CSS** - Utility-first styling
- **React Router 7** - Client-side routing
- **Lucide Icons** - Icon system
- **Recharts** - Data visualization

**Why these?**
- Modern ecosystem
- Fast iteration
- Good documentation
- Community support

### Backend
- **Supabase** - Managed PostgreSQL
- **PostgreSQL 15+** - Relational database
- **pgvector** - Vector embeddings (768-dim)
- **RLS** - Row-level security

**Why?**
- No server management (managed service)
- Powerful RLS for multi-tenancy
- Vector support for AI features
- Good free tier for startups

### Deployment
- **Vercel** - Frontend hosting
- **Supabase** - Database hosting

**Why?**
- Zero-config deployment (Vercel)
- Excellent DX
- Good free tier
- Fast edge functions

---

## 10. Known Issues & Gaps

### Critical
- [ ] Missing RLS policies (TBD in Phase 4.2)
- [ ] Unindexed queries (TBD in Phase 4.2)
- [ ] Error handling in critical paths (TBD in Phase 4.2)

### High
- [ ] Test coverage <50% (see Phase 4.2)
- [ ] Missing TypeScript types (some `any` types)
- [ ] Outdated dependencies (TBD)

### Medium
- [ ] Code duplication in components
- [ ] Inconsistent error messages
- [ ] Limited semantic memory usage

### Low
- [ ] Code style inconsistencies
- [ ] Missing documentation
- [ ] Unused imports/variables

---

## Summary

**Strengths:**
✅ Modern tech stack (React 19, TypeScript, Vite)
✅ Solid multi-tenancy model (RLS + company_id filtering)
✅ Clean component architecture (50+ reusable components)
✅ Comprehensive RPC layer (41+ functions)
✅ Good security foundation (SECURITY DEFINER, rate limiting)

**Weaknesses:**
❌ Low test coverage
❌ Potential N+1 queries
❌ Tight coupling to Supabase
❌ Missing performance optimization
❌ Technical debt (TBD in Phase 4.2-4.8)

**Overall Assessment:**
🟡 **Generally Healthy** — Modern, clean architecture with opportunities for improvement in testing, performance, and technical debt reduction.

---

**Next Phases:**
- Phase 4.2: Database Audit (@data-engineer)
- Phase 4.3: Frontend Specification (@ux-design-expert)
- Phase 4.4-4.10: Reviews, assessment, and epic generation
