# SPEC — Wireflow Dashboard: Colaborador (staff) vs Dono (owner)

**Tarefa:** O3 · **Data:** 2026-06-07
**Status:** DONE (documentação de fluxo) · **Sem SQL.**
**Fontes:** `specs/active/01-colaboradores-comissoes-pagamentos.md`, `pages/Dashboard.tsx`, `App.tsx`, `components/dashboard/MeuDiaWidget.tsx`, `components/StaffEarningsCard.tsx`.

> Objetivo: documentar o que o **staff** vê / não vê no app e como funcionam os **redirects** de rota protegida, comparando com a realidade implementada. Não redesenha telas — mapeia comportamento e aponta divergências para decisão.

---

## 1. Origem do papel

- `role` vem de `useAuth()` (Supabase) → `'owner' | 'staff'`. **Nunca** de URL/form.
- Staff se registra via `/#/register?company={ownerUserId}` → `role: 'staff'`.
- Detecção na UI: `const isStaff = role === 'staff'` (já usado em `Dashboard.tsx`, `Finance.tsx`).

---

## 2. Wireflow do Dashboard (`/`)

```
                ┌─────────────────────────┐
   login  ──▶   │  Dashboard  (/)         │
                │  role === 'staff' ?     │
                └───────────┬─────────────┘
                            │
            ┌───────────────┴────────────────┐
            ▼ staff                           ▼ owner
 ┌───────────────────────┐        ┌──────────────────────────────┐
 │ DashboardHero (staff)  │       │ DashboardHero (owner)          │
 │ MeuDiaWidget           │       │ SetupCopilot                   │
 │  · agenda do dia (dele)│       │ Avisos do sistema              │
 │  · resumo: concluídos, │       │ KPIs: Receita dia / Agenda /   │
 │    pendentes,          │       │   Oportunidades                │
 │    faturamento próprio │       │ Receita do dia (meta diária)   │
 │  · botão "Concluir"    │       │ Agenda de hoje (todos)         │
 │ StaffEarningsCard      │       │ Oportunidades / CRM            │
 │  · comissões a receber │       │ Meta mensal                    │
 │    (líquido próprio)    │       │ Saúde do negócio               │
 └───────────────────────┘        │ Dica do dia                    │
                                   └──────────────────────────────┘
```

**Implementado hoje** (`Dashboard.tsx` L250-455): `isStaff` → renderiza só `MeuDiaWidget` + `StaffEarningsCard`. Owner → todo o resto. ✅ alinhado com a Feature 1 da spec 01.

---

## 3. O que o staff VÊ × NÃO VÊ (resumo executivo)

| Item | Owner | Staff | Onde |
|------|:----:|:----:|------|
| Agenda do dia (própria) | ✅ | ✅ | MeuDiaWidget |
| Faturamento **próprio líquido** (comissão a receber) | ✅ | ✅ (só o dele) | StaffEarningsCard |
| Faturamento **bruto da barbearia** | ✅ | ❌ | só no dashboard owner / Finance |
| KPIs do negócio (meta, saúde, oportunidades) | ✅ | ❌ | dashboard owner |
| Concluir atendimento | ✅ | ✅ | MeuDiaWidget botão |
| Estoque de produtos (consulta) | ✅ | ✅ | Produtos v1 (ver SPEC-products §3) |
| Cadastrar/editar produto | ✅ | ❌ | Produtos v1 |
| Comissões/financeiro de **outros** colaboradores | ✅ | ❌ | — |
| Configurações (plano, equipe, integrações) | ✅ | ❌ | guard de rota |

---

## 4. Matriz de acesso a rotas (realidade `App.tsx`)

### 4.1 Abertas a staff (sem guard owner)

| Rota | Tela | Observação UI |
|------|------|----------------|
| `/` | Dashboard | versão staff (§2) |
| `/agenda` | Agenda | staff pode criar/editar/cancelar de colega (Feature 1) |
| `/clientes`, `/clientes/:id` | Clients / ClientCRM | — |
| `/financeiro` | Finance | **aberta a staff** com visão restrita (`isStaff` → "Meu Giro", esconde despesas) |
| `/meus-insights` | StaffInsights | área de métricas do próprio staff |
| `/configuracoes/servicos` | ServiceSettings | única sub-config aberta a staff |
| `/produtos` (futuro, C2) | Products | aberta; tela esconde ações de owner (SPEC-products §3) |

### 4.2 Bloqueadas por `OwnerRouteGuard` (redireciona staff)

`/fila`, `/marketing`, `/insights`, `/configuracoes` (e todas as sub: geral, agendamento, equipe, comissoes, assinatura, seguranca, notificacoes).

### 4.3 Bloqueadas por `DevRouteGuard` (só dev)

`/configuracoes/auditoria`, `/configuracoes/lixeira`, `/configuracoes/erros`, `/configuracoes/ui-preview`.

---

## 5. Fluxo de redirect (rota protegida)

```
 staff acessa rota owner (ex: /fila)
        │
        ▼
 OwnerRouteGuard (App.tsx L115-126)
   loading?  ──▶ <LoadingFull/>
   !auth?    ──▶ Navigate /login
   role==='staff' ?
        │ sim
        ▼
   sessionStorage['ownerRouteToast'] = 'Acesso restrito ao dono da barbearia'
   Navigate('/', replace)
        │
        ▼
 Dashboard monta → lê sessionStorage (L122-129)
   mostra toast 4s (bottom-center, animate-in)
   remove a chave
```

**UX do toast:** aparece no rodapé centralizado, cor de perigo, some em 4s. ✅ implementado. Mensagem: *"Acesso restrito ao dono da barbearia"*.

> Recomendação UI (P2): a navegação lateral **não deve exibir** itens bloqueados para staff (Fila, Marketing, Insights, Configurações). Hoje o guard protege o acesso, mas se o link aparecer no menu o staff clica e leva o toast — fricção evitável. Esconder no menu por `role` é melhor UX do que redirecionar. *(Verificar componente de nav; não auditado neste O3.)*

---

## 6. Edge cases (Feature 1 / Agenda)

| Caso | Comportamento esperado | Status |
|------|------------------------|--------|
| Staff tenta cancelar agendamento **já pago/finalizado** | Bloqueia + mensagem "Este agendamento já foi finalizado. Fale com o dono." | implementado em `Agenda.tsx:685` (via `alert` — ver O1 T2: migrar p/ `showAlert`) |
| Staff acessa rota owner | Toast "Acesso restrito ao dono da barbearia" + volta ao dashboard | ✅ |
| Staff sem `teamMemberId` | StaffEarningsCard não quebra (loading→0) | ✅ |

---

## 7. Decisão: privacidade financeira do staff (RESOLVIDA — 2026-06-07)

**Contexto.** A spec 01 (§Feature 1) diz que o staff vê só o **líquido próprio**, nunca o bruto. Existiam dois modelos conflitantes para `/financeiro`:
- A — blindar com `OwnerRouteGuard` (spec literal).
- B — manter aberta com visão restrita (`isStaff` → "Meu Giro").

**Evidência que decidiu (🔴 BUG DE SEGURANÇA encontrado no O3):**
`pages/StaffInsights.tsx` (card "Comissões", L73-78) consulta `finance_records` **sem filtrar `professional_id`** e soma `amount` (bruto do serviço) em vez de `commission_value`:

```
supabase.from('finance_records').select('amount')
  .gte('created_at', start).lte('created_at', end)   // ← sem .eq('professional_id', ...)
```

Resultado: o staff vê, rotulado como "Comissões", o **faturamento bruto** do período (dependente apenas do RLS para não vazar entre profissionais). O modelo B já falha na prática. Compare com `StaffEarningsCard` (correto): `.eq('professional_id', teamMemberId)` + `commission_value`.

**Princípio aplicado:** privacidade financeira é garantia da **camada de dados (RLS)**, não de condicional de UI. Regra #1 do projeto (AGENTS/CLAUDE): nunca confiar no front.

**Decisão → Opção A + correção de dados:**

| # | Ação | Papel | Prioridade |
|---|------|-------|-----------|
| A1 | `OwnerRouteGuard` em `/financeiro`; remover código morto `isStaff` de `Finance.tsx` | Ship (Composer) | P1 |
| A2 | Corrigir query de `StaffInsights`: filtrar `professional_id = teamMemberId` + usar `commission_value` (espelhar `StaffEarningsCard`) | Ship (Composer) | **P0** |
| A3 | Provar via RLS que staff só lê `finance_records` próprios (cross-tenant + cross-staff) | DB (GPT) | **P0** |
| A4 | Registrar em `_reversa_sdd/gaps.md` | DB | — |

Superfícies de ganhos do staff após a decisão: `StaffEarningsCard` (Dashboard) + `/meus-insights` (corrigido). `/financeiro` passa a ser exclusivo do owner.

---

## 8. Cross-ref com O1 (débito visual nas telas de staff)

`MeuDiaWidget` e `StaffEarningsCard` carregam o mesmo débito do O1: `text-[10px]`/`text-[9px]` (MeuDia L50,70,76,77,122,126,130,180; StaffEarnings L58) → `text-xs`. Incluir no lote de fix mecânico (handoff Composer).

---

## 9. Resumo de handoffs

| Item | Tipo | Destino | Prioridade |
|------|------|---------|-----------|
| 🔴 Query de comissão do `StaffInsights` vaza bruto (A2) | bug segurança | Composer + verificação GPT | **P0** |
| Provar RLS `finance_records` por `professional_id` (A3) | segurança | GPT (DB) | **P0** |
| `OwnerRouteGuard` em `/financeiro` + limpar `isStaff` (A1) | rota | Composer | P1 |
| Esconder itens de menu bloqueados para staff | UX/Ship | verificar nav + Composer | P2 |
| `text-[10px]` em widgets staff (MeuDia/StaffEarnings/StaffInsights) | mecânico | Composer (lote O1) | P2 |
| `alert` no cancelamento pago → `showAlert` | mecânico | Composer (lote O1 T2) | P1 |
