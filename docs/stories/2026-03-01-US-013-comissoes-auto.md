---
id: US-013
título: Comissões Automáticas
status: pending
estimativa: 3h
prioridade: high
agente: backend-specialist
assignee: "@backend-specialist"
blockedBy: []
---

# US-013: Comissões Automáticas

## Por Quê
Automatizar o cálculo do que deve ser pago para cada profissional evita erros manuais e aumenta a transparência da equipe.

## O Que
1. Criar tabela/lógica de comissões vinculada aos serviços e agendamentos concluídos.
2. Painel consolidado de "Comissões Pendentes" por profissional.
3. Marcar como "Pago" e gerar baixa no financeiro.

## Critérios de Aceitação
- [ ] Cálculo automático de % de comissão na conclusão do agendamento
- [ ] Relatório de comissões por colaborador
- [ ] Integração com o fluxo de caixa (baixar despesa ao pagar comissão)

## Arquivos Impactados
- `pages/Finance.tsx`
- `supabase/migrations/` (Commissions table/logic)
- `components/CommissionReport.tsx`

## Definição de Pronto
- [ ] Teste manual: Finalizar agendamento -> Ver comissão gerada no perfil do staff
- [ ] Lint & Typecheck: OK
