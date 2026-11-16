---
name: Playwright Visual Critique
description: >-
  Use when validating UI/landing with Playwright screenshots and a critical
  design eye (score ≤8 refuse).
---
# Playwright visual critique

Use when validating AgendiX (or any web UI) with a critical eye: landings, product screens, booking flows. Prefer real browser screenshots over guessing from code.

## When
- After seed/demo data exists
- After landing or UI changes
- Before claiming validator score ≥9
- Whenever copy/claims must match what the UI actually shows

## Workflow
1. **Define routes** to capture (desktop 1280×800 and mobile 390×844 unless specified): e.g. landing `/`, login gateway, `#/book/:slug`, agenda day view, CRM, financeiro, clube, fila.
2. **Run Playwright** (project scripts or MCP playwright) against local `npm run dev` or the target URL. Save PNGs under a dated folder such as `artifacts/visual-critique/YYYY-MM-DD/`.
3. **Annotate each shot** in a short markdown: URL, viewport, what should be true, defects found (hierarchy, AI-slop tells, broken claims, empty states, wrong trial days, stock/mock vs real UI).
4. **Critique with Impeccable vocabulary**: hierarchy, typeset, layout, honesty of claims, CTA clarity, mobile. Score 1–10 harshly; **≤8 = refuse** with a punch list.
5. **Hand shots to the build/validator agent** as attachments — never describe-only when files exist.

## Rules
- Prefer product screenshots from seeded demo tenants over CSS mocks.
- Do not invent metrics or testimonials in captures.
- If auth is required, use documented demo credentials from seed docs — never commit secrets.
- Bounded passes: capture → critique once → fix batch → recapture once.

## Outputs
- PNG set + `CRITIQUE.md` with score, blockers, and next actions for the orchestrator.
