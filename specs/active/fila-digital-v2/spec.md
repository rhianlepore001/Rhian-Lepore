# Fila Digital v2 — Specification

**Status:** draft (aguardando decisões de produto)
**Criado:** 2026-09-06
**Prioridade:** alta
**Branch:** `cursor/fila-digital-v2-2dde`

---

## Problem Statement

A fila digital atual é um fluxo paralelo (`/#/queue/:slug` + `/#/queue-status/:id` + `/#/fila`) desconectado da área do cliente e do clube. Casas que não trabalham por horário — e salões com recepcionista — precisam de walk-in profissional: QR na bancada, entrada manual para quem não usa celular, posição visível, e fechamento de comanda que vira financeiro (com produtos, serviços e assinatura).

O cliente já cadastrado no agendamento público precisa ser o mesmo na fila. Se tiver assinatura ativa, o uso do clube entra no fechamento.

## Goals

- [ ] Casa walk-in opera o dia só com fila (QR + entrada manual), sem depender de agenda
- [ ] Gestor escolhe fila compartilhada (QR geral) ou fila por colaborador (QR na bancada)
- [ ] Cliente entra, escolhe serviço e vê posição/quem está na fila — só depois de check-in no QR da casa
- [ ] Identidade do cliente é a da área pública (telefone); assinatura ativa aplica no fechamento
- [ ] Fechar comanda libera a cadeira; confirmar/editar pagamento registra no financeiro com UX clara

## Out of Scope

| Feature | Reason |
|---------|--------|
| GPS / geofence | Presença é o scan do QR, não localização |
| WhatsApp / SMS de “sua vez” | Pode ser P3 depois; não bloqueia o walk-in |
| Fila híbrida com horário marcado (encaixe na agenda) | Primeiro nicho é quem não agenda |
| Novo papel “recepcionista” | Staff/dono adicionam manualmente; papel novo é outra feature |
| Débito automático / Pix na fila | Fechamento segue o financeiro atual (confirmar pagamento) |
| TV / painel de senha na parede | Fora deste redesign |

---

## User Stories

### P1: Check-in pelo QR (geral ou da bancada) ⭐ MVP

**User Story**: Como cliente na casa, quero escanear o QR da bancada (ou do balcão) e entrar na fila escolhendo o serviço, para não ficar em pé sem saber a vez.

**Why P1**: Sem isso a fila não existe para o nicho walk-in.

**Acceptance Criteria**:

1. WHEN o gestor configura **QR geral** THEN o sistema SHALL gerar um QR único do estabelecimento cuja entrada vai para a fila compartilhada (qualquer colaborador atende o próximo)
2. WHEN o gestor configura **QR por colaborador** THEN o sistema SHALL gerar um QR por profissional ativo; a entrada fica na fila daquele profissional
3. WHEN o cliente escaneia um QR válido THEN o sistema SHALL abrir a área do cliente (`/#/minha-area/:slug`) na sessão Fila, com check-in de presença ativo
4. WHEN a sessão Fila está bloqueada (sem check-in) THEN o sistema SHALL mostrar que a fila só libera no QR da casa — e SHALL recusar entrar na fila
5. WHEN o cliente faz check-in THEN o sistema SHALL oferecer seleção de serviço no mesmo padrão do agendamento público (categorias + serviços)
6. WHEN o cliente já tem cadastro pelo telefone (agendamento público / área) THEN o sistema SHALL reutilizar esse cliente — sem pedir nome de novo se a sessão já existir
7. WHEN o QR é de um colaborador THEN o sistema SHALL pré-associar o profissional; o cliente não escolhe outro barbeiro nesse fluxo

**Independent Test**: QR do João → login na área → Fila destrava → escolhe Corte → entra na fila do João.

---

### P1: Ver posição e quem está na fila ⭐ MVP

**User Story**: Como cliente na fila, quero ver minha posição e quem está na frente, para decidir se espero.

**Why P1**: É o contrato visível da feature.

**Acceptance Criteria**:

1. WHEN o cliente está `waiting` THEN o sistema SHALL mostrar posição (ex.: 3º) atualizada em tempo real
2. WHEN o cliente está na fila THEN o sistema SHALL listar as pessoas à frente (privacidade: ver decisão em Aberto)
3. WHEN o status vira chamado / em atendimento THEN o sistema SHALL deixar isso óbvio na sessão Fila
4. WHEN o cliente cancela a própria senha THEN o sistema SHALL tirá-lo da fila e voltar a sessão ao estado “pode entrar de novo” enquanto o check-in valer

**Independent Test**: Dois clientes no QR geral; o segundo vê “você é o 2º” e o primeiro nome na frente.

---

### P1: Entrada manual (idade / recepção) ⭐ MVP

**User Story**: Como colaborador ou recepção, quero colocar alguém na fila à mão, para atender quem não usa celular.

**Why P1**: Sem isso o QR exclui o cliente idoso e o salão com balcão.

**Acceptance Criteria**:

1. WHEN dono ou staff abre `/#/fila` THEN o sistema SHALL permitir adicionar cliente (nome + telefone + serviço; profissional conforme o modo da casa)
2. WHEN o telefone já existe no CRM da casa THEN o sistema SHALL vincular o cadastro existente (e a assinatura, se houver)
3. WHEN o telefone é novo THEN o sistema SHALL criar o cliente da casa como no fluxo público
4. WHEN a entrada é manual THEN o cliente SHALL aparecer na mesma fila (geral ou do profissional) que uma entrada por QR

**Independent Test**: Staff adiciona “Dona Maria” no telefone conhecido → ela entra na fila do profissional da vez; se o telefone bate com assinante, o fechamento vê o clube.

---

### P1: Operação do colaborador — chamar e fechar comanda ⭐ MVP

**User Story**: Como colaborador, quero atender o próximo da minha fila (ou da fila geral) e, ao terminar, fechar a comanda para liberar a cadeira.

**Why P1**: É o ritmo do dia walk-in.

**Acceptance Criteria**:

1. WHEN o modo é QR geral THEN qualquer colaborador (e o dono) SHALL ver a fila única e atender o próximo sem preferência de “quem corta quem”
2. WHEN o modo é QR por colaborador THEN o staff SHALL ver de forma destacada a própria fila (o dono vê todas)
3. WHEN o colaborador fecha a comanda THEN o sistema SHALL tirar a pessoa de “em atendimento”, liberar a cadeira e permitir chamar o próximo — sem obrigar o pagamento no mesmo toque
4. WHEN a comanda é fechada THEN o sistema SHALL oferecer de imediato **Confirmar pagamento** ou **Editar comanda** (ação clara, mobile-first)
5. WHEN o colaborador confirma pagamento sem editar THEN o sistema SHALL lançar no financeiro o serviço escolhido na entrada (preço de catálogo, clube aplicado se couber)
6. WHEN o colaborador edita THEN o sistema SHALL permitir acrescentar serviços e produtos do catálogo da casa, ajustar valores, e só então confirmar o lançamento
7. WHEN o cliente tem assinatura ativa e o serviço está no plano THEN o sistema SHALL oferecer usar o clube no fechamento (consumo / valor coberto), visível para o colaborador

**Independent Test**: João atende, toca Fechar comanda → próximo já pode ser chamado; depois edita + pomada e confirma → financeiro mostra serviço + produto.

---

### P1: Modo de QR no gestor ⭐ MVP

**User Story**: Como gestor, quero escolher QR geral ou um QR por colaborador, para o modelo da casa (todos atendem o próximo vs. cada um na sua bancada).

**Why P1**: Os dois nichos dependem dessa escolha.

**Acceptance Criteria**:

1. WHEN o gestor troca o modo THEN QRs e filas SHALL seguir o modo novo (entradas já `waiting` — ver Aberto)
2. WHEN o modo é por colaborador THEN a tela de QR SHALL listar cada profissional com download/impressão do próprio QR
3. WHEN o modo é geral THEN a tela SHALL mostrar um QR da casa, sem `?pro=`

**Independent Test**: Alternar modo em Ajustes/Fila → baixar QRs → scan cai na fila certa.

---

### P2: Sessão Fila bloqueada na área do cliente

**User Story**: Como cliente, quero ver na Minha Área que existe fila digital, mas só usar quando estiver na casa.

**Why P2**: Copy e bloqueio já são P1; o polimento da aba (empty, histórico do dia) pode seguir o núcleo.

**Acceptance Criteria**:

1. WHEN abre Minha Área sem check-in THEN a sessão Fila SHALL existir e estar bloqueada, com texto claro (ir até o QR na bancada / balcão)
2. WHEN o check-in expira THEN a sessão SHALL voltar a bloquear; senha ainda `waiting` — ver Aberto

---

## Edge Cases

- WHEN o cliente tenta entrar de novo com o mesmo telefone enquanto já está `waiting`/`calling`/`serving` THEN o sistema SHALL recusar duplicata (já existe UNIQUE parcial)
- WHEN o colaborador está atendendo e fecha a comanda THEN outro atendimento não começa sozinho — chama o próximo é ação explícita (salvo decisão contrária em Aberto)
- WHEN o pagamento fica para depois THEN a comanda SHALL ficar pendente de lançamento, não sumir
- WHEN o plano tem teto de usos e o teto estourou THEN o sistema SHALL cobrar o serviço (não fingir clube)
- WHEN o QR de um staff inativo é escaneado THEN o sistema SHALL recusar ou redirecionar ao QR geral (ver Aberto)
- WHEN a casa não tem slug THEN o gestor SHALL ser levado a criar o slug (mesmo padrão do link de agendamento)

---

## Requirement Traceability

| ID | Story | Phase | Status |
|----|--------|-------|--------|
| FILA-01 | P1: Check-in QR + serviço | Specify | Draft |
| FILA-02 | P1: Posição e lista | Specify | Draft |
| FILA-03 | P1: Entrada manual | Specify | Draft |
| FILA-04 | P1: Fechar comanda + financeiro | Specify | Draft |
| FILA-05 | P1: Modo QR geral vs por colaborador | Specify | Draft |
| FILA-06 | P1: Identidade única + clube no fechamento | Specify | Draft |
| FILA-07 | P2: Aba bloqueada na área do cliente | Specify | Draft |

**Coverage:** 7 total, 0 mapped to tasks

---

## Success Criteria

- [ ] Casa no modo geral: cliente no QR do balcão entra; qualquer barbeiro fecha comanda e segue o próximo
- [ ] Casa no modo bancada: QR do João só alimenta a fila do João
- [ ] Cliente sem QR na Minha Área não entra na fila
- [ ] Assinante conhecido no telefone usa o clube no fechamento
- [ ] Fechar comanda ≠ confirmar pagamento; editar inclui produto + serviço
- [ ] Fluxo cabe no polegar (colaborador no celular da bancada)

---

## O que já existe (brownfield)

- Rotas: `/#/queue/:slug`, `/#/queue-status/:id`, `/#/fila`
- Estados: `waiting` → `calling` → `serving` → `completed` / `cancelled` / `no_show`
- QR já aceita `?pro=` mas o modo não é uma escolha de produto persistida
- Entrada manual hoje: dono only; telefone opcional (`0000000000`); sem serviço obrigatório
- Fechar: um modal único (serviço + preço + profissional) via RPC `finish_queue_entry`
- Área do cliente: `/#/minha-area/:slug` (telefone), abas Próximos / Histórico / Clube / Perfil — **sem Fila**
- Clube: membership por telefone + `business_id`; desconto no checkout de agenda (`useSubscriptionDiscount`), não na fila

---

## Aberto — precisa de decisão

Ver `context.md` (preenchido após as respostas). Perguntas na conversa de 2026-09-06.
