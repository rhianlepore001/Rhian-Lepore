# Clientes / CRM v2 — Specification

## Problem Statement

A lista de clientes e o CRM estão funcionais, mas os filtros mentem (VIP por “≥5 visitas”, Inativo = “0 visitas”), falta última visita na lista, a ficha tem ruído que o gestor não usa, o cadastro pede origem manual inútil, e o colaborador acessa LTV/CRM da casa. O gestor precisa priorizar quem vale atenção e quem sumiu — com uma ficha enxuta e dados corretos.

## Goals

- [ ] Gestor vê todos os clientes com **visitas + última visita** e filtra VIP / Novos / Inativo com regras corretas
- [ ] CRM mostra só sinais acionáveis (contato, KPIs, histórico, nota) — sem ruído
- [ ] Cadastro sem origem manual; **aniversário opcional** para lembrete
- [ ] Colaborador **fora do CRM**; mantém criar/buscar cliente na Agenda

## Out of Scope

| Feature | Reason |
|---------|--------|
| Campanha WhatsApp automática de aniversário | P2 — precisa canal/copy/opt-in |
| Memória semântica / bloco IA no CRM | Pós-MVP; atrapalha densidade |
| Tags livres / segmentos custom | Fora do job atual |
| Import CSV | Feature à parte |
| Badge Clube no CRM | Spec própria do clube |

---

## User Stories

### P1: Lista com sinais corretos ⭐ MVP

**User Story:** Como gestor, quero ver visitas e última visita de cada cliente e filtrar VIP/Novos/Inativo de forma confiável, para saber em quem agir.

**Acceptance Criteria:**

1. WHEN a lista carrega THEN o sistema SHALL exibir para cada cliente: nome, telefone (se houver), total de visitas concluídas e data da última visita (relativa ou absoluta).
2. WHEN o filtro VIP está ativo THEN o sistema SHALL listar apenas o top 10 por LTV (gasto lifetime), com ≥1 visita concluída e LTV > 0 (mesmo ranking dos Melhores clientes em Insights).
3. WHEN o filtro Inativo está ativo THEN o sistema SHALL listar apenas clientes com ≥1 visita concluída cuja última visita foi há ≥ 35 dias.
4. WHEN o filtro Novos está ativo THEN o sistema SHALL listar clientes com primeira visita concluída nos últimos 30 dias OU sem nenhuma visita concluída.
5. WHEN o gestor busca por nome ou telefone THEN a lista SHALL filtrar independentemente do chip ativo.
6. WHEN o card da lista é renderizado THEN o sistema SHALL NOT exibir valor de gasto total.

**IDs:** `CRM-01` … `CRM-06`

---

### P1: CRM enxuto ⭐ MVP

**User Story:** Como gestor, quero abrir a ficha de um cliente e ver só o essencial para decidir o próximo contato ou atendimento.

**Acceptance Criteria:**

1. WHEN o gestor abre `/clientes/:id` THEN a ficha SHALL mostrar: nome, telefone, WhatsApp, chip de status (VIP/Novo/Inativo quando aplicável), KPIs (última visita, total visitas, total gasto), histórico compacto, nota editável, ações (Novo atendimento, editar, desativar).
2. WHEN a ficha renderiza THEN a UI SHALL NOT mostrar: estrelas/rating, “Membro desde 2021”, placeholder picsum, bloco de IA semântica vazio, KPI hero de “próxima visita” predita.
3. WHEN o histórico tem visitas THEN o sistema SHALL listar as últimas 10 (serviço, data, profissional, valor) com opção de ver mais e CTA repetir serviço.
4. WHEN o gestor salva a nota THEN o sistema SHALL persistir em `clients.notes` filtrando por tenant da sessão.

**IDs:** `CRM-10` … `CRM-13`

---

### P1: Cadastro sem origem + aniversário ⭐ MVP

**User Story:** Como gestor, quero cadastrar cliente com contato e aniversário opcional, sem classificar “novo/recente/antigo” na mão.

**Acceptance Criteria:**

1. WHEN o modal “Novo cliente” abre THEN a UI SHALL NOT exibir o controle Origem (Novo/Recente/Antigo).
2. WHEN o gestor preenche nome + (telefone ou e-mail) e confirma THEN o sistema SHALL criar o cliente no tenant da sessão.
3. WHEN o gestor informa data de aniversário THEN o sistema SHALL persistir `birth_date` (DATE, opcional).
4. WHEN aniversário é omitido THEN o cadastro SHALL concluir normalmente.
5. WHEN o gestor edita o cliente no CRM THEN poderá alterar a data de aniversário.
6. WHEN `birth_date` cai hoje ou nos próximos 7 dias THEN lista e/ou ficha SHALL mostrar indicador discreto de aniversário próximo.

**IDs:** `CRM-20` … `CRM-25`

---

### P1: Staff fora do CRM ⭐ MVP

**User Story:** Como dono, quero que o colaborador não acesse o CRM da casa, mas ainda consiga operar a Agenda com clientes.

**Acceptance Criteria:**

1. WHEN `role === 'staff'` THEN rotas `/clientes` e `/clientes/:id` SHALL redirecionar (OwnerRouteGuard) com feedback.
2. WHEN staff usa a nav mobile/sidebar THEN o item Clientes SHALL NOT aparecer.
3. WHEN staff cria agendamento THEN poderá buscar cliente existente e **cadastrar cliente rápido** (nome + telefone) sem abrir o CRM.
4. WHEN staff está na Agenda THEN SHALL NOT ver LTV, filtros VIP/Inativo nem nota da ficha CRM.

**IDs:** `CRM-30` … `CRM-33`

---

### P2: Lembrete de aniversário (base)

**User Story:** Como gestor, quero ser avisado de aniversários próximos para mandar mensagem.

**Acceptance Criteria:**

1. WHEN existem clientes com aniversário nos próximos 7 dias THEN o gestor SHALL conseguir vê-los (indicador na lista e/ou atalho).
2. Campanha automática WhatsApp / push fica **fora** deste P2 mínimo (Deferred).

**IDs:** `CRM-40`

---

## Traceability

| ID | Story | Priority |
|----|-------|----------|
| CRM-01…06 | Lista | P1 |
| CRM-10…13 | CRM enxuto | P1 |
| CRM-20…25 | Cadastro + aniversário | P1 |
| CRM-30…33 | Staff | P1 |
| CRM-40 | Lembrete aniversário UI | P2 |

## Success Metrics

- Gestor identifica inativo real (≥35d) sem contar cards à mão
- VIP da lista = mesmos nomes que top gasto em Insights (top 10)
- Staff não alcança LTV/CRM via nav ou URL
- Cadastro ≤ campos essenciais; origem manual zerada

## Open Tech Notes (Design)

- Coluna `clients.birth_date` ainda **não existe** (só `team_members.birth_date`) — migration necessária.
- Agregar `last_visit_at` / LTV na lista (hoje visitas contadas client-side).
- Unificar regra VIP com query/serviço usado em Insights `top_clients`.
