# Findings Consolidados — AgendiX Security Audit

**Run:** 2026-06-13  
**Fases concluídas:** 1 ✅ | 2 ✅ | 3 ✅ | 4 ✅ | 6 ✅ (`SPEC.md`) | 8 ✅ (`sprints.md`)  
**Próxima fase:** Coder — Sprint 1 (SPEC S2, RLS público)

---

## Contagem por severidade (pós-merge subagentes)

| Severidade | Qtd |
|---|---|
| **CRÍTICO** | 8 |
| **ALTO** | 24 |
| **MÉDIO** | 25 |
| **BAIXO** | 8 |

---

## CRÍTICO — secrets: rotacionar chaves

| ID | Finding | Arquivo |
|---|---|---|
| SEC-001 | API key TestSprite **commitada no git** | `.claude/settings.json:14` |
| SEC-002 | Supabase URL + anon JWT como fallback versionado | `lib/supabase.ts:3-4` |
| SEC-003 | Chaves reais Gemini/OpenRouter em `.env` local (rotacionar) | `.env` (gitignored) |

---

## CRÍTICO — lógica de negócio / fluxos públicos

| ID | Finding | Fonte |
|---|---|---|
| SEC-028 | RPC `mirror_public_client_to_crm` — escrita CRM cross-tenant para `anon` | [logic analyzer](a90824af-b8aa-492b-bf4a-01483f9265f5) |
| SEC-029 | `public_bookings` SELECT `anon` com `USING (true)` — IDOR em massa | logic / [isolation inspector](7d63f4e9-65e4-4441-a57a-cf5f2ee2b663) |
| SEC-030 | Booking público fora de `create_secure_booking` — preço/colisão no browser | logic (reforça SEC-018) |
| SEC-031 | Assinatura/trial bloqueada só no `PaywallModal` — sem gate server-side | logic |
| SEC-044 | Políticas "Public can view *" — `services`, `business_settings`, `team_members`, `categories` legíveis cross-tenant | isolation |
| SEC-045 | `queue_entries` SELECT público por status sem `business_id` | isolation (reforça SEC-036) |

---

## ALTO — prioridade na SPEC

| ID | Finding | Fonte |
|---|---|---|
| SEC-004 | Staff register via `?company={uuid}` sem token | [auth auditor](4ab9402e-0e72-4359-8f47-8ea22d6ea4e8) |
| SEC-005 | RLS `finance_records` FOR ALL no tenant (VULN-01) | [isolation inspector](7d63f4e9-65e4-4441-a57a-cf5f2ee2b663) / EAGLE |
| SEC-006 | Stripe `pk_test_` hardcoded | [secrets scanner](b1a0066c-076c-4ad0-ba51-e92bdac721a6) |
| SEC-007 | OpenRouter `VITE_*` no bundle | secrets |
| SEC-008 | Gemini `VITE_*` no bundle (+ query string) | secrets |
| SEC-009 | Open redirect checkout (`successUrl`/`cancelUrl`) | [standards checker](13995071-2e43-482b-a914-03c7b5df9173) |
| SEC-010 | Redirect `data.url` sem validar Stripe | standards |
| SEC-011 | CORS `*` nas Edge Functions | owasp |
| SEC-012 | Reminder function sem auth + SERVICE_ROLE | owasp / secrets |
| SEC-013 | Rate limit fail-open + GRANT `anon` incerto | auth |
| SEC-014 | `/financeiro` sem OwnerRouteGuard | auth |
| SEC-015 | DevRouteGuard só no frontend | auth |
| SEC-016 | Registro profile: trigger vs INSERT bloqueado por RLS | logic / auth |
| SEC-017 | Storage `client_photos` — upload/delete sem isolamento por tenant | [OWASP scanner](ccb1d305-a17d-4bd4-b08b-c5686f20e80c) |
| SEC-018 | `create_secure_booking` executável por `anon` | OWASP |
| SEC-019 | `get_client_profile` — IDOR por UUID na rota pública | OWASP |
| SEC-032 | Resolução de tenant inconsistente — 13 arquivos usam só `user.id` (staff quebrado) | [duplication detector](a3a76387-8fc0-4360-aefb-664283df785e) |
| SEC-033 | Coluna tenant `user_id` vs `company_id` misturada no mesmo componente | duplication |
| SEC-034 | Race `complete_appointment` → `finance_records` duplicados | logic |
| SEC-035 | Checkout não atômico (`sell_product` antes de `complete_appointment`) | logic |
| SEC-036 | Fila: dedup só no JS + SELECT público expõe PII | logic |
| SEC-037 | `createAgendaAppointment` INSERT sem collision check | logic |
| SEC-038 | Limites de booking (lead time, max/dia) só na UI pública | logic |
| SEC-046 | VULN-02 — policy comissão staff não restringe writes | isolation |
| SEC-047 | RLS FOR ALL em `appointments`/`clients`/`services`/`team_members` — staff com write admin | isolation |
| SEC-048 | Update `public_bookings` só por ID — IDOR se policy anon UPDATE existir | isolation |
| SEC-049 | `CommissionPaymentHistory` sem filtro tenant (VULN-03) | isolation |

---

## MÉDIO (amostra — ver `audit-owasp.md` completo)

| ID | Título |
|---|---|
| SEC-020 | Filter injection em `.or()` PostgREST |
| SEC-021 | Deletes sem filtro tenant em alguns hooks |
| SEC-022 | `service_upsells` SELECT público |
| SEC-023 | `public_clients` INSERT aberto |
| SEC-024 | Checkout sem whitelist de `priceId` |
| SEC-025 | HTML e-mail / `image_url` sem validação |
| SEC-026 | `isDev` por e-mail (client-side) |
| SEC-027 | RPCs referenciadas no código ausentes nas migrations locais |
| SEC-039 | 25+ arquivos com Supabase inline fora de `services/` (sem Zod) | duplication |
| SEC-040 | `role === 'staff'` repetido em 10+ componentes | duplication |
| SEC-041 | Settlement day / `get_commissions_due` triplicados com tenant errado | duplication |
| SEC-042 | `cancelAppointment` / edição booking sem `company_id` explícito | logic |
| SEC-043 | `delete_appointment_with_finance` usa `auth.uid()` em vez de tenant | logic |
| SEC-050 | Policy `queue_entries` referencia `user_id` inexistente (drift schema) | isolation |
| SEC-051 | `aios_logs` isolado por `auth.uid()` — não por tenant | isolation |

---

## BAIXO / positivo

- **`products` / `sell_product` / `get_finance_stats`** — OK na matriz RLS (isolation)
- Rate limit RPC (ADR-007), `get_auth_company_id()`, sem `eval`/XSS direto, `passwordValidation` centralizado

---

## Conclusão transversal (7 auditores)

- **Isolamento cross-tenant (autenticado):** RLS core (`get_auth_company_id()`) OK na maioria das tabelas internas — [isolation inspector](7d63f4e9-65e4-4441-a57a-cf5f2ee2b663).
- **Cross-tenant (anon/público):** **falha** — `public_bookings`, `queue_entries`, catálogo público sem tenant (SEC-029, SEC-044, SEC-045).
- **Intra-tenant (staff vs owner):** **falha** — VULN-01/02 + FOR ALL operacional (SEC-005, SEC-046, SEC-047).
- **Consistência de tenant no client:** 42 arquivos com padrões copiados; staff quebra silenciosamente onde falta `companyId ?? user.id`.
- **Maior risco combinado:** secrets no git/bundle + superfície pública aberta + paywall só no frontend + RLS finance intra-tenant.
- **Ação #1:** revogar SELECT público global (SEC-029, SEC-044, SEC-045); rotacionar chaves; refatorar RLS finance (SEC-005).

---

## Não verificado nesta rodada

- `npm audit` / CVEs em dependências
- Estado live RLS no Supabase produção
- Pentest runtime em rotas públicas booking/queue
- MFA enforcement
- Definições SQL de `get_client_profile` e `get_company_for_invite` (ausentes nas migrations locais)

---

## Gate Fase 4 — concluído

SPEC: `.security/SPEC.md` · Sprints: `.security/sprints.md` (início S2, S1 adiado). Próximo: `/harness-coder sprint 1`.
