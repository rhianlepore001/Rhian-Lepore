# Clientes / CRM v2 — Context

**Gathered:** 2026-08-04  
**Spec:** `specs/active/clientes-crm-v2/spec.md`  
**Discovery:** `specs/active/SPEC-clientes-crm-discovery-2026-08-04.md`  
**Status:** Ready for design

---

## Feature Boundary

Lista de clientes do gestor com sinais corretos (visitas + última visita + filtros VIP/Novos/Inativo), CRM enxuto por cliente, cadastro sem origem manual + data de aniversário opcional, e colaborador fora do CRM (mantém cliente só na Agenda).

---

## Implementation Decisions

### VIP (decisão CTO — aceite do gestor)

- VIP = **top 10 clientes por gasto lifetime (LTV)**, mesmo ranking do bloco “Melhores clientes” em Insights.
- Só entram clientes com **≥1 visita concluída** e LTV > 0.
- Se a base tiver menos de 10 com gasto, o filtro mostra todos os que têm gasto.
- Visitas sozinhas **não** definem VIP nesta versão (evita limiar arbitrário tipo “≥5”).

### Inativo

- Inativo = **≥1 visita concluída** E última visita há **≥ 35 dias**.
- Cliente com 0 visitas concluídas **não** é “Inativo”; cai em Novos / base geral conforme regra abaixo.

### Novos (filtro da lista)

- Novos = **primeira visita concluída nos últimos 30 dias**, OU cliente cadastrado **sem nenhuma visita concluída**.
- O sistema deriva isso; gestor não classifica manualmente.

### Gasto na UI

- **Lista:** não mostra valor gasto no card.
- **CRM:** mostra total gasto (LTV) nos KPIs.

### Modal “Adicionar cliente”

- **Remover** segmento Origem (Novo / Recente / Antigo) — sistema identifica.
- **Campos:** nome (obrigatório), telefone e/ou e-mail, foto opcional, **data de aniversário opcional**.
- Aniversário alimenta lembrete futuro (ver abaixo).

### Data de aniversário + lembrete

- Campo `birth_date` (DATE, opcional) no cliente — create + edit no CRM.
- **P1 desta feature:** persistir e exibir aniversário na ficha; sinal discreto na lista/CRM quando aniversário é **hoje ou nos próximos 7 dias**.
- **P2 / deferred se pesar:** push/notificação/campanha WhatsApp automática de aniversário — não bloquear o MVP.

### CRM enxuto (cortes aprovados)

- **Manter:** nome/telefone/WhatsApp · chip status · KPIs (última visita, visitas, gasto) · histórico compacto · nota · Novo atendimento · editar/desativar.
- **Remover da UI nesta rodada:** estrelas/rating · “Membro desde 2021” · placeholder picsum · bloco IA semântico fixo · origem no create · predição “próxima visita” como KPI hero · investir em hair_history.

### Colaborador

- **Sem acesso** a `/clientes` e `/clientes/:id` (nav + `OwnerRouteGuard`).
- **Pode cadastrar cliente na Agenda** (nome + telefone; aniversário opcional se couber sem fricção — senão só no modal do gestor).
- **Não vê** nota da ficha CRM nesta fase.

### Lista — card

- Nome · telefone · N visitas · última visita (relativa: “há 12 dias”).
- Chips VIP / Novo / Inativo quando aplicável.
- Indicador leve de aniversário próximo (se houver data).

### Ordenação padrão

- Última visita desc (quem veio há menos tempo no topo); sem visita no fim. Busca por nome/telefone permanece.

---

## Specific References

- Prints atuais: lista com chips Todos/VIP/Novos/Inativo; modal com Origem; CRM com KPIs + notas + IA vazia.
- Alinhar VIP com Insights “Melhores clientes” (`clientInsights.top_clients` por gasto).
- Padrão de privacidade staff: igual Financeiro / Insights (owner-only).

---

## Deferred Ideas

- Memória semântica / AIOS como bloco fixo no CRM.
- Campanha WhatsApp automática de aniversário / reativação em massa.
- Tags livres e segmentos custom.
- RLS endurecido staff (além do UI guard) — preferível na mesma sprint se couber; senão P1 imediato pós-UI.
- Import CSV de clientes.
- Badge Clube (spec própria).
