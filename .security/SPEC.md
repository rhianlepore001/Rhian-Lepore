# SECURITY-REMEDIATION-SPEC — AgendiX

**Run:** `2026-06-13` | **Fase:** 6 ✅ | **Modo:** spec only (implementação via `/security-audit code` ou harness-planner)
**Fonte de verdade:** `.security/findings-consolidated.md` + relatórios `audit-*.md`
**Stack:** React 19 · Supabase (RLS + RPC) · Edge Functions · Stripe · HashRouter

> **Escopo:** fechar brechas **CRÍTICAS e ALTAS** da auditoria LionClaw sem refactor amplo. Multi-tenant: `company_id` sempre da sessão; nunca de URL/form.

---

## 0. Gate Skeptic (Fase 4 — assumido por continuação)

Findings tratados como **válidos** salvo marcação explícita do usuário como falso positivo.

| ID | Status gate | Nota |
|---|---|---|
| SEC-001, SEC-002 | ✅ válido | Rotacionar + remover do repo |
| SEC-004 | ✅ válido | Convite staff precisa token assinado |
| SEC-005, SEC-046, SEC-047 | ✅ válido | VULN-01/02 + FOR ALL operacional |
| SEC-028–030, SEC-044, SEC-045 | ✅ válido | Superfície pública |
| SEC-012 | ✅ válido | Edge function + service role |
| SEC-032 | ✅ válido | `resolveTenantId()` central |

**Fora da rodada 1 (rodada 2+):** SEC-031 (paywall server), SEC-007–008 (IA no bundle), SEC-034–035 (race checkout), SEC-039 (migrar 25+ arquivos para services).

---

## 1. Objetivo da rodada 1

Eliminar em ordem:

1. **Vazamento cross-tenant** em rotas públicas (booking, fila, catálogo)
2. **Secrets** versionados ou no bundle
3. **Privilégio financeiro** intra-tenant (staff)
4. **Convite staff** aberto
5. **Tenant resolution** quebrada para staff no client

---

## 2. Sprints

### S1 — Secrets e fallbacks (P0)

**Findings:** SEC-001, SEC-002, SEC-006 (parcial)

| Tarefa | Arquivo(s) | Critério de aceite |
|---|---|---|
| Remover API key do histórico git | `.claude/settings.json` | Arquivo sem secrets; key rotacionada no provedor |
| Remover fallbacks Supabase | `lib/supabase.ts` | Sem URL/JWT hardcoded; app falha claro se env ausente |
| Remover fallback Stripe pk | `pages/settings/SubscriptionSettings.tsx` | Só `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY` |
| Documentar rotação | `.env.example` | Lista vars obrigatórias sem valores reais |

**Verificação:** `grep` no repo não encontra `eyJ`, `sk_`, `pk_test_` em código versionado; `npm run build` com env de CI mock.

---

### S2 — RLS superfície pública (P0)

**Findings:** SEC-029, SEC-044, SEC-045, SEC-028 (parcial)

| Tarefa | Migration / código | Critério de aceite |
|---|---|---|
| Revogar `public_bookings_select_anon` `USING (true)` | Nova migration | `anon` não lê linhas sem prova (phone+id ou RPC) |
| Restringir `queue_entries` SELECT público | Nova migration | Policy filtra `business_id = $param` via RPC ou token de fila |
| Revogar "Public can view *" cross-tenant | `20260226_fix_public_access_rls.sql` successor | `services`, `business_settings`, `team_members`, `categories` só legíveis no tenant do link público |
| Remover `GRANT anon` em `mirror_public_client_to_crm` | Migration + `PublicClientContext.tsx` | Espelhamento só server-side pós-booking válido |
| Ajustar fetch client | `services/publicBooking.ts`, `services/queue.ts` | Queries passam `business_id` do contexto público; teste com UUID alheio retorna vazio/403 |

**Verificação:** Com JWT `anon`, `SELECT` em `public_bookings` sem filtro retorna 0 rows; fila de outro tenant inacessível; catálogo de tenant A não aparece com slug/id de tenant B.

---

### S3 — Booking público server-side (P0)

**Findings:** SEC-030, SEC-018, SEC-038

| Tarefa | Arquivo(s) | Critério de aceite |
|---|---|---|
| Rotear submit público por RPC única | `services/publicBooking.ts`, `pages/PublicBooking.tsx` | Sem INSERT direto; usa `create_secure_booking` ou sucessor |
| Recalcular preço/duração no servidor | Migration RPC | `p_total_price` ignorado ou validado contra `services` |
| Anti-colisão | RPC | Dois submits concorrentes → um falha com mensagem clara |
| Limites públicos | RPC | `public_booking_enabled`, lead time, max/dia enforced server-side |
| Restringir `GRANT anon` | Migration | `anon` só cria pending para `business_id` com rate limit |

**Verificação:** Payload com `totalPrice: 0` rejeitado; double-book no mesmo slot falha; limites da UI não bypassáveis via DevTools.

---

### S4 — RLS financeiro e staff (P0)

**Findings:** SEC-005, SEC-046, SEC-047, SEC-014

| Tarefa | Migration / código | Critério de aceite |
|---|---|---|
| Substituir FOR ALL em `finance_records` | Nova migration | Staff: SELECT próprio ou agregado conforme regra de negócio; INSERT/UPDATE/DELETE owner-only (ou role explícita) |
| Policies comissão staff | Migration | Writes não herdados de policy ALL genérica |
| OwnerRouteGuard em `/financeiro` | `App.tsx` | Staff redirecionado ou 403 |
| `CommissionPaymentHistory` | Componente | Query filtra por tenant da sessão |

**Verificação:** Login staff não altera/deleta `finance_records` de outro profissional; rota financeiro bloqueada; EAGLE VULN-01 fechado.

---

### S5 — Convite staff com token (P0)

**Findings:** SEC-004, SEC-016, SEC-027

| Tarefa | Arquivo(s) | Critério de aceite |
|---|---|---|
| RPC `create_staff_invite` (owner) | Migration | Retorna link com token assinado/expirável |
| Validar token no registro | `pages/Register.tsx`, `AuthContext.tsx` | `?company=` sozinho rejeitado; `?token=` obrigatório |
| Migration `get_company_for_invite` | `supabase/migrations/` | Função versionada; valida token, não só UUID |
| Profile creation único | Trigger ou RPC | Sem race trigger vs INSERT client |

**Verificação:** UUID de owner aleatório na URL não cria staff; token expirado falha; owner gera convite válido.

---

### S6 — Edge function reminder (P0)

**Findings:** SEC-012, SEC-011 (parcial)

| Tarefa | Arquivo(s) | Critério de aceite |
|---|---|---|
| Auth no caller | `supabase/functions/send-appointment-reminder/index.ts` | JWT service ou HMAC secret; rejeita anônimo |
| CORS restrito | `_shared/cors.ts` ou por function | Origin allowlist (app domain) |
| Sem SERVICE_ROLE exposto ao client | — | Chamada só server/cron com secret |

**Verificação:** POST sem credencial retorna 401; curl de origem aleatória bloqueado por CORS em browser.

---

### S7 — Tenant resolution no client (P0)

**Findings:** SEC-032, SEC-033, SEC-021

| Tarefa | Arquivo(s) | Critério de aceite |
|---|---|---|
| Criar `resolveTenantId(companyId, userId)` | `utils/tenant.ts` (novo) | Export único documentado |
| Substituir 13 arquivos incorretos | Lista em `audit-duplication.md` DUP-003 | Todos usam helper; staff vê dados do owner |
| Corrigir mistura no mesmo arquivo | `Agenda.tsx`, `Finance.tsx`, `AlertsContext.tsx` | Leitura e mutação usam mesmo tenant |
| Delete `finance_records` na Agenda | `pages/Agenda.tsx` | Delete inclui filtro tenant |

**Verificação:** Login staff: Dashboard, Agenda, CRM, Finance mostram dados da empresa; deletes não afetam tenant errado.

---

## 3. Ordem de execução

```
S1 (secrets) → S2 (RLS público) → S3 (booking RPC) → S4 (finance RLS) → S5 (convite) → S6 (edge) → S7 (client tenant)
```

S2 e S3 podem ser uma única migration grande se preferir deploy único; **não** deployar S3 antes de S2.

---

## 4. Critérios de aceite globais (Definition of Done)

- [ ] Nenhum secret em arquivos versionados (`grep` CI)
- [ ] Fluxos `/#/booking/:id` e `/#/queue/:id` não vazam PII cross-tenant (teste manual ou Vitest + Supabase local)
- [ ] Staff não escreve em `finance_records` alheios
- [ ] Registro staff exige token válido
- [ ] `npm run typecheck && npm run lint && npm run build && npm test` passam
- [ ] Nova migration aplicável em ambiente limpo (`supabase db reset` ou equivalente)
- [ ] `graphify update .` após mudanças de código

---

## 5. Não-objetivos (rodada 1)

- Paywall server-side completo (SEC-031)
- Mover IA para Edge Function (SEC-007, SEC-008)
- Refatorar 25+ arquivos para `services/` + Zod (SEC-039)
- `npm audit` / dependências
- MFA enforcement
- Pentest dinâmico externo

---

## 6. Riscos de implementação

| Risco | Mitigação |
|---|---|
| Booking público quebra após S2+S3 | Feature flag `public_booking_enabled`; testar com tenant de staging |
| Staff perde acesso legítimo após S4 | Matriz owner/staff documentada antes da migration |
| Migrations conflitantes (91 histórico) | Uma migration `YYYYMMDD_security_remediation_r1.sql` consolidada |
| RPC ausente em prod (`get_company_for_invite`) | Incluir CREATE na mesma migration S5 |

---

## 7. Próximo passo

- **Fase 8 ✅:** `.security/sprints.md` — 6 sprints executáveis (início em S2; S1 adiado)
- **Implementar:** `/harness-coder sprint 1` → RLS superfície pública
- **Rodada 2 SPEC:** SEC-031, SEC-009–010, SEC-017, SEC-034–035, SEC-039
