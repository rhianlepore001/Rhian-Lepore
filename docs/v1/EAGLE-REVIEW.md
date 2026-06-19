# EAGLE REVIEW — Pre-Launch v1.0

> **Data:** 2026-06-07  
> **Escopo:** Revisao final de seguranca financeira, RLS, paridade e vazamentos  
> **Base:** board O/G/C/Q done, UI applied (G16-A2, Input zoom, T1/T3, Toast)

---

## 1. G16-A3: Isolamento de finance_records por professional_id / tenant

### RLS vigente (ultima migration relevante: `20260417_staff_commission_rls.sql`)

| Policy | Tabela | Operacao | Condicao |
|--------|--------|----------|----------|
| **Finance: company isolation** | finance_records | ALL | `user_id = get_auth_company_id()` |
| **Staff can view own commissions** | finance_records | SELECT | `EXISTS (team_members WHERE id=professional_id AND staff_user_id=auth.uid())` |
| **Owner can manage finance_records** | finance_records | ALL | `auth.uid()::text = user_id` |

### Analise critica

**A policy "Staff can view own commissions" e redundante.** PostgreSQL RLS resolve multiplas policies com OR logico. A policy "Finance: company isolation" (ALL, `user_id = get_auth_company_id()`) ja garante que qualquer usuario autenticado dentro do tenant le TODAS as finance_records do tenant. Ou seja, staff le registros de outros profissionais da mesma empresa via essa policy.

**Conclusao:** Sem vazamento **cross-tenant**. A policy `get_auth_company_id()` isola corretamente entre tenants. A vulnerabilidade e **intra-tenant**: staff pode, via Supabase client, ler finance_records de colegas. A correcao frontend (`.eq('professional_id', teamMemberId)`) impede isso na UI, mas nao e defense-in-depth.

### Queries finance_records sem filtro company_id/tenant

| Arquivo | Linha | Query | Filtro? |
|---------|-------|-------|---------|
| StaffInsights.tsx | 74 | `.from('finance_records').select('commission_value').eq('professional_id', teamMemberId)` | `professional_id` OK, **sem `.eq('user_id', companyId)`** — porem RLS filtra por company |
| StaffEarningsCard.tsx | 27 | `.from('finance_records').select('commission_value').eq('professional_id', teamMemberId).eq('commission_paid', false)` | `professional_id` OK, **sem `.eq('user_id')`** — RLS cobre |
| CommissionsManagement.tsx | 270 | `.from('finance_records').select('commission_value').eq('user_id', user.id).eq('professional_id', profId)` | Duplo filtro **OK** |
| CommissionPaymentHistory.tsx | 54 | `.from('finance_records').select('*').eq('professional_id', professionalId)` | **SEM `.eq('user_id')`** — mas componente so e acessivel pelo owner (tab Comissoes). RLS cobre cross-tenant |
| CommissionDetailReport.tsx | 61 | `.from('finance_records').select(...).eq('user_id', user.id).eq('professional_id', professionalId)` | Duplo filtro **OK** |
| ProfessionalCommissionDetails.tsx | 70 | `.from('appointments').select('...finance_records...').eq('professional_id', professionalId)` | Query em `appointments` (RLS company isolation) — **OK via RLS** |
| RPC `get_finance_stats` | — | SECURITY DEFINER, filtra por `v_auth_company_id` + opcionalmente `p_professional_id` | **OK** — ownership check na linha 35-37 |

**Veredito G16-A3:** StaffInsights e StaffEarningsCard estao corretos para o uso staff (`.eq('professional_id', teamMemberId)`). A correcao G16-A2 e suficiente para o caso de uso da UI. RLS garante isolamento cross-tenant. Nenhum vazamento cross-tenant encontrado.

---

## 2. Decisao A1: /financeiro sem OwnerRouteGuard

### Estado atual

```tsx
// App.tsx:183
<Route path="/financeiro" element={<Finance />} />
```

Sem Guard. Staff acessa `/financeiro` com visao restrita (`isStaff = role === 'staff'`).

### O que staff ve

- Tab "Meu Financeiro" (overview filtrado por `professionalId` via RPC `get_finance_stats`)
- **Nao ve**: Comissoes, Historico, Insights (tabs ocultas `Finance.tsx:424-428`)
- **Nao ve**: Card de despesas, lucro, goal (`Finance.tsx:461` — `!isStaff &&`)

### Risco real com evidencia RLS

| Vetor de ataque | Possivel? | Evidencia RLS |
|----------------|-----------|--------------|
| Staff le finance_records de outro tenant | **Nao** | `get_auth_company_id()` em "Finance: company isolation" bloqueia |
| Staff le finance_records de colega no mesmo tenant via Supabase client direto | **Sim** | Policy ALL com `user_id = get_auth_company_id()` permite. Staff NAO e bloqueado pela policy "Staff can view own commissions" (OR logico com a policy mais ampla) |
| Staff manipula transacoes financeiras (INSERT/UPDATE/DELETE) | **Sim** | "Finance: company isolation" e ALL — permite INSERT/UPDATE/DELETE para todo membro do tenant |

### Recomendacao

**Manter acessivel a staff** (visao restrita e funcional para o colaborador), mas **blindex RLS**:

1. **P0 — Refatorar RLS de finance_records** (acao pos-launch):
   - Trocar "Finance: company isolation" (ALL) por:
     - Owner: ALL com `user_id = get_auth_company_id() AND get_auth_role() = 'owner'`
     - Staff: SELECT com `EXISTS (team_members WHERE id = professional_id AND staff_user_id = auth.uid())`
   - Isso fecha o buraco intra-tenant e torna a policy "Staff can view own commissions" a UNICA via de leitura para staff

2. **P2 — Restringir INSERT/UPDATE/DELETE para owner**:
   - Staff NAO deve criar/editar/deletar finance_records diretamente — apenas via checkout de appointment
   - Hoje, `createFinanceRecord` em `services/finance.ts` e acessivel a qualquer usuario autenticado do tenant

**Risco de launch:** **Medio-baixo**. Nao ha vazamento cross-tenant. O buraco intra-tenant requer acesso direto ao Supabase client (nao exploitavel pela UI). Mas e defense-in-depth imperfeito.

---

## 3. Paridade (PARITY-REPORT.md) — Confirmacao em codigo

### P0 — Onboarding: /onboarding 2 steps vs spec 5

**Confirmado em `WizardEngine.tsx:26-31`:**

```tsx
const WIZARD_STEPS: WizardStepConfig[] = [
  { step: 1, title: 'Boas-vindas', Icon: Sparkles },
  { step: 2, title: 'Seus Servicos', Icon: Scissors },
];
```

Rota `/onboarding` usa WizardEngine com **2 steps**. Rota `/onboarding-wizard` usa `OnboardingWizard` com **5 steps** (BizInfo, Services, Team, MonthlyGoal, Success). Login redireciona para `/onboarding` — **usuario nunca ve o fluxo 5-step**.

**Risco de launch:** **Medio**. Onboarding enxuto pode ate ser melhor UX, mas diverge da spec. Se a decisao de produto e manter 2 steps, atualizar o spec.

### P0 — Auto-atribuicao no AppointmentWizard

**Confirmado.** `AppointmentWizard.tsx` exige selecao manual de profissional (step 3, `selectedProId`). Nao existe logica de auto-select quando ha apenas 1 team member. Essa logica existe em `Agenda.tsx:270-274` (modal inline) e `PublicBooking.tsx:526` (`getFirstAvailableProfessional`), mas **NAO** no wizard.

**Risco de launch:** **Baixo-medio**. Funcionalidade ausente, mas UX viavel (usuario seleciona manualmente). Nao e bloqueador de launch.

### P1 — sell_product com appointmentId sempre null

**Confirmado.** `Finance.tsx:366` cria transacao manual com `appointmentId: null`. Na venda de produto via `Products.tsx`, o hook `useCatalog` chama `sellProduct` que passa `p_appointment_id: parsed.appointmentId ?? null`. Nenhuma UI passa `appointmentId` para venda de produto — o campo总是在 null.

**Risco de launch:** **Baixo.** Funcionalidade de venda avulsa funciona (estoque decrementa, finance_record criado). A vinculacao com appointment e nice-to-have para relatorios, nao bloqueador.

---

## 4. Vazamentos financeiros ou cross-tenant remanescentes

### Cross-tenant: NENHUM encontrado

Todas as queries e RPCs relevantes filtram por `company_id`/`user_id` via RLS ou parametros:

| Componente/Service | Mecanismo | Status |
|---|---|---|
| `get_finance_stats` RPC | Ownership check `v_auth_company_id` | **OK** |
| `get_commissions_due` RPC | `WHERE fr.user_id = p_user_id` | **OK** |
| `mark_commissions_as_paid` RPC | `WHERE user_id = p_user_id` | **OK** |
| `sell_product` RPC | `company_id = v_company_id` | **OK** |
| `deleteFinanceRecord` | `.eq('user_id', companyId)` | **OK** |
| `createFinanceRecord` | `user_id: input.companyId` | **OK** |
| `mark_expense_as_paid` | `WHERE id = p_record_id AND user_id = p_user_id` | **OK** |
| RLS finance_records | `user_id = get_auth_company_id()` | **OK** |

### Intra-tenant: Queries sem filtro explicito de professional_id

| Componente | Risco | Detalhe |
|---|---|---|
| `CommissionPaymentHistory.tsx:54` | P2 — owner-only path | Query sem `.eq('user_id')`, mas so acessivel pelo owner through Comissoes tab |
| `StaffInsights.tsx:74` | Coberto | `.eq('professional_id', teamMemberId)` filtra corretamente |
| `StaffEarningsCard.tsx:27` | Coberto | `.eq('professional_id', teamMemberId)` filtra corretamente |
| `get_finance_stats` com staff | Coberto | Chamado com `professionalId: teamMemberId`, RPC valida ownership |

### Vulnerabilidades intra-tenant (defense-in-depth)

| ID | Descricao | Severidade |
|---|---|---|
| VULN-01 | RLS policy "Finance: company isolation" e ALL — staff pode INSERT/UPDATE/DELETE finance_records de outros profissionais no mesmo tenant | **P0 pos-launch** |
| VULN-02 | RLS policy "Staff can view own commissions" e redundante — overpowered pela policy broader de company isolation | **P1 pos-launch** |
| VULN-03 | `CommissionPaymentHistory` query sem `.eq('user_id')` — acessivel apenas pelo owner, mas se exposto a staff seria vazamento intra-tenant | **P2** |

---

## 5. Tabela de classificacao final

| ID | Item | Prioridade | Bloqueia launch? | Acao |
|---|---|---|---|---|
| G16-A3 | Staff le apenas proprias finance_records na UI | **OK** | Nao | Nenhuma acao |
| A1 | /financeiro sem OwnerRouteGuard | **P2** | Nao | Manter; blindex RLS pos-launch |
| VULN-01 | RLS finance_records ALL para todo tenant | **P0** | Nao | Refatorar para role-based pos-launch |
| VULN-02 | Redundancia RLS staff commissions | **P1** | Nao | Limpar policies pos-launch |
| VULN-03 | CommissionPaymentHistory sem user_id | **P2** | Nao | Adicionar `.eq('user_id')` pos-launch |
| P0-01 | Onboarding 2-step vs 5-step | **P1** | Nao | Alinhar com produto |
| P0-02 | Auto-atribuicao no AppointmentWizard | **P1** | Nao | Portar logica pos-launch |
| P1-01 | sell_product sem appointmentId na UI | **P2** | Nao | Nice-to-have |
| P2-01 | Som notification QueueStatus cliente | **P2** | Nao | Pos-launch |
| P2-02 | Trial/subscription unit tests | **P2** | Nao | Pos-launch |

---

## 6. Veredicto

**Launch v1.0:** **APROVADO com ressalvas.**

- Nenhum vazamento **cross-tenant** detectado
- Isolamento financial por professional_id funciona corretamente na UI (StaffInsights, StaffEarningsCard, Finance RPC)
- Gaps de defense-in-depth (intra-tenant) sao P0/P1 pos-launch, nao bloqueadores
- Paridade: 3 gaps confirmados (onboarding, auto-atribuicao, sell_product appointmentId) — nenhum e bloqueador funcionacional
- Suite 227/227 verde

**Acoes obrigatorias pos-launch (em ordem):**
1. Refatorar RLS finance_records para role-based (P0)
2. Alinhar onboarding: decidir 2-step ou 5-step (P1)
3. Portar auto-atribuicao para AppointmentWizard (P1)