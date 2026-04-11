# Codebase Structure

**Analysis Date:** 2026-04-11

## Directory Layout

```text
[project-root]/
├── components/       # Shared UI, feature widgets, modals, and onboarding/appointment subfeatures
├── contexts/         # Global React context providers for auth, alerts, UI, and public-client state
├── hooks/            # Reusable stateful feature hooks and Supabase-backed data loaders
├── lib/              # Thin integration helpers around Supabase, onboarding, AI prompts, and audit helpers
├── pages/            # Route-level screens, including nested settings pages
├── utils/            # Formatting, date, logging, validation, and token helpers
├── constants/        # Focused constant modules such as wizard targets and glossary data
├── supabase/         # Database migrations and Edge Functions
├── test/             # Vitest suites for hooks, contexts, components, and utility modules
├── public/           # Static assets, manifests, theme demos, and icons
├── scripts/          # One-off maintenance and Supabase support scripts
├── index.tsx         # Browser bootstrap
├── App.tsx           # Router and provider composition
├── package.json      # Runtime/tooling manifest
└── vite.config.ts    # Vite config, aliasing, and PWA plugin setup
```

## Directory Purposes

**`components/`:**
- Purpose: Hold reusable UI primitives plus feature-specific UI assemblies.
- Contains: Shell components (`components/Layout.tsx`, `components/Sidebar.tsx`, `components/Header.tsx`), widgets, cards, modals, appointment flow pieces, onboarding flow pieces
- Key files: `components/Layout.tsx`, `components/SettingsLayout.tsx`, `components/AppointmentWizard.tsx`, `components/dashboard/SetupCopilot.tsx`, `components/onboarding/WizardEngine.tsx`

**`contexts/`:**
- Purpose: Hold top-level providers that expose cross-route state via hooks.
- Contains: Auth, alerts, public booking client state, UI chrome state, guided-mode state
- Key files: `contexts/AuthContext.tsx`, `contexts/AlertsContext.tsx`, `contexts/PublicClientContext.tsx`, `contexts/UIContext.tsx`, `contexts/GuidedModeContext.tsx`

**`hooks/`:**
- Purpose: Encapsulate reusable fetch + transform logic and focused client workflows.
- Contains: Business metrics hooks, onboarding state, AI/marketing helpers, tour/subscription/security helpers
- Key files: `hooks/useDashboardData.ts`, `hooks/useOnboardingState.ts`, `hooks/useSubscription.ts`, `hooks/useAIOSDiagnostic.ts`, `hooks/useSemanticMemory.ts`

**`lib/`:**
- Purpose: Hold shared integration helpers and small domain modules that are not React components.
- Contains: Supabase client setup, onboarding persistence, audit log helpers, AI prompt builders, third-party wrappers
- Key files: `lib/supabase.ts`, `lib/onboarding.ts`, `lib/auditLogs.ts`, `lib/ai-assistant-prompts.ts`, `lib/gemini.ts`

**`pages/`:**
- Purpose: Hold route targets registered in `App.tsx`.
- Contains: Top-level screens such as `pages/Dashboard.tsx`, `pages/Agenda.tsx`, `pages/PublicBooking.tsx`, plus nested settings routes in `pages/settings/`
- Key files: `pages/Dashboard.tsx`, `pages/Agenda.tsx`, `pages/Finance.tsx`, `pages/PublicBooking.tsx`, `pages/Onboarding.tsx`, `pages/settings/GeneralSettings.tsx`

**`utils/`:**
- Purpose: Hold plain helpers without React coupling.
- Contains: Date parsing/formatting, currency formatting, logging, password validation, tier/token helpers
- Key files: `utils/date.ts`, `utils/formatters.ts`, `utils/Logger.ts`, `utils/passwordValidation.ts`

**`constants/`:**
- Purpose: Hold focused constant datasets that are consumed by feature logic.
- Contains: Guided wizard targets and glossary data
- Key files: `constants/WIZARD_TARGETS.ts`, `constants/i18n-glossary.ts`, root `constants.ts`

**`supabase/`:**
- Purpose: Hold backend-side assets owned by Supabase.
- Contains: SQL migrations in `supabase/migrations/` and Deno Edge Functions in `supabase/functions/`
- Key files: `supabase/functions/create-checkout-session/index.ts`, `supabase/functions/send-appointment-reminder/index.ts`

**`test/`:**
- Purpose: Hold centralized test suites rather than co-locating most tests beside source.
- Contains: `test/components/`, `test/contexts/`, `test/hooks/`, `test/lib/`, `test/utils/`, plus `test/setup.ts`
- Key files: `test/setup.ts`, `test/hooks/useDashboardData.test.ts`, `test/contexts/AuthContext.test.tsx`

## Key File Locations

**Entry Points:**
- `index.tsx`: Mounts the React app and wraps it in `components/ErrorBoundary.tsx`
- `App.tsx`: Defines the route table, providers, auth guards, and lazy page loading
- `pages/Onboarding.tsx`: Entry for the provider-backed onboarding wizard flow

**Configuration:**
- `package.json`: Scripts and package dependencies
- `vite.config.ts`: Vite server config, alias `@`, and PWA plugin configuration
- `tsconfig.json`: TypeScript compiler options and alias mapping
- `vitest.config.ts`: Test runner setup

**Core Logic:**
- `contexts/AuthContext.tsx`: Canonical authenticated user/business state
- `hooks/useDashboardData.ts`: Dashboard aggregation and derived metrics
- `lib/onboarding.ts`: Shared onboarding persistence helpers
- `pages/PublicBooking.tsx`: Public booking flow orchestration
- `pages/Finance.tsx`: Finance screen orchestration and mutation paths

**Testing:**
- `test/setup.ts`: Shared Vitest DOM setup
- `test/components/*.test.tsx`: Component-level behavior tests
- `test/hooks/*.test.ts`: Hook tests
- `test/contexts/*.test.tsx`: Provider/context tests

## Naming Conventions

**Files:**
- React components use `PascalCase.tsx`: `pages/Dashboard.tsx`, `components/BrutalCard.tsx`
- Hooks use `useX.ts` or `useX.tsx`: `hooks/useDashboardData.ts`, `hooks/use2FA.ts`
- Utility and lib modules use `camelCase.ts`: `utils/formatters.ts`, `lib/onboarding.ts`
- Route groups use nested folders when the URL family is broad: `pages/settings/*.tsx`

**Directories:**
- Top-level feature buckets are lowercase plurals: `components/`, `contexts/`, `hooks/`, `pages/`, `utils/`
- Feature-specific component subfolders are lowercase nouns: `components/dashboard/`, `components/appointment/`, `components/onboarding/`, `components/security/`

## Where to Add New Code

**New Route-Level Feature:**
- Primary code: add a page under `pages/` or `pages/settings/` and register it in `App.tsx`
- Shared shell/navigation updates: touch `App.tsx`, `components/Layout.tsx`, or `components/SettingsLayout.tsx` only if the route changes the app chrome
- Tests: add coverage in `test/` under the matching area, for example `test/hooks/` or `test/components/`

**New Reusable Component or Widget:**
- General shared UI: `components/`
- Dashboard-only UI: `components/dashboard/`
- Appointment booking flow UI: `components/appointment/`
- Onboarding wizard UI: `components/onboarding/`
- If the component fetches its own data, keep it close to the owning feature folder instead of creating a broad shared bucket

**New Hook or Derived Data Loader:**
- Implementation: `hooks/`
- Use this when multiple pages/components need the same Supabase-backed state or transformation pattern
- Keep pure formatting helpers in `utils/` instead of `hooks/`

**New Backend Contract Helper:**
- Client helper wrapper: `lib/`
- Database schema/RPC changes: `supabase/migrations/`
- Privileged server-side integration: `supabase/functions/`

**Utilities:**
- Shared helpers: `utils/`
- Shared constant datasets: `constants/`

## Special Directories

**`pages/settings/`:**
- Purpose: Dedicated settings screens that all render inside `components/SettingsLayout.tsx`
- Generated: No
- Committed: Yes

**`components/dashboard/`:**
- Purpose: Dashboard-only widgets, hero blocks, and modals
- Generated: No
- Committed: Yes

**`components/onboarding/`:**
- Purpose: Provider-backed onboarding wizard engine, overlay, progress UI, and step screens
- Generated: No
- Committed: Yes

**`supabase/migrations/`:**
- Purpose: Source of truth for schema, policy, storage, and RPC evolution
- Generated: No
- Committed: Yes

**`supabase/functions/`:**
- Purpose: Deno Edge Functions for privileged integrations such as checkout session creation
- Generated: No
- Committed: Yes

**`public/`:**
- Purpose: Static assets delivered by Vite without import indirection
- Generated: Mixed
- Committed: Yes

**`.planning/codebase/`:**
- Purpose: Mapper-generated reference docs consumed by later GSD phases
- Generated: Yes
- Committed: Yes

## Structural Guidance

- Use `App.tsx` as the only route registry. Do not hide route definitions inside feature modules.
- Put orchestration and search-param logic in `pages/`; keep reusable UI in `components/`.
- Reach for a hook in `hooks/` when the same Supabase query/normalization logic would otherwise be duplicated across pages or widgets.
- Put thin backend helpers in `lib/` instead of creating a large service class hierarchy; that is the dominant pattern in `lib/onboarding.ts` and `lib/auditLogs.ts`.
- Use the `@` alias only where it improves readability for cross-root imports; the codebase mixes alias imports and relative imports, so preserve the local style of the file you edit.

---

*Structure analysis: 2026-04-11*
