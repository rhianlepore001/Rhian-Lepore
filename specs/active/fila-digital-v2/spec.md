# Fila Digital v2 — Specification

**Status:** ready (design em revisão — `design.md`)
**Criado:** 2026-09-06
**Prioridade:** alta
**Branch:** `cursor/fila-digital-v2-2dde`

---

## Problem Statement

A fila digital atual é um fluxo paralelo (`/#/queue/:slug` + `/#/queue-status/:id` + `/#/fila`) desconectado da área do cliente e do clube. Casas walk-in precisam de QR na bancada ou no balcão, entrada manual, tempo de espera honesto, pagamento escolhido na entrada (clube / balcão / Pix ou MB WAY) e fechamento de comanda que não perde cliente, profissional nem serviço.

## Goals

- [ ] Scan do QR: escolher serviço (igual booking) → cadastro/login se preciso → fila
- [ ] Gestor escolhe QR geral ou QR por colaborador; troca só com fila vazia
- [ ] Cliente vê a própria posição e o primeiro nome das outras pessoas; vê a regra de sair/atraso
- [ ] Staff opera a fila inteira e adiciona à mão; não mexe nos extras do dono
- [ ] ETA usa duração dos serviços; no QR geral divide pelas cadeiras
- [ ] Pagamento na entrada; Pix/MB WAY com confirmação do recebedor; card já mostra pago/clube
- [ ] Fechar comanda persiste tudo; pode finalizar agora ou ir para lista Comandas

## Out of Scope

| Feature | Reason |
|---------|--------|
| GPS / geofence | Presença é o scan do QR |
| WhatsApp / SMS de “sua vez” | P3 |
| Fila + horário marcado | Primeiro nicho é quem não agenda |
| Papel “recepcionista” | Staff/dono operam; papel novo é outra feature |
| TV / painel de senha | Fora deste redesign |

---

## User Stories

### P1: Entrar pelo QR (serviço → identidade → pagamento) ⭐ MVP

**User Story**: Como cliente na casa, quero escanear o QR, escolher o serviço e entrar na fila — se eu já for cliente, sem cadastrar de novo.

**Why P1**: É o walk-in.

**Acceptance Criteria**:

1. WHEN o cliente escaneia o QR THEN o sistema SHALL abrir a seleção de serviço no padrão do agendamento público (categorias + serviços)
2. WHEN o serviço é escolhido e **não** há sessão pública da casa THEN o sistema SHALL pedir cadastro/login igual ao booking (telefone; nome se for novo)
3. WHEN já existe sessão pública da casa THEN o sistema SHALL pular o cadastro e seguir
4. WHEN o telefone já é cliente da casa THEN o sistema SHALL reutilizar esse cadastro (CRM + clube)
5. WHEN o cliente tem assinatura ativa THEN o sistema SHALL oferecer **Usar assinatura**, **Pagar ao balcão** e **Pagar agora** (Pix no BR, MB WAY em PT)
6. WHEN não tem assinatura ativa (ou o plano não cabe) THEN o sistema SHALL oferecer balcão e Pix/MB WAY — sem fingir clube
7. WHEN escolhe Pix/MB WAY THEN o sistema SHALL entrar na fila na hora, gerar o pagamento da região (mesmo padrão público) e SHALL mostrar ao cliente “Aguarde a confirmação do pagamento.”
8. WHEN o Pix/MB WAY está pendente THEN o card no `/#/fila` SHALL mostrar **Aguardando confirmação e pagamento**
9. WHEN o recebedor confirma THEN o card SHALL passar a pago; ao finalizar o corte o profissional SHALL só conferir — não cobrar de novo
10. WHEN o QR é por colaborador THEN a entrada SHALL ficar na fila daquele profissional; o cliente não escolhe outro
11. WHEN o QR é geral THEN a entrada SHALL ir para a fila compartilhada
12. WHEN abre Minha Área **sem** ter vindo do QR THEN a sessão Fila SHALL aparecer bloqueada, com texto para ir até o QR na casa

**Independent Test**: QR do João → Corte → telefone conhecido assinante → “Usar assinatura” → entra na fila do João.

---

### P1: Posição, nomes e regra de espera ⭐ MVP

**User Story**: Como cliente na fila, quero ver minha posição, o primeiro nome de quem está na frente e as regras da casa (ficar ou poder sair).

**Why P1**: Contrato visível.

**Acceptance Criteria**:

1. WHEN está `waiting`/`calling` THEN o sistema SHALL mostrar a posição (ex.: 3º) em tempo real
2. WHEN lista as outras pessoas THEN o sistema SHALL mostrar só **primeiro nome** + posição — sem telefone, sem serviço
3. WHEN o gestor ativou **pode sair** THEN o cliente SHALL ver o prazo de atraso (N minutos) de forma profissional; o relógio só ANDA depois de **Chamar cliente**
4. WHEN o gestor ativou **não pode sair** THEN o cliente SHALL ver que precisa permanecer na casa — sem relógio de atraso
5. WHEN o profissional vai para **Em atendimento** (contato visual) THEN o sistema SHALL **não** iniciar minutos de atraso
6. WHEN o status muda (chamando / em atendimento) THEN a tela do cliente SHALL refletir na hora
7. WHEN o cliente cancela a própria senha THEN sai da fila e pode entrar de novo só com novo scan (ou enquanto a política de check-in permitir)

**Independent Test**: Dois clientes no QR geral; o segundo vê “você é o 2º” e o primeiro nome à frente; vê o texto da política.

---

### P1: Tempo estimado ⭐ MVP

**User Story**: Como cliente, quero uma espera baseada no tempo real dos serviços da frente.

**Why P1**: Sem isso a posição sozinha não decide se ele espera.

**Acceptance Criteria**:

1. WHEN calcula ETA THEN o sistema SHALL usar `duration_minutes` do serviço de cada pessoa à frente (e o restante de quem está `serving`, se houver)
2. WHEN o modo é **por colaborador** THEN o ETA SHALL somar só aquela bancada
3. WHEN o modo é **QR geral** THEN o ETA SHALL distribuir a carga entre os colaboradores ativos (cadeiras em paralelo)
4. WHEN o catálogo muda o tempo do serviço THEN novas entradas SHALL usar o valor novo; entradas já na fila mantêm o tempo capturado na entrada

**Independent Test**: Dois waiting de 30 min, um staff livre no modo geral → ~30 min para o segundo, não 60.

---

### P1: Entrada manual ⭐ MVP

**User Story**: Como staff ou dono, quero colocar alguém na fila à mão a qualquer momento.

**Why P1**: Idoso e recepção.

**Acceptance Criteria**:

1. WHEN staff ou dono abre `/#/fila` THEN o sistema SHALL permitir adicionar (nome + telefone + serviço; profissional se o modo for por colaborador)
2. WHEN o telefone já existe THEN vincula o cliente e a assinatura, se houver
3. WHEN o telefone é novo THEN cria o cliente da casa
4. WHEN a entrada é manual THEN cai na mesma fila que um QR (geral ou do profissional escolhido)
5. WHEN informa o pagamento na entrada manual THEN o sistema SHALL oferecer os mesmos métodos do finalizar agendamento (dinheiro, Pix/MB WAY, débito, crédito, outro, clube se couber)

**Independent Test**: Staff adiciona Dona Maria no telefone conhecido → aparece na fila; se for assinante, o card pode oferecer clube.

---

### P1: Operar a fila (chamar opcional → atender → comanda) ⭐ MVP

**User Story**: Como colaborador, quero atender quem está à vista sem cerimônia, chamar só quem não vejo, e fechar a comanda sem perder dados.

**Why P1**: Ritmo da cadeira.

**Acceptance Criteria**:

1. WHEN o modo é geral THEN staff e dono SHALL ver a fila única e qualquer um atende o próximo
2. WHEN o modo é por colaborador THEN staff SHALL operar a própria fila com destaque; dono vê todas
3. WHEN o profissional toca **Em atendimento** a partir de `waiting` THEN o sistema SHALL aceitar (contato visual; não exige `calling`; sem timer de atraso)
4. WHEN toca **Chamar cliente** THEN o status vira `calling` e, se a política for “pode sair”, SHALL iniciar os N minutos configurados pelo dono
5. WHEN o cliente já pagou Pix/MB WAY (confirmado) ou usou assinatura THEN o card SHALL mostrar pago / clube **antes** do atendimento
6. WHEN o pagamento é balcão THEN o card SHALL mostrar não pago
7. WHEN fecha a comanda THEN o sistema SHALL persistir cliente, profissional logado (staff ou dono), serviço(s), produtos, valores e status de pagamento
8. WHEN fecha THEN o colaborador SHALL poder: (a) finalizar já (só serviço ou editando itens) e seguir o próximo, ou (b) só fechar e mandar para **Comandas**
9. WHEN a comanda está em Comandas THEN dono e staff SHALL conseguir editar (serviços/produtos) e concluir o lançamento depois, sem perder o vínculo
10. WHEN Pix/assinatura já resolveu o valor THEN finalizar SHALL **não** exigir nova cobrança

**Independent Test**: Cliente Pix confirmado → card com pago → Em atendimento → Fechar e só finalizar → financeiro lançado, próximo livre.

---

### P1: Ajustes só do dono ⭐ MVP

**User Story**: Como gestor, quero o modo de QR e a política de saída; o staff não mexe nisso.

**Why P1**: Os dois nichos e a regra da casa.

**Acceptance Criteria**:

1. WHEN a fila tem alguém `waiting`, `calling` ou `serving` THEN o sistema SHALL bloquear a troca QR geral ↔ por colaborador
2. WHEN a fila está vazia THEN o dono SHALL poder trocar o modo
3. WHEN o modo é por colaborador THEN a UI de QR SHALL oferecer um QR por profissional ativo (download/impressão)
4. WHEN o modo é geral THEN um QR da casa, sem `?pro=`
5. WHEN o dono configura política THEN escolhe **pode sair** (com N minutos de atraso) **ou** **não pode sair**
6. WHEN o usuário é staff THEN a UI SHALL esconder/bloquear esses extras

**Independent Test**: Um waiting → toggle de modo desabilitado; fila vazia → troca; staff não vê o toggle.

---

### P1: Recuperar a senha se o celular deslogar ⭐ MVP

**User Story**: Como cliente, se o celular perder a sessão, quero recuperar minha posição com o mesmo telefone.

**Why P1**: A senha é do servidor; perder o storage do Chrome não pode queimar a vez.

**Acceptance Criteria**:

1. WHEN a sessão pública some e o cliente informa o mesmo telefone THEN o sistema SHALL reabrir a senha ativa (`waiting`/`calling`/`serving`)
2. WHEN não há senha ativa THEN o sistema SHALL **não** deixar entrar de novo sem scan do QR
3. WHEN a senha está ativa THEN estar logado o tempo todo SHALL **não** ser obrigatório

**Independent Test**: Entrar na fila → limpar site data → telefone de novo → mesma posição.

---

## Edge Cases

- WHEN o mesmo telefone tenta segunda senha ativa THEN recusa (UNIQUE parcial já existe)
- WHEN o teto do clube estourou THEN não oferece “Usar assinatura” (ou oferece e cobra o serviço)
- WHEN QR de profissional inativo THEN recusa com caminho para o QR da casa / balcão
- WHEN a casa não tem slug THEN dono cria o slug (padrão do link de agendamento)
- WHEN Pix está pendente e o corte termina THEN o profissional só confere o pagamento; o card continua “Aguardando confirmação e pagamento” até o recebedor confirmar
- WHEN o atraso de **Chamar cliente** estoura THEN o staff trata (não-show / devolver à fila); sem no-show automático no MVP
- WHEN ninguém está `serving` e o próximo é atendido THEN o ETA dos demais recalcula

---

## Requirement Traceability

| ID | Story | Phase | Status |
|----|--------|-------|--------|
| FILA-01 | P1: QR → serviço → identidade → pagamento | Specify | Ready |
| FILA-02 | P1: Posição + primeiro nome + política | Specify | Ready |
| FILA-03 | P1: ETA por duração / cadeiras | Specify | Ready |
| FILA-04 | P1: Entrada manual | Specify | Ready |
| FILA-05 | P1: Chamar opcional, atender, comanda | Specify | Ready |
| FILA-06 | P1: Ajustes do dono + lock com fila | Specify | Ready |
| FILA-07 | P1: Pix/MB WAY + confirmação recebedor | Specify | Ready |
| FILA-08 | P1: Assinatura no card | Specify | Ready |
| FILA-09 | P1: Recuperar senha por telefone | Specify | Ready |

**Coverage:** 9 total, 0 mapped to tasks

---

## Success Criteria

- [ ] Scan → serviço → (login se precisar) → pagamento → posição com primeiros nomes
- [ ] QR geral vs bancada; toggle só com fila vazia; staff não vê extras
- [ ] ETA honesto (duração + paralelo no geral)
- [ ] Card mostra pago/clube antes do atendimento quando já resolveu
- [ ] Comanda nunca perde cliente, profissional logado, serviço
- [ ] Política de sair/atraso visível para o cliente
- [ ] Mobile-first na cadeira e no bolso do cliente

---

## O que já existe (brownfield)

- Rotas: `/#/queue/:slug`, `/#/queue-status/:id`, `/#/fila`
- Estados: `waiting` → `calling` → `serving` → `completed` / `cancelled` / `no_show`
- QR já aceita `?pro=`; modo não é setting persistido
- Entrada manual: dono only; telefone opcional; sem serviço obrigatório
- Fechar: um modal via `finish_queue_entry` (sem comandas, sem Pix, sem clube)
- Área do cliente: `/#/minha-area/:slug` — sem Fila
- Booking público: serviço → telefone/nome — **reusar este ritmo**
- Clube: Pix BR + MB WAY PT com confirmação; `useSubscriptionDiscount` só no checkout de agenda

---

## Decisões de produto

Ver `context.md` — aprovado em 2026-09-06. Pronto para design.
