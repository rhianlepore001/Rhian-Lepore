# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Beauty OS / AgenX AIOS** - A premium SaaS system for salon and barbershop management. This is a React 19 + TypeScript + Vite frontend application with multi-tenant support, advanced theming (Brutal for barbershops, Beauty for salons), and AI-powered features.

**Key Tech Stack:**
- Frontend: React 19, TypeScript 5.8, Vite 6
- Styling: Tailwind CSS (glassmorphism design patterns)
- Database: Supabase (PostgreSQL with RLS for multi-tenant isolation)
- Authentication: Clerk (migrated from Supabase Auth)
- AI: Google Generative AI (Gemini API)
- Payments: Stripe
- Testing: Vitest + React Testing Library
- Routing: React Router 7 (HashRouter pattern)
- Charts: Recharts
- UI Components: Lucide React icons, custom components

---

## Build and Run Commands

### Development
```bash
npm install              # Install dependencies
npm run dev            # Start dev server (http://localhost:3000 with --host flag)
npm run sync:ide       # Sync AIOS infrastructure
```

### Production
```bash
npm run build          # Build for production (outputs to dist/)
npm run preview        # Preview production build locally
```

### Code Quality
```bash
npm run lint           # Run ESLint (strict, fails on any warnings)
npm run typecheck      # Run TypeScript compiler check
npm run lint --fix     # Fix ESLint issues automatically
```

### Testing
```bash
npm test               # Run all Vitest tests
npm test -- <file>     # Run specific test file
npm run test:ui        # Run tests with UI dashboard
npm run test:coverage  # Generate coverage report
```

### Special Commands
```bash
npm run aios:doctor    # Run AIOS diagnostic tool
```

---

## Project Structure

### Core Directories
- **`pages/`** - Page components (Dashboard, Agenda, Finance, Marketing, ClientCRM, etc.)
  - Settings pages in `pages/settings/` (Team, Services, Subscriptions, Security, Audit Logs, etc.)
  - Public pages: PublicBooking, QueueJoin, QueueStatus, ProfessionalPortfolio
- **`components/`** - Reusable UI components (~50+ files)
  - Modal components: AppointmentEditModal, ClientAuthModal, etc.
  - Feature components: CommissionsManagement, BusinessHoursEditor, etc.
  - Styled components: BrutalCard, BrutalButton, BrutalBackground
- **`contexts/`** - React Context for global state
  - AuthContext: Authentication state and user session
  - AlertsContext: Toast notifications and alerts
  - PublicClientContext: Public booking client data
  - UIContext: UI theme preferences
- **`lib/`** - Utility libraries
  - `supabase.ts`: Database client initialization
  - `gemini.ts`: Google Generative AI integration
  - `auditLogs.ts`: Audit logging utilities
- **`utils/`** - Helper functions
  - `date.ts`: Date formatting and calculations
  - `formatters.ts`: Currency and data formatters
  - `Logger.ts`: Custom logging utility
  - `tierSystem.ts`: Subscription tier logic
- **`.agent/`** - Agent rules and configurations
  - `rules/`: Security, performance, and architectural rules (GEMINI.md is master rule file)
  - `agents/`: Agent profiles for different specializations
- **`.aiox-core/`** - AIOS infrastructure (pre-integrated AI system framework)
- **`public/`** - Static assets (PWA icons, favicons, etc.)
- **`supabase/`** - Database migrations (SQL files)
- **`test/`** - Test setup and configuration

### Configuration Files
- `vite.config.ts` - Vite config (port 3000, path aliases with `@/`)
- `tsconfig.json` - TypeScript config (ES2022 target, strict settings)
- `vitest.config.ts` - Vitest config (jsdom environment, coverage setup)
- `.eslintrc.json` - ESLint config (React + TypeScript rules)
- `.env.example` - Environment variables template
- `package.json` - Dependencies and scripts

---

## Architecture & Patterns

### Routing Architecture
- **HashRouter**: Application uses `#` based routing (not traditional URL paths)
- Route structure in `App.tsx` with lazy-loaded page components
- Protected routes via ProtectedLayout wrapper that checks authentication
- Public routes for unauthenticated users (PublicBooking, QueueJoin, etc.)

### State Management
- **React Context API** for global state (no Redux/Zustand)
- AuthContext provides `useAuth()` hook for authentication state
- AlertsContext for toast notifications via `useAlerts()` hook
- Components access context via custom hooks

### Multi-Tenant Architecture
- **Company/Tenant Isolation**: All data queries must include `company_id` filter
- **Supabase RLS (Row Level Security)**: Enforced at database level via policies
- User's `company_id` extracted from Supabase auth session (never from URL/form input)
- Critical: See `.agent/rules/rule-03-multi-tenant-shield.md` for security requirements

### Component Pattern
- Functional components with hooks (React 19)
- TypeScript interfaces for props and data types
- Tailwind CSS for styling (custom "Brutal" theme classes)
- Modal components use state-based visibility management
- Forms use controlled components with React state

### Data Fetching
- Direct Supabase client calls from components (not centralized API layer)
- Supabase client initialized in `lib/supabase.ts`
- Error handling via try/catch blocks
- Loading states managed with component-level state

### Authentication Flow
1. User logs in via Clerk
2. Clerk provides session tokens
3. AuthContext wraps app and maintains auth state
4. Protected routes check `isAuthenticated` before rendering
5. Supabase queries use Clerk's auth tokens via RLS policies

---

## Important Architectural Rules

### Security (See `.agent/rules/` for detailed rules)

**Multi-Tenant Isolation:**
- All database queries MUST filter by `company_id` from session
- Supabase RLS enabled on all tenant-accessible tables
- Never accept `company_id` from URL params or form input
- Extract from `auth.jwt()` in database policies or Supabase client session

**Environment Variables:**
- `GEMINI_API_KEY` required in `.env.local` for AI features
- Never commit `.env` or `.env.local` files
- Use `.env.example` as template for local setup

**Vite Client Auth Security:**
- See `rule-01-vite-client-auth.md` and `rule-02-vite-env-security.md`
- API keys exposed in Vite build are intentionally frontend-safe (Gemini key is frontend-only)

### Code Organization

**Component Responsibilities:**
- One component per file (or related compound components)
- Keep components focused on UI and user interaction
- Extract complex logic to utility functions
- Use TypeScript interfaces for all props

**File Naming:**
- Components: PascalCase (Dashboard.tsx, ClientCRM.tsx)
- Utilities: camelCase (formatters.ts, date.ts)
- Config files: kebab-case or camelCase (vite.config.ts)

**Styling Approach:**
- Tailwind CSS utility classes
- Custom theme colors in CSS (--color-* variables)
- "Brutal" theme for barbershops (dark, bold aesthetic)
- "Beauty" theme for salons (elegant, clean aesthetic)
- Glassmorphism effects for premium feel

---

## Testing Strategy

### Test Setup
- **Test Runner:** Vitest (compatible with Jest syntax)
- **Environment:** jsdom (DOM simulation)
- **Assertion Library:** Jest/Vitest built-in (no separate library needed)
- **Component Testing:** React Testing Library patterns
- **Setup File:** `test/setup.ts` (runs before tests)

### Test File Location
- Test files alongside source files: `ComponentName.test.tsx`
- Test configuration in `test/setup.ts`

### Testing Patterns
```typescript
// Example test pattern
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from './Dashboard';

describe('Dashboard', () => {
  it('should render dashboard title', () => {
    render(<Dashboard />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
```

### Running Tests
- `npm test` - Run all tests in watch mode
- `npm test -- --run` - Run once and exit
- `npm run test:ui` - Visual dashboard for test results
- `npm run test:coverage` - Generate coverage report (HTML in `coverage/`)

---

## Database Architecture

### Supabase Setup
- PostgreSQL database with Row Level Security (RLS)
- Migrations stored in `supabase/migrations/`
- Service role key used for admin operations only
- Anon key used for client-side queries

### RLS Policies
- Every table accessed by users has ENABLE ROW LEVEL SECURITY
- Policies filter by `company_id` from JWT claims
- Service role bypasses RLS (use cautiously)

### Key Tables
- `companies` - Tenant/organization data
- `users` - User accounts linked to companies
- `appointments` - Scheduling data with company isolation
- `services` - Service offerings per company
- `transactions` - Financial records per company
- Audit tables for tracking changes

---

## Development Workflow

### Before Starting
1. Check `.env.local` is configured with required keys (GEMINI_API_KEY, Supabase credentials)
2. Run `npm install` if dependencies were updated
3. Start dev server: `npm run dev`
4. Open http://localhost:3000 in browser

### Making Changes
1. Create feature branches from `main`
2. Run `npm run lint` and `npm run typecheck` frequently
3. Add tests for new functionality
4. Keep commits focused and descriptive

### Common Tasks
- **Add new page:** Create in `pages/`, add route to `App.tsx`, add to lazy-loaded imports
- **Add new component:** Create in `components/`, import where needed
- **Update database schema:** Create migration file in `supabase/migrations/`
- **Add context state:** Extend relevant context in `contexts/`
- **Debug authentication:** Check `AuthContext.tsx` and Clerk dashboard
- **Style component:** Use Tailwind classes + custom CSS if needed

---

## Key Gotchas & Things to Know

1. **HashRouter**: Routes use `#` (e.g., `/#/dashboard` not `/dashboard`)
2. **Lazy Loading**: Pages imported with `React.lazy()` - wrap in `<Suspense>` with fallback
3. **Supabase Auth**: Migrated from custom auth to Clerk - some legacy code may reference old patterns
4. **RLS is Critical**: Without proper RLS, multi-tenant isolation breaks - always check queries
5. **TypeScript Paths**: `@/` alias points to root directory (configured in tsconfig.json)
6. **Mobile First**: Components optimized for mobile first (check responsive behavior)
7. **PWA Support**: App is installable on mobile - test in PWA mode for offline support
8. **Agent System**: `.agent/` directory contains special rules - read GEMINI.md for priorities

---

## Performance Considerations

- **Code Splitting**: Vite automatically splits lazy-loaded pages
- **Renders**: Watch for unnecessary re-renders in context updates
- **Database Queries**: Minimize number of queries per component
- **Bundle Size**: Check imports - avoid importing entire libraries if only using one function
- **Styling**: Tailwind purges unused classes in production build

---

## Useful Resources

- **Vite Docs**: https://vitejs.dev/
- **React 19 Docs**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/
- **Vitest**: https://vitest.dev/
- **React Router**: https://reactrouter.com/

---

## Important Notes

- **Portuguese Language Rule**: Project enforces Portuguese (Brazilian) for all documentation, comments, and communication - see `.agent/rules/GEMINI.md` (P0 priority rule)
- **Agent System Active**: This codebase uses AIOS (AI Operating System) framework with specialized agents - check `.agent/rules/` directory for active constraints
- **Security Audit Completed**: See `SECURITY_AUDIT.md` for known issues and audit trail
- **Temporary Files Ignore**: `temp_*`, `*_tests/`, `.antigravity/` directories are temporary - generally safe to delete if not in active use
