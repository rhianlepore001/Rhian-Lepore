---
id: US-012
título: Soft Delete + Lixeira (Trash System)
status: pending
estimativa: 3h
prioridade: medium
agente: backend-specialist
assignee: "@backend-specialist"
blockedBy: []
---

# US-012: Soft Delete + Lixeira (Trash System)

## Por Quê
Evitar perda acidental de dados e permitir a recuperação de registros deletados por engano (Clientes, Agendamentos, Financeiro).

## O Que
1. Implementar coluna `deleted_at` em tabelas core.
2. Criar Trigger/Filtro global para não listar deletados por padrão.
3. Criar página `pages/settings/RecycleBin.tsx`.

## Critérios de Aceitação
- [ ] Coluna `deleted_at` funcional
- [ ] Interface de Lixeira permite Restaurar ou Excluir Permanentemente
- [ ] Purga automática após 30 dias (pg_cron instruído)

## Arquivos Impactados
- `supabase/migrations/` (Soft delete logic)
- `pages/settings/RecycleBin.tsx`
- `hooks/useTrashManager.ts`

## Definição de Pronto
- [ ] Teste manual: Deletar cliente -> Ver na lixeira -> Restaurar
- [ ] RLS impede acesso a dados de outros estabelecimentos na lixeira
