---
id: US-011
título: Deep Link WhatsApp Integration
status: pending
estimativa: 2h
prioridade: high
agente: frontend-specialist
assignee: "@frontend-specialist"
blockedBy: []
---

# US-011: Deep Link WhatsApp Integration

## Por Quê
Permitir que o dono do negócio envie mensagens sem fricção, abrindo o WhatsApp já com o texto preenchido.

## O Que
1. Criar utilitário para formatar links `wa.me`.
2. Tratar formatação de números de telefone brasileiros.
3. Integrar em todos os cards de ação do cliente.

## Critérios de Aceitação
- [ ] Utilitário `whatsappLink.ts` criado
- [ ] Funciona em Mobile e Web Desktop
- [ ] Suporte a caracteres especiais e quebra de linha no texto

## Arquivos Impactados
- `utils/whatsappLink.ts`
- `components/ClientActionButtons.tsx`

## Definição de Pronto
- [ ] Teste manual: Clique no botão abre WhatsApp com texto e número corretos
