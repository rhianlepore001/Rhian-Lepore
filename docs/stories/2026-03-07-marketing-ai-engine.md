# Story: Marketing AI Engine Foundation

## Contexto
O módulo de marketing atual do AgenX possui placeholders para o futuro. Precisamos ativar o **Motor de Sugestão IA** para que o usuário sinta o valor real do AIOS como um "sócio virtual", permitindo que ele crie campanhas de reativação em segundos.

## Critérios de Aceitação
- [ ] **Modal de Campanha**: Substituir o `alert` atual por um modal premium com glassmorphism.
- [ ] **Sugestões Contextuais**: A IA deve sugerir textos baseados no radar de Churn (clientes em risco).
- [ ] **Ações de Copiar**: Permitir copiar o texto gerado para uso no WhatsApp com placeholders de nome do cliente.
- [ ] **Phase 2 Preview**: Refatorar as seções de "Calendário" e "Estúdio" para um estado visual premium "Em Breve" mais informativo.

## Squad Tasks
### Frontend 🎨
- Implementar `CampaignModal.tsx`.
- Adicionar animações de entrada via `framer-motion` (se disponível) ou CSS puro.

### Backend/IA 🤖
- Criar mock de sugestões inteligentes baseadas em métricas do estabelecimento.

## Definição de Pronto
- [ ] Lint & Typecheck passam.
- [ ] Tema Barber vs Beauty testados.
- [ ] Registra log em `aios_logs`.

---
**Data**: 2026-03-07
**Status**: 🆕 DRAFT
**Assignee**: @aios-master
