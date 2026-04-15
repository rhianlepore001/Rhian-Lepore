# Phase 2: Repository Cleanup - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove ~4.5MB of obsolete files (AIOX, RAG, multi-agent frameworks, Gemini IDE config, photo assets) to reduce repo bloat before beta. Keep active code (.planning/, .agent/, src/, supabase/, docs), all configuration files, and git history intact.

</domain>

<decisions>
## Implementation Decisions

### Cleanup Strategy
- **D-01:** Aggressive approach — delete everything outside core folders (src/, supabase/, .planning/, .agent/, .claude/get-shit-done/, package.json, README, CLAUDE.md, LICENSE, public/, docs/)
- **D-02:** Keep .agent/ directory — it contains active GSD system configuration and skills
- **D-03:** Keep .claude/get-shit-done/ — it contains active GSD workflow and templates
- **D-04:** Remove .claude/agents/ — historical AIOX agent configs (obsolete)
- **D-05:** Remove .gemini/ — Antigravity IDE config (not used)
- **D-06:** Remove .codex/ — Codex IDE config (not used)
- **D-07:** Remove supabase/.temp/ — temporary CLI files
- **D-08:** Remove any photo zip files or asset directories at root level

### Commit Structure
- **D-09:** Single atomic commit: `chore: clean repo — remove AIOX, RAG, agent frameworks, Gemini config`
- **D-10:** Include detailed commit message listing categories deleted

### Verification Strategy
- **D-11:** No backup branch — trust git history (can revert via git if needed)
- **D-12:** Run `git status` before deletion to confirm staged changes
- **D-13:** Verify .planning/, .agent/, src/ still exist after cleanup

### Claude's Discretion
- Exact list of directories to preserve (prioritize safety over size)
- Order of deletion commands
- Post-deletion verification checks

</decisions>

<canonical_refs>
## Canonical References

- `ROADMAP.md` Phase 2 — cleanup scope and requirements (REQ-010, REQ-011)
- `PROJECT.md` — core value and project identity (confirms what to keep)
- `CLAUDE.md` — project rules (Portuguese priority, multi-tenant, core stack)

</canonical_refs>

<code_context>
## Existing Code Insights

### Preserve
- `src/` — React 19 + TypeScript source code (active product)
- `supabase/` — migrations, edge functions, RLS policies (database schema)
- `public/` — favicon, manifest, static assets
- `package.json`, `package-lock.json`, `.tsconfig.json`, `vite.config.ts` — build config
- `README.md`, `CLAUDE.md`, `LICENSE` — documentation
- `.planning/` — GSD project planning and state
- `.agent/` — GSD agent system (active)
- `.claude/get-shit-done/` — GSD workflow and templates (active)

### Remove
- `.claude/agents/` — old agent definitions (AIOX era)
- `.gemini/` — Antigravity IDE config (not used)
- `.codex/` — Codex IDE config (not used)
- `supabase/.temp/` — temporary CLI files
- Photo zips or asset dumps at root level

</code_context>

<specifics>
## Specific Ideas

- After deletion, repo should be lean but fully functional
- All active development code and GSD infrastructure intact
- Clean git log showing clear break between AIOX and AGENX phases

</specifics>

<deferred>
## Deferred Ideas

- Full codebase audit (code quality, unused exports) — Phase 5 (Polish)
- node_modules pruning — defer to performance optimization phase
- Archive historical AIOX docs — consider separate archive branch if needed later

</deferred>

---

*Phase: 02-repository-cleanup*
*Context gathered: 2026-04-15*
