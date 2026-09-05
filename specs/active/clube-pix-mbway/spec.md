# SPEC: Pix (BR) e MB WAY (PT) no Clube

**Status:** done
**Criado:** 2026-09-05
**Prioridade:** alta

---

## O que o cliente final vê

- Conta **Brasil (R$)**: no checkout do Clube aparece **Pix agora** e **No balcão**. O QR/código Pix do estabelecimento aparece de verdade (copia-e-cola se o QR falhar).
- Conta **Portugal (€)**: aparece **MB WAY** e **No balcão**. Mostra o telemóvel cadastrado para enviar o valor. Pix não aparece.
- Enquanto o pagamento não é confirmado pelo estabelecimento, a área do cliente diz **pagamento pendente** — não parece plano já ativo.
- Se gerar o Pix falhar, a solicitação **não** é criada. Dá para tentar de novo.

## O que muda no sistema

- Dono BR cadastra Pix; dono PT cadastra telemóvel MB WAY.
- `payment_method` do clube aceita `mbway`.
- RPC público devolve também os dados MB WAY.
- Retry de membership `pending` reabre o pagamento em vez de bloquear.

## O que NÃO muda

- Confirmação manual na lista de assinantes.
- Checkout de atendimento (já tem Pix vs MBWay por região).
- Teto de usos / financeiro da mensalidade (PR #47).

## Edge cases

- Chave Pix salva com tipo errado → tenta detectar o tipo e ainda mostra a chave.
- QR Code falha → mostra copia-e-cola (não a caixa vermelha sozinha).
- WhatsApp PT: 9 dígitos são válidos.
- Membership `active` no mesmo WhatsApp → continua bloqueando nova assinatura.

## Done when

- [ ] Pix só em contas BR; MB WAY só em contas €/PT
- [ ] QR Pix não quebra com CSS vars; cliente vê o código
- [ ] Falha ao gerar Pix não cria membership “já paga”
- [ ] Pending na área do cliente mostra pagamento, não plano ativo
- [ ] Dono PT cadastra MB WAY em Ajustes > Clube
