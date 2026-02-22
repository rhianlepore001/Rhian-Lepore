---
id: US-002
título: Interface de Insights Proativos no CRM
status: in-progress
estimativa: 2h
prioridade: medium
agente: frontend-specialist
---

# US-002: Interface de Insights Proativos no CRM

## Por Quê
O barbeiro precisa ver as informações relevantes do cliente de forma rápida antes ou durante o atendimento. Em vez de ler uma lista longa de observações, ele deve ver "Insights de IA" que resumem ou destacam preferências similares ao contexto atual.

## O Que
Modificar a tela `ClientCRM.tsx` para:
1.  Carregar memórias semânticas relacionadas ao abrir o perfil de um cliente.
2.  Exibir um componente de "AI Insights" (Command Strip style) com as preferências mais fortes.
3.  Permitir que novas observações sejam salvas e indexadas automaticamente como vetores.

## Critérios de Aceitação
- [ ] Componente `AISemanticInsights` exibido no topo do perfil do cliente.
- [ ] Uso do hook `useSemanticMemory` para buscar similaridades (ex: buscar "estilo" ou "preferência").
- [ ] Feedback visual de que a IA está "processando" ou "lembrando" as notas do cliente.
- [ ] Botão para "Gerar Resumo de IA" baseado nas notas vetoriais.

## Arquivos Impactados
- `pages/ClientCRM.tsx`
- `components/AISemanticInsights.tsx` (Novo Componente)

## Definição de Pronto
- [ ] Interface segue o padrão do kit Antigravity (Glassmorphism + Premium).
- [ ] As sugestões mudam conforme novas notas são adicionadas.
- [ ] Performance: O carregamento dos insights não bloqueia a UI principal.
