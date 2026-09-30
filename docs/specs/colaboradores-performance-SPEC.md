# Spec — Análise de performance dos colaboradores

| Campo | Valor |
|---|---|
| Produto | AgendiX (`rhianlepore001/Rhian-Lepore`) |
| Status | aguardando implementação |
| Branch alvo sugerida | `feat/colaboradores-performance` |
| Idioma | pt-BR |
| Autor da spec | Bob (orquestração) a partir do pedido do Rhian |
| Data | 2026-09-24 (WEST / Europe/London) |
| Escopo | documentação + plano de implementação; **sem código de feature neste PR** |

## 1. Problema e posicionamento

Hoje a aba **Comissões** em `/financeiro` (`pages/Finance.tsx` → `components/CommissionsManagement.tsx`) mistura **pagamento de comissão** com detalhes analíticos (detalhe por linha, histórico, relatório). O Rhian quer:

1. A aba atual virar **somente "Pagamento de comissão"**: valor a pagar por colaborador/período + status pago/pendente + botão **"Ver histórico e análise"**.
2. Uma página nova de **análise profissional de performance** por colaborador e ranking justo.
3. Métricas que **geram decisão**, não vanity metrics — com análise diferenciada **barbearia vs salão**.

Posicionamento AgendiX: **"o serviço que faz o seu salão crescer"** — a performance do colaborador deve responder: *quanto esta cadeira faz o negócio crescer?*

## 2. Pesquisa de indústria (o que realmente importa)

### 2.1 Famílias de KPI usadas no setor

Fontes setoriais (Zenoti 2026 Beauty and Wellness Benchmark Report; Setora/Phorest; dashboards Phorest/SalonIQ; players BR: AppBarber, Trinks, Barbeiro.app, BarberSoft; internacionais: Fresha, Booksy, Square Appointments, Vagaro; PT: Buk.pt) convergem em cinco famílias:

| Família | Pergunta | Exemplos |
|---|---|---|
| Receita / valor | Está gerando o que deveria? | receita por profissional, ticket médio, mix de serviços, attach de produto |
| Agenda / capacidade | A cadeira está ocupada? | utilização/ocupação, receita por hora, no-show/cancelamento |
| Retenção | O cliente volta? | rebooking, retenção 1ª→2ª visita, frequência |
| Crescimento | De onde vem o amanhã? | novos vs recorrentes, share de clube/membership |
| Pessoas / cadeira | Como cada profissional performa? | ranking normalizado, tip rate (quando existir), request rate |

**Benchmarks citados (só com fonte; não inventar números):**

- Utilização mediana de barbearias ~**56%**, com top performers ~19 pontos acima (Zenoti 2026 Benchmark Report, dados NA).
- Taxa de cancelamento em barbearias ~**4%** (menor vertical no mesmo relatório Zenoti).
- Tip rate 16–20% do ticket (Zenoti; **não aplicável ao BR hoje** — AgendiX não modela tips).
- Rebooking médio de salão citado como ~55%, fortes >70% (Phorest via Setora — tratar como **direcional**, não meta BR).
- Retail attach “saudável” em barbershop citado em faixas 8–12% (PulseRevOps / Booksy framing — **direcional**, verificar localmente).

### 2.2 Barbearia vs salão (diferenças que a UI deve respeitar)

| Dimensão | Barbearia | Salão de beleza |
|---|---|---|
| Duração | curta, alta frequência | longa, multi-etapa (química, coloração) |
| Walk-in / fila | comum; cadeira ociosa dói | menos walk-in; agenda previsível |
| Ticket | menor, volume | maior, menos atendimentos/dia |
| Produto | pomada/shampoo (attach menor) | retail forte (attach crítico) |
| Remuneração BR | comissão % e **aluguel de cadeira** frequentes | Lei do Salão Parceiro (13.352/2016) + comissão; aluguel também |
| Métrica-âncora | ocupação + ticket + rebooking | ticket + mix químico/retail + retenção |

### 2.3 Modelos de remuneração (impacto direto na métrica “retorno ao dono”)

| Modelo | Como funciona | O que “retorno ao dono” significa |
|---|---|---|
| Comissão % serviço | `team_members.commission_rate` / `commission_percent` | `receita − comissão − custo produto atribuível` |
| Comissão produto | `products.commission_percent` / `product_sales.commission_*` | margem produto − comissão produto |
| Tiered / meta | **não existe hoje no schema** | v2 |
| Aluguel de cadeira / booth rent | profissional paga valor fixo; autonomia alta (Trinks blog; Grace’s; Lei 12.592/13.352) | **não é** `receita − comissão`; é `aluguel cobrado − custos da cadeira`; receita do profissional não é do salão |
| Salário + comissão | **não modelado** | v2 |

**Decisão de produto (recomendada):** MVP assume modelo **comissão** já existente; aluguel de cadeira entra como **modo de métrica** (flag por colaborador) em v2 com fórmula distinta — ver decisões abertas.

### 2.4 Como concorrentes apresentam

- **AppBarber / BarberSoft / Barbeiro.app / Trinks**: comissões + faturamento por profissional + ocupação; foco operacional BR.
- **Fresha**: performance por staff, chair rental support, insights de retenção.
- **Buk.pt**: políticas de antecedência (8h/16h/24h) + sinal/pré-pagamento Stripe — relevante para *proteger a cadeira*, não para analytics de staff.
- **Square Appointments**: forte em transação, fraco em retenção/rebooking (relato House of Shaves via Zenoti).

**Diferenciação AgendiX:** narrativa **"recupera a cadeira / faz o salão crescer"** + retorno líquido ao dono + ranking **normalizado por hora** + WhatsApp/Pix nativos BR (contexto de produto, não desta feature).

## 3. Inventário do repo / schema (grounding real)

Verificado em `main` (pull 2026-09-24) + Supabase projeto `lcqwrngscsziysyfhpfj` (READ-ONLY).

### 3.1 UI / código atual de comissões

| Arquivo | Papel |
|---|---|
| `pages/Finance.tsx` | Aba `commissions` label **"Comissões"** (só owner); staff sem aba |
| `components/CommissionsManagement.tsx` | RPC `get_commissions_due`; tabs pending/paid; pagar via `mark_commissions_as_paid`; modais detalhe/histórico/relatório |
| `components/ProfessionalCommissionDetails.tsx` | Linhas serviço+produto; editar taxa; CSV |
| `components/CommissionPaymentHistory.tsx` | Histórico por `finance_records.commission_paid_at` |
| `components/CommissionDetailReport.tsx` | Relatório detalhado |
| `pages/settings/CommissionsSettings.tsx` | deprecated → `/configuracoes/equipe` |
| `services/finance.ts` | `calcCommission`, `fetchFinanceStats`, `markExpenseAsPaid` |
| `pages/StaffInsights.tsx` + `services/staffInsights.ts` | Insights **do próprio** colaborador (`/meus-insights`) — base a reutilizar, não confundir com análise do dono |
| `services/occupancy.ts` | Ocupação do **estabelecimento** (não per-pro) via `business_hours` × profissionais ativos × `duration_minutes` |
| `services/cancellationRate.ts` | Taxas cancel/no-show no nível empresa |

### 3.2 Tabelas e colunas relevantes (confirmadas)

**`appointments`:** `id`, `user_id`, `client_id`, `service` (texto), `appointment_time`, `status` (valores reais em prod: `Confirmed`, `Completed`, `Cancelled`, `Pending`, `NoShow`), `price`, `professional_id`, `duration_minutes`, `payment_method`, `total_price`, `completed_at`, `completed_by`, `origin`, `machine_fee_*`, `public_booking_id`.  
**Não existe:** `started_at` / `finished_at` reais → chair time real ≠ duração agendada.

**`team_members`:** `commission_rate`, `commission_percent`, `commission_payment_frequency`, `commission_payment_day`, `is_owner`, `active`, `staff_user_id`, `cpf`.  
**Não existe:** `compensation_model` (`commission` \| `chair_rental`), `chair_rent_amount`, horários individuais.

**`finance_records`:** `revenue`, `commission_rate`, `commission_value`, `commission_base`, `commission_paid`, `commission_paid_at`, `professional_id`, `appointment_id`, `type`, `status`, `payment_method`, `machine_fee_amount`.

**`commission_payments`:** `professional_id`, `start_date`, `end_date`, `gross_amount`, `fee_deducted`, `net_amount`, `commission_percent`, `status` (`pending` default), `paid_at`, `paid_by`.

**`product_sales`:** `professional_id`, `sold_by`, `quantity`, `unit_sale_price`, `unit_cost_price`, `total_revenue`, `total_cost`, `commission_percent`, `commission_value`, `appointment_id`, `client_id`.

**`clients`:** `last_visit`, `total_visits`, `source`.

**`client_memberships` / `membership_plans`:** clube; redemptions via `payment_method = 'membership'` em appointments/finance (preço pode ser 0 no checkout).

**`business_settings`:** `business_hours` (jsonb), `commission_settlement_day_of_month`, `machine_fee_*`. Sem grade por profissional.

**`queue_entries`:** `serving_at`, `closed_at`, `professional_id`, `duration_minutes` — útil como proxy de tempo real **só para origem fila**.

**`notifications`:** `user_id`, `title`, `message`, `type`, `read` — canal in-app existente (hoje ligado ao dono/`user_id` empresa; staff notifications exigem desenho cuidadoso).

### 3.3 RPCs existentes a preservar (additive-only)

`get_commissions_due`, `mark_commissions_as_paid`, `get_professional_commission_details`, `get_professional_finance_summary`, `get_finance_stats`, `recalculate_pending_commissions`, `update_commission_record`.  
**Regra:** não reescrever in-place; criar `*_v2` ou params opcionais.

### 3.4 Computável hoje vs gaps de schema

| Métrica | Computável hoje? | Fonte | Gap |
|---|---|---|---|
| Comissão a pagar / paga | Sim | `get_commissions_due`, `commission_payments`, `finance_records.commission_paid` | — |
| Receita gerada (serviços Completed) | Sim | `appointments.price` + `professional_id` | exclusões: membership R$0, descontos |
| Comissão gerada | Sim | `finance_records.commission_value` | — |
| Custo produto atribuível | Sim | `product_sales.total_cost` | só se venda registrada |
| Retorno líquido ao dono (comissão) | Sim (aprox.) | receita − comissão − custo produto | sem overhead (aluguel loja, luz) |
| Ticket médio | Sim | Σ price / # Completed | — |
| Tempo de cadeira **agendado** | Sim (proxy) | `SUM(duration_minutes)` Completed (+ Confirmed no período) | ≠ tempo real |
| Tempo de cadeira **real** | Não | — | precisa `started_at`/`served_at` additive |
| Ocupação por profissional | Parcial | `duration` / (horas loja) | sem horário individual → super/subestima |
| No-show / cancel por pro | Sim | `status IN ('NoShow','Cancelled')` | `types/scheduling.ts` ainda omite `NoShow` (só UI Agenda) |
| Rebooking | Parcial | próximo `appointments` do mesmo `client_id` ±24–48h após Completed | definir janela; sem flag `rebooked_at_checkout` |
| Retail attach | Sim | visitas com `product_sales` / visitas Completed | — |
| Ranking por receita | Sim | agregação | **injusto** sem normalização/hora |
| Aluguel de cadeira | Não | — | modelo + tabela/colunas |
| Tips | Não | — | descartada no BR MVP |

## 4. Catálogo curado de métricas

Legenda prioridade: **MVP** | **v2** | **descartada**.

### 4.1 MVP

#### M1 — Valor de comissão a pagar
- **Responde:** Quanto preciso repassar a este colaborador neste ciclo?
- **Fórmula:** `SUM(finance_records.commission_value)` onde `commission_paid = false` + produtos pendentes no período do settlement (`business_settings.commission_settlement_day_of_month` / `team_members.commission_payment_*`). Preferir RPC existente `get_commissions_due`.
- **Fonte:** `finance_records`, `product_sales`, `commission_payments`
- **Segmento:** ambos
- **Decisão:** pagar agora / marcar pago / ajustar taxa
- **Caveats:** dono (`is_owner`) fora da fila; membership R$0 gera comissão 0

#### M2 — Status do pagamento (pago / pendente)
- **Responde:** Já liquidei este ciclo?
- **Fórmula:** pendente se `total_due > 0`; pago se existe `commission_payments` com `status='paid'`/`paid_at` no período (já há tab paid em `CommissionsManagement`)
- **Fonte:** `commission_payments.status`, `finance_records.commission_paid`
- **Segmento:** ambos
- **Decisão:** acerto financeiro
- **Caveats:** pagamentos parciais — UI atual permite valor custom; manter

#### M3 — Retorno líquido ao dono (contribuição)
- **Responde:** Quanto este colaborador deixou de lucro direto para o estabelecimento além da comissão?
- **Fórmula (modelo comissão):**  
  `owner_return = service_revenue + product_revenue − service_commission − product_commission − product_cost`  
  onde:
  - `service_revenue` = Σ `appointments.price` com `status='Completed'` e `professional_id=X` no período (excluir `payment_method='membership'` **ou** price=0 — ver decisão aberta)
  - `service_commission` = Σ `finance_records.commission_value` ligados a esses appointments
  - `product_revenue` / `product_commission` / `product_cost` = Σ de `product_sales` do profissional
- **Fórmula (aluguel de cadeira — v2):** `owner_return = chair_rent_collected − direct_chair_costs` (receita do profissional **não** entra)
- **Fonte:** `appointments`, `finance_records`, `product_sales`
- **Segmento:** ambos (crítica)
- **Decisão:** manter, treinar, renegociar %, ou migrar modelo
- **Caveats:** sem rateio de custo fixo; multi-profissional no mesmo serviço hoje é 1 `professional_id`; descontos manuais no `price`; fila settled vira appointment Completed

#### M4 — Tempo de cadeira (agendado) + produtividade R$/hora
- **Responde:** Quanto tempo a cadeira ficou “vendida” e qual a produtividade?
- **Fórmula:**  
  `chair_minutes = SUM(duration_minutes)` em Completed no período  
  `revenue_per_hour = service_revenue / (chair_minutes/60)` (0 se minutos=0)
- **Fonte:** `appointments.duration_minutes`, `appointments.price`
- **Segmento:** ambos (barbearia: volume; salão: cuidado com serviços longos)
- **Decisão:** comparar produtividade, não só faturamento bruto
- **Caveats:** proxy; gaps entre serviços não contam; v2 com timestamps reais

#### M5 — Ticket médio
- **Responde:** O profissional sobe o valor por visita (consulta/add-on)?
- **Fórmula:** `AVG(appointments.price)` Completed no período (opcional: incluir product attach na visita)
- **Fonte:** `appointments.price`; opcional join `product_sales.appointment_id`
- **Segmento:** ambos (salão: mais sensível)
- **Decisão:** coaching de consulta / upsell
- **Caveats:** mix de clientes e turnos distorce; comparar vs própria média histórica

#### M6 — Taxa de no-show e cancelamento (por profissional)
- **Responde:** Esta agenda está “furando” e liberando (ou não) a cadeira?
- **Fórmula:**  
  `no_show_rate = NoShow / (Completed+NoShow+Cancelled+Confirmed past)`  
  `cancel_rate = Cancelled / mesmo denominador`  
  (alinhar a `services/cancellationRate.ts`)
- **Fonte:** `appointments.status`
- **Segmento:** ambos (barbearia: impacto walk-in)
- **Decisão:** reforçar confirmação, depósito, antecedência mínima
- **Caveats:** muitas causas fora do controle do profissional (Setora); usar para processo, não punição cega

#### M7 — Attach de produto (retail)
- **Responde:** O profissional recomenda produto?
- **Fórmula:** `% visitas Completed com ≥1 product_sales` e `Σ product_revenue`
- **Fonte:** `product_sales` × `appointments`
- **Segmento:** salão = alta; barbearia = média
- **Decisão:** treino de vitrine/script
- **Caveats:** estoque/zero produto ativo → empty state honesto

#### M8 — Ranking justo (normalizado)
- **Responde:** Quem performa melhor **por hora trabalhada**, não só quem ficou mais tempo na cadeira?
- **Fórmula de score MVP (componente transparente):**  
  `score = 0.45 * norm(owner_return_per_hour) + 0.25 * norm(ticket) + 0.20 * norm(rebooking_rate) + 0.10 * norm(1 - no_show_rate)`  
  onde `norm` = min-max no período entre profissionais ativos com ≥ N atendimentos (N default 8).
- **Fonte:** métricas M3–M7 + M9
- **Segmento:** ambos
- **Decisão:** reconhecimento privado + coaching; **não** mural público (ver Setora / Goodhart)
- **Caveats:** sample size; profissionais part-time; owner opcionalmente fora do ranking

#### M9 — Taxa de rebooking (definição operacional)
- **Responde:** O cliente saiu com o próximo horário marcado / voltou rápido?
- **Fórmula MVP:** % de Completed cujo mesmo `client_id` tem outro appointment (`Pending`/`Confirmed`/`Completed`) com `appointment_time` em (completed_at, completed_at + 45 dias] **e** criado até 48h após o Completed (aproximação de “rebookou perto do atendimento”).
- **Fonte:** `appointments.client_id`, `created_at`, `completed_at`
- **Segmento:** ambos (barbearia frequência 2–5 semanas — Zenoti)
- **Decisão:** hábito de remarcar na saída; CTA “Agendar próximo” (overhaul de booking)
- **Caveats:** definição imperfecta sem flag de checkout; documentar no UI como “reagendou em até 48h”

### 4.2 v2

| ID | Nome | Motivo v2 |
|---|---|---|
| V1 | Tempo de cadeira real | precisa `appointments.started_at` / `served_at` additive (+ fila já tem `serving_at`) |
| V2 | Ocupação por profissional com grade própria | tabela `staff_availability` ou horas em `team_members` |
| V3 | Retenção 1ª→2ª visita / 90 dias | cohort; útil mas mais pesado |
| V4 | Request rate (% clientes que pedem o profissional) | precisa preferência explícita no booking |
| V5 | Mix de serviços / share químico | taxonomia de categoria (`service_categories`) + tags |
| V6 | Modelo aluguel de cadeira | `compensation_model` + `chair_rent_amount` + lançamentos |
| V7 | Comissão escalonada / meta | regras |
| V8 | Share de receita de clube atribuída | atribuição ambígua |
| V9 | Materialized view / snapshot diário | performance em tenants grandes |

### 4.3 Métricas descartadas e por quê

| Métrica | Por quê descartar |
|---|---|
| Receita bruta total como ranking principal | Favorece quem tem mais horas/turno; vanity sem normalização (Setora) |
| Tip rate | Sem modelo de gorjeta no AgendiX BR |
| Nº absoluto de cortes/dia sem contexto | Volume ≠ lucro; distorce part-time |
| Leaderboard público na parede/chat | Demotiva meio, mata mentoria, facilita poaching (Setora; lições Microsoft/GE) |
| “Engajamento” / likes / scores subjetivos | Sem dado; vanity |
| Comparar % comissão entre colegas na UI do staff | Vazamento financeiro; proibido |
| NPS/pesquisa satisfação | Sem coleta hoje |
| Meta genérica de “100% ocupação” | Irreal; Zenoti mediana 56% |

## 5. UX

### 5.1 Tela simplificada — Pagamento de comissão

**Rota:** continua em `/financeiro` aba `commissions` (renomear label para **"Pagamento de comissão"**).

**Conteúdo (owner/manager):**
1. Seletor de período do ciclo (já existe via settlement day) + label do intervalo.
2. Lista de colaboradores (exceto `is_owner`): avatar, nome, **valor a pagar**, badge **Pendente/Pago**, mini breakdown serviços/produtos (opcional 1 linha).
3. CTA primário: **Pagar** (fluxo atual do modal).
4. CTA secundário por card: **"Ver histórico e análise"** → navega para `/financeiro/performance?professionalId=…&from=…&to=…`.
5. Tab **Pagos** permanece (histórico de `commission_payments`).
6. Remover da tela principal (ou rebaixar): modais densos de análise — migrar para a página de performance. Manter caminho mínimo para editar % (settings equipe) sem poluir pagamento.

**Estados:** loading skeleton; empty “Nenhuma comissão pendente neste ciclo”; erro com retry; staff **não vê** a aba (já é assim).

### 5.2 Página — Análise de performance

**Rota nova:** `/financeiro/performance` (owner only via `OwnerRouteGuard`).

**Layout desktop (1280):**
- Header: título “Performance dos colaboradores” + filtro período (mês / ciclo / custom) + seletor colaborador (Todos | individual).
- **Overview cards (4):** Retorno ao dono (M3), R$/hora (M4), Ticket médio (M5), Rebooking (M9).
- **Ranking** (quando “Todos”): tabela com score normalizado + métricas-chave; ordenação default por `owner_return_per_hour`; tooltip explicando normalização; aviso “comparar cada um consigo mesmo”.
- **Detalhe colaborador:** sparkline 3–6 meses (retorno, ticket); mix serviços top 5; attach produto; no-show/cancel; tabela histórico (appointments Completed + product_sales) paginada.
- Link de volta: “Pagamento de comissão”.

**Mobile (390×844):** cards empilhados; ranking em lista compacta; charts com altura controlada; filtros em bottom sheet.

**Empty / loading / error:** empty com ilustração sóbria (Impeccable — sem stock AI-slop); skeleton; erro + retry.

### 5.3 Roles e privacidade

| Papel | Vê pagamento comissão | Vê performance de todos | Vê só a própria |
|---|---|---|---|
| Owner/manager | Sim | Sim | — |
| Collaborator (staff) | Não (já bloqueado) | **Nunca** earnings de outros | **Recomendação:** sim, em `/meus-insights` (estender StaffInsights com M4/M5/M9 **sem** owner_return nem ranking de colegas) |

**Regra dura:** nenhum colaborador vê earnings/comissões/retorno de outros.

**Decisão para Rhian (flagada):** expor self-performance ao staff? Default recomendado: **sim, só métricas operacionais próprias**.

## 6. Plano de implementação (pacotes sem overlap)

Branch feature sugerida: `feat/colaboradores-performance` a partir de `main`.  
Migrations: **apenas additive** (colunas/tabelas/RLS/`_v2` RPCs).  
Gates: validator ≥9 + code review separado + Package G regression.

### Pacote P0 — Rename + CTA (UI payment only)
**OWN:** `pages/Finance.tsx` (label aba), `components/CommissionsManagement.tsx` (simplificar header/CTAs; botão “Ver histórico e análise”), rotas em `App.tsx` (link).  
**NÃO TOCAR:** formulas RPC, StaffInsights, Agenda.  
**Acceptance:** aba chama-se Pagamento de comissão; lista só valor+status+pagar; CTA navega com query params; Playwright 390 e 1280.

### Pacote P1 — RPC de agregação + tipos
**OWN:** `supabase/migrations/YYYYMMDD_staff_performance_rpc.sql` (nova `get_staff_performance_v1`), `types/insights.ts` ou `types/staffPerformance.ts` (CREATE), `services/staffPerformance.ts` (CREATE), testes unitários `test/services/staffPerformance.test.ts`.  
**RPC:** `SECURITY INVOKER` preferível; se DEFINER, checar `get_auth_company_id()` e role owner; **REVOKE anon**; GRANT authenticated.  
**NÃO TOCAR:** `get_commissions_due` body.  
**Acceptance:** fixtures cobrem M3–M9; membership R$0; product cost; professional sem dados → zeros; RLS tenant isolation test.

### Pacote P2 — Página performance UI
**OWN:** `pages/StaffPerformance.tsx` (CREATE), componentes em `components/performance/` (CREATE), wire `App.tsx` rota + `OwnerRouteGuard`, hook `hooks/useStaffPerformance.ts` (CREATE).  
**NÃO TOCAR:** CommissionsManagement além do que P0 já fez.  
**Acceptance:** filtros, cards, ranking normalizado, detalhe, empty/error; Impeccable + screenshots 390/1280.

### Pacote P3 — Extensão StaffInsights (opcional, após decisão Rhian)
**OWN:** `pages/StaffInsights.tsx`, `services/staffInsights.ts`, `hooks/useStaffInsights.ts`.  
**Acceptance:** staff vê só próprios M4/M5/M6/M9; zero vazamento.

### Pacote P4 — Schema additive chair-time real (v2 track)
**OWN:** migration `appointments.started_at timestamptz NULL`, opcional `served_minutes`; updates mínimos em Agenda/Queue checkout **somente** para preencher; RPC `_v2`.  
Só após MVP estável.

### Pacote G — Regression guard
**OWN:** `REGRESSION_GUARD.md` read-only. Escopo: Financeiro, Agenda, Comissões existentes, Clube, Stripe subscription, RLS finance RPCs, StaffInsights. GO/NO-GO.

## 7. Critérios do validator (score ≥9)

1. Métricas MVP têm fórmula + fonte de coluna explícitas.
2. Nenhuma vanity no ranking default.
3. Pagamento separado de análise.
4. Staff nunca vê earnings alheios.
5. Migration additive-only; sem drop/rewrite RPC.
6. Testes unitários das fórmulas + smoke Playwright.
7. Screenshots mobile/desktop no relatório final.
8. Copy pt-BR na voz do produto.
9. Performance: agregação server-side (RPC), não N+1 no client.
10. Regression guard GO.

## 8. Plano de testes

| Tipo | O quê |
|---|---|
| Unit | Fixtures: 2 pros, 10 appointments, memberships, product_sales, NoShow; assert M3–M9 |
| RLS | staff não executa `get_staff_performance_v1` para outro tenant/pro; anon sem EXECUTE |
| E2E Playwright | owner: pagar comissão; abrir performance; filtrar; staff: 403/redirect |
| Visual | 390×844 e 1280 light/dark barbearia+beleza; critique Impeccable |
| Regression | Finance overview, mark paid, Agenda NoShow, Clube redemption |

## 9. Decisões abertas (máx. 5) + default recomendado

1. **Staff vê própria performance?** → **Sim**, só operacionais em `/meus-insights` (sem retorno ao dono nem ranking).
2. **Membership R$0 no retorno ao dono?** → **Excluir da receita** e marcar card “atendimentos clube: N” separado.
3. **Aluguel de cadeira no MVP?** → **Não**; v2 com `compensation_model`. No MVP, copy explica que a métrica assume comissão.
4. **N mínimo para entrar no ranking?** → **8** atendimentos Completed no período; abaixo disso badge “amostra baixa”.
5. **Rebooking janela** → **48h para criação + 45 dias para o próximo horário**; documentar no tooltip.

## 10. Referências

1. Zenoti — *Salon & Barbershop Metrics Guide* / 2026 Beauty and Wellness Benchmark Report — https://www.zenoti.com/thecheckin/salon-and-barbershop-metrics-guide  
2. Setora — *Barber Performance Metrics* — https://www.setora.co.uk/blog/barber-team-performance-metrics  
3. Phorest — Professional Salon Concepts dashboard (rebooking defs) — support.phorest.com  
4. SalonIQ FAQ — utilisation, care factor, rebooking — faq.saloniq.com  
5. AppBarber funcionalidades — https://appbarber.com.br/funcionalidades/  
6. Barbeiro.app relatórios — https://www.barbeiro.app/funcionalidades/relatorios  
7. Trinks barbearias + blog aluguel vs comissão — https://negocios.trinks.com/negocios/barbearias/ ; https://blog.trinks.com/aluguel-cadeira-barbearia-comissao/  
8. Fresha for barbers — https://www.fresha.com/for-business/barber  
9. Buk.pt — antecedência e pré-pagamento — https://buk.pt/pagina-marcacoes ; https://ajuda.buk.pt/article/1067-como-definir-a-antecipacao-minima-para-marcacoes  
10. Lei 12.592/2012 e 13.352/2016 (Salão Parceiro) — planalto.gov.br  
11. Grace’s — aluguel vs parceria — https://graces.com.br/blog/lei-do-salao-parceiro-ou-aluguel-de-cadeira-como-escolher-sem-perder-o-controle-do-salao/  

## 11. Self-review da spec

| Critério | Nota | Nota |
|---|---|---|
| Clareza | 9 | Problema, UX e pacotes separados |
| Implementabilidade | 9 | Arquivos, RPCs, acceptance e testes |
| Grounding schema | 9 | Colunas confirmadas via Supabase READ-ONLY |
| Anti-vanity | 9 | Descarte explícito + ranking normalizado |

**Score composto: 9/10.** Pendência residual: definição exata de rebooking é aproximação até existir flag de checkout (aceito e documentado).
