# Fila Digital v2 — Context

**Gathered:** 2026-09-06
**Spec:** `specs/active/fila-digital-v2/spec.md`
**Status:** Quase pronto para design — 4 pontos de confirmação abaixo

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
- Pix/MB WAY exige **confirmação do recebedor** (recepção ou profissional) — não basta o cliente dizer que pagou.
- QR por colaborador pré-associa o profissional; cliente não troca de barbeiro nesse scan.
- Minha Área continua com sessão Fila **visível e bloqueada** até o scan (copy clara: vá até o QR na casa).

### 2. Política de sair da casa (gestor)

- Gestor liga uma de duas políticas:
  - **Pode sair:** cliente pode ir embora e voltar; tem **até N minutos de atraso** (N configurável) depois de ser chamado. O prazo aparece de forma profissional na tela do cliente.
  - **Não pode sair:** sem minutos de atraso; o cliente vê a regra com clareza (permanecer na casa).
- Staff **não** edita essa política — só o dono.

### 3. Quem opera o quê

- Staff tem **acesso total à fila** (ver, adicionar à mão sempre, chamar, atender, fechar, comandas).
- Staff **não** mexe nas opções extras do dono (modo QR, política de saída/atraso, e o que mais for ajuste da feature).
- Troca **QR geral ↔ QR por colaborador** fica **bloqueada** enquanto existir qualquer cliente ativo na fila (`waiting`, `calling`, `serving`). Só habilita com fila vazia.

### 4. Tempo de espera

- Duração vem do cadastro de **Serviços** (`duration_minutes`).
- ETA do cliente = soma dos tempos de quem está **na frente** naquela fila.
- Modo QR geral: a soma é **distribuída entre os colaboradores** (várias cadeiras em paralelo).
- Modo por colaborador: a soma é só a fila daquela bancada.

### 5. Ritmo do colaborador

- **Chamar** é opcional: só se o cliente não está à vista (foi embora, está fora).
- Se está à vista: o profissional chama no grito e no app vai **direto para Em atendimento** (waiting → serving, sem obrigar calling).
- Depois de finalizar, o caminho depende do pagamento escolhido na entrada:
  - **Pix/MB WAY já confirmado** ou **assinatura**: o card já mostra pago / clube — não precisa cobrar.
  - **Balcão:** fica não pago; cobra na cadeira **ou** manda para recepção.
- Ao terminar, o colaborador escolhe:
  1. Fechar comanda **e** finalizar (só o serviço, ou editando itens) e seguir o próximo, ou
  2. Só fechar a comanda → ela vai para a lista **Comandas**.
- Comanda **sempre** grava: cliente, colaborador/gestor logado, serviço(s), produtos, valores, status de pagamento. Nada some.

### 6. Pix e assinatura no card

- Se o cliente pagou Pix (confirmado pelo recebedor) **antes** de ir para atendimento, o card já leva o alerta/marca de pago.
- Assinatura reconhecida no mesmo espírito: marca no card para o profissional não cobrar.

### 7. O que o cliente vê da fila

- A própria posição (ex.: 3º).
- As outras pessoas: **só primeiro nome** + posição. Sem telefone, sem serviço na lista pública.

---

## Proposta do agente (sessão que cai) — confirmar

A senha **vive no servidor**, amarrada ao telefone + id da entrada — não ao token do celular.

- Se o app “desloga” ou o Chrome mata o storage: o cliente abre de novo o link da casa (QR ou Minha Área), informa o **mesmo telefone**, e **recupera a posição** se ainda estiver `waiting`/`calling`/`serving`.
- Estar na fila **não exige** ficar logado o tempo todo.
- Check-in do QR só é obrigatório para **entrar**; quem já está na fila recupera por telefone.

---

## Specific References

- “Igual é no agendamento público” — seleção de serviço e cadastro/login.
- “Chamar no grito, no app já colocar em atendimento.”
- “Fechar a comanda e já finalizar editando, ou só finalizar, ou só fechar e ir para Comandas.”
- Marca de pago/assinatura no card **antes** do atendimento quando já estiver resolvido.

---

## Deferred Ideas

- WhatsApp/SMS “sua vez”
- Painel/TV de senha
- Papel formal “recepcionista”
- Fila + encaixe na agenda (casa híbrida)
- Geofence

---

## Ainda aberto (confirmar antes do design)

1. Recuperação de sessão: aceita a proposta acima?
2. Cliente escolhe Pix agora: **entra na fila na hora** e o Pix pode ser confirmado depois (card atualiza), ou **só entra depois** do recebedor confirmar?
3. Política “pode sair”: os N minutos de atraso contam **depois do Chamar** (ou do Em atendimento)? Se estourar: **no-show automático** ou o staff marca?
4. Entrada manual (Dona Maria): pagamento padrão é **pagar ao balcão**, e o staff pode trocar para clube/Pix se fizer sentido?
