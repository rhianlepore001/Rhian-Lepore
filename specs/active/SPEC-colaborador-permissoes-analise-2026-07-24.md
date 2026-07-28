# SPEC — Permissões, notificação e análise do colaborador (Lion Claw discovery)

**Tarefa:** RASCUNHO · **Data:** 2026-07-24
**Status:** rascunho (Rhian: "vamos planejar tudo isso? me faça um discovery estilo Lion Claw")
**Fontes:** `specs/done/SPEC-colaborador-onboarding-expediente.md` (rascunho 19/jul superado, herdou F1+F2+F3), `specs/done/SPEC-dashboard-colaborador-wireflow.md` (DONE, privacidade financeira do staff), `specs/done/01-colaboradores-comissoes-pagamentos.md` (DONE, comissões), `specs/done/SPEC-products-v1-ui.md` (DONE, produtos), `pages/Fila.tsx`, `pages/Produtos.tsx`, `pages/Dashboard.tsx`, `components/Header.tsx`, `components/TeamMemberForm.tsx`, `hooks/useAuth.ts`, `App.tsx`.

> **Objetivo do formato Lion Claw:** discovery pergunta-resposta-investigação que **força clareza** antes de virar sprint. Sem SQL, sem código, sem PRD. **Cada feature tem 4 lentes**: (1) pedido literal, (2) estado atual mapeado, (3) decisões abertas a fechar antes de planejar, (4) impacto provável.
>
> **Quando virar sprint:** promover para `specs/active/SPEC-colaborador-...-sprints.md` com PRD por feature, schema, RLS, wireflow, DoD, gates.

---

## 0. Contexto agregado (4 features novas + 3 herdadas)

Esta SPEC é **a continuação** do rascunho de 19/jul, com **3 features originais mantidas** (F1 link convite, F2 folgas/horários, F3 dashboard staff) + **4 features novas adicionadas em 24/jul** (F4 permissões fila, F5 permissões produtos, F6 notificação agendamento online, F7 análise do colaborador).

**Total: 7 features.** Foco do Lion Claw: forçar as decisões abertas de cada uma antes de planejar.

| # | Feature | Origem | Status Lion Claw |
|---|---------|--------|------------------|
| F1 | Link de convite no card de equipe | 19/jul (F1) | ✅ escopo confirmado (botão "Copiar link" no card, claim account no registro) |
| F2 | Dono configura folgas e horários individuais | 19/jul (F2) | ⏳ 4 decisões em aberto |
| F3 | Dashboard staff mostra expediente | 19/jul (F3) | ⏳ 2 decisões em aberto (depende F2) |
| F4 | Permissões de fila digital pro colaborador | 24/jul (nova) | ✅ escopo fechado (puxar, finalizar, ver; sem adicionar manual/reordenar) |
| F5 | Permissões de produtos pro colaborador | 24/jul (nova) | ✅ escopo fechado (dar baixa + venda avulsa; sem cadastrar/editar) |
| F6 | Notificação no agendamento online (sino interno) | 24/jul (nova) | ✅ escopo fechado (sino+badge in-app, não push) |
| F7 | Análise do colaborador (últimos serviços, produtos vendidos) | 24/jul (nova) | ✅ escopo fechado (cards no /meus-insights ou Dashboard, sem rota nova) |

---

## 1. Feature 1 — Link de convite no card de equipe (HERDADA DE 19/JUL, FECHADA)

### 1.1 Pedido literal
> "Quando ele adicionar um barbeiro na sua equipe, copiar link do barbeiro criado para mandar para o colaborador se registrar. Ou ao invés de cadastrar primeiro, só manda o link do colaborador. Quando o colaborador de registrar o sistema automaticamente já reconhece que é o mesmo colaborador que o dono registrou."

### 1.2 Estado atual (mapeado)
- `pages/Configuracoes.tsx` (sub-rota `equipe`) → `TeamMemberForm` (cria registro em `team_members` com `company_id`).
- Colaborador se registra via `/#/register?company={ownerUserId}` → `AuthContext` lê o param e assume `role: 'staff'`.
- **Gap hoje:** o sistema **não vincula** o `auth.users.id` do colaborador ao `team_members.id` que o dono pré-criou. Cada registro de staff vira uma `team_members` à parte (duplicada) ou falha o link se já existe email.

### 1.3 Decisões abertas (precisam fechar antes de PRD)
- [ ] **D1.1** — Token é assinado (JWT com `team_member_id` + `company_id`) ou aleatório (lookup em tabela)? — *recomendação Lion Claw: aleatório com tabela `invite_tokens` (lookup é trivial, JWT complica rotação/revogação).*
- [ ] **D1.2** — Link é gerado **antes** do dono cadastrar o membro, ou **depois** (link de claim do registro pré-existente)? — *recomendação: depois (claim). Dono cadastra fulano, sistema já cria o token vinculado ao `team_members.id`.*
- [ ] **D1.3** — Token expira? Reuso? Revogação? — *recomendação: expira em 7 dias; 1 uso; revogação = botão "Invalidar link" no card.*
- [ ] **D1.4** — Colaborador abre o link mas já tem conta (login)? — *recomendação: vai pra `/login?next=claim&token=...`; após login, valida token e vincula.*

### 1.4 Impacto provável
- **Schema**: nova tabela `invite_tokens(id uuid, team_member_id uuid, company_id uuid, token text unique, expires_at timestamptz, used_at timestamptz null, created_by uuid)`.
- **Auth**: fluxo de "claim account" no `AuthContext` (lê token da URL, valida, vincula `team_members.auth_user_id`).
- **RLS**: `invite_tokens` com policy service-role-only (dono não pode listar tokens de outros donos).
- **UI**: `TeamMemberForm` ganha botão "Copiar link de convite" no card de cada membro; status "Pendente / Aceito / Expirado".

---

## 2. Feature 2 — Dono configura folgas e horários individuais (HERDADA DE 19/JUL, ABERTA)

### 2.1 Pedido literal
> "Uma forma de o dono escolher as folgas dos colaboradores, fulano x, fulano y, e o dono também pode escolher os horários dos colaboradores."

### 2.2 Estado atual
- `business_hours` existe (config global do estabelecimento) — define expediente da barbearia.
- `team_members` não tem colunas de schedule próprio (**a verificar em sprint**, fora de escopo do discovery).
- Agenda (`pages/Agenda.tsx`) respeita `business_hours` global; **não respeita** folgas individuais.
- `useEmptySlots` ou similar gera slots por `business_hours`, sem filtro por profissional.

### 2.3 Decisões abertas
- [ ] **D2.1** — Folga é recorrente (toda terça) ou pontual (dia 25/12)? — *Lion Claw recomenda: suportar os 2 (recorrente + pontual em tabelas separadas). Recorrente para "toda terça" do fulano; pontual para "fulano folgou dia 25/12" eventual.*
- [ ] **D2.2** — Horário individual sobrescreve o do estabelecimento, ou é delta? — *recomendação: sobrescreve (mais simples; dono configura horário do fulano do zero). Delta é YAGNI.*
- [ ] **D2.3** — Visibilidade na agenda: dia de folga do fulano aparece como coluna oculta, desabilitada, ou label "Folga"? — *recomendação: label "Folga — Fulano" (transparência pro dono ver; staff não vê a agenda dos outros).*
- [ ] **D2.4** — Cobre horário de almoço/intervalo? — *recomendação: SIM, é recorrente, mesma tabela de schedule com flag `is_break`.*

### 2.4 Impacto provável
- **Schema**: `team_member_schedules(team_member_id, weekday, start_time, end_time, is_break bool)` + `team_member_time_off(team_member_id, date, reason null)` + `team_member_breaks(team_member_id, weekday, start_time, end_time)`.
- **Agenda**: `useEmptySlots` filtra por `team_member_schedules` + `team_member_time_off` antes de gerar grid.
- **Mobile-first**: edit com chips de dia da semana (1 toque) + time picker.
- **Multi-tenant**: RLS em `company_id` em todas as novas tabelas.

---

## 3. Feature 3 — Dashboard staff mostra expediente (HERDADA DE 19/JUL, ABERTA)

### 3.1 Pedido literal
> "Nova opção para dashboard dos colaboradores, ou um sessão nova, mostrando seus dias de trabalho, horários etc."

### 3.2 Estado atual
- `components/dashboard/MeuDiaWidget.tsx` (agenda do dia) + `components/StaffEarningsCard.tsx` (comissão líquida) já implementados.
- **Não mostra:** semana completa, dias de folga, expediente, próximos agendamentos.

### 3.3 Decisões abertas
- [ ] **D3.1** — Cards novos no `MeuDiaWidget` (ex: "Minha semana", "Meu expediente") ou página `/meu-expediente` (rota staff-only)? — *recomendação: cards no `MeuDiaWidget` para começar (sem rota nova, mais barato). Quando tiver conteúdo rico, vira rota depois.*
- [ ] **D3.2** — O que mostra quando staff não tem expediente cadastrado (F2 ainda não entregou)? — *recomendação: empty state com CTA "Aguardando o dono configurar seu horário. Avise seu gerente." (sem texto pejorativo).*

### 3.4 Impacto provável
- **UI**: cards no `MeuDiaWidget` (read-only) consumindo `team_member_schedules` + `team_member_time_off`.
- **Dependência**: depende de F2 (sem schedule, mostra fallback).
- **Multi-tenant**: staff vê só o próprio expediente (`WHERE team_member_id = current`).

---

## 4. Feature 4 — Permissões de fila digital pro colaborador (NOVA 24/JUL, FECHADA)

### 4.1 Pedido literal
> "Precisamos adicionar as permissões de colaborador para fila digital, e pensar na lógica de como irá funcionar para colaborador, da mesma forma a sessão de produtos."

### 4.2 Escopo fechado (Rhian, 24/jul)
Colaborador pode na fila digital:
- ✅ **Puxar** da fila (chamar o próximo).
- ✅ **Finalizar** atendimento (muda status pra `completed`).
- ✅ **Ver** fila inteira (transparência).
- ❌ **NÃO** pode adicionar cliente manual à fila.
- ❌ **NÃO** pode reordenar.
- ❌ **NÃO** pode configurar regras da fila.
- ❌ **NÃO** pode marcar `no_show` (decisão a confirmar — ver 4.3).

### 4.3 Decisões abertas
- [ ] **D4.1** — Colaborador pode marcar `no_show`? — *recomendação Lion Claw: SIM, é parte do "finalizar" (status final pode ser `completed` ou `no_show`). Se não, quem marca? Dono? Volta pra fila? Decidir.*
- [ ] **D4.2** — Colaborador vê fila inteira da barbearia ou só os que ele vai atender? — *recomendação: vê fila inteira (transparência), mas só pode puxar/finalizar clientes atribuídos a ele (a confirmar — pode ter regra de "qualquer um puxa" tipo rodízio).*

### 4.4 Estado atual mapeado
- `pages/Fila.tsx` (rota `/fila`) — `OwnerRouteGuard` BLOQUEIA staff hoje (CONFIRMAR em sprint).
- `queue_entries` (schema) tem `status` (`waiting | calling | serving | completed | cancelled | no_show`) — o colaborador já tem material pra trabalhar.
- `StaffEarningsCard` (DONE) usa `finance_records` filtrado por `professional_id` (P0 segurança resolvido).

### 4.5 Impacto provável
- **Auth/Rota**: remover `OwnerRouteGuard` de `/fila` e implementar guard de **role + ação**: staff vê a fila, mas UI esconde botões de "Adicionar manual" e "Reordenar".
- **Schema**: nada novo. RLS existente já isola por `company_id`.
- **UI**: `Fila.tsx` ganha prop `viewerRole: 'owner' | 'staff'`; botões condicionais.
- **Privacy**: staff **NÃO** vê comissões de outros (regra já existente em `StaffEarningsCard`).

---

## 5. Feature 5 — Permissões de produtos pro colaborador (NOVA 24/JUL, FECHADA)

### 5.1 Pedido literal
> "Pensar na lógica de como irá funcionar para colaborador, da mesma forma a sessão de produtos."

### 5.2 Escopo fechado (Rhian, 24/jul)
Colaborador pode em produtos:
- ✅ **Dar baixa no estoque** ao vender (consumir unidade).
- ✅ **Cadastrar venda avulsa** (cliente compra produto sem ter agendamento).
- ✅ **Ver lista** de produtos + **histórico de vendas próprias**.
- ❌ **NÃO** pode cadastrar novo produto.
- ❌ **NÃO** pode editar produto existente.
- ❌ **NÃO** pode excluir produto.

### 5.3 Decisões abertas
- [ ] **D5.1** — Venda avulsa tem fluxo de pagamento (PIX/cartão) ou só registro de "vendeu 1 shampoo pro João"? — *recomendação: registro simples (sem gateway); valor entra em `finance_records` como receita avulsa. Dono fecha caixa no fim do mês.*
- [ ] **D5.2** — Estoque abaixo do mínimo: staff recebe aviso ou só owner? — *recomendação: AMBOS veem (transparência); staff vê "estoque baixo" no card, mas só owner recebe notificação/ação corretiva.*
- [ ] **D5.3** — Venda avulsa está atrelada a cliente do CRM ou pode ser anônima (cliente não cadastrado)? — *recomendação: pede seleção de cliente (mesmo que seja "cliente avulso" genérico do tenant). Sem venda fantasma.*

### 5.4 Estado atual mapeado
- `pages/Produtos.tsx` — provavelmente com `OwnerRouteGuard` (CONFIRMAR em sprint).
- `useProducts` hook (CONFIRMAR existência em sprint) — staff pode ler mas não escrever.
- **Gap:** fluxo de "dar baixa" e "venda avulsa" pode não existir separado do checkout de agendamento. Pode estar atrelado à conclusão de appointment.

### 5.5 Impacto provável
- **Schema**: nada novo (venda avulsa = INSERT em `finance_records` + UPDATE em `products.stock`).
- **Auth/Rota**: remover `OwnerRouteGuard` de `/produtos`; implementar guard por ação (UI conditionals).
- **UI**: nova view "Venda avulsa" no card de cada produto (modal com qty + seleção de cliente + valor).
- **Privacy**: staff vê só suas vendas (espelhar padrão de `StaffEarningsCard` — `WHERE seller_id = teamMemberId`).

---

## 6. Feature 6 — Notificação no agendamento online (NOVA 24/JUL, FECHADA)

### 6.1 Pedido literal
> "E também agendamento online, precisa aparecer notificação para o colaborador conseguir aceitar."

### 6.2 Escopo fechado (Rhian, 24/jul)
- Notificação **dentro do app** (sino + badge no header), **NÃO** push.
- Aproveita o `Header.tsx` que já tem ícone de sino (CONFIRMAR em sprint).
- Foco: cliente agendou online → colaborador que vai atender recebe badge no sino com a info do agendamento.

### 6.3 Decisões abertas
- [ ] **D6.1** — Notificação vai pra 1 colaborador (o atribuído) ou pra todos? — *recomendação: 1 (o atribuído). Evita spam. Se não tem colaborador atribuído, vai pro dono (regra atual).*
- [ ] **D6.2** — "Aceitar" significa o quê? Confirmar que viu? Ou bloquear o slot pra outro? — *recomendação: aceitar = confirmar presença (muda status pra `confirmed`). Não aceitar = agendamento fica `pending` até o dono intervir (ou expira em X horas, a definir).*
- [ ] **D6.3** — Reagendamento/cancelamento pelo cliente também dispara notificação pro colaborador? — *recomendação: SIM (cancelamento é crítico pro staff; reagendamento é menos urgente mas importante).*

### 6.4 Estado atual mapeado
- `components/Header.tsx` tem sino (CONFIRMAR — pode ser notificação genérica).
- `appointments` (schema) tem `status` (`pending | confirmed | completed | cancelled | no_show` — CONFIRMAR valores exatos em sprint).
- Realtime do Supabase é viável para escutar INSERTs em `appointments WHERE professional_id = current`.

### 6.5 Impacto provável
- **Realtime**: subscribe em `appointments` filtered por `professional_id` (staff) — Supabase Realtime.
- **Schema**: nada novo (status já existe).
- **UI**: badge no sino do header + drawer de notificações (mesmo do dono, com scope filtrado).
- **Auth**: notificação é server-side scope (RLS); staff só vê INSERTs do próprio `professional_id`.

---

## 7. Feature 7 — Análise do colaborador (NOVA 24/JUL, FECHADA)

### 7.1 Pedido literal
> "Nova funcionalidade para colaborador (se ainda não tiver) uma forma do colaborador ver seus últimos serviços, produtos vendidos, uma espécie de análise."

### 7.2 Escopo fechado (Rhian, 24/jul)
- **Localização:** cards/widgets adicionais no `/meus-insights` (já existe) ou no Dashboard staff. **Sem rota nova.**
- **Conteúdo:**
  - Lista de últimos N serviços realizados (com data, cliente, serviço, valor).
  - Lista de produtos vendidos (qty, valor total, estoque atual).
  - Métricas simples: ticket médio próprio, total de serviços no mês, ranking interno (opcional).

### 7.3 Decisões abertas
- [ ] **D7.1** — "Últimos N" é fixo (10) ou configurável? — *recomendação: fixo em 10 (YAGNI).*
- [ ] **D7.2** — Análise cruza com meta do estabelecimento ou só dados próprios? — *recomendação: só próprios (privacy já estabelecida em `SPEC-dashboard-colaborador-wireflow §7`). Meta do estabelecimento é P0 leak.*
- [ ] **D7.3** — Ranking interno mostra posição do staff vs colegas? — *recomendação: NÃO nesta sprint. Dono vê; staff não vê ranking (pode ser desmotivador + é dado de outros). Adiar para sprint futura com opt-in.*

### 7.4 Estado atual mapeado
- `/meus-insights` (`pages/StaffInsights.tsx`) já existe e mostra comissões (corrigido P0 do `SPEC-dashboard-colaborador-wireflow §7`).
- Hooks de appointments/products existem (`useAppointments`, `useProducts` — CONFIRMAR nomes em sprint).

### 7.5 Impacto provável
- **Schema**: nada novo.
- **UI**: novos cards em `StaffInsights.tsx` (mesma rota, sem guard novo).
- **Privacy**: query SEMPRE com `.eq('professional_id', teamMemberId)` + `.eq('seller_id', teamMemberId)` (espelhar `StaffEarningsCard`).

---

## 8. Dependências cruzadas entre as 7 features

```
F1 (link convite)              ─ standalone
F2 (folgas/horários)            ─ standalone
F3 (dashboard staff expediente) ─ depende de F2
F4 (permissões fila)            ─ standalone (depende de F1 só se staff ainda não cadastrado, mas é independente)
F5 (permissões produtos)        ─ standalone
F6 (notificação agendamento)    ─ standalone (mas reutiliza infra de realtime que pode vir da F1)
F7 (análise colaborador)        ─ standalone
```

**Insights de dependência:**
- F1, F2, F4, F5, F6, F7 são **standalones** — podem ir em sprints independentes.
- F3 depende de F2 (precisa de schedule pra mostrar).
- F4-F7 tocam em áreas diferentes do app (fila / produtos / header / insights) — **pouco acoplamento entre si**, dá pra paralelizar com subagentes.

---

## 9. Multi-tenant (regra de ouro, não negociar)

Toda nova tabela escopada aqui:
- coluna `company_id uuid NOT NULL` vinda do `AuthContext` (`useAuth().companyId`).
- RLS policy `USING (company_id = current_setting('app.company_id')::uuid)`.
- FKs (`team_member_id`) sempre dentro do mesmo tenant.
- **Service role** só para geração/validação de token de convite (F1) e para realtime server-side de F6. Nunca em queries de UI.

**Regra crítica de privacy (já estabelecida em `SPEC-dashboard-colaborador-wireflow §7`):** staff **só vê o próprio** (comissão, faturamento, ranking, agenda, vendas). Vazamento entre staff = **P0 segurança**.

---

## 10. Riscos & dívidas conhecidas (de specs DONE)

- **SPEC-dashboard-colaborador-wireflow §7 (DONE)**: privacidade financeira do staff é regra dura. F4, F5, F6, F7 **NÃO podem vazar** faturamento do estabelecimento nem dados de outros colaboradores.
- **SPEC-mobile-first-audit (DONE)**: 7 features são mobile-first; qualquer UI nova passa pelo lens 375px.
- **SPEC-ui-audit (DONE)**: tokens de cor e tipografia (DS v1.1) já em uso; componentes novos herdam o `Card` canônico (`components/ui/Card.tsx`), não criar componente paralelo.
- **SPEC-products-v1-ui (DONE)**: a sessão de produtos já tem UI/UX definida. F5 **estende**, não refaz.

---

## 11. Resumo do discovery (3-4 blocos pro chat)

1. **O que encontrei:** 3 features originais de 19/jul (F1 link convite, F2 folgas/horários, F3 dashboard staff) + 4 novas de 24/jul (F4 fila, F5 produtos, F6 notificação, F7 análise) = 7 features no total. F1 e F4-F7 têm escopo fechado. F2 e F3 têm decisões em aberto. 1 dependência crítica: F3 depende de F2.

2. **O que é proposto:** 1 SPEC unificada em `specs/active/` (esta) com discovery Lion Claw; quando virar sprint, **7 PRDs separados** (cada feature vira sprint independente, exceto F3 que anda junto com F2).

3. **Impacto:** schema novo **só pra F1** (`invite_tokens`) e **F2** (`team_member_schedules`, `team_member_time_off`, `team_member_breaks`). F4-F7 não exigem migration. RLS existente isola por `company_id`. Privacy de staff é o ponto de maior risco (replicar padrão `StaffEarningsCard` em tudo que envolve dado financeiro).

4. **Recomendação imediata (quando virar sprint):** começar por **F1 (link convite)** — escopo pequeno, alto valor de UX pro dono, sem dependência. Depois **F4 + F5 juntas** (mesma natureza: liberar acesso do staff a áreas que ele já existe no schema). F6 com F1 (compartilham realtime infra). F2/F3 juntas (F3 depende de F2). F7 pode ir a qualquer momento (extensão pura de UI).

---

## 12. Próximo passo (quando virar sprint)

1. Promover esta spec de `specs/active/` para cá (a partir daqui). ✅ (já está aqui).
2. Detalhar F1, F2, F3 separadamente (esta é overview; cada uma vira spec de sprint).
3. Detalhar F4, F5, F6, F7 separadamente.
4. **Ordem recomendada de sprints** (validar com Rhian):
   - **Sprint 1:** F1 (link convite) + F4 (permissões fila) — valor alto, escopo médio.
   - **Sprint 2:** F5 (permissões produtos) + F7 (análise colaborador) — escopo médio, pouco acoplamento.
   - **Sprint 3:** F2 (folgas/horários) + F3 (dashboard staff) juntos (F3 depende de F2).
   - **Sprint 4:** F6 (notificação agendamento) — depende de decidir push vs in-app (decidido: in-app).
5. Cada sprint gera: PRD + wireflow + schema + RLS + DoD + gates (typecheck, lint, build, vitest, playwright).

> **Rhian (2026-07-24):** "vamos planejar tudo isso? me faça um discovery estilo Lion Claw." Esta SPEC é o discovery. **Sem prazo.** Quando virar sprint, abro PRDs separados.
