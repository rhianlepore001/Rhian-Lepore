---
id: US-010
título: Copywriter IA (WhatsApp Messages)
status: pending
estimativa: 4h
prioridade: high
agente: backend-specialist
assignee: "@aios-copywriter"
blockedBy: [US-009]
---

# US-010: Copywriter IA (WhatsApp Messages)

## Por Quê
Facilitar a vida do dono do negócio gerando mensagens personalizadas e persuasivas para reativar clientes, economizando tempo de digitação.

## O Que
1. Criar prompt especializado no Gemini para reativação de clientes.
2. Integrar com dados do cliente (nome, último serviço).
3. Botão "Gerar Mensagem" na lista de Churn.

## Critérios de Aceitação
- [ ] Integração com Gemini via `lib/gemini.ts`
- [ ] Geração de 3 variantes de mensagem (Curta, Promocional, Direta)
- [ ] Interface para copiar ou enviar direto via WhatsApp

## Arquivos Impactados
- `utils/aiosCopywriter.ts`
- `components/ReactivationCard.tsx`

## Definição de Pronto
- [ ] Teste manual: Mensagem gerada contém o nome do cliente e serviço
- [ ] Lint & Typecheck: OK
