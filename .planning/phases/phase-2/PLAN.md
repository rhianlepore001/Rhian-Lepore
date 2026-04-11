# Phase 2 — Repository Cleanup

**Phase:** 2  
**Scope:** Remove stale files & directories (Days 1-5)  
**Status:** 🔴 PENDING  
**Goal:** Remove ~4.5MB of unused files; reduce clutter for contributors and CI

---

## Context

Per `AGENX-SDD-30DAYS.md` Phase 2, the repo contains significant stale artifacts from previous development iterations (AIOX system, RAG experiments, multi-agent squads, test reports).

**Important:** `.planning/` (GSD framework) and `.agent/` are active and must NOT be deleted.

---

## Audit: Root Files to Delete

Cross-referencing the 30-day plan against current root directory:

| File | Delete? | Reason |
|------|---------|--------|
| `ANALISE_AGENX_COMPLETA.md` | ✅ Yes | Stale analysis doc |
| `CLAUDE_HANDOFF.md` | ✅ Yes | Stale handoff doc |
| `EPIC-003-EXECUTION-STATUS.md` | ✅ Yes | Stale epic tracker |
| `EPIC-004-READY-FOR-PR.md` | ✅ Yes | Stale epic tracker |
| `Fotos Freaha-Concorrente-*.zip` | ✅ Yes | 3MB zip — competitor photos |
| `GUIA_SEGURANCA.md` | ✅ Yes | Replaced by current security setup |
| `PLAN-rag-2-0.md` | ✅ Yes | Abandoned RAG 2.0 plan |
| `PRD.md` | ✅ Yes | Superseded by AGENX-SDD-30DAYS.md |
| `agenx-backlog.docx` | ✅ Yes | Binary blob in repo |
| `aios-settings.json` | ✅ Yes | AIOX system config |
| `backlog_content.txt` | ✅ Yes | Stale backlog text |
| `fix_plan.js` | ✅ Yes | Ad-hoc script |
| `mcp_config.json` | ✅ Yes | Stale MCP config |
| `metadata.json` | ✅ Yes | Stale metadata |
| `write_file.cjs` | ✅ Yes | Ad-hoc write script |
| `write_phone_input.ps1` | ✅ Yes | Ad-hoc PowerShell script |
| `escudo-v2.skill` | ✅ Yes | Codex skill package in wrong location |
| `AGENX-SDD-30DAYS.md` | ⚠️ Keep | Active roadmap — move to `.planning/` |

## Audit: Directories to Delete

| Directory | Delete? | Reason |
|-----------|---------|--------|
| `aiox-guide/` | ✅ Yes | Legacy AI course guides |
| `squads/` | ✅ Yes | 462KB multi-agent squad specs |
| `testsprite_tests/` | ✅ Yes | 505KB auto-generated tests |
| `playwright-report/` | ✅ Yes | 527KB old E2E reports |
| `e2e/` | ✅ Yes | E2E tests that don't run |
| `test-results/` | ✅ Yes | Old test result artifacts |
| `n8n-skills/` | ✅ Yes | Empty directory |

## Audit: test/ Cleanup

| File | Action |
|------|--------|
| `test/verification_output.txt` | Delete — manual artifact |
| `test/verification_output_utf8.txt` | Delete — manual artifact |
| `test/verify_custom_service.ts` | Delete — ad-hoc script, not a test |

## .claude/ Cleanup (per 30-day plan)

| Item | Action |
|------|--------|
| `.claude/commands/AIOS/` | Delete — 12 AIOX agents |
| `.claude/hooks/synapse-engine.cjs` | Delete — AIOX hook |
| `.claude/hooks/precompact-session-digest.cjs` | Delete — AIOX hook |
| `.claude/rules/` | Review before deleting — may contain active rules |

---

## .gitignore Update

Add to `.gitignore`:
```
# Generated artifacts
*.backup
*.tmp
test-results/
playwright-report/
```

---

## Tasks (Execution Order)

1. Move `AGENX-SDD-30DAYS.md` → `.planning/ROADMAP-30DAYS.md`
2. Delete stale root files (17 files listed above)
3. Delete stale directories (7 dirs listed above)
4. Clean `test/` artifacts (3 files)
5. Clean `.claude/` (audit and remove AIOX items)
6. Update `.gitignore`
7. Commit: `chore: clean repo — remove 4.5MB unused files`

---

## Verification

- [ ] Root has only essential files (README, CLAUDE.md, App.tsx, index.tsx, package.json, configs, .env.*)
- [ ] No `.zip` or `.docx` binary files in repo
- [ ] `test/` contains only real test files
- [ ] `.claude/` has no AIOX references
- [ ] `.gitignore` includes test-results and playwright-report
- [ ] `AGENX-SDD-30DAYS.md` accessible at new path in `.planning/`

---

## UAT

After cleanup:
1. `npm install && npm run dev` — app still starts
2. `npm test` — tests still pass
3. `npm run build` — build succeeds
4. Git status shows clean working tree after commit
