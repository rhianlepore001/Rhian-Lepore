# SPEC — Onboarding de colaborador, agenda de folgas e dashboard staff (rascunho)

**Tarefa:** RASCUNHO · **Data:** 2026-07-19
**Status:** rascunho (Rhian: "pense nisso apenas como rascunho")
**Fontes:** `specs/done/SPEC-dashboard-colaborador-wireflow.md` (DONE), `specs/done/01-colaboradores-comissoes-pagamentos.md`, `App.tsx`, `pages/Dashboard.tsx`, `components/Header.tsx`, `components/TeamMemberForm.tsx`, `components/BottomMobileNav.tsx`.

> Objetivo: capturar 3 pedidos de feature em rascunho para planejamento futuro. **Sem SQL, sem código, sem PRD**. Esta spec só serve de checkpoint para reabrir e detalhar quando Rhian decidir que vira sprint.

---

## 1. Contexto

O Agendix já tem fluxo de colaborador (staff): o dono cadastra a equipe, o staff se registra via link `/#/register?company={ownerUserId}` e assume `role: 'staff'`. O dashboard do staff já existe (`MeuDiaWidget` + `StaffEarningsCard`), com wireflow documentado em `SPEC-dashboard-colaborador-wireflow.md` (DONE).

Estes 3 pedidos complementam o que já existe:

1. **Link de convite pro colaborador se registrar** (alternativa ao fluxo atual de cadastrar primeiro).
2. **Dono escolhe folgas e horários dos colaboradores**.
3. **Dashboard staff mostra seus dias/horários de trabalho** (extensão do que já existe).

---

## 2. Feature 1 — Link de convite pro colaborador

### Pedido literal
> "Quando ele adicionar um barbeiro na sua equipe, copiar link do barbeiro criado para mandar para o colaborador se registrar. Ou ao invés de cadastrar primeiro, só manda o link do colaborador. Quando o colaborador de registrar o sistema automaticamente já reconhece que é o mesmo colaborador que o dono registrou."

### Estado atual
- Dono cadastra membro da equipe em `TeamMemberForm` (cria registro em `team_members` com `company_id`).
- Colaborador se registra via `/#/register?company={ownerUserId}` — o `AuthContext` lê o param e vincula.
- **Gap**: o sistema não vincula o `auth.users.id` do colaborador ao `team_members.id` que o dono pré-criou. Hoje cada registro vira uma `team_members` à parte ou falha o link se já existe email.

### Perguntas em aberto (definir antes de planejar)
- O link é gerado **antes** do dono cadastrar o membro, ou **depois** (como "link de claim" do registro pré-existente)?
- Token é assinado (JWT com `team_member_id` + `company_id`) ou aleatório (lookup em tabela)?
- Expira? Reuso? Revogação?
- Comportamento se o colaborador abre o link mas já tem conta (login)?

### Impactos prováveis
- **Schema**: nova coluna `invite_tokens` (token, `team_member_id`, `company_id`, `expires_at`, `used_at`) ou `team_members.invite_token`.
- **Auth**: fluxo de "claim account" no `register` (precisa de `team_member_id` além de `company_id`).
- **RLS**: token-scoped policy (service role) para criar o vínculo; nunca confiar em URL sem assinatura.
- **UI**: `TeamMemberForm` ganha botão "Copiar link de convite" + "Gerar link antes de cadastrar".

---

## 3. Feature 2 — Folgas e horários por colaborador

### Pedido literal
> "Uma forma de o dono escolher as folgas dos colaboradores, fulano x, fulano y, e o dono também pode escolher os horários dos colaboradores."

### Estado atual
- `business_hours` existe (config global do estabelecimento, dona) — define expediente da barbearia.
- Cada `team_members` tem `working_hours` (?) — **a verificar**, não auditado nesta rodada.
- Agenda respeita `business_hours` global; não respeita folgas individuais.

### Perguntas em aberto
- Folga é recorrente (toda terça) ou pontual (dia 25/12)?
- Horário individual sobrescreve o do estabelecimento, ou é delta (ex: "fulano começa 1h mais tarde")?
- Visibilidade na agenda: dia de folga do fulano aparece como coluna oculta, desabilitada, ou só com a label "Folga"?
- Cobre horário de almoço? Intervalo?

### Impactos prováveis
- **Schema**: `team_member_schedules` (recorrente, dia da semana, hora início/fim) + `team_member_time_off` (pontual, `date`, motivo opcional) + `team_member_breaks` (recorrente, intervalo).
- **Agenda**: filtros e geração de slots devem considerar `working_hours` e `time_off` do profissional.
- **Mobile-first**: edit deve ser thumb-friendly (seleção de dia da semana em chips, picker de hora).
- **Multi-tenant**: RLS em `company_id` em todas as novas tabelas.

---

## 4. Feature 3 — Dashboard staff mostra dias/horários de trabalho

### Pedido literal
> "Nova opção para dashboard dos colaboradores, ou uma sessão nova, mostrando seus dias de trabalho, horários etc."

### Estado atual (DONE em `SPEC-dashboard-colaborador-wireflow.md`)
- Staff vê no dashboard: `MeuDiaWidget` (agenda do dia dele) + `StaffEarningsCard` (comissão líquida).
- **Não** vê: semana completa, dias de folga, expediente, próximos agendamentos.

### Perguntas em aberto
- É extensão do `MeuDiaWidget` (adicionar cards de "Minha semana", "Meu expediente") ou seção/rota nova?
- O que mostra quando staff não tem expediente cadastrado (ainda não recebeu da Feature 2)? Empty state com CTA "Aguardando o dono configurar seu horário"?
- Staff pode visualizar a agenda de outros colaboradores (privacidade)?

### Impactos prováveis
- **UI**: novos cards no `MeuDiaWidget` ou página `/meu-expediente` (rota staff-only, sem `OwnerRouteGuard`).
- **Dependência**: depende da Feature 2 (sem schedule cadastrado, mostrar fallback).
- **Multi-tenant**: staff só vê o próprio expediente — `WHERE team_member_id = current`.

---

## 5. Dependências entre features

```
F1 (link convite)        ─ standalone
F2 (folgas/horários)     ─ standalone
F3 (dashboard staff)     ─ depende de F2 (precisa de schedule pra mostrar)
```

F1 e F2 podem ir em sprints independentes. F3 só vira sprint depois de F2.

---

## 6. Multi-tenant (regra de ouro, não negociar)

Toda nova tabela escopada aqui:
- coluna `company_id uuid NOT NULL` vinda do `AuthContext` (`useAuth().companyId`).
- RLS policy `USING (company_id = current_setting('app.company_id')::uuid)`.
- FKs (`team_member_id`) sempre dentro do mesmo tenant.
- Service role só pra geração/validação de token de convite (F1), nunca em queries de UI.

---

## 7. Riscos & dívidas conhecidas (de specs DONE que afetam estas features)

- **SPEC-dashboard-colaborador-wireflow §7**: privacy de comissão do staff já é regra dura (só vê líquido próprio, não bruto). F2/F3 não podem vazar faturamento do estabelecimento pro staff.
- **SPEC-mobile-first-audit**: 3 features são mobile-first; qualquer UI nova passa pelo lens 375px.
- **SPEC-ui-audit / design-audit.md**: tokens de cor e tipografia (DS v1.1) já em uso; componentes novos herdam o `Card` canônico (`components/ui/Card.tsx`), não criar componente paralelo.

---

## 8. Próximo passo (quando virar sprint)

1. Promover esta spec de `specs/active/` para cá (a partir daqui).
2. Detalhar F1, F2 e F3 separadamente (esta é overview; cada uma vira uma spec de sprint).
3. PRD da F1 primeiro (link convite) — escopo pequeno, sem dependência, alto valor de UX pro dono.
4. PRD da F2 com wireflow + decisões de schema + RLS.
5. PRD da F3 atrelado ao wireflow da F2.

> **Rhian:** "isso será planejado melhor depois, pense nisso apenas como rascunho." Esta spec é o checkpoint. Sem prazo.
