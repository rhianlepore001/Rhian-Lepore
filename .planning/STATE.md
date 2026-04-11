# STATE.md — Project State

> **GSD Project State**  
> **Initialized:** 2026-04-11  
> **Project:** AGENX — SaaS para gestão de barbearias

---

## Status: CODEBASE MAPPED

The codebase has been analyzed and documented. The project is an existing brownfield SaaS with significant implementation already in place.

---

## Project Context

**What it is:** Multi-tenant SaaS for barber shop and salon management  
**Tech stack:** React 19 + TypeScript + Vite + Supabase + Tailwind  
**Auth:** Supabase Auth with JWT, RLS-enforced multi-tenancy via `company_id`  
**Deployment:** Vercel  
**Current phase:** Pre-launch MVP (30-day accelerated plan started April 11, 2026)

---

## Codebase Map

| Document | Path | Status |
|----------|------|--------|
| STACK.md | `.planning/codebase/STACK.md` | ✅ Complete |
| INTEGRATIONS.md | `.planning/codebase/INTEGRATIONS.md` | ✅ Complete |
| ARCHITECTURE.md | `.planning/codebase/ARCHITECTURE.md` | ✅ Complete |
| STRUCTURE.md | `.planning/codebase/STRUCTURE.md` | ✅ Complete |
| CONVENTIONS.md | `.planning/codebase/CONVENTIONS.md` | ✅ Complete |
| TESTING.md | `.planning/codebase/TESTING.md` | ✅ Complete |
| CONCERNS.md | `.planning/codebase/CONCERNS.md` | ✅ Complete |

---

## Existing Roadmap

The project already has an execution plan at `AGENX-SDD-30DAYS.md`:

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 0 — Security | OpenRouter key secured | ✅ Done |
| Phase 1 — Identity/Docs | README, CLAUDE.md, package.json | ✅ Done |
| Phase 2 — Repo Cleanup | Remove 4.5MB stale files | 🔴 Pending |
| Phase 3 — Feature Specs | Collaborators, Finance, Commissions | 🟡 In Progress |
| Phase 4 — E2E Tests | Full flow testing + mobile | 🔴 Pending |
| Phase 5 — Polish | UX, copy, domain, favicon | 🔴 Pending |
| Phase 6 — Beta + Launch | Stripe, Instagram, 3-5 beta users | 🔴 Pending |

---

## Key Facts for New Agents

- **Router:** HashRouter — all routes use `#/path` pattern
- **Company_id:** Always sourced from `useAuth()`, never hardcoded
- **Supabase client:** Import from `@/lib/supabase`
- **Roles:** `owner` (full access) | `staff` (own schedule + commissions only)
- **RLS:** Enforced at DB level — trust it, don't bypass it
- **Auth:** Exclusively Supabase Auth — no Clerk in the project
- **AI features** (OpenRouter, Gemini, RAG): Post-MVP, not critical path
- **Largest files:** `Agenda.tsx` (111KB), `PublicBooking.tsx` (104KB) — avoid touching unless necessary
- **94 migrations** in `supabase/migrations/` — don't run outdated ones manually

---

## Next Steps

Run `/gsd-plan-phase 2` to start the repository cleanup phase.
