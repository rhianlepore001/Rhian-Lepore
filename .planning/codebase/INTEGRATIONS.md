# External Integrations

**Analysis Date:** 2026-04-11

## APIs & External Services

**Supabase Platform:**
- Supabase is the primary backend for data, auth, storage, realtime, RPCs, and serverless execution.
  - Client: `@supabase/supabase-js` in `lib/supabase.ts`
  - App usage: `contexts/AuthContext.tsx`, `contexts/AlertsContext.tsx`, `pages/*.tsx`, `hooks/*.ts`, and `utils/Logger.ts`
  - Database surface: `supabase/migrations/`
  - Serverless surface: `supabase/functions/create-checkout-session/index.ts` and `supabase/functions/send-appointment-reminder/index.ts`
  - Auth: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` on the client; server-side function envs use `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`

**AI Providers:**
- OpenRouter is used for chat-completions style workflows in `lib/openrouter.ts`, `hooks/useAIAssistant.ts`, and `hooks/useContentCalendar.ts`.
  - Endpoint: `https://openrouter.ai/api/v1/chat/completions`
  - Models referenced: `google/gemini-2.0-flash-lite-001`
  - Auth: `VITE_OPENROUTER_API_KEY`
- Google Gemini is used directly through the SDK and direct REST calls in `lib/gemini.ts`.
  - SDK: `@google/generative-ai`
  - Models referenced: `text-embedding-004`, `gemini-1.5-flash`, `gemini-2.0-flash-lite`
  - Auth: `VITE_GEMINI_API_KEY`

**Payments:**
- Stripe client bootstrap is in `pages/settings/SubscriptionSettings.tsx`.
  - SDK/Client: `@stripe/stripe-js`
  - Checkout initiation: `supabase.functions.invoke('create-checkout-session', ...)`
  - Auth: `VITE_STRIPE_PUBLISHABLE_KEY` on the client
- Stripe server-side checkout orchestration lives in `supabase/functions/create-checkout-session/index.ts`.
  - SDK/Client: Stripe Deno import plus `supabase-js`
  - Auth: `STRIPE_SECRET_KEY`
  - Data touchpoint: updates `profiles.stripe_customer_id`

**Transactional Email:**
- Resend is used in `supabase/functions/send-appointment-reminder/index.ts` for reminder emails.
  - SDK/Client: `npm:resend`
  - Auth: `RESEND_API_KEY`

## Data Storage

**Databases:**
- Supabase PostgreSQL with schema, RLS, RPCs, and business logic defined in `supabase/migrations/`.
  - Connection: client uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `lib/supabase.ts`
  - Client: `@supabase/supabase-js`
  - RPC-heavy areas include `hooks/useDashboardData.ts`, `hooks/useMarketingOpportunities.ts`, `hooks/useAIOSDiagnostic.ts`, `lib/auditLogs.ts`, `pages/Finance.tsx`, `pages/Reports.tsx`, and `pages/PublicBooking.tsx`

**File Storage:**
- Supabase Storage is the active file layer.
  - Buckets referenced by app code: `avatars` in `components/ProfileModal.tsx`, `team_photos` in `components/TeamMemberForm.tsx`, `service_images` in `components/ServiceModal.tsx`, `client_photos` in `pages/Clients.tsx`, `pages/ClientCRM.tsx`, and `pages/PublicBooking.tsx`, and `galleries` in `components/BusinessGalleryManager.tsx`
  - Bucket/policy setup exists in `supabase/migrations/20260218_storage_setup.sql` for `logos` and `covers`
  - Additional bucket creation appears in migrations such as `supabase/migrations/20260218_add_client_photos_bucket.sql`

**Caching:**
- No external cache service was detected.
- Semantic caching is implemented inside Supabase tables and RPCs in `lib/gemini.ts` and `hooks/useSemanticMemory.ts` through `ai_knowledge_base`, `client_semantic_memory`, `match_kb_content`, and `match_client_memories`.

## Authentication & Identity

**Auth Provider:**
- Supabase Auth is the identity system.
  - Implementation: `contexts/AuthContext.tsx` manages session bootstrap, `onAuthStateChange`, sign-in, sign-up, sign-out, and profile hydration
  - Password recovery: `pages/ForgotPassword.tsx` and `pages/UpdatePassword.tsx`
  - MFA: `hooks/use2FA.ts`
  - Rate limiting at login path uses Supabase RPC `check_login_rate_limit` in `contexts/AuthContext.tsx`

**Authorization:**
- Authorization is enforced mainly through RLS and security-definer RPCs in `supabase/migrations/`.
- Multi-user and company scoping logic is visible in migrations such as `supabase/migrations/20260307_us015b_multi_user_rls.sql` and `supabase/migrations/20260318_add_rpc_ownership_checks.sql`.

## Monitoring & Observability

**Error Tracking:**
- No third-party error tracker is active.
- Frontend errors are captured by `components/ErrorBoundary.tsx` and sent to Supabase via `utils/Logger.ts`.
  - RPC: `log_error`
  - UI surface: `pages/settings/SystemLogs.tsx` reads `system_errors`
- Sentry is only mentioned as a future integration comment in `utils/Logger.ts`.

**Logs and Audit:**
- Audit logging helpers call Supabase RPCs in `lib/auditLogs.ts`.
  - RPCs: `create_audit_log`, `get_audit_logs`
- System and audit views are exposed through `pages/settings/SystemLogs.tsx` and `pages/settings/AuditLogs.tsx`.

## CI/CD & Deployment

**Hosting:**
- Vercel is the primary documented frontend host in `DEPLOY.md`; SPA rewrites are defined in `vercel.json`.
- Netlify is documented as an alternate host in `DEPLOY.md`.

**CI Pipeline:**
- No CI workflow file was detected during this scan.
- Operational scripts exist locally in `package.json` and `scripts/`, but no `.github/workflows/*.yml` file was referenced by this tech-focused pass.

## Environment Configuration

**Required client env vars:**
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.example` and `lib/supabase.ts`
- `VITE_OPENROUTER_API_KEY` from `.env.example`, `lib/openrouter.ts`, `hooks/useAIAssistant.ts`, and `hooks/useContentCalendar.ts`
- `VITE_GEMINI_API_KEY` from `lib/gemini.ts` and `vite.config.ts`
- `VITE_STRIPE_PUBLISHABLE_KEY` from `pages/settings/SubscriptionSettings.tsx`

**Required server/script env vars:**
- `STRIPE_SECRET_KEY` in `supabase/functions/create-checkout-session/index.ts`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in Supabase functions and scripts
- `RESEND_API_KEY` in `supabase/functions/send-appointment-reminder/index.ts`
- `VITE_SUPABASE_SERVICE_ROLE_KEY` is also referenced by `scripts/backup-supabase.js`

**Secrets location:**
- Safe variable names are documented in `.env.example`.
- `.env` and `.env.local` exist at the repo root and should be treated as secret-bearing files.
- Vercel-hosted production env configuration is documented in `DEPLOY.md`.

## Edge / Serverless Functions

**Supabase Edge Functions:**
- `supabase/functions/create-checkout-session/index.ts`
  - Purpose: create a Stripe Checkout Session for the authenticated Supabase user
  - Upstream services: Stripe and Supabase Auth/Profile storage
  - Invocation path: `pages/settings/SubscriptionSettings.tsx`
- `supabase/functions/send-appointment-reminder/index.ts`
  - Purpose: query next-day bookings and send reminder emails through Resend
  - Upstream services: Supabase database and Resend
  - Trigger model: designed for scheduled or manual invocation; this scan did not find scheduler config in-repo

## Webhooks & Callbacks

**Incoming:**
- Stripe success and cancel browser redirects are passed as URLs from `pages/settings/SubscriptionSettings.tsx` into `create-checkout-session`; no Stripe webhook handler file was detected in `supabase/functions/`.
- Supabase password recovery callback flow is handled through hash parsing and redirect logic in `App.tsx` plus session reset in `pages/UpdatePassword.tsx`.

**Outgoing:**
- OpenRouter requests from `lib/openrouter.ts`, `hooks/useAIAssistant.ts`, and `hooks/useContentCalendar.ts`
- Google Generative AI SDK and REST requests from `lib/gemini.ts`
- Stripe API calls from `supabase/functions/create-checkout-session/index.ts`
- Resend email sends from `supabase/functions/send-appointment-reminder/index.ts`

## Notable Integration Patterns

- Use `lib/supabase.ts` for all client-side Supabase access. New data features should follow the existing pattern of `supabase.from(...)`, `supabase.rpc(...)`, `supabase.auth...`, `supabase.storage...`, and `supabase.channel(...)` as seen across `contexts/`, `hooks/`, and `pages/`.
- Keep secret-bearing integrations off the client. Stripe secret operations and email sending already follow this rule in `supabase/functions/`.
- Treat AI integrations as split-brain:
  - OpenRouter for conversational/content-generation fetch flows in `lib/openrouter.ts` and hooks.
  - Direct Gemini for embeddings, semantic cache support, and some generation flows in `lib/gemini.ts`.
- Treat Supabase migrations as part of the integration contract. Storage, RLS, RPC auth checks, payment-method reporting, and AI memory tables are all defined there, not only in the frontend.

## Practical Risks Visible From Current Integration Code

- `lib/supabase.ts` contains client fallback credentials, and `pages/settings/SubscriptionSettings.tsx` contains a fallback Stripe publishable key. They are public-scope keys, but they still hard-code deployment defaults into the client bundle.
- `index.html` and `public/*.html` load Tailwind from a CDN, so part of the UI toolchain depends on an external script at runtime rather than an npm-managed build-only dependency.
- `supabase/functions/send-appointment-reminder/index.ts` assumes a specific relational shape on `bookings`, `clients`, `services`, `business_profiles`, and `business_settings`; changes to schema or relation names will break the email function unless kept aligned with migrations.

---

*Integration audit: 2026-04-11*
