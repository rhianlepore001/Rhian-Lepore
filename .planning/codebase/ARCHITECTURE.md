# Architecture

**Analysis Date:** 2026-04-11

## Pattern Overview

**Overall:** Route-driven React SPA backed directly by Supabase.

**Key Characteristics:**
- `index.tsx` mounts a single `App` tree under an `ErrorBoundary`, so all runtime flows stay inside one client-side application shell.
- `App.tsx` centralizes routing, auth guards, provider wiring, and lazy page loading; most page modules act as orchestration layers over shared components and hooks.
- Data access is browser-side and service-light: features typically call `supabase.from(...)`, `supabase.rpc(...)`, realtime channels, or `supabase.functions.invoke(...)` from pages, hooks, contexts, or a small `lib/` helper.

## Layers

**Application Shell / Routing:**
- Purpose: Boot the SPA, wire global providers, and define route boundaries.
- Location: `index.tsx`, `App.tsx`
- Contains: `HashRouter`, lazy route imports, `ProtectedLayout`, `RequireAuth`, `OwnerRouteGuard`
- Depends on: `react-router-dom`, provider contexts, shell components such as `components/Layout.tsx`
- Used by: Every page in `pages/`

**Context / Session Layer:**
- Purpose: Hold cross-cutting client state that should survive route changes.
- Location: `contexts/AuthContext.tsx`, `contexts/AlertsContext.tsx`, `contexts/PublicClientContext.tsx`, `contexts/UIContext.tsx`, `contexts/GuidedModeContext.tsx`
- Contains: Auth/session state, trial/subscription flags, alert polling + realtime subscriptions, public-client persistence, sidebar/modal state, guided setup state
- Depends on: `lib/supabase.ts`, browser storage, helper modules such as `lib/onboarding.ts`
- Used by: Route guards in `App.tsx`, layout chrome, pages, onboarding helpers, public booking flow

**Page Orchestration Layer:**
- Purpose: Own screen-level state, route params/search params, data fetching, and composition of reusable UI.
- Location: `pages/*.tsx`, `pages/settings/*.tsx`
- Contains: Feature flows such as dashboard, agenda, finance, CRM, queue, onboarding, settings, and public booking/client-area pages
- Depends on: Contexts, hooks, shared components, `lib/supabase.ts`, utilities
- Used by: Route table in `App.tsx`

**Reusable UI / Feature Components:**
- Purpose: Render shared visual building blocks and feature-specific widgets/modals.
- Location: `components/`, `components/dashboard/`, `components/appointment/`, `components/onboarding/`, `components/security/`, `components/marketing/`
- Contains: Layout chrome, cards, buttons, modals, wizards, charts, onboarding steps, dashboard widgets
- Depends on: Props from pages/hooks, contexts, occasional direct Supabase access for tightly coupled widgets such as `components/dashboard/SetupCopilot.tsx`
- Used by: Pages and other composite components

**Hook / Derived-Data Layer:**
- Purpose: Encapsulate reusable stateful logic and fetch/transform routines without creating a formal service tier.
- Location: `hooks/`
- Contains: Feature hooks such as `hooks/useDashboardData.ts`, `hooks/useOnboardingState.ts`, `hooks/useSubscription.ts`, `hooks/useAIOSDiagnostic.ts`, `hooks/useMarketingOpportunities.ts`
- Depends on: `useAuth`, `lib/supabase.ts`, utilities, RPC endpoints
- Used by: Pages and smart components

**Supabase Integration Layer:**
- Purpose: Provide the shared client and thin helpers around RPCs and backend-side concerns.
- Location: `lib/supabase.ts`, `lib/onboarding.ts`, `lib/auditLogs.ts`, `lib/gemini.ts`, `supabase/functions/*`, `supabase/migrations/*`
- Contains: Supabase client creation, onboarding persistence helpers, audit log helpers, semantic-memory RPC access, Edge Functions for Stripe checkout and reminders, SQL migrations/RPC definitions
- Depends on: Supabase platform
- Used by: Contexts, hooks, pages, scripts, test files

## Data Flow

**Authenticated Dashboard Flow:**

1. `App.tsx` wraps authenticated routes with `ProtectedLayout`, which blocks until `contexts/AuthContext.tsx` resolves the Supabase session and profile.
2. `pages/Dashboard.tsx` consumes `useAuth`, `useAlerts`, and `hooks/useDashboardData.ts` to assemble the screen.
3. `hooks/useDashboardData.ts` mixes direct table reads (`profiles`, `appointments`, `goal_settings`) with RPC calls such as `get_dashboard_stats`, `get_dashboard_actions`, and `get_finance_stats`.
4. The page passes normalized data into dashboard widgets in `components/dashboard/` and opens heavy detail views through lazy modals.

**Public Booking Flow:**

1. Public route `/book/:slug` lands in `pages/PublicBooking.tsx` without the authenticated shell.
2. The page loads business profile, settings, services, categories, professionals, and gallery from Supabase based on `profiles.business_slug`.
3. Client identity is hydrated through `contexts/PublicClientContext.tsx`, which persists the public client in `localStorage` and uses RPCs like `get_public_client_by_phone`.
4. Availability and booking actions run through RPC-heavy calls such as `get_available_slots`, `get_full_dates`, `get_active_booking_by_phone`, and secure booking creation from `components/AppointmentWizard.tsx`.
5. The page subscribes to booking updates over Supabase realtime to keep pending/confirmed booking state fresh.

**Onboarding / Setup Flow:**

1. `App.tsx` redirects authenticated users with `tutorialCompleted === false` to `/onboarding`.
2. `pages/Onboarding.tsx` restores progress from `lib/onboarding.ts` and mounts `components/onboarding/WizardEngine.tsx` inside `WizardProvider`.
3. `WizardEngine` persists step progress via `saveOnboardingStep` and completion via `completeOnboarding`.
4. The dashboard-side `components/dashboard/SetupCopilot.tsx` separately inspects setup readiness through `getSetupStatus` and navigates users into the relevant feature pages.

**State Management:**
- Global session/business state lives in `contexts/AuthContext.tsx`.
- Cross-route UI chrome state lives in `contexts/UIContext.tsx`.
- Alert state with polling + realtime refresh lives in `contexts/AlertsContext.tsx`.
- Public-client identity for anonymous booking flows lives in `contexts/PublicClientContext.tsx`.
- Feature state is otherwise local `useState` inside pages/components, often mirrored from route search params such as `pages/Agenda.tsx` and `pages/Finance.tsx`.
- Persistence uses browser storage directly: `localStorage` in `contexts/AuthContext.tsx` and `contexts/PublicClientContext.tsx`, `sessionStorage` in `contexts/GuidedModeContext.tsx`.

## Key Abstractions

**Route Guards:**
- Purpose: Separate public, authenticated, and owner-only surfaces.
- Examples: `ProtectedLayout`, `RequireAuth`, `OwnerRouteGuard` in `App.tsx`
- Pattern: Small wrapper components returning `Navigate` / `Outlet`

**Feature Hooks as Query Adapters:**
- Purpose: Normalize Supabase results into UI-ready state.
- Examples: `hooks/useDashboardData.ts`, `hooks/useOnboardingState.ts`, `hooks/useSubscription.ts`
- Pattern: Hook owns Supabase reads, derived calculations, loading flags, and mutation helpers

**Composable Feature Widgets:**
- Purpose: Keep pages focused on orchestration while heavy UI stays modular.
- Examples: `components/dashboard/ProfitMetrics.tsx`, `components/dashboard/ActionCenter.tsx`, `components/dashboard/MeuDiaWidget.tsx`, `components/AppointmentWizard.tsx`
- Pattern: Page passes normalized data or callback props into domain widgets and modals

**Thin Lib Helpers Around Backend Contracts:**
- Purpose: Reuse RPC/table access where multiple call sites need the same contract.
- Examples: `lib/onboarding.ts`, `lib/auditLogs.ts`, `lib/gemini.ts`
- Pattern: Export plain async functions over `supabase` rather than classes or repository objects

## Entry Points

**Browser Bootstrap:**
- Location: `index.tsx`
- Triggers: Initial page load
- Responsibilities: Find `#root`, create the React root, wrap the app in `components/ErrorBoundary.tsx`

**App Router:**
- Location: `App.tsx`
- Triggers: Every client navigation
- Responsibilities: Register providers, configure route tree, redirect unauthenticated or incomplete users, decide when `components/Layout.tsx` is used

**Authenticated Shell:**
- Location: `components/Layout.tsx`
- Triggers: All routes inside `ProtectedLayout`
- Responsibilities: Mount sidebar/header/bottom-nav shell, wrap children with `UIProvider`, inject paywall/banner behavior

**Public Booking Surface:**
- Location: `pages/PublicBooking.tsx`
- Triggers: `/book/:slug`
- Responsibilities: Resolve business profile, collect booking input, fetch availability, submit bookings, handle edit/rebook flows

**Settings Shell:**
- Location: `components/SettingsLayout.tsx`
- Triggers: `pages/settings/*.tsx`
- Responsibilities: Provide settings-specific nav/drawer layout while keeping each settings page focused on one resource

## Error Handling

**Strategy:** Fail soft in the UI, log aggressively, and prefer empty/partial states over route-level crashes.

**Patterns:**
- `components/ErrorBoundary.tsx` provides the only app-wide hard stop for render errors.
- Most data loaders catch errors locally and keep the page alive, for example `hooks/useDashboardData.ts`, `pages/Reports.tsx`, and `components/dashboard/SetupCopilot.tsx`.
- `utils/Logger.ts` writes to the console and forwards errors to the `log_error` RPC without blocking the UI.
- Auth, onboarding, and public-client flows usually log and continue rather than throwing, which means failures tend to degrade behavior instead of breaking navigation.

## Cross-Cutting Concerns

**Logging:** Use `utils/Logger.ts` for structured client-side logging; many older paths still call `console.error` directly.

**Validation:** Input validation is mostly inline in pages/components such as `pages/PublicBooking.tsx`, `pages/Finance.tsx`, and `components/AppointmentWizard.tsx`; there is no centralized schema layer.

**Authentication:** Supabase Auth is the primary identity source in `contexts/AuthContext.tsx`; public booking uses anonymous-access tables/RPCs plus `contexts/PublicClientContext.tsx`.

**Backend Interaction:** Prefer direct `supabase` usage from the feature that needs the data. Use RPCs for business rules (`get_dashboard_stats`, `create_secure_booking`, `mark_expense_as_paid`), realtime channels for live updates (`pages/Agenda.tsx`, `contexts/AlertsContext.tsx`, `pages/PublicBooking.tsx`), and Edge Functions for privileged integrations such as Stripe checkout in `supabase/functions/create-checkout-session/index.ts`.

---

*Architecture analysis: 2026-04-11*
