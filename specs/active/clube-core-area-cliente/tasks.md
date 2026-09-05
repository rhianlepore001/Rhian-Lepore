# Tasks — Clube Core (área do cliente)

## T1 — RPC pública: ler e cancelar
**What:** `get_public_client_membership` + `cancel_public_client_membership`  
**Where:** `supabase/migrations/20260905000001_public_client_membership.sql`  
**Depends on:** —  
**Done when:** SECURITY DEFINER, escopo business+phone, GRANT anon/authenticated  
**Tests:** service chama `rpc` com os args certos (T2)

## T2 — Service + validade + hooks
**What:** fetch/cancel públicos; helpers de dias restantes / progresso  
**Where:** `services/memberships.ts`, `utils/membershipValidity.ts`, `hooks/useMemberships.ts`  
**Depends on:** T1  
**Tests:** `test/services/memberships.test.ts`, `test/utils/membershipValidity.test.ts`

## T3 — Painel do clube (UI)
**What:** card profissional (status, validade, incluso, usos, ações)  
**Where:** `components/membership/ClientMembershipPanel.tsx`  
**Depends on:** T2  
**Tests:** `test/components/ClientMembershipPanel.test.tsx`

## T4 — Minha Área + rota `/clube/:slug`
**What:** hero + aba Clube; JoinClub lê slug do path; CTA pós-contratar  
**Where:** `pages/ClientArea.tsx`, `pages/JoinClub.tsx`, `App.tsx`  
**Depends on:** T3  
**Tests:** painel cobre estados; typecheck/lint

## Gate
`npm run typecheck && npm run lint && npm run build && npm test`
