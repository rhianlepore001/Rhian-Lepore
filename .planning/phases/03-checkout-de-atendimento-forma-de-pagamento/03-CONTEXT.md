# Phase 3: Checkout de Atendimento + Forma de Pagamento — Context

**Gathered:** 2026-04-13
**Status:** Ready for planning
**Source:** PRD Express Path (specs/active/01-colaboradores-comissoes-pagamentos.md — Feature 2)

<domain>
## Phase Boundary

Esta fase implementa o fluxo de conclusão de atendimento com captura de forma de pagamento, taxa de maquininha e configurações financeiras relacionadas. **Não inclui** cálculo de comissões (Fase 4) nem dashboard do colaborador (Fase 5).

**Entrega concreta:**
1. Botão "Concluir atendimento" no card de agendamento existente
2. Modal `CheckoutModal.tsx` completo (forma de pagamento, taxa, "Recebido por")
3. Forma de pagamento torna-se OPCIONAL na criação do agendamento
4. Seção "Financeiro" em Settings com configuração de taxa de maquininha
5. Migrations SQL para novos campos e tabelas
6. RLS atualizado para as novas regras de permissão
7. Badge "Pago via [método]" em agendamentos já concluídos

</domain>

<decisions>
## Implementation Decisions

### D-01: Fluxo de Pagamento
- Forma de pagamento é capturada APENAS no momento de conclusão do serviço, não na criação
- Na criação do agendamento: campo `payment_method` é opcional (pode ficar em branco)
- Esta é uma decisão FECHADA — não reverter ao modelo anterior

### D-02: Modal de Conclusão (CheckoutModal)
- Aparece ao clicar "Concluir atendimento" no card de agendamento
- Campos do modal:
  - Serviço realizado (pré-preenchido, read-only)
  - Valor (pré-preenchido, editável)
  - Forma de pagamento: PIX | Dinheiro | Débito | Crédito (obrigatório)
  - Taxa de maquininha (%): aparece SOMENTE se Débito ou Crédito selecionado
    - Pré-preenchido com taxa configurada pelo dono nas Settings
    - Campo opcional
  - "Recebido por": dropdown com todos os colaboradores + dono (quem pegou o dinheiro)
- Botão "Confirmar pagamento" → muda status do agendamento para `concluído`

### D-03: Taxa de Maquininha — Configuração pelo Dono
- Localização: Settings > Financeiro (nova seção)
- Toggle: "Repassar taxa de maquininha ao colaborador?" (Sim/Não)
- Campo: "Taxa débito (%)"
- Campo: "Taxa crédito (%)"
- Se toggle = Não → taxa absorvida pela barbearia, comissão calculada sobre valor bruto
- Se toggle = Sim → comissão calculada sobre (valor - taxa)

### D-04: Campos em `appointments` (migration)
Novos campos a adicionar via migration:
- `payment_method`: TEXT — 'pix' | 'cash' | 'debit' | 'credit' | NULL
- `received_by`: UUID — referência ao colaborador que recebeu o pagamento
- `machine_fee_applied`: BOOLEAN — se taxa foi aplicada
- `machine_fee_percent`: DECIMAL(5,2) — percentual da taxa aplicada

### D-05: Configuração de taxas em settings
Nova tabela ou campos na tabela existente `settings`:
- `machine_fee_enabled`: BOOLEAN — toggle de repasse
- `debit_fee_percent`: DECIMAL(5,2) — taxa débito (ex: 2.5)
- `credit_fee_percent`: DECIMAL(5,2) — taxa crédito (ex: 3.5)

### D-06: RLS — Regras de Acesso
- `appointments` UPDATE (status, payment_method, received_by): liberado para todos os usuários da mesma barbearia (`company_id` match)
- `settings` SELECT/UPDATE: apenas owner

### D-07: Edge Cases (decisões fechadas)
- Colaborador tenta concluir sem escolher forma de pagamento → bloqueia, campo vermelho: "Selecione a forma de pagamento"
- Agendamento já concluído → botão "Concluir" desaparece; badge "Pago via [método]" exibido
- Agendamento concluído + pago → colaborador NÃO pode cancelar: "Este agendamento já foi finalizado. Fale com o dono."

### Claude's Discretion
- Componente visual: pode ser modal ou drawer — preferir modal para mobile
- Animações de transição: mínimas, sem overhead de performance
- Tratamento de erro de rede: toast de erro com retry
- Loading state no botão "Confirmar pagamento"
- Posicionamento do botão "Concluir atendimento" no card existente (antes ou depois de outros botões)
- Limpeza de campos ao fechar modal sem confirmar

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spec de origem
- `specs/active/01-colaboradores-comissoes-pagamentos.md` — Feature 2 completa (seções de fluxo, configuração, edge cases)

### Código existente (DEVE ler antes de criar novos componentes)
- `pages/Agenda.tsx` — maior arquivo do projeto (111KB), contém a lógica de agendamentos; QUALQUER mudança no card de agendamento parte daqui
- `components/` — listar componentes existentes de modal antes de criar CheckoutModal (verificar se há padrão a seguir)
- `pages/settings/` — estrutura existente de Settings para adicionar nova seção Financeiro
- `lib/supabase.ts` — cliente Supabase; padrão de queries
- `contexts/AuthContext.tsx` — leitura de `companyId`, `role`, `user`

### Banco de dados
- `supabase/migrations/` — últimas migrations (verificar schema atual de `appointments` e `settings` antes de criar novas)
- `.planning/codebase/ARCHITECTURE.md` — decisões de arquitetura do projeto
- `.planning/STATE.md` — contexto do projeto e decisões chave

### Convenções do projeto
- `.planning/codebase/CONVENTIONS.md` — padrões de código
- `CLAUDE.md` — regras críticas (multi-tenant, RLS, HashRouter)

</canonical_refs>

<specifics>
## Specific Ideas

### Ordem de implementação sugerida pela spec
1. Feature 2 (esta fase) — sem dados de pagamento não há base para comissão
2. Feature 3 (Fase 4) — depende de `payment_method` e `received_by` prontos
3. Feature 1 (Fase 5) — depende de roles + dados de comissão prontos

### Componente CheckoutModal — estrutura esperada
```
CheckoutModal
├── Header: "Concluir Atendimento"
├── Serviço (read-only)
├── Valor (editável)
├── Forma de Pagamento (radio/select obrigatório)
│   └── [se Débito/Crédito] Taxa de Maquininha (%)
├── Recebido Por (dropdown colaboradores)
└── Botões: [Cancelar] [Confirmar Pagamento]
```

### Settings > Financeiro — estrutura esperada
```
Settings > Financeiro
├── Toggle: "Repassar taxa de maquininha ao colaborador?"
├── [se toggle ativo]
│   ├── Taxa Débito (%)
│   └── Taxa Crédito (%)
└── Botão Salvar
```

</specifics>

<deferred>
## Deferred Ideas

- Integração com maquininha física ou sistema de pagamento externo
- Relatório financeiro detalhado por forma de pagamento (vai para Fase 4)
- Notificações push ou WhatsApp sobre pagamento recebido
- PIX automático integrado (listado como "O QUE NÃO FAZER" no plano 30 dias)

</deferred>

---

*Phase: 03-checkout-de-atendimento-forma-de-pagamento*
*Context gathered: 2026-04-13 via PRD Express Path*
