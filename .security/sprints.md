# Sprints — AgendiX Security Remediation (Rodada 1)

**SPEC:** `.security/SPEC.md`  
**Início:** Sprint 1 = SPEC **S2** (S1 secrets **adiado** pelo usuário)  
**Ciclo:** Coder → Evaluator por sprint  
**Findings:** SEC-029, SEC-044, SEC-045, SEC-028, SEC-030, SEC-005, SEC-004, SEC-012, SEC-032

---

## Pré-requisito adiado

| SPEC | Status | Nota |
|---|---|---|
| S1 — Secrets | ⏸ Adiado | Rotacionar chaves e remover fallbacks antes de deploy em produção. Não bloqueia S2–S7 em dev local. |

---

## Sprint 1: RLS superfície pública (SPEC S2)

**Objetivo:** Visitante anônimo não lê dados de outro tenant em booking, fila nem catálogo público; espelhamento CRM não é invocável por `anon` com `business_id` arbitrário.

**Dependências:** nenhuma (S1 adiado)

**Findings:** SEC-029, SEC-044, SEC-045, SEC-028 (parcial)

### Features

- **feat-s2-001:** Revogar SELECT global em `public_bookings` para `anon`
  - [x] Migration remove ou substitui policy `public_bookings_select_anon` com `USING (true)` (`20260321_fix_public_bookings_select_anon.sql`)
  - [x] `anon` não consegue `SELECT` em `public_bookings` apenas com UUID de booking de outro tenant
  - [x] Fluxo legítimo de reagendamento/consulta continua funcionando (via RPC `SECURITY DEFINER` ou prova phone+id documentada na migration)

- **feat-s2-002:** Restringir SELECT público em `queue_entries`
  - [x] Policy `Public can view active queue` não retorna filas de todos os tenants (`20260218_fix_queue_rls_completed.sql:7-9`)
  - [x] Leitura pública exige vínculo com `business_id` (policy com filtro ou RPC dedicada)
  - [x] Dono autenticado continua vendo todas as entradas da própria fila

- **feat-s2-003:** Catálogo público scoped por tenant
  - [x] Policies "Public can view *" em `service_categories`, `services`, `business_settings`, `team_members` deixam de usar `USING (true)` global (`20260226_fix_public_access_rls.sql`)
  - [x] Leitura pública filtra por `user_id` / `business_id` coerente com o link `/#/booking/:slug` ou id do tenant
  - [x] Policy `Public can view profiles` com `USING (true)` revogada ou restrita (se ainda existir)

- **feat-s2-004:** Remover espelhamento CRM invocável por `anon`
  - [x] `GRANT EXECUTE` para `anon` em `mirror_public_client_to_crm` revogado (`20260405_fix_crm_mirror_and_rescheduling.sql:51`)
  - [x] `contexts/PublicClientContext.tsx` não chama mais RPC diretamente com `p_user_id` controlado pelo browser
  - [x] Espelhamento ocorre server-side (trigger pós-insert booking ou RPC interna sem grant anon)

- **feat-s2-005:** Ajustar services públicos no client
  - [x] `fetchPublicBookingById` em `services/publicBooking.ts` não depende de SELECT anon aberto; usa RPC ou passa credencial de prova
  - [x] `fetchQueueEntry` em `services/queue.ts` respeita novo contrato RLS/RPC
  - [x] Queries de catálogo em `publicBooking.ts` / `PublicBooking.tsx` passam `businessId` do contexto da URL

### Hints para o Coder

- **Arquivos existentes:**
  - `supabase/migrations/20260321_fix_public_bookings_select_anon.sql`
  - `supabase/migrations/20260226_fix_public_access_rls.sql`
  - `supabase/migrations/20260218_fix_queue_rls_completed.sql`
  - `supabase/migrations/20260405_fix_crm_mirror_and_rescheduling.sql`
  - `supabase/migrations/20260320_us0302_remove_permissive_rls_policy.sql` (referência de como revogaram `profiles`)
  - `services/publicBooking.ts`, `services/queue.ts`, `contexts/PublicClientContext.tsx`
  - `pages/PublicBooking.tsx`, `pages/PublicQueue.tsx` (ou equivalente fila pública)
  - `.security/audit-isolation.md` (CRIT-001–003)
- **Interfaces chave:** `get_auth_company_id()` em `20260307_us015b_multi_user_rls.sql`; RPCs existentes `get_available_slots`, `get_queue_position`
- **Notas:**
  - Uma migration consolidada `YYYYMMDD_security_s2_public_rls.sql` é preferível a várias migrations pequenas
  - Não quebrar `/#/booking/:id` e `/#/queue/:id` para o tenant correto
  - `company_id` em rotas autenticadas continua vindo de `useAuth()` — nunca da URL em fluxos internos
  - Após migration: `npm run typecheck && npm run lint && npm run build && npm test`

---

## Sprint 2: Booking público server-side (SPEC S3)

**Objetivo:** Todo agendamento público passa por RPC única no servidor; preço, duração, colisão e limites não são controláveis pelo browser.

**Dependências:** Sprint 1 (RLS público fechado antes de abrir writes controlados)

**Findings:** SEC-030, SEC-018, SEC-038

### Features

- **feat-s3-001:** Eliminar INSERT direto em `public_bookings` no fluxo público
  - [ ] `submitPublicBooking` / mutation em `services/publicBooking.ts` não faz `.insert()` direto com payload do browser
  - [ ] `pages/PublicBooking.tsx` usa apenas RPC (`create_secure_booking` ou sucessor renomeado)
  - [ ] Nenhum caminho público restante com INSERT direto (grep no repo)

- **feat-s3-002:** Preço e duração calculados no servidor
  - [ ] RPC ignora ou valida `p_total_price` contra soma real de `services` do tenant
  - [ ] `duration_minutes` derivado de serviços, não aceito cegamente do client
  - [ ] Payload com `totalPrice: 0` ou serviço inexistente retorna erro estruturado

- **feat-s3-003:** Anti-colisão em agendamento público
  - [ ] Dois submits concorrentes no mesmo slot → segundo falha com mensagem clara
  - [ ] Lógica reutiliza ou estende checks de `20260217_fix_secure_booking_final.sql`

- **feat-s3-004:** Limites de negócio enforced server-side
  - [ ] `public_booking_enabled` respeitado na RPC
  - [ ] Lead time mínimo e máximo de agendamentos/dia aplicados (hoje só em `PublicBookingSettings.tsx`)
  - [ ] Bypass via DevTools não cria booking inválido

- **feat-s3-005:** Restringir `GRANT anon` na RPC de booking
  - [ ] `anon` só cria booking `pending` para `business_id` válido e público
  - [ ] Rate limit ou throttling documentado na migration (pode reutilizar padrão ADR-007 se existir RPC)

### Hints para o Coder

- **Arquivos existentes:**
  - `supabase/migrations/20260217_fix_secure_booking_final.sql`
  - `services/publicBooking.ts`, `pages/PublicBooking.tsx`
  - `hooks/usePublicBooking.ts`
  - `pages/settings/PublicBookingSettings.tsx` (limites configuráveis)
  - `.security/audit-logic.md` (LOGIC-CRIT-003, LOGIC-HIGH-001)
  - Migration criada na **Sprint 1** (não contradizer policies novas)
- **Interfaces chave:** assinatura atual de `create_secure_booking`; tipos em `services/publicBooking.ts`
- **Notas:** Deploy S3 somente após S2 aplicada. Testar reagendamento e primeiro agendamento. Manter HashRouter `/#/booking/...`

---

## Sprint 3: RLS financeiro e guards staff (SPEC S4)

**Objetivo:** Staff não lê/escreve financeiro alheio; rota `/financeiro` bloqueada para staff; VULN-01/02 fechados.

**Dependências:** Sprint 1 (padrão RLS); independente de Sprint 2

**Findings:** SEC-005, SEC-046, SEC-047, SEC-014, SEC-049

### Features

- **feat-s4-001:** Refatorar RLS de `finance_records` (VULN-01)
  - [ ] Policy FOR ALL genérica por tenant substituída por políticas separadas SELECT / INSERT / UPDATE / DELETE
  - [ ] Staff: permissões explícitas (ex.: SELECT próprio ou agregado; sem DELETE de colega)
  - [ ] Owner mantém controle total no tenant
  - [ ] Migration referencia e corrige `20260307_us015b_multi_user_rls.sql:173-178`

- **feat-s4-002:** Policies de comissão staff (VULN-02)
  - [ ] Writes em tabelas de comissão não herdados de policy ALL permissiva (`20260417_staff_commission_rls.sql`)
  - [ ] Staff não altera registros de comissão de outro profissional

- **feat-s4-003:** Guard de rota `/financeiro`
  - [ ] `App.tsx:183` envolve `<Finance />` com `OwnerRouteGuard` (padrão das rotas vizinhas L179–195)
  - [ ] Staff autenticado que acessa `/#/financeiro` é redirecionado ou vê 403

- **feat-s4-004:** Queries financeiras no client com tenant da sessão
  - [ ] `CommissionPaymentHistory.tsx` filtra por tenant de `useAuth().companyId` (VULN-03)
  - [ ] Nenhuma query financeira usa só `user.id` quando usuário é staff

### Hints para o Coder

- **Arquivos existentes:**
  - `supabase/migrations/20260307_us015b_multi_user_rls.sql`
  - `supabase/migrations/20260417_staff_commission_rls.sql`
  - `docs/v1/EAGLE-REVIEW.md` (VULN-01 documentado)
  - `App.tsx` (`OwnerRouteGuard` inline ~L117)
  - `pages/Finance.tsx`, `components/CommissionPaymentHistory.tsx`
  - `.security/audit-isolation.md` (ALTO-001, ALTO-002)
- **Interfaces chave:** `get_auth_company_id()`, `useAuth()` → `companyId`, `role`
- **Notas:** Validar com usuário owner E staff real (RLS quebra silenciosamente). Não desabilitar RLS.

---

## Sprint 4: Convite staff com token (SPEC S5)

**Objetivo:** Registro de staff exige convite assinado/expirável; `?company=uuid` sozinho não cria staff.

**Dependências:** Sprint 3 (matriz owner/staff clara ajuda testar registro)

**Findings:** SEC-004, SEC-016, SEC-027

### Features

- **feat-s5-001:** RPC de criação de convite (owner-only)
  - [ ] Nova RPC `create_staff_invite` (ou nome equivalente) só executável por owner autenticado
  - [ ] Retorna URL com token assinado + expiração (não expor secret no client)
  - [ ] Tabela ou registro de convites com status `pending|used|expired`

- **feat-s5-002:** Validação de token no registro
  - [ ] `pages/Register.tsx` exige parâmetro `token` (hash route `/#/register?token=...`)
  - [ ] `?company=` sem token é rejeitado com mensagem clara
  - [ ] `contexts/AuthContext.tsx` fluxo de registro staff usa token validado, não UUID cru da URL

- **feat-s5-003:** RPC `get_company_for_invite` versionada
  - [ ] Função criada em migration local (hoje referenciada em `Register.tsx:50-51` mas ausente nas migrations)
  - [ ] Valida token + retorna nome da empresa para UI; não vaza dados sem token válido

- **feat-s5-004:** Criação de profile sem race trigger vs INSERT
  - [ ] Um único caminho: trigger DB ou RPC — não ambos competindo
  - [ ] Registro staff completo sem erro RLS silencioso em `profiles`

### Hints para o Coder

- **Arquivos existentes:**
  - `pages/Register.tsx`, `contexts/AuthContext.tsx`
  - `App.tsx` (rota register)
  - Grep `get_company_for_invite` no repo
  - `.security/audit-auth.md`, `.security/audit-duplication.md` (DUP-011)
- **Interfaces chave:** `signUp`, `role: 'staff'`, metadata Supabase Auth
- **Notas:** Links devem usar HashRouter `/#/register?...`. Owner gera convite em settings/equipe (verificar UI existente ou placeholder mínimo).

---

## Sprint 5: Edge function reminder (SPEC S6)

**Objetivo:** `send-appointment-reminder` não aceita chamadas anônimas; CORS restrito; service role não exposto ao browser.

**Dependências:** nenhuma (paralelizável após Sprint 1)

**Findings:** SEC-012, SEC-011 (parcial)

### Features

- **feat-s6-001:** Autenticação do caller na edge function
  - [ ] `supabase/functions/send-appointment-reminder/index.ts` valida JWT de serviço, HMAC header ou cron secret
  - [ ] Request sem credencial retorna HTTP 401
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` usada só server-side dentro da function

- **feat-s6-002:** CORS allowlist
  - [ ] `Access-Control-Allow-Origin: *` substituído por allowlist (domínio app + localhost dev)
  - [ ] Padrão alinhado com `create-checkout-session` ou `_shared/cors.ts` se existir

- **feat-s6-003:** Caller no app não expõe secret
  - [ ] Nenhum código client chama a function com service role key
  - [ ] Invocação só via cron, backend ou edge com env seguro

### Hints para o Coder

- **Arquivos existentes:**
  - `supabase/functions/send-appointment-reminder/index.ts`
  - `supabase/functions/create-checkout-session/index.ts` (referência CORS)
  - `.security/audit-owasp.md`, `.security/audit-secrets.md`
- **Notas:** Documentar env vars necessárias em `.env.example` sem valores reais.

---

## Sprint 6: Tenant resolution no client (SPEC S7)

**Objetivo:** Staff vê e muta dados do tenant correto em todas as rotas compartilhadas; helper único substitui `user.id` solto.

**Dependências:** Sprint 3 (finance/agenda coerentes); pode rodar em paralelo com Sprint 4–5

**Findings:** SEC-032, SEC-033, SEC-021

### Features

- **feat-s7-001:** Helper `resolveTenantId`
  - [ ] Novo `utils/tenant.ts` exporta `resolveTenantId(companyId, userId)` documentado
  - [ ] Regra: owner → `companyId ?? userId`; staff → `companyId` obrigatório
  - [ ] Teste unitário Vitest cobre owner, staff e null safety

- **feat-s7-002:** Corrigir 13 arquivos com só `user.id`
  - [ ] Todos os arquivos listados em `audit-duplication.md` DUP-003 usam o helper
  - [ ] Inclui: `Dashboard.tsx`, `ClientCRM.tsx`, `CommissionsManagement.tsx`, `AppointmentWizard.tsx`, hooks de campanha/rebooking, onboarding steps

- **feat-s7-003:** Consistência intra-arquivo
  - [ ] `pages/Agenda.tsx`: leitura e deletes usam mesmo tenant (`effectiveUserId` em todas mutações)
  - [ ] `pages/Finance.tsx`: `useMonthlyHistory` usa tenant de staff, não `user?.id`
  - [ ] `contexts/AlertsContext.tsx`: overdue e bookings usam `tenantId` definido no topo

- **feat-s7-004:** Deletes com filtro tenant
  - [ ] Delete de `finance_records` na Agenda inclui filtro tenant explícito
  - [ ] Nenhum delete/update crítico sem `.eq('user_id', tenantId)` ou coluna tenant correta

### Hints para o Coder

- **Arquivos existentes:**
  - `.security/audit-duplication.md` (seção DUP-003, DUP-004, DUP-010)
  - `hooks/useDashboardData.ts`, `pages/Agenda.tsx`, `pages/Finance.tsx`, `contexts/AlertsContext.tsx` (padrões corretos para copiar)
  - `contexts/AuthContext.tsx` (`companyId`, `role`)
- **Interfaces chave:** `useAuth()` → `{ companyId, user, role }`
- **Notas:** Mudança mínima — substituir identifier, sem refactor para `services/` nesta sprint. `graphify update .` ao final.

---

## Ordem de execução recomendada

```
Sprint 1 (S2 RLS público)
    → Sprint 2 (S3 booking RPC)
    → Sprint 3 (S4 finance RLS)
    → Sprint 4 (S5 convite staff)
    ∥ Sprint 5 (S6 edge) — paralelo após Sprint 1
    → Sprint 6 (S7 tenant client)
```

**S1 secrets:** executar antes de qualquer deploy produção (não bloqueia dev das sprints acima).

---

## Definition of Done (todas as sprints)

- [ ] Critérios da sprint marcados
- [ ] `npm run typecheck && npm run lint && npm run build && npm test`
- [ ] Migration aplicável em DB limpo (quando houver SQL)
- [ ] `graphify update .` após mudanças de código
- [ ] Evaluator validou critérios com evidência (arquivo:linha ou output de teste)

---

## Próximo comando

```
/harness-coder sprint 1
```

Implementa **Sprint 1 = SPEC S2** (RLS superfície pública).
