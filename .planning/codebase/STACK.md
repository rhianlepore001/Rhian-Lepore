# Technology Stack

**Analysis Date:** 2026-04-11

## Languages

**Primary:**
- TypeScript 5.8.x for the SPA, hooks, contexts, utilities, and Supabase Edge Functions. Main app entry points are `index.tsx`, `App.tsx`, `components/`, `pages/`, `hooks/`, `contexts/`, and `lib/`.
- SQL for database schema, RLS policies, RPCs, storage policies, and operational fixes in `supabase/migrations/`.

**Secondary:**
- HTML for the application shell and CDN-loaded styling in `index.html`.
- JavaScript for operational scripts such as `scripts/backup-supabase.js`, `scripts/fix-queue-rls.mjs`, and `scripts/verify_rls.ts`.

## Runtime

**Environment:**
- Node.js 18+ is the documented local requirement in `README.md`.
- Browser runtime for the client app, bootstrapped from `index.html` and mounted in `index.tsx`.
- Deno runtime for Supabase Edge Functions in `supabase/functions/create-checkout-session/index.ts` and `supabase/functions/send-appointment-reminder/index.ts`.

**Package Manager:**
- npm via `package-lock.json`.
- Lockfile: present in `package-lock.json`.

## Frameworks

**Core:**
- React 19 in `package.json` with the app mounted from `index.tsx` and route composition in `App.tsx`.
- React Router DOM 7 for client routing in `App.tsx`.
- Vite 6 as the dev server and build tool in `package.json` and `vite.config.ts`.
- Supabase JS 2.x as the primary backend client in `lib/supabase.ts`.

**Testing:**
- Vitest 2 with jsdom in `vitest.config.ts`.
- Testing Library packages in `package.json`.
- Playwright is installed in `package.json`, but this scan did not find a Playwright config file in the repo root.

**Build/Dev:**
- `@vitejs/plugin-react` in `vite.config.ts` and `vitest.config.ts`.
- `vite-plugin-pwa` in `vite.config.ts` for manifest generation and auto-update behavior.
- ESLint with TypeScript and React plugins in `.eslintrc.json`.

## UI and Styling

**Styling approach:**
- Utility-class styling is used heavily throughout JSX, for example in `App.tsx`, `components/ErrorBoundary.tsx`, and `pages/settings/SubscriptionSettings.tsx`.
- Tailwind is not installed as an npm dependency in `package.json`; instead, the app shell loads `https://cdn.tailwindcss.com` and defines `tailwind.config` inline in `index.html`.
- Brand fonts are loaded from Google Fonts in `index.html`.

**PWA surface:**
- Vite PWA plugin defines manifest metadata in `vite.config.ts`.
- Runtime manifest switching is implemented in `hooks/useDynamicBranding.ts`.
- Public manifest assets live in `public/manifest-barber.webmanifest` and `public/manifest-beauty.webmanifest`.

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` in `package.json` and `lib/supabase.ts` for auth, database access, storage, realtime channels, RPCs, and function invocation.
- `react`, `react-dom`, and `react-router-dom` in `package.json` for the SPA shell in `index.tsx` and `App.tsx`.
- `@google/generative-ai` in `package.json` and `lib/gemini.ts` for direct Gemini calls and embeddings.
- `@stripe/stripe-js` and `@stripe/react-stripe-js` in `package.json`; client checkout bootstrap happens in `pages/settings/SubscriptionSettings.tsx`.

**Infrastructure:**
- `vite-plugin-pwa` in `package.json` and `vite.config.ts` for installable app behavior.
- `dotenv` in `package.json`, used by `scripts/backup-supabase.js`.
- `supabase` CLI package in `package.json`; repo structure under `supabase/` and the `backup` script indicate Supabase CLI-driven workflows.
- `recharts`, `lucide-react`, `driver.js`, `focus-trap-react`, `html2canvas`, and `qrcode` in `package.json` support charts, icons, onboarding UX, modal focus, canvas export, and QR generation.

## Configuration

**Environment:**
- Safe env template is documented in `.env.example`.
- Frontend env access uses `import.meta.env` in `lib/supabase.ts`, `lib/openrouter.ts`, `lib/gemini.ts`, `hooks/useAIAssistant.ts`, `hooks/useContentCalendar.ts`, and `pages/settings/SubscriptionSettings.tsx`.
- Node scripts use `process.env` in `scripts/backup-supabase.js`, `scripts/verify_rls.ts`, and `scripts/fix-queue-rls.mjs`.
- Edge Functions use `Deno.env.get(...)` in `supabase/functions/create-checkout-session/index.ts` and `supabase/functions/send-appointment-reminder/index.ts`.
- `.env`, `.env.local`, and `.env.example` are present at the repo root. Use `.env.example` as the safe source of env names; do not read `.env` or `.env.local`.

**Build:**
- TypeScript compiler options and the `@/*` alias are defined in `tsconfig.json`.
- Vite dev server host, port, aliasing, PWA config, and injected `process.env.*` shims are defined in `vite.config.ts`.
- SPA rewrite routing for deployment is configured in `vercel.json`.

## Deployment and Runtime Surfaces

**Frontend hosting:**
- Vercel is the primary documented host in `DEPLOY.md` and `vercel.json`.
- Netlify is documented as an alternative in `DEPLOY.md`.

**Backend surfaces:**
- Supabase provides PostgreSQL, Auth, Storage, Realtime, RPCs, and Edge Functions. The client entry point is `lib/supabase.ts`; database behavior is defined under `supabase/migrations/`.
- Stripe checkout is brokered through the Supabase Edge Function `supabase/functions/create-checkout-session/index.ts`.
- Email reminders are sent through the Supabase Edge Function `supabase/functions/send-appointment-reminder/index.ts`.

## Platform Requirements

**Development:**
- Node.js 18+ per `README.md`.
- npm install followed by `npm run dev`.
- Supabase project access and env configuration matching `.env.example`.

**Production:**
- Static frontend build output from `vite build`.
- SPA hosting with rewrite-to-`index.html`, as shown in `vercel.json`.
- Supabase project with migrations from `supabase/migrations/` applied and Edge Functions deployed from `supabase/functions/`.

## Practical Guidance

- Treat the frontend as a Vite React SPA with a Supabase backend, not as a Next.js or server-rendered app. New app code belongs in `components/`, `pages/`, `hooks/`, `contexts/`, and `lib/`.
- Treat `supabase/migrations/` as the authoritative backend schema and policy history for data model changes, storage buckets, and RPC behavior.
- When documenting or changing styling, account for the current CDN Tailwind setup in `index.html`; there is no root `tailwind.config.*` or PostCSS pipeline in this repo.
- When adding backend-only secrets, prefer Edge Functions or Supabase-side execution rather than putting secrets into `import.meta.env` usage in client files.

---

*Stack analysis: 2026-04-11*
