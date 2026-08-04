# SPEC — Clientes / CRM do gestor (Lion Claw discovery)

**Tarefa:** RASCUNHO · **Data:** 2026-08-04  
**Status:** discovery em andamento (Rhian: melhorar feature de clientes; CRM enxuto; staff sem acesso ao CRM)  
**Branch:** `cursor/discovery-clientes-crm-68c9`  
**Fontes:** `pages/Clients.tsx`, `pages/ClientCRM.tsx`, `services/crm.ts`, `App.tsx`, `components/BottomMobileNav.tsx`, `pages/Reports.tsx` (Melhores clientes), `hooks/useAIOSDiagnostic.ts`, `specs/done/SPEC-dashboard-colaborador-wireflow.md`, prints atuais da UI.

> **Formato Lion Claw:** discovery pergunta-resposta-investigação que força clareza antes de virar sprint. Sem SQL, sem PRD completo. Cada frente tem 4 lentes: (1) pedido literal, (2) estado atual, (3) decisões abertas, (4) impacto provável.  
> **Quando virar sprint:** promover para `SPEC-clientes-crm-sprints.md` com PRD, schema/RLS, wireflow, DoD e gates.

---

## 0. Contexto e veredito CTO

A feature de clientes **funciona como cadastro + ficha**, mas **não entrega o job do gestor**: segmentar quem vale atenção (VIP), quem sumiu (inativo) e agir rápido (ligar / WhatsApp / remarcar).

**Veredito:** sua intuição está correta no essencial. Corrigimos dois pontos:

1. **Lista:** visitas **+ última visita** são o par mínimo. Gasto total é o 3º sinal — útil, mas não precisa poluir todo card; brilha no filtro VIP e no detalhe.
2. **Filtros atuais estão semanticamente errados** (ver §2). VIP ≠ “≥5 visitas”; Inativo ≠ “0 visitas”.

**Colaborador e CRM:** concordo — **CRM completo é domínio do gestor**. Staff precisa de cliente na operação (Agenda / checkout), não de LTV, ranking VIP nem histórico financeiro da casa. Isso alinha com o padrão já usado em Financeiro e Insights (owner-only).

---

## 1. Fluxo do gestor (como deveria pensar)

```text
Operar o dia          → Agenda / Fila / Checkout
Conhecer a base       → Lista Clientes (busca + filtros)
Priorizar atenção     → VIP / Inativos
Agir no indivíduo     → CRM enxuto (contato + sinais + histórico + nota)
Crescer / analisar    → Insights (já tem “Melhores clientes” por gasto)
```

Clientes não compete com Insights: **lista/CRM = ação**; **Insights = leitura agregada**. Os mesmos VIPs podem aparecer nos dois, com a mesma regra.

---

## 2. Feature A — Lista de clientes (gestor)

### 2.1 Pedido literal
> Gestor deve ver todos os clientes, com número de visitas e última vez que veio. Depois filtrar VIPs (atendimentos ou mais gastos — os mesmos dos Insights) e inativos (35 ou 45 dias sem vir).

### 2.2 Estado atual (mapeado)

| Elemento | Hoje | Problema |
|----------|------|----------|
| Lista | Nome, telefone, contagem de visitas, badge VIP | **Falta última visita** no card |
| Filtro VIP | `totalVisits >= 5` | Arbitrary; **não usa gasto**; Insights usa top por gasto |
| Filtro Inativo | `totalVisits === 0` | São **nunca atendidos**, não “sumiram” |
| Filtro Novos | `1–4 visitas` | Confunde com origem “Novo/Recente/Antigo” no cadastro |
| Cadastro | Nome, tel, origem, e-mail, foto | Origem pouco acionável; foto opcional ok |
| Nav staff | `/clientes` aberto p/ staff (sem `OwnerRouteGuard`) | Staff vê CRM + LTV da casa |
| Sync | `syncPublicClientsToCrm` ao abrir lista | Ok; booking público vira cliente |

### 2.3 Decisões abertas (fechar antes do PRD)

- [ ] **D-A1 — Card da lista: o que mostra?**  
  - Recomendação: **nome · telefone · N visitas · última visita (data relativa: “há 12 dias” / “ontem”)**. Gasto só no detalhe ou no chip VIP.
- [ ] **D-A2 — Definição de VIP**  
  - Opções: (1) top N por gasto lifetime; (2) gasto ≥ X; (3) visitas ≥ N; (4) híbrido top gasto **ou** visitas ≥ N; (5) tag manual do gestor.  
  - Recomendação: **alinhar com Insights (top por gasto)** + badge VIP; visitas sozinhas com limiar 5 é fraco demais.
- [ ] **D-A3 — Definição de Inativo**  
  - Recomendação: **≥1 visita concluída E última visita há ≥ 45 dias** (cadência típica de barbearia ~mensal + folga). 35 dias = mais agressivo (mais “em risco”).
- [ ] **D-A4 — O que fazer com “Novos”?**  
  - Recomendação: **Novos = primeira visita nos últimos 30 dias** (ou cadastrados sem visita concluída). Separar de “nunca veio”.
- [ ] **D-A5 — Ordenação padrão da lista**  
  - Recomendação: **última visita desc** (quem veio recentemente no topo) + busca. Alternativa: alfabética (hoje).

### 2.4 Impacto provável
- UI lista + filtros; possível RPC/agregação `last_visit_at` / `total_spent` (hoje visitas são contadas client-side em loop de appointments).
- Unificar regra VIP com bloco “Melhores clientes” de Insights.
- Cadastro: reavaliar campo “Origem do cliente” (candidato a remoção — ver CRM).

---

## 3. Feature B — CRM do cliente (ficha enxuta)

### 3.1 Pedido literal
> No CRM, só o que importa. Visão CTO do que ter / renovar no CRM atual.

### 3.2 Estado atual (mapeado)

**Já existe e é útil**
- Identidade: nome, telefone, e-mail, foto  
- KPIs: última visita, total visitas, total gasto (LTV), “próxima visita” (predição)  
- Histórico de visitas (serviço, data, profissional, preço) + “Repetir serviço”  
- Notas + memória semântica IA  
- Ações: WhatsApp, novo serviço, editar, soft-delete  
- Card AIOS “cliente inativo” (quando entra em `at_risk`)

**Ruído / pouco uso pelo gestor**
- Estrelas de rating (quase sempre vazias)  
- “Membro desde 2021” **hardcoded** (falso)  
- Foto placeholder genérica (picsum) quando sem foto  
- Histórico legado de fotos de corte (`hair_history`)  
- Bloco IA “sem memórias profundas” ocupando viewport  
- Predição “próxima visita” como KPI de destaque (secundário)  
- Densidade de cards grandes no histórico (mobile)  
- Campo origem Novo/Recente/Antigo no create (não alimenta filtros reais)

### 3.3 Proposta CTO — CRM v2 (só o que importa)

**Manter (núcleo)**
1. **Cabeçalho:** nome · telefone · WhatsApp · editar contato  
2. **Status:** chip VIP / Inativo / Novo (mesma regra da lista)  
3. **3 KPIs:** última visita · visitas · total gasto  
4. **Histórico:** lista compacta (últimas N visitas) — serviço, data, profissional, valor · CTA “Repetir”  
5. **Nota curta** do estabelecimento (preferências operacionais: “não gosta de conversa”, “sempre degradê”)  
6. **Ações primárias:** WhatsApp · Novo atendimento · (opcional) Desativar cliente

**Remover ou esconder nesta rodada**
| Item | Ação | Motivo |
|------|------|--------|
| Estrelas / rating | Remover da UI | Gestor não usa; não há fluxo de avaliação |
| “Membro desde 2021” | Remover | Dado falso |
| Placeholder picsum | Remover / iniciais | Polui confiança |
| AI Semantic Insights como bloco fixo | Fora do MVP desta feature | Pós-MVP; atrapalha densidade |
| hair_history visual | Esconder se vazio; não investir | Legado |
| Origem Novo/Recente/Antigo no create | Remover ou virar “importado de outro sistema” só | Confunde com filtros |
| Predição próxima visita | Rebaixar / Insights | Nice-to-have, não núcleo |
| Upload de foto no create | Opcional secundário | Não bloqueia job |

**Adiar (não inventar agora)**
- Timeline de campanhas / mensagens enviadas  
- Tags livres ilimitadas  
- Clube/assinatura badge (já tem spec própria) — só se clube estiver ativo  
- Score de risco com copy de IA no meio da ficha (pode virar botão “Recuperar” no filtro Inativos)

### 3.4 Decisões abertas

- [ ] **D-B1 — Nota: quem edita?** Só gestor, ou profissional no checkout também grava observação? (recomendação: **só gestor na ficha**; observação de atendimento no checkout = fase 2)  
- [ ] **D-B2 — Histórico: quantas visitas?** Últimas 10 + “ver mais”, ou scroll infinito? (recomendação: **10 + ver mais**)  
- [ ] **D-B3 — Total gasto inclui produtos?** Recomendação: **sim** (serviço + produtos vinculados ao cliente) — alinhar com LTV do RPC atual.  
- [ ] **D-B4 — Soft-delete permanece?** Recomendação: **sim**, fora do fluxo principal (menu ⋯).

### 3.5 Impacto provável
- Refator visual/estrutural de `ClientCRM.tsx` (arquivo já denso).  
- Possível reuso de `get_client_profile` com campos já existentes.  
- Menos dependência de AIOS/semantic memory na tela crítica.

---

## 4. Feature C — Colaborador vs CRM

### 4.1 Pedido literal
> Colaborador não deve ter acesso ao CRM dos clientes.

### 4.2 Estado atual
- `/clientes` e `/clientes/:id` **não** usam `OwnerRouteGuard` (`App.tsx`).  
- Bottom nav mobile mostra **Clientes** para staff e owner.  
- Staff já é bloqueado de Financeiro / Insights / Configurações (padrão de privacidade).  
- Staff **precisa** escolher cliente ao criar/editar agendamento (`ClientSelection`).

### 4.3 Recomendação CTO (fechada na intenção; detalhes a confirmar)

| Capacidade | Gestor | Colaborador |
|------------|--------|-------------|
| Lista CRM + filtros VIP/Inativo | Sim | **Não** |
| Ficha CRM (LTV, histórico completo, notas da casa) | Sim | **Não** |
| Buscar cliente por nome/tel na Agenda | Sim | Sim |
| Ver preferência operacional no atendimento? | Sim | Fase 2 (opcional, só nota curta) |
| Criar cliente rápido no fluxo da Agenda | Sim | **Sim** (operacional; evita fricção) |
| Ver gasto / VIP / inativos da casa | Sim | **Não** |

- Nav: remover item Clientes do bottom nav / sidebar para staff.  
- Rotas: `OwnerRouteGuard` em `/clientes` e `/clientes/:id`.  
- Deep link staff → redirect + toast (padrão já usado).

### 4.4 Decisões abertas

- [ ] **D-C1 — Staff pode cadastrar cliente na Agenda?** Recomendação: **sim** (nome+telefone), sem abrir CRM.  
- [ ] **D-C2 — Staff vê nota do cliente no card do agendamento?** Recomendação fase 1: **não**; fase 2: trecho curto se gestor quiser.  
- [ ] **D-C3 — RLS:** só UI guard ou também policy no banco? Recomendação: **UI agora + reforço RLS na sprint** (staff autenticado no mesmo tenant ainda lê `clients` hoje).

---

## 5. Correção à sua impressão (o que está certo / o que ajustar)

| Sua impressão | CTO |
|---------------|-----|
| Essencial = visitas + última visita | **Certo.** É o mínimo da lista. |
| VIP por muitos atendimentos **ou** mais gastos (Insights) | **Certo na intenção.** Prefira **gasto (LTV)** alinhado a Insights; visitas como critério secundário/híbrido. |
| Inativo = 35 ou 45 dias | **Certo.** Hoje o filtro está **errado** (0 visitas). Fechar 35 vs 45. |
| CRM sem coisas desnecessárias | **Certo.** Cortar rating, “membro desde”, IA vazia, origem confusa. |
| Colaborador sem CRM | **Certo.** Manter cliente só na operação (Agenda). |

---

## 6. Escopo sugerido da próxima sprint (após fechar decisões)

**P0 — valor imediato**
1. Lista: mostrar **última visita**; corrigir filtros VIP / Inativo / Novos.  
2. CRM enxuto: cabeçalho + 3 KPIs + histórico compacto + nota + ações.  
3. Staff fora do CRM (nav + `OwnerRouteGuard`).

**P1 — consistência**
4. Mesma definição VIP na lista e em Insights.  
5. Remover origem confusa / rating / membro-desde.  
6. CTA “WhatsApp recuperar” a partir do filtro Inativos (sem card de IA genérico).

**P2 — endurecer**
7. RLS staff sem leitura de LTV/lista CRM.  
8. Agregações server-side (performance com base grande).

---

## 7. Gray areas para fechar nesta conversa

1. **VIP** — top por gasto (Insights) vs visitas vs híbrido vs manual?  
2. **Inativo** — 35 ou 45 dias?  
3. **Novos** — manter filtro? Qual definição?  
4. **Staff** — cadastra cliente na Agenda? Vê nota curta?  
5. **CRM** — concordar com lista de remoções (§3.3)?  
6. **Gasto no card da lista** — sim/não?

---

## 8. Deferred (fora desta feature)

- Memória semântica / IA no CRM (pós-MVP).  
- Campanhas de reativação em massa.  
- Tags livres e segmentos custom.  
- Integração profunda Clube (badge) — spec própria.  
- Import CSV de clientes legados.
