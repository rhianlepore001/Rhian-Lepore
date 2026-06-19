# Auditoria de Isolamento Multi-tenant — AgendiX

**Data:** 2026-06-13  
**Auditor:** security-isolation-inspector (pipeline LionClaw)  
**Escopo:** `AuthContext`, `hooks/*.ts`, `services/*.ts`, RLS em `supabase/migrations` (finance_records, products, team_members, public_bookings, queue, services públicos), docs VULN-01 (`docs/v1/EAGLE-REVIEW.md`).

**Metodologia:** análise estática de código + policies SQL versionadas. Estado real do banco de produção **não** foi verificado ao vivo.

---

## Resumo executivo

| Severidade | Qtd |
|---|---|
| CRÍTICO | 3 |
| ALTO | 6 |
| MÉDIO | 7 |
| BAIXO | 4 |
| INFORMATIVO | 3 |

**Cross-tenant:** Foram identificadas **políticas RLS públicas sem filtro de tenant** que permitem leitura (e em alguns casos enumeração) de dados de **todos** os tenants via role `anon`/`authenticated`. Isso **contradiz** a conclusão anterior de “zero cross-tenant” em `docs/v1/EAGLE-REVIEW.md` (foco em `finance_records` autenticado).

**Intra-tenant:** VULN-01 confirmado — staff com policy `FOR ALL` em `finance_records` e em várias tabelas operacionais.

---

## Fonte canônica de `company_id`

| Mecanismo | Evidência | Status |
|---|---|---|
| `useAuth().companyId` derivado de `profiles.company_id` na sessão | `contexts/AuthContext.tsx:87`, `416-422` | OK |
| `get_auth_company_id()` em RLS | `supabase/migrations/20260307_us015b_multi_user_rls.sql:33-46` | OK (padrão central) |
| RPCs validam `p_user_id` vs tenant da sessão | `supabase/migrations/20260530_finance_stats_professional_filter.sql:33-36` | OK |

---

## Findings

### CRIT-001: `public_bookings` — SELECT anônimo sem filtro de tenant

- **Severidade:** CRÍTICO  
- **Arquivo(s):** `supabase/migrations/20260321_fix_public_bookings_select_anon.sql:13-17`

```sql
CREATE POLICY "public_bookings_select_anon"
  ON public.public_bookings FOR SELECT TO anon
  USING (true);
```

- **Impacto:** Qualquer cliente anônimo com a chave `anon` pode **ler todos** os agendamentos públicos de **todos** os tenants (nome, telefone, horário, `business_id`, preço). IDOR em massa + violação LGPD.
- **Código que amplifica:** `services/publicBooking.ts:243-251` (`fetchPublicBookingById` — só filtra por `id`, sem `business_id`).
- **Solução:** Substituir `USING (true)` por predicate mínima (ex.: `id = current_setting('request.jwt.claims')` via RPC, token de edição, ou SELECT restrito ao row recém-inserido). Remover SELECT global para `anon`.
- **Esforço:** Médio

---

### CRIT-002: `queue_entries` — SELECT público de fila ativa sem tenant

- **Severidade:** CRÍTICO  
- **Arquivo(s):** `supabase/migrations/20260218_fix_queue_rls_completed.sql:7-9`

```sql
CREATE POLICY "Public can view active queue" ON queue_entries
    FOR SELECT
    USING (status NOT IN ('completed', 'cancelled', 'no_show'));
```

- **Impacto:** Leitura cross-tenant de **todas** as entradas de fila ativas (`client_name`, `client_phone`, `business_id`). Combina com `services/queue.ts:222-227` (`fetchQueueEntry` — só `.eq('id', entryId)`).
- **Solução:** Restringir SELECT público a `id = :entry_id` via RPC SECURITY DEFINER ou policy com claim/token; nunca `USING (true)` / status-only global.
- **Esforço:** Médio

---

### CRIT-003: Políticas “Public can view *” sem `user_id` / `business_id`

- **Severidade:** CRÍTICO  
- **Arquivo(s):** `supabase/migrations/20260226_fix_public_access_rls.sql:6-32`

```sql
CREATE POLICY "Public can view services" ON services FOR SELECT USING (active = true);
CREATE POLICY "Public can view business settings" ON business_settings FOR SELECT USING (true);
CREATE POLICY "Public can view team members" ON team_members FOR SELECT USING (active = true);
CREATE POLICY "Public can view categories" ON service_categories FOR SELECT USING (true);
```

- **Impacto:** Enumeração cross-tenant de catálogo, equipe, configurações e categorias de **todas** as barbearias/salões com `active = true` (ou todas, no caso de `business_settings`). Não há migration posterior que revogue essas policies (diferente de `profiles`, corrigido em `20260320_us0302_remove_permissive_rls_policy.sql`).
- **Código:** queries públicas filtram no app (`services/publicBooking.ts:291-333`), mas RLS **não** impõe tenant — bypass direto ao PostgREST.
- **Solução:** Policies públicas com `USING (user_id = :resolved_business_id)` via RPC, ou views `SECURITY DEFINER` por slug; remover `USING (true)`.
- **Esforço:** Alto

---

### ALTO-001: VULN-01 — `finance_records` FOR ALL por tenant (staff escreve tudo)

- **Severidade:** ALTO  
- **Arquivo(s):** `supabase/migrations/20260307_us015b_multi_user_rls.sql:173-178`, `docs/v1/EAGLE-REVIEW.md:145`

```sql
CREATE POLICY "Finance: company isolation"
  ON finance_records FOR ALL TO authenticated
  USING (user_id = get_auth_company_id())
  WITH CHECK (user_id = get_auth_company_id());
```

- **Impacto:** Staff autenticado pode INSERT/UPDATE/DELETE registros financeiros de **colegas** no mesmo tenant via Supabase client. UI filtra (`StaffEarningsCard.tsx:29`, `Finance.tsx:227`), mas RLS não restringe por role/`professional_id`.
- **Solução:** Owner: ALL; Staff: SELECT/INSERT limitados ao `professional_id` do `team_members.staff_user_id = auth.uid()`. Separar policies por operação e role.
- **Esforço:** Alto

---

### ALTO-002: Policy “Staff can view own commissions” ineficaz para writes (VULN-02)

- **Severidade:** ALTO  
- **Arquivo(s):** `supabase/migrations/20260417_staff_commission_rls.sql:8-17`

- **Impacto:** Policy `FOR SELECT` por `professional_id` é **OR** com policy ALL do tenant — não limita INSERT/UPDATE/DELETE. Redundante para leitura (staff já lê todo o tenant via ALTO-001).
- **Solução:** Refatorar com policies `RESTRICTIVE` ou remover ALL broad; staff SELECT-only na própria comissão.
- **Esforço:** Médio

---

### ALTO-003: Registro de staff via `company` na URL (sem token)

- **Severidade:** ALTO  
- **Arquivo(s):** `pages/Register.tsx:31-32`, `89`, `contexts/AuthContext.tsx:304-306`, `324-337`

```tsx
const companyIdFromUrl = searchParams.get('company');
// ...
companyId: companyIdFromUrl || undefined
// ...
role: data.companyId ? 'staff' : 'owner',
company_id: data.companyId || authData.user.id,
```

- **Impacto:** Qualquer pessoa que conheça o UUID do owner registra-se como `staff` do tenant (`/#/register?company={ownerId}`) sem convite assinado. Escalação intra-tenant imediata (agenda, clientes, financeiro parcial, produtos).
- **Solução:** Tabela `staff_invites` + token expirável validado em RPC `SECURITY DEFINER` antes do `signUp`; nunca confiar em query param como fonte de `company_id`.
- **Esforço:** Médio

---

### ALTO-004: RLS operacional FOR ALL sem distinção owner/staff

- **Severidade:** ALTO  
- **Arquivo(s):** `supabase/migrations/20260307_us015b_multi_user_rls.sql:106-143`

Tabelas com `FOR ALL` + `user_id = get_auth_company_id()` **sem** `get_auth_role() = 'owner'`:

| Tabela | Linhas migration |
|---|---|
| `appointments` | 106-111 |
| `clients` | 114-119 |
| `services` | 122-127 |
| `service_categories` | 130-135 |
| `team_members` | 138-143 |

- **Impacto:** Staff pode criar/editar/excluir clientes, serviços, categorias e membros da equipe — rotas admin expostas sem `OwnerRouteGuard` (`App.tsx:193` `/configuracoes/servicos`, `180-181` clientes).
- **Contraste positivo:** `products` restringe INSERT/UPDATE a owner (`supabase/migrations/20260603_products_v1.sql:54-73`); `business_settings` UPDATE só owner (`20260307_us015b_multi_user_rls.sql:153-158`).
- **Solução:** Alinhar RLS com matriz owner/staff; adicionar `OwnerRouteGuard` onde faltar como defense-in-depth.
- **Esforço:** Alto

---

### ALTO-005: Delete client-side de histórico sem filtro tenant explícito

- **Severidade:** ALTO  
- **Arquivo(s):** `pages/Agenda.tsx:529-533`

```tsx
await supabase.from('finance_records').delete().eq('appointment_id', appointmentId);
await supabase.from('appointments').delete().eq('id', appointmentId).eq('user_id', user.id);
```

- **Impacto:** `finance_records` delete **sem** `.eq('user_id', companyId)` — depende 100% de RLS (ALTO-001 permite staff deletar financeiro alheio). `user.id` em vez de `companyId` quebra delete para staff e é inconsistente com `effectiveUserId` usado no mesmo arquivo (`Agenda.tsx:82`, `500`).
- **Solução:** Usar RPC `delete_appointment_with_finance` (`supabase/migrations/20260607_delete_appointment_with_finance.sql`) já existente; sempre filtrar `user_id` com `companyId` da sessão.
- **Esforço:** Baixo

---

### ALTO-006: `public_bookings` update por ID sem `business_id` (IDOR parcial)

- **Severidade:** ALTO  
- **Arquivo(s):** `services/publicBooking.ts:103-118`

```typescript
.from('public_bookings')
.update({ ... })
.eq('id', parsed.editingBookingId);
```

- **Impacto:** Update filtra só por UUID. Se existir policy UPDATE permissiva para o role do caller, permite editar booking de outro tenant. Hoje UPDATE autenticado exige `business_id = get_auth_company_id()` (`20260307_us015b_multi_user_rls.sql:211-216`), mas fluxo público pode usar `anon` — verificar se UPDATE anônimo está bloqueado (depende do estado live). Combinado com CRIT-001, SELECT vaza dados para reconhecimento de IDs.
- **Solução:** Exigir `business_id` + token de edição no UPDATE; RPC `edit_public_booking`.
- **Esforço:** Médio

---

### MEDIO-001: `company_id` de URL/form no registro (aceito só para convite staff)

- **Severidade:** MÉDIO  
- **Arquivo(s):** `pages/Register.tsx:31`, `contexts/AuthContext.tsx:39`, `274`, `305`

- **Impacto:** Padrão do projeto viola regra “company_id nunca de URL” — usado intencionalmente para onboarding staff, mas sem validação server-side no insert de `profiles`/`team_members`.
- **Solução:** Mesma de ALTO-003 (convites assinados).
- **Esforço:** Médio

---

### MEDIO-002: Queries autenticadas com `user.id` em vez de `companyId`

- **Severidade:** MÉDIO  
- **Arquivo(s):** (amostra)

| Arquivo | Linha | Problema |
|---|---|---|
| `pages/Dashboard.tsx` | 51, 72 | `.eq('user_id', user.id)` |
| `hooks/useCampaignHistory.ts` | 54, 85 | idem |
| `components/CommissionsManagement.tsx` | 131, 246, 269 | idem |
| `pages/ClientCRM.tsx` | 113, 138, 197, 224, 299 | idem |
| `hooks/useDashboardData.ts` | 18, 33 | `fetchDashboardProfile(userId!)` — staff busca perfil próprio, não do owner |

- **Impacto:** Staff recebe datasets vazios ou incorretos (bug funcional). RLS ainda impede cross-tenant, mas quebra isolamento lógico e incentiva workarounds perigosos.
- **Solução:** Padronizar `effectiveUserId = companyId ?? user.id` como em `pages/Agenda.tsx:82`, `pages/Clients.tsx:24`.
- **Esforço:** Médio

---

### MEDIO-003: `CommissionPaymentHistory` sem filtro `user_id`

- **Severidade:** MÉDIO (VULN-03)  
- **Arquivo(s):** `components/CommissionPaymentHistory.tsx:55-63`

```typescript
.from('finance_records')
.select('*')
.eq('professional_id', professionalId)
```

- **Impacto:** Owner-only na UI; se rota vazar para staff, RLS ALTO-001 ainda expõe dados intra-tenant. Falta `.eq('user_id', companyId)`.
- **Solução:** Adicionar filtro tenant + restringir RLS finance por role.
- **Esforço:** Baixo

---

### MEDIO-004: `/financeiro` acessível a staff sem `OwnerRouteGuard`

- **Severidade:** MÉDIO  
- **Arquivo(s):** `App.tsx:183`, `pages/Finance.tsx:99`, `571-572`

- **Impacto:** Decisão de produto documentada em `EAGLE-REVIEW.md:41-80`. Staff vê “Meu Financeiro” via RPC com `professionalId` — OK na UI, mas depende de RLS fraco (ALTO-001).
- **Solução:** Manter rota + corrigir RLS finance.
- **Esforço:** Incluso em ALTO-001

---

### MEDIO-005: `client_semantic_memory` insert sem `company_id` no client

- **Severidade:** MÉDIO  
- **Arquivo(s):** `hooks/useSemanticMemory.ts:30-37`, RLS `supabase/migrations/20260318_fix_rls_client_semantic_memory.sql:38-59`

- **Impacto:** Insert só envia `client_id`; RLS valida via subquery em `clients.company_id`. OK se RLS aplicada; falha silenciosa se `clients.company_id` NULL (migration backfill linha 26-30).
- **Solução:** Garantir NOT NULL em `clients.company_id`; teste cross-tenant automatizado.
- **Esforço:** Baixo

---

### MEDIO-006: `aios_logs` RLS por `auth.uid() = user_id` (não por tenant)

- **Severidade:** MÉDIO  
- **Arquivo(s):** `supabase/migrations/20260221_aios_foundation.sql:24-28`, `hooks/useCampaignHistory.ts:54`

- **Impacto:** Staff não vê logs da empresa (só os próprios se existirem). Não é vazamento cross-tenant, mas impede auditoria e pode levar a inserts com `user_id` errado.
- **Solução:** Migrar para `user_id = get_auth_company_id()` ou policy staff read company.
- **Esforço:** Médio

---

### MEDIO-007: RPC `get_company_for_invite` ausente no repositório

- **Severidade:** MÉDIO  
- **Arquivo(s):** `pages/Register.tsx:50-51` — **nenhuma** definição em `supabase/migrations/`

- **Impacto:** Comportamento em produção indeterminado a partir do repo; se RPC permissiva, vaza metadados do tenant; se ausente, UX quebrada.
- **Solução:** Adicionar migration com RPC que valida convite e retorna apenas campos públicos.
- **Esforço:** Baixo

---

### BAIXO-001: `products` / `sell_product` — isolamento correto

- **Severidade:** BAIXO (positivo)  
- **Arquivo(s):** `supabase/migrations/20260603_products_v1.sql:44-79`, `101-106`, `services/catalog.ts:22`, `68`

- **Impacto:** Staff lê produtos ativos; só owner altera catálogo; RPC usa `get_auth_company_id()`.
- **Status:** OK

---

### BAIXO-002: `get_finance_stats` valida tenant + profissional

- **Severidade:** BAIXO (positivo)  
- **Arquivo(s):** `supabase/migrations/20260530_finance_stats_professional_filter.sql:33-43`, `services/finance.ts:44-50`

- **Impacto:** RPC rejeita `p_user_id` de outro tenant; filtro opcional por `professional_id`.
- **Status:** OK

---

### BAIXO-003: `team_members` service layer filtra por `companyId`

- **Severidade:** BAIXO (positivo)  
- **Arquivo(s):** `services/team.ts:12-16`, `62-63`, `77-78`

- **Impacto:** Queries sempre `.eq('user_id', companyId)` passado de `useAuth()`.
- **Status:** OK (RLS ainda permissivo para staff — ver ALTO-004)

---

### BAIXO-004: Policy `queue_entries` referencia coluna inexistente `user_id`

- **Severidade:** BAIXO (risco de drift)  
- **Arquivo(s):** `supabase/migrations/20260307_us015b_multi_user_rls.sql:161-166` vs schema `supabase/migrations/20260218_queue_system.sql:4-6` (`business_id` only)

- **Impacto:** Migration pode falhar ou policy nunca aplicada; fila depende de policies legadas “Public can view active queue” (CRIT-002).
- **Solução:** Corrigir policy para `business_id::text = get_auth_company_id()`.
- **Esforço:** Baixo

---

### INFO-001: VULN-01 documentado em EAGLE-REVIEW

- **Arquivo(s):** `docs/v1/EAGLE-REVIEW.md:143-157`

- **Nota:** Classificado como P0 pós-launch; esta auditoria eleva prioridade das policies públicas (CRIT-001–003) acima do intra-tenant finance.

---

### INFO-002: `AuthContext.companyId` correto para staff

- **Arquivo(s):** `contexts/AuthContext.tsx:87`, `114-121`

- Staff: `companyId = profile.company_id`; `teamMemberId` resolvido com `.eq('user_id', profile.company_id)`.

---

### INFO-003: Rotas protegidas vs staff (amostra)

| Rota | Guard | Staff acessa? |
|---|---|---|
| `/configuracoes/*` (maioria) | `OwnerRouteGuard` | Não |
| `/configuracoes/servicos` | Nenhum | **Sim** |
| `/financeiro` | Nenhum | Sim (visão restrita) |
| `/produtos` | Nenhum | Sim (UI owner-only para CRUD) |
| `/fila` | Owner | Não |

---

## Matriz RLS — tabelas auditadas

| Tabela | RLS | Isolamento tenant | Owner/Staff | Veredito |
|---|---|---|---|---|
| `finance_records` | Sim | `get_auth_company_id()` | Staff = ALL | **Falha intra-tenant (ALTO-001)** |
| `products` | Sim | `company_id` + role owner write | OK | **Pass** |
| `product_sales` | Sim | `company_id` SELECT | OK | **Pass** |
| `team_members` | Sim | company + public read global | Staff ALL | **Falha (ALTO-004 + CRIT-003)** |
| `public_bookings` | Sim | Owner/staff update; anon SELECT all | — | **Falha cross-tenant (CRIT-001)** |
| `services` | Sim | company + public read global | Staff ALL | **Falha (CRIT-003 + ALTO-004)** |
| `business_settings` | Sim | public read all | owner update | **Falha (CRIT-003)** |
| `queue_entries` | Sim | public read all active | policy bug user_id | **Falha (CRIT-002 + BAIXO-004)** |
| `profiles` | Sim | company isolation (pós US-0302) | OK | **Pass** |
| `client_semantic_memory` | Sim | via clients.company_id | OK se backfill | **Pass*** |

---

## Não verificado

- Estado live das 91+ migrations no Supabase remoto  
- Policies duplicadas/conflitantes já aplicadas manualmente  
- Edge Functions / webhooks Stripe com `company_id`  
- Testes E2E cross-tenant automatizados  

---

## Prioridade de remediação

1. **P0:** CRIT-001, CRIT-002, CRIT-003 — revogar SELECT público global; RPCs scoped por slug/business_id  
2. **P0:** ALTO-001 + ALTO-002 — RLS finance role-based  
3. **P1:** ALTO-003 — convites staff assinados  
4. **P1:** ALTO-004 — RLS owner/staff em tabelas operacionais  
5. **P2:** MEDIO-002, ALTO-005, ALTO-006 — higiene no client  

---

## Referências

- `docs/v1/EAGLE-REVIEW.md` — G16-A3, VULN-01/02/03  
- `.security/audit-auth.md` — convite staff, credenciais Supabase  
- `specs/active/SPEC-dashboard-colaborador-wireflow.md` — A3 RLS finance_records  
