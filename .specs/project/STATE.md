# STATE — Decisões, Blockers e Memória Persistente

## Decisões Fechadas

### D-001: Ciclo de comissões
- **Decisão**: Mês cheio (dia 6 do mês anterior → dia 5 do mês atual, se configurado dia 5)
- **Data**: 2026-04-16
- **Contexto**: Padrão real de barbearias — ciclo de ~30 dias, não fragmento curto

### D-002: Notificação de agendamento cruzado
- **Decisão**: Sem notificação em tempo real
- **Data**: 2026-04-16
- **Contexto**: Colaborador vê na agenda quando atualizar. Mais simples para MVP.

### D-003: Quem pode concluir atendimento
- **Decisão**: Qualquer colaborador da mesma barbearia
- **Data**: 2026-04-16
- **Contexto**: Recepcionista ou colega pode concluir por qualquer um. Mais flexível.

### D-004: Campo "Recebido por" no checkout
- **Decisão**: Obrigatório — não permite concluir sem selecionar quem recebeu
- **Data**: 2026-04-16
- **Contexto**: Mais preciso para controle financeiro.

### D-005: Taxa de maquininha
- **Decisão**: Removida da criação do agendamento. Aparece apenas no card de conclusão quando forma de pagamento = Débito ou Crédito.
- **Data**: 2026-04-16

### D-006: CPF do colaborador
- **Decisão**: Campo opcional. Dono preenche na hora de emitir recibo — não obrigatório no cadastro.
- **Data**: 2026-04-16

### D-007: Histórico de comissões
- **Decisão**: Tudo na mesma tela com filtro "Pendente / Pago". Badge "Pago" com data. Sem tela separada.
- **Data**: 2026-04-16

### D-008: Colaborador sem % configurado
- **Decisão**: Ao clicar "Marcar como pago", aparece prompt para definir % na hora. Sistema calcula e registra.
- **Data**: 2026-04-16

### D-009: Formas de pagamento
- **Decisão**: Separar "Cartão" em "Débito" e "Crédito" (hoje é unificado como "Cartão")
- **Data**: 2026-04-16
- **Contexto**: Necessário para aplicar taxas de maquininha diferentes por tipo.

## Ordem de Implementação

| Prioridade | Feature | Slug | Motivo |
|---|---|---|---|
| 1 | Checkout de Comanda + Pagamento | `checkout-comanda` | Sem isso, comissão não tem dado pra calcular |
| 2 | Comissões e Pagamento da Equipe | `comissoes-pagamento` | Depende do checkout funcionando |
| 3 | Dashboard Colaborador (visão restrita) | `dashboard-colaborador` | Depende de roles + dados de comissão prontos |

## Codebase Gaps Identificados

| Gap | Feature | Impacto |
|---|---|---|
| `complete_appointment` RPC não tem campo "received_by" | F2 | Precisa alterar RPC |
| Forma de pagamento é "Cartão" (unificado) — precisa separar Débito/Crédito | F2 | Migration + UI |
| Não existe campo `machine_fee_percent` / `machine_fee_applied` em appointments | F2 | Migration |
| Settings não tem `debit_fee_percent` / `credit_fee_percent` / `machine_fee_enabled` | F2 | Migration |
| `CommissionsManagement` não tem relatório detalhado por profissional com breakdown | F3 | Componente novo |
| Não existe compartilhamento WhatsApp/PDF de recibo | F3 | Componente novo |
| Lembrete noturno de atendimentos não concluídos não existe | F3 | Lógica client-side |
| Dashboard staff não mostra faturamento líquido próprio | F1 | Componente novo |
| Rotas financeiras não bloqueiam staff (redirecionamento) | F1 | Guard de rota |

## Blockers
_(nenhum no momento)_

## Design System End-to-End

### Status: Especificação Completa, Implementação Pendente
- **Spec**: `.specs/features/design-system-end-to-end/spec.md`
- **Design**: `.specs/features/design-system-end-to-end/design.md`
- **Tasks**: `.specs/features/design-system-end-to-end/tasks.md`

### Decisões
- **D-DS-001**: Manter Tailwind CSS + variáveis CSS (não CSS-in-JS)
- **D-DS-002**: `useBrutalTheme()` retorna strings (classes Tailwind prontas)
- **D-DS-003**: Mobile detection no hook, não nos componentes
- **D-DS-004**: `forceTheme` via `useBrutalTheme({ override })`
- **D-DS-005**: Glassmorphism nas settings mantido, mas via hook

### Inconsistências Identificadas
- 6 componentes base usam `isBeauty` inline em vez de `useBrutalTheme()`
- Classes hardcoded (`text-accent-gold`, `bg-beauty-neon`) espalhados
- Light mode tokens CSS existem mas componentes não consomem
- Mobile shadows duplicadas entre hook e componentes

### Próximos Passos
1. Executar T1-T3 (fundação)
2. Executar T4-T9 (componentes base) em paralelo
3. Auditar componentes derivados (T10-T11)
4. Testar light mode (T13-T14)
5. Gerar visualizações Stitch (T15-T16)

## Deferred Ideas
- Sincronização de tema entre abas (BroadcastChannel)
- Detecção automática `prefers-color-scheme`
- Tema por componente individual
