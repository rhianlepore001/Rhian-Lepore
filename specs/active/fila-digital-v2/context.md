# Fila Digital v2 — Context

**Gathered:** 2026-09-06
**Spec:** `specs/active/fila-digital-v2/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Walk-in profissional: QR (geral ou por colaborador) abre o mesmo fluxo de serviço do agendamento público, cadastro/login por telefone, pagamento escolhido na entrada (clube / balcão / Pix ou MB WAY), posição visível, operação de chamar/atender/fechar comanda, e comandas persistidas. Área do cliente mostra Fila bloqueada até o QR. Gestor configura modo e política de saída; staff opera a fila inteira sem tocar nesses extras.

---

## Implementation Decisions

### 1. QR e entrada do cliente

- Scan **não** cai na Minha Área primeiro: vai **direto para escolher serviço**, igual ao agendamento público.
- Depois do serviço: cadastro/login **igual ao booking público** (telefone + nome se for novo).
- Se já está logado na sessão pública da casa: reconhece e **pula o cadastro**.
- Se tem assinatura ativa: oferece **Usar assinatura** / **Pagar ao balcão** / **Pagar agora no Pix** (Brasil) ou **MB WAY** (Portugal).
- QR por colaborador pré-associa o profissional; cliente não troca de barbeiro nesse scan.
- Minha Área continua com sessão Fila **visível e bloqueada** até o scan (copy clara: vá até o QR na casa).

### 2. Pix / MB WAY (igual ao fluxo público, com um recado)

- Cliente **entra na fila na hora**. Não espera o dinheiro cair para ganhar posição.
- Depois de gerar o Pix/MB WAY (mesmo padrão do clube / pagamento público da região):
  - **Cliente** vê: “Aguarde a confirmação do pagamento.” (não usamos “recepcionista” — a casa pode não ter.)
  - **Staff/dono** vê no card: **Aguardando confirmação e pagamento.**
- Recebedor (dono, staff ou quem estiver no caixa) confirma quando o valor cair — igual ao Pix do produto hoje.
- Ao terminar o corte, o profissional **só confere** se o pagamento caiu. Não cobra de novo o cliente.
- Se ainda estiver pendente no fechamento: o card continua “aguardando”; a comanda não some.

### 3. Política de sair da casa (gestor)

- Configuração **antes da operação**, na tela de ajustes da fila — só o dono.
- Duas políticas:
  - **Pode sair:** cliente pode ir embora e voltar. O prazo de **N minutos de atraso** só começa quando o profissional toca **Chamar cliente** (pessoa fora do contato visual). O prazo aparece na tela do cliente.
  - **Não pode sair:** sem minutos de atraso; o cliente vê que precisa permanecer na casa.
- **Em atendimento** só é usado quando o profissional **já chamou no grito** quem está à vista. Nesse caso não há timer de atraso.
- Estourar o atraso: o staff trata (não-show / voltar a waiting). Sem no-show automático neste MVP — o timer é informativo e operacional.

### 4. Quem opera o quê

- Staff tem **acesso total à fila** (ver, adicionar à mão sempre, chamar, atender, fechar, comandas).
- Staff **não** mexe nas opções extras do dono (modo QR, política de saída/atraso, e o que mais for ajuste da feature).
- Troca **QR geral ↔ QR por colaborador** fica **bloqueada** enquanto existir qualquer cliente ativo na fila (`waiting`, `calling`, `serving`). Só habilita com fila vazia.

### 5. Tempo de espera

- Duração vem do cadastro de **Serviços** (`duration_minutes`).
- ETA do cliente = soma dos tempos de quem está **na frente** naquela fila.
- Modo QR geral: a soma é **distribuída entre os colaboradores** (várias cadeiras em paralelo).
- Modo por colaborador: a soma é só a fila daquela bancada.

### 6. Ritmo do colaborador

- **Chamar cliente:** cliente não está à vista → status `calling` → se a casa “pode sair”, começa o relógio de N minutos.
- **Em atendimento:** cliente à vista, já chamado na voz → `waiting` → `serving` direto.
- Ao terminar:
  1. Fechar comanda **e** finalizar (só o serviço, ou editando itens) e seguir o próximo, ou
  2. Só fechar a comanda → lista **Comandas**.
- Comanda **sempre** grava: cliente, colaborador/gestor logado, serviço(s), produtos, valores, método e status de pagamento.

### 7. Entrada manual e método de pagamento

- Staff/dono adicionam à mão quando quiserem.
- Método de pagamento **igual ao finalizar agendamento** (`CheckoutModal`): dinheiro, Pix/MB WAY, débito, crédito, outro, e clube se couber. Não fica preso em “só balcão”.

### 8. O que o cliente vê da fila

- A própria posição (ex.: 3º).
- As outras pessoas: **só primeiro nome** + posição. Sem telefone, sem serviço na lista pública.

### 9. Sessão que cai

- A senha **vive no servidor** (telefone + id da entrada).
- Se o celular desloga: mesmo telefone na Minha Área ou no fluxo da casa **recupera a posição** se ainda estiver `waiting`/`calling`/`serving`.
- Estar na fila **não exige** ficar logado o tempo todo.
- Check-in do QR só para **entrar**; quem já está na fila volta pelo telefone.

### Agent's Discretion

- Copy do cliente no Pix: “Aguarde a confirmação do pagamento.” (em vez de “recepcionista”).
- Sem no-show automático ao estourar o atraso (staff marca).
- QR de profissional inativo: recusa com caminho para o estabelecimento.

---

## Specific References

- “Igual é no agendamento público” — serviço, cadastro/login e Pix.
- “Aguarde confirmação” no cliente; “Aguardando confirmação e pagamento” no card do gestor.
- “Em atendimento só se ele mesmo chamar quem está no contato visual; Chamar cliente dispara o atraso.”
- “Método de pagamento como no finalizar agendamento.”
- “Fechar a comanda e já finalizar editando, ou só finalizar, ou só fechar e ir para Comandas.”

---

## Deferred Ideas

- WhatsApp/SMS “sua vez”
- Painel/TV de senha
- Papel formal “recepcionista”
- Fila + encaixe na agenda (casa híbrida)
- Geofence
- No-show automático ao estourar o atraso
